import { useState, useEffect, useRef } from "react";
import { useSupabase } from "../../lib/supabase-context";
import loader from "../../utils/loadGoogleMaps";
import TechnicianJobDetailSheet from "../components/jobs/TechnicianJobDetailSheet";
import CurrentLocationMarker from "../components/map/CurrentLocationMarker";
import TechnicianMarkers from "../components/map/TechnicianMarkers";
import JobMarkers from "../components/map/JobMarkers";
import MapControls from "../components/map/MapControls";
import TechnicianPanel from "../components/map/TechnicianPanel";
import JobPanel from "../components/map/JobPanel";
import TechnicianModal from "../components/map/TechnicianModal";
import { Technician } from "../types/technician";

// Extend window object to include Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}

interface TechnicianMarker {
  id: string;
  marker: google.maps.Marker;
  infoWindow: google.maps.InfoWindow;
  labelMarker: google.maps.Marker;
}

interface JobMarker {
  marker: google.maps.Marker;
  job: any;
}

interface RouteLine {
  polyline: google.maps.Polyline;
  technicianId: string;
}

const TechnicianMap = () => {
  const { supabase } = useSupabase();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const technicianMarkersRef = useRef<TechnicianMarker[]>([]);
  const jobMarkersRef = useRef<JobMarker[]>([]);
  const routeLinesRef = useRef<RouteLine[]>([]);

  // State
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedTechnician, setSelectedTechnician] =
    useState<Technician | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showTechnicianPanel, setShowTechnicianPanel] = useState(false);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [enRouteTechnicians, setEnRouteTechnicians] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [showStatusLegend, setShowStatusLegend] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);

  // Define handleCheckInOut function before useEffects
  function handleCheckInOut(technician: Technician) {
    if (!supabase) return;

    // Map our status values to database-compatible values
    const newStatus = technician.status === "available" ? "active" : "active";

    // Update technician status - keep as 'active' since that's what the DB allows
    supabase
      .from("users")
      .update({ status: newStatus })
      .eq("id", technician.id)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating technician status:", error);
          setError("Failed to update status");
        } else {
          // Update local state with our custom status for UI
          const newUISStatus =
            technician.status === "available" ? "on_job" : "available";
          setTechnicians((prev) =>
            prev.map((tech) =>
              tech.id === technician.id
                ? { ...tech, status: newUISStatus }
                : tech
            )
          );
        }
      })
      .catch((err) => {
        console.error("Error updating technician status:", err);
        setError("Failed to update status");
      });
  }

  // Get current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!supabase) return;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    };
    fetchCurrentUser();
  }, [supabase]);

  // Get current user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Error getting location:", error);
        }
      );
    }
  }, []);

  // Fetch technicians with their current status and job information
  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!supabase) return;

      try {
        // Fetch technicians with their current job status and location
        const { data: techData, error: techError } = await supabase
          .from("users")
          .select(
            `
            id,
            first_name,
            last_name,
            status,
            technician_locations (
              latitude,
              longitude,
              updated_at
            )
          `
          )
          .eq("role", "technician")
          .eq("status", "active");

        if (techError) throw techError;

        // Fetch current job assignments and job details
        const { data: jobAssignments, error: jobError } = await supabase
          .from("job_technicians")
          .select(
            `
            technician_id,
            is_primary,
            jobs (
              id,
              name,
              status,
              locations (
                name,
                address,
                city,
                state
              )
            )
          `
          )
          .eq("is_primary", true)
          .neq("jobs.status", "tech_completed")
          .neq("jobs.status", "cancelled");

        if (jobError) throw jobError;

        // Process technician data with job information
        const techniciansWithJobs = (techData || []).map((tech) => {
          const techJobs = (jobAssignments || [])
            .filter((assignment) => assignment.technician_id === tech.id)
            .map((assignment) => assignment.jobs)
            .filter((job) => job !== null); // Filter out null jobs

          const currentJob = techJobs.find(
            (job) =>
              job &&
              (job.status === "scheduled" || job.status === "in_progress")
          );
          const jobCount = techJobs.length;
          const nextJob = techJobs
            .filter((job) => job && job.status === "scheduled")
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )[0];

          // Get technician's real location from technician_locations table
          const techLocation = tech.technician_locations?.[0];

          return {
            id: tech.id,
            first_name: tech.first_name,
            last_name: tech.last_name,
            // Map database status to UI status - all technicians are 'active' in DB but we show different UI states
            status: currentJob ? "on_job" : "available",
            current_job_id: currentJob?.id,
            current_job_name: currentJob?.name,
            job_count: jobCount,
            next_job_time: nextJob?.created_at,
            location: {
              lat: 33.749 + (Math.random() - 0.5) * 0.1, // Random position around Atlanta (fallback)
              lng: -84.388 + (Math.random() - 0.5) * 0.1,
            },
            current_location: techLocation
              ? {
                  lat: techLocation.latitude,
                  lng: techLocation.longitude,
                  address: "Current Location",
                }
              : currentUserLocation
              ? {
                  lat: currentUserLocation.lat,
                  lng: currentUserLocation.lng,
                  address: "Current Location",
                }
              : undefined,
            technician_location: techLocation || undefined,
          };
        });

        setTechnicians(techniciansWithJobs);
      } catch (err) {
        console.error("Error fetching technicians:", err);
        setError("Failed to load technicians");
      }
    };

    fetchTechnicians();

    // Update current user location immediately
    updateCurrentUserLocation();

    const interval = setInterval(fetchTechnicians, 30000); // Refresh every 30 seconds

    // Set up periodic location updates (every 2 minutes)
    const locationInterval = setInterval(() => {
      updateCurrentUserLocation();
    }, 120000); // 2 minutes

    return () => {
      clearInterval(interval);
      clearInterval(locationInterval);
    };
  }, [supabase, currentUserLocation]);

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(
            `
            id,
            name,
            status,
            type,
    
            
            locations (
              name,
              address,
              city,
              state
            )
          `
          )
          .neq("status", "tech_completed")
          .neq("status", "cancelled");

        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load jobs");
      }
    };

    fetchJobs();
  }, [supabase]);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        // Use centralized loader

        const google = await loader.load();

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 33.749, lng: -84.388 }, // Atlanta
          zoom: 12,
          mapTypeId: "roadmap",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        setError("Failed to load map");
      }
    };

    initMap();
  }, []);

  // Update map type
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(mapType as any);
    }
  }, [mapType]);

  // Update traffic layer
  useEffect(() => {
    if (mapInstanceRef.current) {
      const trafficLayer = (mapInstanceRef.current as any).trafficLayer;
      if (trafficLayer) {
        trafficLayer.setMap(trafficEnabled ? mapInstanceRef.current : null);
      }
    }
  }, [trafficEnabled]);

  const toggleMapType = () => {
    setMapType(mapType === "roadmap" ? "satellite" : "roadmap");
  };

  const toggleTraffic = () => {
    setTrafficEnabled(!trafficEnabled);
  };

  const handleStartJob = async (jobId: string) => {
    if (!supabase || !selectedTechnician) return;

    try {
      // Update job status to in_progress
      const { error } = await supabase
        .from("jobs")
        .update({ status: "in_progress" })
        .eq("id", jobId);

      if (error) throw error;

      // Update local state
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: "in_progress" } : job
        )
      );

      // Refresh technicians to update their status
      setTechnicians((prev) =>
        prev.map((tech) =>
          tech.id === selectedTechnician.id
            ? { ...tech, status: "on_job", current_job_id: jobId }
            : tech
        )
      );
    } catch (err) {
      console.error("Error starting job:", err);
      setError("Failed to start job");
    }
  };

  const handleEndJob = async (jobId: string) => {
    if (!supabase || !selectedTechnician) return;

    try {
      // Update job status to completed
      const { error } = await supabase
        .from("jobs")
        .update({ status: "tech_completed" })
        .eq("id", jobId);

      if (error) throw error;

      // Update local state
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: "tech_completed" } : job
        )
      );

      // Refresh technicians to update their status
      setTechnicians((prev) =>
        prev.map((tech) =>
          tech.id === selectedTechnician.id
            ? { ...tech, status: "available", current_job_id: undefined }
            : tech
        )
      );
    } catch (err) {
      console.error("Error ending job:", err);
      setError("Failed to end job");
    }
  };

  const handleTechnicianClick = (technician: Technician) => {
    setSelectedTechnician(technician);
    setShowTechnicianModal(true);

    // Pan to technician's real current location if available, otherwise fallback to assigned location
    if (mapInstanceRef.current) {
      const locationToPanTo =
        technician.current_location || technician.location;
      if (locationToPanTo) {
        mapInstanceRef.current.panTo(locationToPanTo);
        mapInstanceRef.current.setZoom(15);
      }
    }
  };

  const handleTechnicianCardClick = (technician: Technician) => {
    // Pan to technician's real current location if available, otherwise fallback to assigned location
    if (mapInstanceRef.current) {
      const locationToPanTo =
        technician.current_location || technician.location;
      if (locationToPanTo) {
        mapInstanceRef.current.panTo(locationToPanTo);
        mapInstanceRef.current.setZoom(15);
      }
    }
  };

  const handleEnRoute = (technician: Technician) => {
    if (!mapInstanceRef.current) return;

    const isEnRoute = enRouteTechnicians.has(technician.id);

    if (isEnRoute) {
      // Remove route line
      const routeLine = routeLinesRef.current.find(
        (line) => line.technicianId === technician.id
      );
      if (routeLine) {
        routeLine.polyline.setMap(null);
        routeLinesRef.current = routeLinesRef.current.filter(
          (line) => line.technicianId !== technician.id
        );
      }
      setEnRouteTechnicians((prev) => {
        const newSet = new Set(prev);
        newSet.delete(technician.id);
        return newSet;
      });
    } else {
      // Add route line
      if (technician.current_job_id) {
        const job = jobs.find((j) => j.id === technician.current_job_id);
        if (job) {
          const startPosition =
            technician.current_location || technician.location;
          const endPosition = { lat: 33.749, lng: -84.388 }; // Default Atlanta position for jobs

          const polyline = new google.maps.Polyline({
            path: [startPosition, endPosition],
            geodesic: true,
            strokeColor: "#FF6B35",
            strokeOpacity: 1.0,
            strokeWeight: 3,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                },
                offset: "50%",
                repeat: "100px",
              },
            ],
          });

          polyline.setMap(mapInstanceRef.current);

          routeLinesRef.current.push({
            polyline,
            technicianId: technician.id,
          });

          setEnRouteTechnicians((prev) => new Set(prev).add(technician.id));

          // Fit map to show the entire route
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(startPosition);
          bounds.extend(endPosition);
          mapInstanceRef.current.fitBounds(bounds);
        }
      }
    }
  };

  const handleNavigateToJob = (job: any) => {
    if (!mapInstanceRef.current) return;

    // Pan to job location (using default Atlanta coordinates)
    const jobPosition = { lat: 33.749, lng: -84.388 };
    mapInstanceRef.current.panTo(jobPosition);
    mapInstanceRef.current.setZoom(15);
  };

  const handleEnRouteToJob = (job: any, technician: Technician) => {
    if (!mapInstanceRef.current) return;

    const startPosition = technician.current_location || technician.location;
    const endPosition = { lat: 33.749, lng: -84.388 }; // Default Atlanta position for jobs

    // Remove existing route for this technician
    const existingRoute = routeLinesRef.current.find(
      (line) => line.technicianId === technician.id
    );
    if (existingRoute) {
      existingRoute.polyline.setMap(null);
      routeLinesRef.current = routeLinesRef.current.filter(
        (line) => line.technicianId !== technician.id
      );
    }

    // Create new route
    const polyline = new google.maps.Polyline({
      path: [startPosition, endPosition],
      geodesic: true,
      strokeColor: "#FF6B35",
      strokeOpacity: 1.0,
      strokeWeight: 3,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          },
          offset: "50%",
          repeat: "100px",
        },
      ],
    });

    polyline.setMap(mapInstanceRef.current);

    routeLinesRef.current.push({
      polyline,
      technicianId: technician.id,
    });

    setEnRouteTechnicians((prev) => new Set(prev).add(technician.id));

    // Fit map to show the entire route
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(startPosition);
    bounds.extend(endPosition);
    mapInstanceRef.current.fitBounds(bounds);
  };

  // Get technician's assigned jobs
  const getTechnicianJobs = (technicianId: string) => {
    return jobs.filter((job) =>
      job.job_technicians?.some((jt: any) => jt.technician_id === technicianId)
    );
  };

  // Function to update technician location
  const updateTechnicianLocation = async (
    technicianId: string,
    latitude: number,
    longitude: number
  ) => {
    if (!supabase) return;

    try {
      const { error } = await supabase.from("technician_locations").upsert({
        tech_id: technicianId,
        latitude,
        longitude,
      });

      if (error) throw error;

      // Refresh technicians to get updated location
      setTechnicians((prev) =>
        prev.map((tech) =>
          tech.id === technicianId
            ? {
                ...tech,
                technician_location: {
                  latitude,
                  longitude,
                  updated_at: new Date().toISOString(),
                },
                current_location: {
                  lat: latitude,
                  lng: longitude,
                  address: "Current Location",
                },
              }
            : tech
        )
      );
    } catch (err) {
      console.error("Error updating technician location:", err);
      setError("Failed to update location");
    }
  };

  // Function to get current user's location and update it automatically
  const updateCurrentUserLocation = async () => {
    if (!supabase || !currentUser) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await updateTechnicianLocation(
            currentUser.id,
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (error) => {
          console.log("Error getting current user location:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Map Components */}
      <CurrentLocationMarker
        currentUserLocation={currentUserLocation}
        mapInstance={mapInstanceRef.current}
      />

      <TechnicianMarkers
        technicians={technicians}
        mapInstance={mapInstanceRef.current}
        onTechnicianClick={handleTechnicianClick}
        onCheckInOut={handleCheckInOut}
      />

      <JobMarkers
        jobs={jobs}
        mapInstance={mapInstanceRef.current}
        onJobClick={(job) => {
          setSelectedJob(job);
          setShowJobSheet(true);
        }}
      />

      {/* Map Controls */}
      <MapControls
        showTechnicianPanel={showTechnicianPanel}
        showJobPanel={showJobPanel}
        trafficEnabled={trafficEnabled}
        showTopBar={showTopBar}
        onToggleTechnicianPanel={() => {
          setShowTechnicianPanel(!showTechnicianPanel);
          setShowJobPanel(false);
        }}
        onToggleJobPanel={() => {
          setShowJobPanel(!showJobPanel);
          setShowTechnicianPanel(false);
        }}
        onUpdateLocation={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setCurrentUserLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              },
              (error) => {
                console.log("Error getting location:", error);
              }
            );
          }
        }}
        onToggleMapType={toggleMapType}
        onToggleTraffic={toggleTraffic}
        onToggleTopBar={() => setShowTopBar(!showTopBar)}
      />

      {/* Technician Panel */}
      {showTechnicianPanel && (
        <TechnicianPanel
          technicians={technicians}
          onTechnicianClick={handleTechnicianClick}
          onClose={() => setShowTechnicianPanel(false)}
          onTechnicianCardClick={handleTechnicianCardClick}
        />
      )}

      {/* Job Panel */}
      {showJobPanel && (
        <JobPanel
          jobs={jobs}
          technicians={technicians}
          enRouteTechnicians={enRouteTechnicians}
          onNavigateToJob={handleNavigateToJob}
          onEnRouteToJob={handleEnRouteToJob}
          onClose={() => setShowJobPanel(false)}
        />
      )}

      {/* Technician Modal */}
      <TechnicianModal
        technician={selectedTechnician}
        isOpen={showTechnicianModal}
        enRouteTechnicians={enRouteTechnicians}
        onClose={() => setShowTechnicianModal(false)}
        onCheckInOut={handleCheckInOut}
        onEnRoute={handleEnRoute}
        onStartJob={handleStartJob}
        onEndJob={handleEndJob}
        getTechnicianJobs={getTechnicianJobs}
        onUpdateLocation={updateTechnicianLocation}
      />

      {/* Job Detail Sheet */}
      {showJobSheet && selectedJob && (
        <TechnicianJobDetailSheet
          job={selectedJob}
          onClose={() => setShowJobSheet(false)}
        />
      )}

      {/* Status Legend */}
      {showStatusLegend && (
        <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[140px]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Status Legend</h4>
            <button
              onClick={() => setShowStatusLegend(false)}
              className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
              title="Hide Legend"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>On Job</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>Offline</span>
            </div>
          </div>
        </div>
      )}

      {/* Show Legend Button (when hidden) */}
      {!showStatusLegend && (
        <div className="absolute bottom-4 left-4 z-20">
          <button
            onClick={() => setShowStatusLegend(true)}
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            title="Show Status Legend"
          >
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default TechnicianMap;
