import React, { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Package,
  Wrench,
  Search,
  Calendar,
  Clock,
} from "lucide-react";
import { useMediaQuery } from "react-responsive";
import JobDetailsModal from "../jobs/JobDetailsModal";

interface Job {
  id: string;
  number: string;
  name: string;
  type: string;
  status: string;
  additional_type?: string;
  schedule_start?: string;
  description?: string;
  locations?: {
    id?: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    companies?: {
      id?: string;
      name: string;
    };
  };
  units?: Array<{
    id?: string;
    unit_number: string;
    status?: string;
  }>;
  job_technicians?: {
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
    };
  }[];
}

interface JobQueueProps {
  jobs: Job[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onJobDragStart: (
    job: Job,
    from: { type: "column" | "technician"; id: string }
  ) => void;
  onJobDragEnd: () => void;
  onJobClick: (jobId: string) => void;
  selectedJobId: string | null;
  getJobTypeColorClass: (type: string) => string;
  onJobReassign?: (
    jobId: string,
    fromTechId: string,
    toTechId: string,
    action: "switch" | "share"
  ) => void;
  onActivateDragMode?: () => void;
  dragModeActive?: boolean;
  selectedJobToDrag?: string | null;
  onSelectJobToDrag?: (jobId: string) => void;
  onAssignTechnicians?: (appointment: { technicianIds: string[] }) => void;
  onViewAssets?: (location: any, units: any[]) => void;
}

const getJobTypeColorClass = (type: string) => {
  const colorMap: { [key: string]: string } = {
    maintenance: "bg-purple-100 text-purple-800 border-purple-200",
    "service call": "bg-teal-100 text-teal-800 border-teal-200",
    inspection: "bg-blue-100 text-blue-800 border-blue-200",
    repair: "bg-orange-100 text-orange-800 border-orange-200",
    installation: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    colorMap[type.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200"
  );
};

const JobQueue = ({
  jobs,
  searchTerm,
  onSearchChange,
  onJobDragStart,
  onJobDragEnd,
  onJobClick,
  selectedJobId,
  getJobTypeColorClass,
  onJobReassign,
  onActivateDragMode,
  dragModeActive,
  selectedJobToDrag,
  onSelectJobToDrag,
  onAssignTechnicians,
  onViewAssets,
  closeDrawer, // optional prop for mobile close
}: JobQueueProps & { closeDrawer?: () => void }) => {
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [showScheduledJobs, setShowScheduledJobs] = useState(false);

  // Add drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const jobQueueRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<Job | null>(
    null
  );

  // Simplified drag state management
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragging(false);
      setDraggedJobId(null);
    };

    if (isDragging) {
      document.addEventListener("dragend", handleGlobalDragEnd);
    }

