import { useState, useEffect, useRef } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Loader } from "@googlemaps/js-api-loader";
import JobQueue from "../../components/dispatch/JobQueue";
import DispatchFilters from "../../components/dispatch/DispatchFilters";
import TechnicianScheduleMobile from "../components/schedule/TechnicianScheduleMobile";
import TechnicianJobDetailSheet from "../components/jobs/TechnicianJobDetailSheet";
import TechnicianRescheduleModal from "../components/jobs/TechnicianRescheduleModal";
import TechnicianReassignModal from "../components/jobs/TechnicianReassignModal";
import {
  Minimize,
  Maximize,
  Layers,
  Car,
  RotateCw,
  Menu,
  Calendar,
  Plus,
} from "lucide-react";
import { useMediaQuery } from "react-responsive";
import { Dialog } from "@headlessui/react";

const TechnicianMap = () => {
  const { supabase } = useSupabase();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("job_type");
  const [filterJobType, setFilterJobType] = useState("all");
  const [filterZipCode, setFilterZipCode] = useState("");
  const [showJobQueue, setShowJobQueue] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [mapType, setMapType] = useState<string>("roadmap");
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all technicians
  useEffect(() => {
    const fetchTechs = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, first_name, last_name")
          .eq("role", "technician")
          .eq("status", "active")
          .order("first_name");
        if (error) throw error;
        setTechnicians(data || []);
      } catch (err) {
        setError("Failed to load technicians");
      }
    };
    fetchTechs();
  }, [supabase]);

  // Fetch all jobs (not just for the selected day)
  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(
            `*,
              job_technicians:job_technicians!inner (
                technician_id, is_primary, users:technician_id (first_name, last_name)
              ),
              locations (name, zip, address, city, state),
              job_units:job_units!inner (
                unit_id,
                units:unit_id (id, unit_number)
              )
            `
          )
          .order("schedule_start");
        if (error) throw error;
        // Flatten units
        const jobsWithUnits = (data || []).map((job: any) => ({
          ...job,
          units: (job.job_units || []).map((ju: any) => ju.units),
        }));
        setJobs(jobsWithUnits);
      } catch (err) {
        setError("Failed to load jobs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, [supabase]);

  // Map logic (initialize, update markers, etc.)
  useEffect(() => {
    let isMounted = true;
    const initMap = async () => {
      if (!mapRef.current) return;
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "routes", "marker"],
        });
        const google = await loader.load();
        if (mapRef.current && isMounted) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: 33.749, lng: -84.388 },
            zoom: 11,
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
          mapInstanceRef.current = mapInstance;
        }
      } catch (error) {
        setError("Failed to load map");
      }
    };
    initMap();
    return () => {
      isMounted = false;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [mapType]);

  // --- Handlers for map controls ---
  const toggleMapType = () => {
    if (!mapInstanceRef.current) return;
    const newMapType = mapType === "roadmap" ? "satellite" : "roadmap";
    setMapType(newMapType);
    mapInstanceRef.current.setMapTypeId(newMapType as google.maps.MapTypeId);
  };
  const toggleTraffic = () => {
    setTrafficEnabled(!trafficEnabled);
    // ...traffic layer logic
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // --- Drag-and-drop handlers for schedule grid ---
  const handleJobScheduleUpdate = async (
    jobId: string,
    technicianId: string,
    newTime: string
  ) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      await supabase
        .from("jobs")
        .update({ schedule_start: newTime })
        .eq("id", jobId);
      const job = jobs.find((j) => j.id === jobId);
      if (
        job &&
        !job.job_technicians.some(
          (jt: any) => jt.technician_id === technicianId
        )
      ) {
        await supabase.from("job_technicians").delete().eq("job_id", jobId);
        await supabase.from("job_technicians").insert({
          job_id: jobId,
          technician_id: technicianId,
          is_primary: true,
        });
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, schedule_start: newTime } : j
        )
      );
    } catch (err) {
      setError("Failed to update job schedule");
    } finally {
      setIsLoading(false);
    }
  };
  const handleJobReassign = async (
    jobId: string,
    fromTechId: string,
    toTechId: string
  ) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      await supabase
        .from("job_technicians")
        .delete()
        .eq("job_id", jobId)
        .eq("technician_id", fromTechId);
      await supabase
        .from("job_technicians")
        .insert({ job_id: jobId, technician_id: toTechId, is_primary: true });
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                job_technicians: [
                  {
                    technician_id: toTechId,
                    is_primary: true,
                    users: { first_name: "", last_name: "" },
                  },
                ],
              }
            : j
        )
      );
    } catch (err) {
      setError("Failed to reassign job");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Job click handler ---
  const handleJobClick = (job: any) => {
    setSelectedJob(job);
    setShowJobSheet(true);
  };

  // --- Job queue filtering ---
  const filteredJobs = jobs.filter((job) => {
    if (filterJobType !== "all" && job.type !== filterJobType) return false;
    if (filterZipCode && job.locations?.zip !== filterZipCode) return false;
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.locations?.name?.toLowerCase().includes(searchLower) ||
      job.locations?.address?.toLowerCase().includes(searchLower) ||
      job.locations?.city?.toLowerCase().includes(searchLower)
    );
  });

  // --- Layout ---
  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-2 py-2 gap-2">
        <button
          className="md:hidden btn btn-secondary"
          onClick={() => setShowJobQueue((v) => !v)}
        >
          <Menu size={20} />
        </button>
        <span className="font-bold text-lg md:text-xl flex-1 text-center md:text-left">
          Airl... Technician
        </span>
        {isMobile ? (
          <button
            className="btn btn-secondary"
            onClick={() => setShowFilters(true)}
          >
            Filters
          </button>
        ) : (
          <DispatchFilters
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            sortBy={sortBy as any}
            onSortChange={setSortBy}
            filterJobType={filterJobType}
            onJobTypeFilterChange={setFilterJobType}
            filterZipCode={filterZipCode}
            onZipCodeFilterChange={setFilterZipCode}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            dragModeActive={false}
            onActivateDragMode={() => setShowSchedule(true)}
            onCancelDragMode={() => setShowSchedule(false)}
            jobsByDate={{}}
          />
        )}
        <div className="flex gap-2 md:hidden">
          <button
            className="btn btn-primary"
            onClick={() => setShowSchedule((v) => !v)}
          >
            <Calendar size={18} className="mr-1" />
            Schedule
          </button>
          <button className="btn btn-primary" onClick={() => {}}>
            <Plus size={18} className="mr-1" />
            Add Job
          </button>
        </div>
      </div>
      {/* Filters Modal for Mobile */}
      {isMobile && (
        <Dialog
          open={showFilters}
          onClose={() => setShowFilters(false)}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm mx-auto p-4">
            <DispatchFilters
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              sortBy={sortBy as any}
              onSortChange={setSortBy}
              filterJobType={filterJobType}
              onJobTypeFilterChange={setFilterJobType}
              filterZipCode={filterZipCode}
              onZipCodeFilterChange={setFilterZipCode}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              dragModeActive={false}
              onActivateDragMode={() => setShowSchedule(true)}
              onCancelDragMode={() => setShowSchedule(false)}
              jobsByDate={{}}
            />
            <button
              className="btn btn-secondary w-full mt-4"
              onClick={() => setShowFilters(false)}
            >
              Close
            </button>
          </div>
        </Dialog>
      )}
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Job Queue Drawer (mobile full screen) */}
        <div
          className={`fixed z-40 top-0 left-0 h-full ${
            isMobile ? "w-full" : "w-80"
          } bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 ${
            showJobQueue
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }`}
        >
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-lg">Job Queue</span>
              <button
                className="btn btn-secondary"
                onClick={() => setShowJobQueue(false)}
              >
                Close
              </button>
            </div>
          )}
          <JobQueue
            jobs={filteredJobs}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onJobDragStart={() => {}}
            onJobDragEnd={() => {}}
            onJobClick={(jobId) => {
              const job = jobs.find((j) => j.id === jobId);
              if (job) handleJobClick(job);
            }}
            selectedJobId={selectedJob?.id || null}
            getJobTypeColorClass={() => ""}
            closeDrawer={isMobile ? () => setShowJobQueue(false) : undefined}
          />
        </div>
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0 h-full w-full z-0" />
          {/* Map Controls - FAB group for mobile, vertical for desktop */}
          {isMobile ? (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-4 bg-white rounded-full shadow-lg px-4 py-2 border border-gray-200">
              <button
                onClick={toggleMapType}
                className="p-2 rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none"
                aria-label={
                  mapType === "roadmap"
                    ? "Switch to Satellite"
                    : "Switch to Map"
                }
              >
                <Layers size={22} />
              </button>
              <button
                onClick={toggleTraffic}
                className={`p-2 rounded-full focus:outline-none ${
                  trafficEnabled
                    ? "bg-primary-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                aria-label={trafficEnabled ? "Hide Traffic" : "Show Traffic"}
              >
                <Car size={22} />
              </button>
              <button
                onClick={() => {}}
                className="p-2 rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none"
                aria-label="Recalculate Route"
              >
                <RotateCw size={22} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none"
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
              </button>
            </div>
          ) : (
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button
                onClick={toggleMapType}
                className="p-3 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
                title={
                  mapType === "roadmap"
                    ? "Switch to Satellite"
                    : "Switch to Map"
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
                onClick={() => {}}
                className="p-3 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
                title="Recalculate Route"
              >
                <RotateCw size={20} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-3 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          )}
        </div>
        {/* Technician Schedule Drawer (mobile full screen modal) */}
        <div
          className={`fixed z-40 bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg transition-transform duration-300 ${
            isMobile ? "h-full" : ""
          } ${
            showSchedule ? "translate-y-0" : "translate-y-full md:translate-y-0"
          }`}
          style={isMobile ? { minHeight: "100vh" } : { minHeight: 320 }}
        >
          <div className="flex items-center justify-between p-4 border-b md:hidden">
            <span className="font-bold text-lg">Schedule</span>
            <button
              className="btn btn-secondary"
              onClick={() => setShowSchedule(false)}
            >
              Close
            </button>
          </div>
          <TechnicianScheduleMobile
            technicians={technicians}
            jobs={jobs}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onJobScheduleUpdate={handleJobScheduleUpdate}
            onJobReassign={handleJobReassign}
            onJobClick={handleJobClick}
          />
        </div>
      </div>
      {/* Job Detail Sheet */}
      {showJobSheet && selectedJob && (
        <TechnicianJobDetailSheet
          job={selectedJob}
          onClose={() => setShowJobSheet(false)}
        />
      )}
      {/* Reschedule Modal */}
      <TechnicianRescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onSave={() => {}}
        initialDate={selectedJob?.schedule_start}
      />
      {/* Reassign Modal */}
      <TechnicianReassignModal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onSave={() => {}}
        currentTechnicianId={""}
      />
    </div>
  );
};

export default TechnicianMap;
