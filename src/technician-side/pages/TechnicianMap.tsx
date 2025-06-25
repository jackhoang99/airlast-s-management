import { useState, useEffect, useRef } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { useLocation, Link } from "react-router-dom";
import { Loader } from "@googlemaps/js-api-loader";
import {
  MapPin,
  Calendar,
  Clock,
  Navigation,
  List,
  Search,
  ArrowLeft,
  Briefcase,
  AlertTriangle,
  Phone,
  Mail,
  Layers,
  Car,
  RotateCw,
  Compass,
  Maximize,
  Minimize,
  User,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

const TechnicianMap = () => {
  const { supabase } = useSupabase();
  const location = useLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapInitializing, setIsMapInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianLocation, setTechnicianLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showJobsList, setShowJobsList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null);
  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<string | null>(
    null
  );
  const [mapType, setMapType] = useState<string>("roadmap");
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [watchPositionId, setWatchPositionId] = useState<number | null>(null);
  const [directionsSteps, setDirectionsSteps] = useState<
    google.maps.DirectionsStep[]
  >([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<string | null>(null);
  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

  // Parse jobId from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const jobId = searchParams.get("jobId");
    if (jobId) {
      setSelectedJobId(jobId);
    }
  }, [location]);

  // Get technician ID
  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;

      try {
        // Get username from session storage
        const username = sessionStorage.getItem("techUsername");

        if (username) {
          console.log("Looking up technician with username:", username);

          // Try to find user by username
          const { data, error } = await supabase
            .from("users")
            .select("id, role")
            .eq("username", username)
            .maybeSingle();

          if (error && !error.message.includes("contains 0 rows")) {
            console.error("Error fetching technician by username:", error);
            throw error;
          }

          if (data) {
            console.log("Found technician by username:", data);
            setTechnicianId(data.id);
          } else {
            // Try with email format
            const email = `${username}@airlast-demo.com`;
            console.log("Trying with email:", email);

            const { data: emailData, error: emailError } = await supabase
              .from("users")
              .select("id, role")
              .eq("email", email)
              .maybeSingle();

            if (emailError && !emailError.message.includes("contains 0 rows")) {
              console.error("Error fetching technician by email:", emailError);
              throw emailError;
            }

            if (emailData) {
              console.log("Found technician by email:", emailData);
              setTechnicianId(emailData.id);
            } else {
              console.error("Could not find technician with username or email");
              setError("Could not find technician record");
            }
          }
        } else {
          // Fallback to auth user if username not in session
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            console.log("Looking up technician with auth user:", user.email);

            // Try to find by email
            const { data, error } = await supabase
              .from("users")
              .select("id, username, role")
              .eq("email", user.email)
              .maybeSingle();

            if (error && !error.message.includes("contains 0 rows")) {
              console.error("Error fetching technician by email:", error);
              throw error;
            }

            if (data) {
              console.log("Found technician by email:", data);
              setTechnicianId(data.id);
              sessionStorage.setItem("techUsername", data.username);
            } else {
              // Try with username from email
              const username = user.email.split("@")[0];
              console.log("Trying with username from email:", username);

              const { data: usernameData, error: usernameError } =
                await supabase
                  .from("users")
                  .select("id, role")
                  .eq("username", username)
                  .maybeSingle();

              if (
                usernameError &&
                !usernameError.message.includes("contains 0 rows")
              ) {
                console.error(
                  "Error fetching technician by username from email:",
                  usernameError
                );
                throw usernameError;
              }

              if (usernameData) {
                console.log(
                  "Found technician by username from email:",
                  usernameData
                );
                setTechnicianId(usernameData.id);
                sessionStorage.setItem("techUsername", username);
              } else {
                console.error("Could not find technician with any method");
                setError("Could not find technician record");
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching technician info:", err);
        setError("Failed to load technician information");
      }
    };

    fetchTechnicianInfo();
  }, [supabase]);

  // Get technician's current location
  useEffect(() => {
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTechnicianLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Atlanta if location access is denied
          setTechnicianLocation({ lat: 33.7489954, lng: -84.3902397 });
        }
      );

      // Set up continuous location tracking
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setTechnicianLocation(newLocation);

          // If we're navigating, update the route
          if (
            isNavigating &&
            map &&
            directionsService &&
            directionsRenderer &&
            selectedJobId
          ) {
            const selectedJob = jobs.find((job) => job.id === selectedJobId);
            if (
              selectedJob &&
              selectedJob.locations?.lat &&
              selectedJob.locations?.lng
            ) {
              updateRoute(newLocation, {
                lat: selectedJob.locations.lat,
                lng: selectedJob.locations.lng,
              });
            }
          }
        },
        (error) => {
          console.error("Error watching position:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000,
        }
      );

      setWatchPositionId(watchId);

      // Clean up watch position on unmount
      return () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    } else {
      // Default to Atlanta if geolocation is not supported
      setTechnicianLocation({ lat: 33.7489954, lng: -84.3902397 });
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!technicianLocation || !mapRef.current) return;

      try {
        setIsMapInitializing(true);

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "routes"],
        });

        const google = await loader.load();
        setGoogleMaps(google.maps);

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: technicianLocation,
          zoom: 12,
          mapTypeId: mapType as google.maps.MapTypeId,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP,
          },
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        setMap(mapInstance);

        // Add marker for technician's location
        const techMarker = new google.maps.Marker({
          position: technicianLocation,
          map: mapInstance,
          title: "Your Location",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#4f46e5",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
            scale: 10,
          },
        });

        // Initialize directions service and renderer
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#4f46e5",
            strokeWeight: 5,
          },
        });

        setDirectionsService(directionsService);
        setDirectionsRenderer(directionsRenderer);

        // Enable traffic layer if selected
        if (trafficEnabled) {
          const trafficLayer = new google.maps.TrafficLayer();
          trafficLayer.setMap(mapInstance);
        }

        // If jobs are already loaded, update markers
        if (jobs.length > 0) {
          updateMapMarkers(jobs);
        }
      } catch (error) {
        console.error("Error initializing map:", error);
        setError(
          "Failed to load map. Please check your internet connection and try again."
        );
      } finally {
        setIsMapInitializing(false);
      }
    };

    if (technicianLocation && mapRef.current) {
      initMap();
    }
  }, [technicianLocation, mapType, trafficEnabled]);

  // Fetch jobs assigned to technician
  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase || !technicianId) return;

      try {
        // Fetch jobs assigned to this technician
        const { data: jobTechData, error: jobTechError } = await supabase
          .from("job_technicians")
          .select("job_id")
          .eq("technician_id", technicianId);

        if (jobTechError) throw jobTechError;

        const jobIds = jobTechData.map((jt) => jt.job_id);

        if (jobIds.length === 0) {
          setJobs([]);
          setIsLoading(false);
          return;
        }

        // Fetch job details
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(
            `
            *,
            locations (
              name,
              address,
              city,
              state,
              zip
            ),
            units (
              unit_number
            )
          `
          )
          .in("id", jobIds)
          .neq("status", "completed")
          .neq("status", "cancelled")
          .order("schedule_start");

        if (jobsError) throw jobsError;

        // Process jobs to add geocoded locations
        const jobsWithCoordinates = await Promise.all(
          jobsData.map(async (job) => {
            if (job.locations) {
              const { lat, lng } = await geocodeAddress(
                `${job.locations.address}, ${job.locations.city}, ${job.locations.state} ${job.locations.zip}`
              );
              return {
                ...job,
                locations: {
                  ...job.locations,
                  lat,
                  lng,
                },
              };
            }
            return job;
          })
        );

        setJobs(jobsWithCoordinates);

        // Update map markers if map is already initialized
        if (map) {
          updateMapMarkers(jobsWithCoordinates);
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load job information");
      } finally {
        setIsLoading(false);
      }
    };

    if (technicianId) {
      fetchJobs();
    }
  }, [supabase, technicianId, map]);

  // Update map markers when selectedJobId changes
  useEffect(() => {
    if (map && jobs.length > 0 && selectedJobId) {
      const selectedJob = jobs.find((job) => job.id === selectedJobId);
      if (
        selectedJob &&
        selectedJob.locations?.lat &&
        selectedJob.locations?.lng
      ) {
        map.setCenter({
          lat: selectedJob.locations.lat,
          lng: selectedJob.locations.lng,
        });
        map.setZoom(15);

        // Calculate route if technician location is available
        if (technicianLocation && directionsService && directionsRenderer) {
          calculateRoute(technicianLocation, {
            lat: selectedJob.locations.lat,
            lng: selectedJob.locations.lng,
          });
        }
      }
    }
  }, [
    selectedJobId,
    map,
    jobs,
    technicianLocation,
    directionsService,
    directionsRenderer,
  ]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const geocodeAddress = async (
    address: string
  ): Promise<{ lat: number; lng: number }> => {
    // This is a mock geocoding function since we don't have a real geocoding service
    // In a real application, you would use Google's Geocoding API or similar

    // Generate a random point near Atlanta for demo purposes
    const atlantaLat = 33.7489954;
    const atlantaLng = -84.3902397;

    // Random offset within ~5 miles
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;

    return {
      lat: atlantaLat + latOffset,
      lng: atlantaLng + lngOffset,
    };
  };

  const updateMapMarkers = (jobsToMark: any[]) => {
    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    if (!map || !googleMaps) return;

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    // Add technician's location to bounds
    if (technicianLocation) {
      bounds.extend(technicianLocation);

      // Add technician marker
      const techMarker = new google.maps.Marker({
        position: technicianLocation,
        map,
        title: "Your Location",
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          fillColor: "#4f46e5",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#FFFFFF",
          scale: 10,
        },
      });

      newMarkers.push(techMarker);
    }

    jobsToMark.forEach((job) => {
      if (job.locations?.lat && job.locations?.lng) {
        const position = { lat: job.locations.lat, lng: job.locations.lng };

        // Create marker
        const marker = new google.maps.Marker({
          position,
          map,
          title: job.name,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            fillColor:
              job.id === selectedJobId
                ? "#ef4444"
                : getJobStatusColor(job.status),
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: "#FFFFFF",
            scale: job.id === selectedJobId ? 10 : 8,
          },
        });

        // Create info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="max-width: 200px;">
              <h3 style="margin: 0; font-size: 14px; font-weight: 600;">${
                job.name
              }</h3>
              <p style="margin: 4px 0; font-size: 12px;">
                ${job.locations?.address}<br>
                ${job.locations?.city}, ${job.locations?.state} ${
            job.locations?.zip
          }
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Status:</strong> ${job.status}<br>
                <strong>Type:</strong> ${job.type}<br>
                ${
                  job.schedule_start
                    ? `<strong>Scheduled:</strong> ${formatDateTime(
                        job.schedule_start
                      )}<br>`
                    : ""
                }
              </p>
              <a href="/tech/jobs/${
                job.id
              }" style="color: #0672be; font-size: 12px; text-decoration: none;">View Job Details</a>
            </div>
          `,
        });

        // Add click listener
        marker.addListener("click", () => {
          infoWindow.open(map, marker);
          setSelectedJobId(job.id);
        });

        newMarkers.push(marker);
        bounds.extend(position);
      }
    });

    setMarkers(newMarkers);

    // Adjust map to fit all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);

      // Don't zoom in too far
      const listener = googleMaps.event.addListener(map, "idle", () => {
        if (map.getZoom() > 15) {
          map.setZoom(15);
        }
        googleMaps.event.removeListener(listener);
      });
    }
  };

  const calculateRoute = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    if (!directionsService || !directionsRenderer || !googleMaps) return;

    setIsNavigating(true);
    setIsRecalculating(true);

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: googleMaps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: googleMaps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        setIsRecalculating(false);

        if (status === googleMaps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);

          // Get estimated time and distance
          const route = result.routes[0];
          if (route && route.legs.length > 0) {
            setEstimatedTime(route.legs[0].duration?.text || null);
            setEstimatedDistance(route.legs[0].distance?.text || null);

            // Calculate arrival time
            if (route.legs[0].duration) {
              const now = new Date();
              const arrivalDate = new Date(
                now.getTime() + route.legs[0].duration.value * 1000
              );
              setArrivalTime(
                arrivalDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );
            }

            // Get directions steps
            if (route.legs[0].steps) {
              setDirectionsSteps(route.legs[0].steps);
              setCurrentStepIndex(0);
            }
          }
        } else {
          console.error("Directions request failed:", status);
          setError("Failed to calculate route. Please try again.");
          setIsNavigating(false);
        }
      }
    );
  };

  const updateRoute = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    if (!directionsService || !directionsRenderer || !googleMaps) return;

    setIsRecalculating(true);

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: googleMaps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: googleMaps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        setIsRecalculating(false);

        if (status === googleMaps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);

          // Get estimated time and distance
          const route = result.routes[0];
          if (route && route.legs.length > 0) {
            setEstimatedTime(route.legs[0].duration?.text || null);
            setEstimatedDistance(route.legs[0].distance?.text || null);

            // Calculate arrival time
            if (route.legs[0].duration) {
              const now = new Date();
              const arrivalDate = new Date(
                now.getTime() + route.legs[0].duration.value * 1000
              );
              setArrivalTime(
                arrivalDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );
            }

            // Get directions steps
            if (route.legs[0].steps) {
              setDirectionsSteps(route.legs[0].steps);
            }
          }
        }
      }
    );
  };

  const clearRoute = () => {
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
    }
    setIsNavigating(false);
    setEstimatedTime(null);
    setEstimatedDistance(null);
    setDirectionsSteps([]);
    setShowDirections(false);
  };

  const recalculateRoute = () => {
    if (!technicianLocation || !selectedJobId) return;

    const selectedJob = jobs.find((job) => job.id === selectedJobId);
    if (
      selectedJob &&
      selectedJob.locations?.lat &&
      selectedJob.locations?.lng
    ) {
      calculateRoute(technicianLocation, {
        lat: selectedJob.locations.lat,
        lng: selectedJob.locations.lng,
      });
    }
  };

  const toggleMapType = () => {
    if (!map || !googleMaps) return;

    const newMapType = mapType === "roadmap" ? "satellite" : "roadmap";
    setMapType(newMapType);
    map.setMapTypeId(newMapType as google.maps.MapTypeId);
  };

  const toggleTraffic = () => {
    setTrafficEnabled(!trafficEnabled);

    if (map && googleMaps) {
      if (!trafficEnabled) {
        const trafficLayer = new googleMaps.TrafficLayer();
        trafficLayer.setMap(map);
      } else {
        // This effectively removes the traffic layer
        new googleMaps.TrafficLayer().setMap(null);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getJobStatusColor = (status: string): string => {
    switch (status) {
      case "scheduled":
        return "#3b82f6"; // blue
      case "unscheduled":
        return "#f59e0b"; // amber
      case "completed":
        return "#10b981"; // green
      case "cancelled":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format HTML instructions to plain text
  const formatInstructions = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.number.toLowerCase().includes(searchLower) ||
      (job.locations?.name &&
        job.locations.name.toLowerCase().includes(searchLower)) ||
      (job.locations?.address &&
        job.locations.address.toLowerCase().includes(searchLower)) ||
      (job.locations?.city &&
        job.locations.city.toLowerCase().includes(searchLower))
    );
  });

  const handleNavigateToJob = (job: any) => {
    if (!technicianLocation || !job.locations?.lat || !job.locations?.lng)
      return;

    calculateRoute(technicianLocation, {
      lat: job.locations.lat,
      lng: job.locations.lng,
    });
  };

  const nextStep = () => {
    if (currentStepIndex < directionsSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? "fullscreen" : ""}`}>
      {/* Search bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 input w-full"
          />
        </div>
        <button
          onClick={() => setShowJobsList(!showJobsList)}
          className="btn btn-secondary"
        >
          <List size={16} className="mr-2" />
          {showJobsList ? "Hide List" : "Show List"}
        </button>
        <button
          onClick={toggleFullscreen}
          className="btn btn-secondary"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>

      {/* Map and job list container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map */}
        <div
          className={`flex-1 bg-gray-100 relative ${
            showJobsList ? "hidden md:block" : ""
          }`}
        >
          {/* Always render the map container */}
          <div id="map" ref={mapRef} className="h-full w-full"></div>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
              <div className="bg-white p-4 rounded-lg shadow text-center">
                <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-3" />
                <p className="text-error-600 font-medium">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 btn btn-primary"
                >
                  Reload Page
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              onClick={toggleMapType}
              className="p-3 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
              title={
                mapType === "roadmap" ? "Switch to Satellite" : "Switch to Map"
              }
            >
              <Layers size={20} />
            </button>
            <button
              onClick={toggleTraffic}
              className={`p-3 rounded-full shadow-md ${
                trafficEnabled
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title={trafficEnabled ? "Hide Traffic" : "Show Traffic"}
            >
              <Car size={20} />
            </button>
            <button
              onClick={recalculateRoute}
              className="p-3 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
              title="Recalculate Route"
              disabled={!selectedJobId}
            >
              <RotateCw size={20} />
            </button>
          </div>

          {/* Recalculating indicator */}
          {isRecalculating && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Recalculating...
            </div>
          )}

          {/* Compass */}
          <div className="absolute bottom-40 right-4 p-3 bg-white rounded-full shadow-md">
            <Compass size={24} className="text-primary-600" />
          </div>

          {/* Directions Panel - Slide up from bottom when showing directions */}
          {showDirections && directionsSteps.length > 0 && (
            <div className="absolute left-0 right-0 bottom-32 max-h-[50vh] bg-white shadow-lg border-t border-gray-200 overflow-y-auto z-20 animate-slide-up">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                <h3 className="font-medium">Turn-by-Turn Directions</h3>
                <button
                  onClick={() => setShowDirections(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {directionsSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        index === currentStepIndex
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === currentStepIndex
                              ? "bg-primary-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p
                            className={`${
                              index === currentStepIndex ? "font-medium" : ""
                            }`}
                          >
                            {formatInstructions(step.instructions)}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {step.distance?.text || ""} •{" "}
                            {step.duration?.text || ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Job list */}
        {showJobsList && (
          <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-medium flex items-center">
                <Briefcase size={16} className="mr-2 text-primary-600" />
                Jobs ({filteredJobs.length})
              </h2>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No jobs found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      selectedJobId === job.id
                        ? "bg-primary-50 border-l-4 border-primary-500"
                        : ""
                    }`}
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{job.name}</h3>
                        <p className="text-sm text-gray-500">
                          {job.locations?.name}
                          {job.units ? ` • Unit ${job.units.unit_number}` : ""}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <MapPin size={12} className="mr-1" />
                          <span>
                            {job.locations?.address}, {job.locations?.city}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-xs text-gray-600">
                          <Calendar size={12} className="mr-1" />
                          {job.schedule_start
                            ? formatDateTime(job.schedule_start).split(",")[0]
                            : "Unscheduled"}
                        </div>
                        {job.schedule_start && (
                          <div className="flex items-center text-xs text-gray-600 mt-1">
                            <Clock size={12} className="mr-1" />
                            {new Date(job.schedule_start).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full
                        ${
                          job.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : job.status === "unscheduled"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {job.status}
                      </span>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToJob(job);
                          }}
                          className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full flex items-center"
                        >
                          <Navigation size={10} className="mr-1" />
                          Navigate
                        </button>

                        <Link
                          to={`/tech/jobs/${job.id}`}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Job Bottom Sheet */}
      {selectedJobId && !showJobsList && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 rounded-t-lg shadow-lg p-4">
          {(() => {
            const job = jobs.find((j) => j.id === selectedJobId);
            if (!job) return null;

            return (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{job.name}</h3>
                    <p className="text-sm text-gray-500">
                      {job.locations?.name}
                      {job.units ? ` • Unit ${job.units.unit_number}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJobId(null);
                      clearRoute();
                    }}
                    className="text-gray-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* ETA and Distance */}
                {isNavigating && estimatedTime && estimatedDistance && (
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="text-sm text-gray-500">
                        Estimated arrival
                      </div>
                      <div className="text-lg font-bold">
                        {arrivalTime || "--:--"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Distance</div>
                      <div className="text-lg font-bold">
                        {estimatedDistance}
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Step */}
                {directionsSteps.length > 0 && (
                  <div className="bg-primary-50 p-3 rounded-lg border border-primary-100 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center">
                          {currentStepIndex + 1}
                        </div>
                        <div className="font-medium">
                          {formatInstructions(
                            directionsSteps[currentStepIndex].instructions
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-primary-700">
                        {directionsSteps[currentStepIndex].distance?.text || ""}
                      </div>
                    </div>

                    {/* Step navigation */}
                    <div className="flex justify-between mt-3">
                      <button
                        onClick={prevStep}
                        disabled={currentStepIndex === 0}
                        className={`p-2 rounded ${
                          currentStepIndex === 0
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-primary-600 hover:bg-primary-100"
                        }`}
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <button
                        onClick={() => setShowDirections(!showDirections)}
                        className="text-primary-600 text-sm font-medium"
                      >
                        {showDirections ? "Hide All Steps" : "View All Steps"}
                      </button>
                      <button
                        onClick={nextStep}
                        disabled={
                          currentStepIndex === directionsSteps.length - 1
                        }
                        className={`p-2 rounded ${
                          currentStepIndex === directionsSteps.length - 1
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-primary-600 hover:bg-primary-100"
                        }`}
                      >
                        <ChevronDown size={20} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {job.contact_phone && (
                    <a
                      href={`tel:${job.contact_phone}`}
                      className="btn btn-secondary flex-1"
                    >
                      <Phone size={16} className="mr-2" />
                      Call
                    </a>
                  )}

                  <button
                    onClick={recalculateRoute}
                    className="btn btn-secondary flex-1"
                  >
                    <RotateCw size={16} className="mr-2" />
                    Recalculate
                  </button>

                  <Link
                    to={`/tech/jobs/${job.id}`}
                    className="btn btn-primary flex-1"
                  >
                    <Briefcase size={16} className="mr-2" />
                    View Job
                  </Link>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default TechnicianMap;
