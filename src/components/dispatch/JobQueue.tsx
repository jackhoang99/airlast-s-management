import { useState } from "react";
import { AlertTriangle, Package, Wrench, Search } from "lucide-react";

interface Job {
  id: string;
  name: string;
  type: string;
  locations?: {
    name: string;
    zip: string;
  };
  job_technicians?: any[];
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
}

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
}: JobQueueProps) => {
  // Categorize jobs
  const unassignedJobs = jobs.filter(
    (job) => !job.job_technicians || job.job_technicians.length === 0
  );

  const partsOrderedJobs = jobs
    .filter(
      (job) => job.type === "repair" || job.name.toLowerCase().includes("parts")
    )
    .slice(0, 10);

  const pmsToScheduleJobs = jobs.filter(
    (job) => job.type === "preventative maintenance"
  );

  const renderJobCard = (
    job: Job,
    from: { type: "column" | "technician"; id: string }
  ) => (
    <div
      key={job.id}
      draggable={!!dragModeActive}
      onDragStart={() => dragModeActive && onJobDragStart(job, from)}
      onDragEnd={onJobDragEnd}
      onClick={() => {
        if (!dragModeActive) {
          onJobClick(job.id);
        }
      }}
      className={`p-2 mb-2 rounded-lg border transition-shadow ${getJobTypeColorClass(
        job.type
      )} ${selectedJobId === job.id ? "ring-2 ring-primary-500" : ""} ${
        dragModeActive ? "cursor-move" : "cursor-pointer"
      } ${
        dragModeActive && selectedJobToDrag === job.id
          ? "ring-2 ring-blue-500 border-blue-400 bg-blue-50"
          : ""
      }`}
    >
      <div className="text-xs font-medium truncate">{job.name}</div>
      <div className="text-xs text-gray-600 truncate">
        {job.locations?.name}
      </div>
      <div className="text-xs text-gray-500">{job.locations?.zip}</div>
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
      className={`w-80 bg-white border-r border-gray-200 flex flex-col${
        dragModeActive ? " ring-2 ring-blue-400" : ""
      }`}
    >
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-medium text-gray-900 mb-3">Job Queue</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 input w-full"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Unassigned Calls */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
            <AlertTriangle size={16} className="mr-2 text-amber-500" />
            Unassigned Calls ({unassignedJobs.length})
          </h3>
          <div className="min-h-[120px] bg-gray-50 rounded-lg p-2">
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
            className="min-h-[120px] bg-gray-50 rounded-lg p-2"
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

        {/* PMs to Schedule */}
        <div className="p-4">
          <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
            <Wrench size={16} className="mr-2 text-purple-500" />
            PMs to Schedule ({pmsToScheduleJobs.length})
          </h3>
          <div
            className="min-h-[120px] bg-gray-50 rounded-lg p-2"
            onDragOver={handleDragOver}
          >
            {filteredJobs(pmsToScheduleJobs).map((job) =>
              renderJobCard(job, { type: "column", id: "pms_to_schedule" })
            )}
            {filteredJobs(pmsToScheduleJobs).length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No PMs to schedule
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Drag Mode Activation Button */}
      <div className="m-4">
        <button
          className="w-full p-4 border-2 border-primary-300 rounded-lg text-center text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors font-semibold"
          onClick={() =>
            typeof onActivateDragMode === "function" && onActivateDragMode()
          }
          disabled={dragModeActive}
        >
          {dragModeActive
            ? "Click here to drop a job"
            : "Click here to drag a job"}
        </button>
      </div>
    </div>
  );
};

export default JobQueue;