    return () => {
      document.removeEventListener("dragend", handleGlobalDragEnd);
    };
  }, [isDragging]);

  // Categorize jobs based on view mode
  const unassignedJobs = jobs.filter(
    (job) =>
      job.status === "unscheduled" &&
      (!job.job_technicians || job.job_technicians.length === 0)
  );

  const partsOrderedJobs = jobs
    .filter(
      (job) =>
        job.status === "unscheduled" &&
        (job.type === "repair" || job.name.toLowerCase().includes("parts"))
    )
    .slice(0, 10);

  const pmsToScheduleJobs = jobs.filter(
    (job) => job.status === "unscheduled" && job.type === "maintenance"
  );

  const otherJobsToSchedule = jobs.filter(
    (job) => job.status === "unscheduled" && job.type !== "maintenance"
  );

  // For scheduled jobs view
  const scheduledJobs = jobs.filter(
    (job) =>
      job.status === "scheduled" &&
      job.job_technicians &&
      job.job_technicians.length > 0
  );

  const renderJobCard = (
    job: Job,
    from: { type: "column" | "technician"; id: string }
  ) => (
    <div
      key={job.id}
      draggable={!!dragModeActive}
      onDragStart={(e) => {
        if (dragModeActive) {
          e.dataTransfer.setData("application/json", JSON.stringify(job));
          onJobDragStart(job, from);

          // Create a custom drag image that's smaller
          const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
          dragImage.style.transform = "scale(0.1)";
          dragImage.style.transformOrigin = "top left";
          dragImage.style.opacity = "0.1";
          dragImage.style.pointerEvents = "none";
          dragImage.style.position = "absolute";
          dragImage.style.top = "-1000px";
          dragImage.style.left = "-1000px";
          document.body.appendChild(dragImage);

          e.dataTransfer.setDragImage(dragImage, 0, 0);

          // Remove the drag image after a short delay
          setTimeout(() => {
            if (document.body.contains(dragImage)) {
              document.body.removeChild(dragImage);
            }
          }, 100);

          // Initialize drag state
          setIsDragging(true);
          setDraggedJobId(job.id);
        }
      }}
      onDragEnd={(e) => {
        onJobDragEnd();
        setIsDragging(false);
        setDraggedJobId(null);
      }}
      onClick={() => {
        if (!dragModeActive) {
          // Show the job details modal instead of just calling onJobClick
          setSelectedJobForModal(job);
          setShowJobModal(true);
          // Also call the original onJobClick for backward compatibility
          onJobClick(job.id);
        }
      }}
      className={`p-2 mb-2 rounded border transition-all duration-200 text-base min-h-[44px] flex flex-col justify-center job-card-scale ${
        isDragging && draggedJobId === job.id ? "dragging" : ""
      } ${getJobTypeColorClass(job.type)} ${
        selectedJobId === job.id ? "ring-2 ring-primary-500" : ""
      } ${dragModeActive ? "cursor-move" : "cursor-pointer"} ${
        dragModeActive && selectedJobToDrag === job.id
          ? "ring-2 ring-blue-500 border-blue-400 bg-blue-50"
          : ""
      } ${isMobile ? "text-base min-h-[56px]" : "text-xs min-h-[32px]"} ${
        isDragging && draggedJobId === job.id
          ? "shadow-lg border-2 border-blue-300 job-card-dragging"
          : ""
      }`}
      style={{
        ...(isMobile
          ? { fontSize: 16, padding: 12 }
          : { fontSize: 12, padding: 6 }),
        // Only apply visual feedback, not scaling to the original card
        zIndex: isDragging && draggedJobId === job.id ? 1000 : "auto",
        opacity: isDragging && draggedJobId === job.id ? 0.6 : 1,
        filter:
          isDragging && draggedJobId === job.id
            ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
            : "none",
        // Additional styles for better drag visibility
        ...(isDragging &&
          draggedJobId === job.id && {
            borderWidth: "2px",
            borderStyle: "solid",
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.05)",
          }),
      }}
    >
      <div className="font-medium truncate text-lg">{job.name}</div>
      <div className="text-gray-600 truncate">{job.locations?.name}</div>
      <div className="text-gray-500">{job.locations?.zip}</div>
      {/* Display unit information */}
      {job.units && job.units.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          Unit: {job.units.map((unit) => unit.unit_number).join(", ")}
        </div>
      )}
      {/* Display job type or additional type */}
      {job.type === "maintenance" && job.additional_type ? (
        <div className="text-xs text-gray-400 mt-1">{job.additional_type}</div>
      ) : (
        <div className="text-xs text-gray-400 mt-1">{job.type}</div>
      )}
    </div>
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const filteredJobs = (jobList: Job[]) =>
    jobList.filter(
      (job) =>
        !searchTerm ||
        job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.locations?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div
      ref={jobQueueRef}
      className={`bg-white border-r border-gray-200 flex flex-col relative ${
        isMobile ? "w-full h-full" : "w-80"
      }${dragModeActive ? " ring-2 ring-blue-400 job-queue-drag-mode" : ""}`}
    >
      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium z-50 animate-pulse">
          Dragging...
        </div>
      )}

      {isMobile && closeDrawer && (
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-lg">Job Queue</span>
          <button className="btn btn-secondary" onClick={closeDrawer}>
            Close
          </button>
        </div>
      )}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">
            {showScheduledJobs ? "Scheduled" : "Job Queue"}
          </h2>
          <button
            onClick={() => setShowScheduledJobs(!showScheduledJobs)}
            className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors ${
              showScheduledJobs
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {showScheduledJobs ? (
              <>
                <Calendar size={14} />
                Jobs Queue
              </>
            ) : (
              <>
                <Clock size={14} />
                Scheduled Jobs
              </>
            )}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`pl-9 input w-full ${isMobile ? "h-12 text-base" : ""}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
        {showScheduledJobs ? (
          /* Scheduled Jobs View */
          <div className="p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
              <Clock size={16} className="mr-2 text-green-500" />
              Scheduled Jobs ({scheduledJobs.length})
            </h3>
            <div
              className="min-h-[120px] max-h-[300px] overflow-y-auto bg-gray-50 rounded-lg p-2"
              onDragOver={handleDragOver}
            >
              {filteredJobs(scheduledJobs).map((job) =>
                renderJobCard(job, { type: "column", id: "scheduled" })
              )}
              {filteredJobs(scheduledJobs).length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  No scheduled jobs
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Jobs to Schedule View */
          <>
            {/* Unassigned Calls */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                <AlertTriangle size={16} className="mr-2 text-amber-500" />
                Unassigned Calls ({unassignedJobs.length})
              </h3>
              <div className="min-h-[120px] max-h-[300px] overflow-y-auto bg-gray-50 rounded-lg p-2">
                {filteredJobs(unassignedJobs).map((job) =>
                  renderJobCard(job, { type: "column", id: "unassigned" })
                )}
                {filteredJobs(unassignedJobs).length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No unassigned calls
                  </div>
                )}
              </div>
            </div>

            {/* Parts Ordered */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                <Package size={16} className="mr-2 text-blue-500" />
                Parts Ordered ({partsOrderedJobs.length})
              </h3>
              <div
                className="min-h-[120px] max-h-[300px] overflow-y-auto bg-gray-50 rounded-lg p-2"
                onDragOver={handleDragOver}
              >
                {filteredJobs(partsOrderedJobs).map((job) =>
                  renderJobCard(job, { type: "column", id: "parts_ordered" })
                )}
                {filteredJobs(partsOrderedJobs).length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No parts ordered
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance Jobs to Schedule */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                <Wrench size={16} className="mr-2 text-purple-500" />
                Maintenance Jobs to Schedule ({pmsToScheduleJobs.length})
              </h3>
              <div
                className="min-h-[120px] max-h-[300px] overflow-y-auto bg-gray-50 rounded-lg p-2"
                onDragOver={handleDragOver}
              >
                {filteredJobs(pmsToScheduleJobs).map((job) =>
                  renderJobCard(job, { type: "column", id: "pms_to_schedule" })
                )}
                {filteredJobs(pmsToScheduleJobs).length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No maintenance jobs to schedule
                  </div>
                )}
              </div>
            </div>

            {/* Other Jobs to Schedule */}
            <div className="p-4">
              <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                <Calendar size={16} className="mr-2 text-green-500" />
                Other Jobs to Schedule ({otherJobsToSchedule.length})
              </h3>
              <div
                className="min-h-[120px] max-h-[300px] overflow-y-auto bg-gray-50 rounded-lg p-2"
                onDragOver={handleDragOver}
              >
                {filteredJobs(otherJobsToSchedule).map((job) =>
                  renderJobCard(job, {
                    type: "column",
                    id: "other_to_schedule",
                  })
                )}
                {filteredJobs(otherJobsToSchedule).length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No jobs to schedule
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        job={
          selectedJobForModal || {
            id: "",
            number: "",
            name: "",
            status: "",
            type: "",
            locations: { name: "" },
            units: [],
          }
        }
        onViewAssets={onViewAssets}
        showViewAssetsButton={true}
        onAssignTechnicians={onAssignTechnicians}
      />
    </div>
  );
};

export default JobQueue;
