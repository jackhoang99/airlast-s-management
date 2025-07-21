import { useState, useEffect, useRef } from "react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import JobQueue from "../components/dispatch/JobQueue";
import TechnicianSchedule from "../components/dispatch/TechnicianSchedule";
import DispatchFilters from "../components/dispatch/DispatchFilters";
import JobTypeLegend from "../components/dispatch/JobTypeLegend";
import DispatchMap from "../components/dispatch/DispatchMap";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import QuickAssetViewModal from "../components/locations/QuickAssetViewModal";
import { Link } from "react-router-dom";

type User = Database["public"]["Tables"]["users"]["Row"];

type Job = Database["public"]["Tables"]["jobs"]["Row"] & {
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  };
  units?: {
    unit_number: string;
  }[];
  job_technicians?: {
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
    };
  }[];
};

const DispatchSchedule = () => {
  const { supabase } = useSupabase();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<{
    type: "column" | "technician";
    id: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragModeActive, setDragModeActive] = useState(false);
  const [selectedJobToDrag, setSelectedJobToDrag] = useState<string | null>(
    null
  );

  // Filter states
  const [sortBy, setSortBy] = useState<"job_type" | "zip_code" | "date">(
    "job_type"
  );
  const [filterJobType, setFilterJobType] = useState<string>("all");
  const [filterZipCode, setFilterZipCode] = useState<string>("");

  const [directionsSteps, setDirectionsSteps] = useState<
    google.maps.DirectionsStep[]
  >([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<string | null>(null);
  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

  // Job modal state
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<Job | null>(
    null
  );
  const [isDraggingEnabled, setIsDraggingEnabled] = useState<string | null>(
    null
  );

  // Parse jobId from URL query parameters
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;

      try {
        // Fetch technicians
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", "technician")
          .eq("status", "active")
          .order("first_name");

        if (error) throw error;
        setTechnicians(data || []);

        // Fetch jobs
        await fetchJobs();
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, filterJobType, filterZipCode, sortBy]);

  // Create a separate function to fetch jobs that can be called from drag handlers
  const fetchJobs = async () => {
    if (!supabase) return;

    try {
      // Fetch all jobs, not just assigned ones for dispatch view
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select(
          `
          *,
          locations (
            id,
            name,
            address,
            city,
            state,
            zip,
            company_id,
            companies (
              id,
              name
            )
          ),
          job_units:job_units!inner (
            unit_id,
            units:unit_id (
              id,
              unit_number
            )
          ),
          job_technicians (
            technician_id,
            is_primary,
            users:technician_id (
              first_name,
              last_name
            )
          )
        `
        )
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      // Process jobs to add geocoded locations and flatten units
      const jobsWithCoordinates = await Promise.all(
        (jobsData || []).map(async (job) => {
          let locations = job.locations;
          if (locations) {
            const { lat, lng } = await geocodeAddress(
              `${locations.address}, ${locations.city}, ${locations.state} ${locations.zip}`
            );
            locations = {
              ...locations,
              lat,
              lng,
            };
          }
          // Flatten units from job_units
          const units = (job.job_units || []).map((ju: any) => ju.units);
          return {
            ...job,
            locations,
            units,
          };
        })
      );

      // Apply filters
      let filteredJobs = jobsWithCoordinates;

      if (filterJobType !== "all") {
        filteredJobs = filteredJobs.filter((job) => job.type === filterJobType);
      }

      if (filterZipCode) {
        filteredJobs = filteredJobs.filter((job) =>
          job.locations?.zip?.includes(filterZipCode)
        );
      }

      // Sort jobs
      const sortedJobs = [...filteredJobs].sort((a, b) => {
        switch (sortBy) {
          case "job_type":
            return (a.type || "").localeCompare(b.type || "");
          case "zip_code":
            return (a.locations?.zip || "").localeCompare(
              b.locations?.zip || ""
            );
          case "date":
            return (
              new Date(a.schedule_start || a.created_at).getTime() -
              new Date(b.schedule_start || b.created_at).getTime()
            );
          default:
            return 0;
        }
      });

      setJobs(sortedJobs);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  const geocodeAddress = async (
    address: string
  ): Promise<{ lat: number; lng: number }> => {
    // Mock geocoding function for demo
    const atlantaLat = 33.7489954;
    const atlantaLng = -84.3902397;
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;

    return {
      lat: atlantaLat + latOffset,
      lng: atlantaLng + lngOffset,
    };
  };

  const getJobTypeColor = (type: string): string => {
    switch (type?.toLowerCase()) {
      case "preventative maintenance":
        return "#8b5cf6"; // purple
      case "service call":
        return "#06b6d4"; // cyan
      case "repair":
        return "#f59e0b"; // amber
      case "installation":
        return "#10b981"; // emerald
      case "inspection":
        return "#3b82f6"; // blue
      default:
        return "#6b7280"; // gray
    }
  };

  const getJobTypeColorClass = (type: string): string => {
    switch (type?.toLowerCase()) {
      case "preventative maintenance":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "service call":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "repair":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "installation":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "inspection":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Handler for when a drag starts (from JobQueue or TechnicianSchedule)
  const handleJobDragStart = (job: any, from: { type: string; id: string }) => {
    setDragModeActive(true);
    setSelectedJobToDrag(job.id);
    setDraggedJob(job);
    setDraggedFrom(from);
    setIsDragging(true);
  };

  const handleJobDrop = async (
    e: React.DragEvent,
    to: { type: "column" | "technician"; id: string }
  ) => {
    e.preventDefault();

    if (!draggedJob || !draggedFrom || !supabase) {
      setIsDragging(false);
      return;
    }

    try {
      if (to.type === "technician") {
        console.log(`Assigning job ${draggedJob.id} to technician ${to.id}`);

        // First, remove existing technician assignments for this job
        const { error: deleteError } = await supabase
          .from("job_technicians")
          .delete()
          .eq("job_id", draggedJob.id);

        if (deleteError) {
          console.error("Error removing existing assignments:", deleteError);
          throw deleteError;
        }
        // Add new technician assignment
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: draggedJob.id,
            technician_id: to.id,
            is_primary: true,
          });

        if (insertError) {
          console.error("Error assigning technician:", insertError);
          throw insertError;
        }

        // Update job status if needed
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ status: "scheduled" })
          .eq("id", draggedJob.id);

        if (updateError) {
          console.error("Error updating job status:", updateError);
          throw updateError;
        }

        console.log("Job assignment successful");

        // Refresh the jobs data to reflect changes
        await fetchJobs();
        setDragModeActive(false); // Exit drag mode after drop
      } else if (to.type === "column") {
        // Handle dropping job back to unassigned columns
        if (to.id === "unassigned") {
          console.log(`Unassigning job ${draggedJob.id}`);

          // Remove all technician assignments
          const { error: deleteError } = await supabase
            .from("job_technicians")
            .delete()
            .eq("job_id", draggedJob.id);

          if (deleteError) {
            console.error("Error unassigning job:", deleteError);
            throw deleteError;
          }

          // Update job status to unscheduled
          const { error: updateError } = await supabase
            .from("jobs")
            .update({ status: "unscheduled" })
            .eq("id", draggedJob.id);

          if (updateError) {
            console.error("Error updating job status:", updateError);
            throw updateError;
          }

          console.log("Job unassignment successful");

          // Refresh the jobs data to reflect changes
          await fetchJobs();
          setDragModeActive(false); // Exit drag mode after drop
        }
      }
    } catch (err) {
      console.error("Error updating job assignment:", err);
      // Show error to user
      alert("Failed to update job assignment. Please try again.");
    } finally {
      setDraggedJob(null);
      setDraggedFrom(null);
      setIsDragging(false);
    }
  };

  // Handler to activate drag mode from JobQueue
  const handleActivateDragMode = () => {
    setDragModeActive(true);
    setSelectedJobToDrag(null);
  };

  // Handler for selecting a job to drag
  const handleSelectJobToDrag = (jobId: string) => {
    setSelectedJobToDrag(jobId);
  };

  // Handler to deactivate drag mode after drag ends
  const handleJobDragEnd = () => {
    setIsDraggingEnabled(null);
    setDragModeActive(false);
    setSelectedJobToDrag(null);
    setDraggedJob(null);
    setDraggedFrom(null);
    setIsDragging(false);
  };

  const handleJobScheduleUpdate = async (
    jobId: string,
    technicianId: string,
    newScheduleTime: string
  ) => {
    if (!supabase) return;

    try {
      console.log(
        `Updating job ${jobId} schedule: technician ${technicianId}, time ${newScheduleTime}`
      );

      // First, remove existing technician assignments for this job
      const { error: deleteError } = await supabase
        .from("job_technicians")
        .delete()
        .eq("job_id", jobId);

      if (deleteError) {
        console.error("Error removing existing assignments:", deleteError);
        throw deleteError;
      }

      // Add new technician assignment
      const { error: insertError } = await supabase
        .from("job_technicians")
        .insert({
          job_id: jobId,
          technician_id: technicianId,
          is_primary: true,
        });

      if (insertError) {
        console.error("Error assigning technician:", insertError);
        throw insertError;
      }

      // Update job schedule time and status
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          schedule_start: newScheduleTime,
          status: "scheduled",
        })
        .eq("id", jobId);

      if (updateError) {
        console.error("Error updating job schedule:", updateError);
        throw updateError;
      }

      console.log("Job schedule update successful");

      // Refresh the jobs data to reflect changes
      await fetchJobs();
    } catch (err) {
      console.error("Error updating job schedule:", err);
      alert("Failed to update job schedule. Please try again.");
    }
  };

  // Handle job reassignment between technicians
  const handleJobReassign = async (
    jobId: string,
    fromTechId: string,
    toTechId: string,
    action: "switch" | "share"
  ) => {
    if (!supabase) return;

    try {
      console.log(
        `${
          action === "switch" ? "Switching" : "Sharing"
        } job ${jobId} from ${fromTechId} to ${toTechId}`
      );

      if (action === "switch") {
        // Remove existing technician assignments for this job
        const { error: deleteError } = await supabase
          .from("job_technicians")
          .delete()
          .eq("job_id", jobId);

        if (deleteError) {
          console.error("Error removing existing assignments:", deleteError);
          throw deleteError;
        }

        // Add new technician assignment
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: jobId,
            technician_id: toTechId,
            is_primary: true,
          });

        if (insertError) {
          console.error("Error assigning new technician:", insertError);
          throw insertError;
        }
      } else if (action === "share") {
        // Add the new technician while keeping the existing one
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: jobId,
            technician_id: toTechId,
            is_primary: false, // New technician is not primary
          });

        if (insertError) {
          console.error("Error sharing job with technician:", insertError);
          throw insertError;
        }
      }

      console.log("Job reassignment successful");

      // Refresh the jobs data to reflect changes
      await fetchJobs();
    } catch (err) {
      console.error("Error reassigning job:", err);
      alert("Failed to reassign job. Please try again.");
    }
  };
  const handleJobClick = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      // If the job has a schedule_start, move the calendar to that date
      if (job.schedule_start) {
        const jobDate = new Date(job.schedule_start);
        // Only change the date if it's different from the current calendar date
        if (
          jobDate.getFullYear() !== currentDate.getFullYear() ||
          jobDate.getMonth() !== currentDate.getMonth() ||
          jobDate.getDate() !== currentDate.getDate()
        ) {
          setCurrentDate(jobDate);
        }
      }
      setSelectedJobId(jobId);
      setSelectedJobForModal(job);
      setShowJobModal(true);
    }
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleDragToggle = (jobId: string) => {
    setIsDraggingEnabled(isDraggingEnabled === jobId ? null : jobId);
  };

  const scheduleRef = useRef<HTMLDivElement>(null);
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);

  // Scroll to and highlight a job in the schedule
  const handleViewOnSchedule = (jobId: string) => {
    setShowJobModal(false);
    setTimeout(() => {
      const el = document.querySelector(`[data-job-id='${jobId}']`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedJobId(jobId);
        setTimeout(() => setHighlightedJobId(null), 2000);
      }
    }, 200); // Wait for modal to close
  };

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetModalUnit, setAssetModalUnit] = useState<{
    id: string;
    unit_number: string;
  } | null>(null);
  const [assetModalLocation, setAssetModalLocation] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [assetModalUnits, setAssetModalUnits] = useState<any[] | null>(null);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Drag Mode Banner */}
      {dragModeActive && (
        <div className="bg-blue-100 text-blue-800 text-center py-2 font-semibold">
          {selectedJobToDrag
            ? "Drag the job to a technician to reassign."
            : "Drag a job from the Job Queue to a technician."}
        </div>
      )}
      {/* Header with Filters */}
      <DispatchFilters
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterJobType={filterJobType}
        onJobTypeFilterChange={setFilterJobType}
        filterZipCode={filterZipCode}
        onZipCodeFilterChange={setFilterZipCode}
      />

      {/* Main Content - New Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Job Queue Columns */}
        <div className="w-80 flex-shrink-0">
          <JobQueue
            jobs={jobs}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onJobDragStart={handleJobDragStart}
            onJobDragEnd={handleJobDragEnd}
            onJobClick={handleJobClick}
            selectedJobId={selectedJobId}
            getJobTypeColorClass={getJobTypeColorClass}
            onJobReassign={handleJobReassign}
            onActivateDragMode={handleActivateDragMode}
            dragModeActive={dragModeActive}
            selectedJobToDrag={selectedJobToDrag}
          />
        </div>

        {/* Right Side - Map on Top, Technician Schedule on Bottom */}
        <div className="flex-1 flex flex-col">
          {/* Top Half - Map */}
          <div className="flex-1 min-h-0 relative">
            <DispatchMap
              selectedCall={(() => {
                if (selectedJobId) {
                  const job = jobs.find((job) => job.id === selectedJobId);
                  if (job && job.locations) {
                    return {
                      address: job.locations.address || "Atlanta",
                      zip: job.locations.zip || "",
                      city: job.locations.city || "",
                      state: job.locations.state || "",
                      company:
                        job.locations.company_name || job.company_name || "",
                      unit:
                        job.units && job.units.length > 0
                          ? job.units[0].unit_number
                          : "",
                      locationId: job.locations.id || job.location_id || "",
                    };
                  }
                }
                return {
                  address: "Atlanta",
                  zip: "",
                  city: "Atlanta",
                  state: "GA",
                  company: "",
                  unit: "",
                  locationId: "",
                };
              })()}
              className="h-full w-full"
              onMarkerJobClick={(locationId) => {
                console.log("Marker clicked, locationId:", locationId, jobs);
                const job = jobs.find(
                  (j) =>
                    j.locations &&
                    (j.locations.id === locationId ||
                      j.location_id === locationId)
                );
                if (job) {
                  setSelectedJobId(job.id);
                  setSelectedJobForModal(job);
                  setShowJobModal(true);
                } else {
                  console.warn("No job found for locationId:", locationId);
                }
              }}
            />
          </div>

          {/* Bottom Half - Technician Schedule */}
          <div className="h-80 border-t border-gray-200" ref={scheduleRef}>
            <TechnicianSchedule
              technicians={technicians}
              jobs={jobs}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onJobDragStart={handleJobDragStart}
              onJobDrop={handleJobDrop}
              onJobDragEnd={handleJobDragEnd}
              onJobScheduleUpdate={handleJobScheduleUpdate}
              onJobClick={handleJobSelect}
              selectedJobId={selectedJobId}
              getJobTypeColorClass={getJobTypeColorClass}
              isDraggingEnabled={
                dragModeActive && selectedJobToDrag ? selectedJobToDrag : null
              }
              onDragToggle={setIsDraggingEnabled}
              dragModeActive={dragModeActive}
              selectedJobToDrag={selectedJobToDrag}
              highlightedJobId={highlightedJobId}
              onActivateDragMode={handleActivateDragMode}
            />
          </div>
        </div>
      </div>

      {/* Job Type Legend */}
      <JobTypeLegend />

      {/* Job Details Modal */}
      {showJobModal && selectedJobForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Job Details</h3>
              <button
                onClick={() => setShowJobModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-lg">
                  {selectedJobForModal.name}
                </h4>
                <p className="text-gray-600 text-sm">
                  Job #{selectedJobForModal.number}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getJobTypeColorClass(
                      selectedJobForModal.status
                    )}`}
                  >
                    {selectedJobForModal.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getJobTypeColorClass(
                      selectedJobForModal.type
                    )}`}
                  >
                    {selectedJobForModal.type}
                  </span>
                </div>
              </div>
              {selectedJobForModal.locations && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <Link
                        to={
                          selectedJobForModal.locations.id
                            ? `/locations/${selectedJobForModal.locations.id}`
                            : "#"
                        }
                        className="font-medium underline hover:text-primary-700"
                        onClick={() => setShowJobModal(false)}
                      >
                        {selectedJobForModal.locations.name}
                      </Link>
                      <p className="text-sm text-gray-600">
                        <Link
                          to={
                            selectedJobForModal.locations.id
                              ? `/locations/${selectedJobForModal.locations.id}`
                              : "#"
                          }
                          className="underline hover:text-primary-700"
                          onClick={() => setShowJobModal(false)}
                        >
                          {selectedJobForModal.locations.address}
                        </Link>
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedJobForModal.locations.city},{" "}
                        {selectedJobForModal.locations.state}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Company clickable if available */}
              {selectedJobForModal.locations &&
                selectedJobForModal.locations.companies &&
                selectedJobForModal.locations.companies.id && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Company</p>
                    <Link
                      to={`/companies/${selectedJobForModal.locations.companies.id}`}
                      className="font-medium underline hover:text-primary-700"
                      onClick={() => setShowJobModal(false)}
                    >
                      {selectedJobForModal.locations.companies.name ||
                        "View Company"}
                    </Link>
                  </div>
                )}
              {selectedJobForModal.schedule_start && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Scheduled</p>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm">
                      {new Date(
                        selectedJobForModal.schedule_start
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              {selectedJobForModal.job_technicians &&
                selectedJobForModal.job_technicians.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      Assigned Technicians
                    </p>
                    <div className="space-y-1">
                      {selectedJobForModal.job_technicians.map((tech) => (
                        <div
                          key={tech.technician_id}
                          className="flex items-center gap-2"
                        >
                          <User size={14} className="text-gray-400" />
                          <span className="text-sm">
                            {tech.users.first_name} {tech.users.last_name}
                            {tech.is_primary && (
                              <span className="ml-1 text-xs bg-primary-100 text-primary-700 px-1 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {/* Show units if available */}
              {selectedJobForModal.units &&
                selectedJobForModal.units.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Units</p>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {selectedJobForModal.units.map((unit, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          {unit.id ? (
                            <Link
                              to={`/units/${unit.id}`}
                              className="underline hover:text-primary-700"
                              onClick={() => setShowJobModal(false)}
                            >
                              {unit.unit_number}
                            </Link>
                          ) : (
                            <span>{unit.unit_number}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {selectedJobForModal.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">
                    {selectedJobForModal.description}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <a
                href={`/jobs/${selectedJobForModal.id}`}
                className="btn btn-primary flex items-center justify-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Full Job Page
                <ArrowRight size={16} className="ml-2" />
              </a>
              {selectedJobForModal.units &&
              selectedJobForModal.units.length > 0 ? (
                <button
                  className="btn btn-secondary flex items-center justify-center"
                  onClick={() => {
                    setAssetModalUnit(null); // null means all units
                    setAssetModalLocation(selectedJobForModal.locations);
                    setAssetModalUnits(selectedJobForModal.units); // <-- pass only job's units
                    setShowAssetModal(true);
                  }}
                >
                  View Assets
                </button>
              ) : (
                <button
                  className="btn btn-secondary flex items-center justify-center"
                  disabled
                >
                  View Assets
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* QuickAssetViewModal for job details */}
      <QuickAssetViewModal
        open={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        location={assetModalLocation}
        unit={assetModalUnit}
        units={assetModalUnits}
      />
    </div>
  );
};

export default DispatchSchedule;
