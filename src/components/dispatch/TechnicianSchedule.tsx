import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Users, UserCheck, X } from "lucide-react";

interface Job {
  id: string;
  name: string;
  type: string;
  additional_type?: string;
  schedule_start?: string;
  schedule_duration?: string;
  locations?: {
    name: string;
    zip: string;
  };
  units?: {
    id: string;
    unit_number: string;
  }[];
  job_units?: {
    unit_id: string;
    units: {
      id: string;
      unit_number: string;
    };
  }[];
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
}

interface TechnicianScheduleProps {
  technicians: User[];
  jobs: Job[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onJobDragStart: (
    job: Job,
    from: { type: "column" | "technician"; id: string }
  ) => void;
  onJobDrop: (
    e: React.DragEvent,
    to: { type: "column" | "technician"; id: string }
  ) => void;
  onJobDragEnd: () => void;
  onJobScheduleUpdate: (
    jobId: string,
    technicianId: string,
    newTime: string
  ) => void;
  onJobClick: (jobId: string) => void;
  onJobCardClick?: (jobId: string) => void;
  onJobCardDoubleClick?: (jobId: string) => void;
  selectedJobId: string | null;
  getJobTypeColorClass: (type: string) => string;
  onJobReassign: (
    jobId: string,
    fromTechId: string,
    toTechId: string,
    action: "switch" | "share"
  ) => void;
  isDraggingEnabled: string | null;
  onDragToggle: (jobId: string) => void;
  dragModeActive?: boolean;
  selectedJobToDrag?: string | null;
  highlightedJobId?: string | null;
  onActivateDragMode?: () => void;
  isJobPastDue?: (job: Job) => boolean;
}

const TechnicianSchedule = ({
  technicians,
  jobs,
  currentDate,
  onDateChange,
  onJobDragStart,
  onJobDrop,
  onJobDragEnd,
  onJobScheduleUpdate,
  onJobClick,
  onJobCardClick,
  onJobCardDoubleClick,
  selectedJobId,
  getJobTypeColorClass,
  onJobReassign,
  isDraggingEnabled,
  onDragToggle,
  dragModeActive,
  selectedJobToDrag,
  highlightedJobId,
  onActivateDragMode,
  isJobPastDue,
  ...rest
}: TechnicianScheduleProps) => {
  // Time slots for the schedule (8 AM to 8 PM)
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM (24-hour format)

  // Modal state for technician reassignment
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignData, setReassignData] = useState<{
    job: Job;
    fromTechId: string;
    toTechId: string;
    fromTechName: string;
    toTechName: string;
  } | null>(null);

  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [dragOverTechId, setDragOverTechId] = useState<string | null>(null);

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    onDateChange(newDate);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (hour: number) => {
    if (hour === 0) return "12AM";
    if (hour < 12) return `${hour}AM`;
    if (hour === 12) return "12PM";
    return `${hour - 12}PM`;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getJobsForTechnician = (techId: string) => {
    return jobs.filter((job) =>
      job.job_technicians?.some((jt: any) => jt.technician_id === techId)
    );
  };

  const getJobsForDate = (techId: string, date: Date) => {
    const techJobs = getJobsForTechnician(techId);
    return techJobs.filter((job) => {
      if (!job.schedule_start) return false;
      const jobDate = new Date(job.schedule_start);
      return (
        jobDate.getDate() === date.getDate() &&
        jobDate.getMonth() === date.getMonth() &&
        jobDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getJobHour = (job: Job) => {
    if (!job.schedule_start) return 6;
    return Math.max(8, Math.min(20, new Date(job.schedule_start).getHours()));
  };

  const getJobDuration = (job: Job) => {
    if (!job.schedule_duration) return 1;
    const match = job.schedule_duration.toString().match(/(\d+)/);
    return Math.min(4, match ? parseInt(match[1]) : 1); // Max 4 hours for display
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-blue-100");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-blue-100");
  };

  const handleDrop = (e: React.DragEvent, techId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-blue-100");
    onJobDrop(e, { type: "technician", id: techId });
  };

  const handleTimeSlotDrop = (
    e: React.DragEvent,
    techId: string,
    hour: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("bg-blue-100");

    // Calculate the new schedule time
    const newDate = new Date(currentDate);
    newDate.setHours(hour, 0, 0, 0);
    const newScheduleTime = newDate.toISOString();

    // Get the dragged job data from the dataTransfer
    const jobData = e.dataTransfer.getData("application/json");
    if (jobData) {
      try {
        const job = JSON.parse(jobData);
        onJobScheduleUpdate(job.id, techId, newScheduleTime);
      } catch (error) {
        console.error("Error parsing job data:", error);
      }
    }
  };

  const handleJobReassignDrop = (
    job: Job,
    fromTechId: string,
    toTechId: string
  ) => {
    if (fromTechId === toTechId) return; // Same technician, no action needed

    const fromTech = technicians.find((t) => t.id === fromTechId);
    const toTech = technicians.find((t) => t.id === toTechId);

    if (!fromTech || !toTech) return;

    setReassignData({
      job,
      fromTechId,
      toTechId,
      fromTechName: `${fromTech.first_name} ${fromTech.last_name}`,
      toTechName: `${toTech.first_name} ${toTech.last_name}`,
    });
    setShowReassignModal(true);
  };

  const handleReassignAction = (action: "switch" | "share") => {
    if (!reassignData) return;

    onJobReassign(
      reassignData.job.id,
      reassignData.fromTechId,
      reassignData.toTechId,
      action
    );

    setShowReassignModal(false);
    setReassignData(null);
  };

  const handleReassignCancel = () => {
    setShowReassignModal(false);
    setReassignData(null);
  };
  const handleJobDragStart = (e: React.DragEvent, job: Job, techId: string) => {
    // Store job data in dataTransfer for time slot drops
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ...job,
        currentTechId: techId,
        techId: techId,
      })
    );
    onJobDragStart(job, { type: "technician", id: techId });
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="p-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium text-gray-900 text-sm">
            Technician Schedule
          </h2>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevDay}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium">{formatDate(currentDate)}</span>
          <button
            onClick={handleNextDay}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Time Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-1 z-10">
          <div className="flex">
            <div className="w-16 text-xs font-medium text-gray-500 p-1">
              TECH
            </div>
            {timeSlots.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-xs text-center text-gray-500 p-1 border-l border-gray-100 min-w-[40px]"
              >
                {formatTime(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* Technician Rows */}
        <div>
          {technicians.map((tech) => {
            const techJobs = getJobsForDate(tech.id, currentDate);

            return (
              <div key={tech.id} className="border-b border-gray-200">
                <div className="flex">
                  {/* Technician Name */}
                  <div className="w-16 p-1 border-r border-gray-200 flex items-center bg-gray-50">
                    <div className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-1">
                      <span className="text-xs font-medium">
                        {getInitials(tech.first_name, tech.last_name)}
                      </span>
                    </div>
                    <div className="text-xs font-medium truncate text-gray-700">
                      {tech.first_name}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className="flex-1 relative h-12">
                    {timeSlots.map((hour) => (
                      <div
                        key={hour}
                        className={`absolute border-l border-gray-300 h-full transition-colors cursor-pointer z-10 ${
                          dragModeActive && selectedJobToDrag
                            ? dragOverHour === hour &&
                              dragOverTechId === tech.id
                              ? "bg-blue-200 border-blue-500"
                              : "bg-white opacity-60"
                            : "bg-white hover:bg-blue-50"
                        }`}
                        style={{
                          left: `${((hour - 8) / timeSlots.length) * 100}%`,
                          width: `${100 / timeSlots.length}%`,
                          minHeight: 32,
                        }}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => {
                          setDragOverHour(hour);
                          setDragOverTechId(tech.id);
                          handleDragEnter(e);
                        }}
                        onDragLeave={(e) => {
                          setDragOverHour(null);
                          setDragOverTechId(null);
                          handleDragLeave(e);
                        }}
                        onDrop={(e) => handleTimeSlotDrop(e, tech.id, hour)}
                        title={`Drop job here for ${formatTime(hour)}`}
                      />
                    ))}

                    {/* Scheduled Jobs */}
                    {techJobs.map((job) => {
                      const startHour = getJobHour(job);
                      const duration = getJobDuration(job);
                      const left = ((startHour - 8) / timeSlots.length) * 100;
                      const width = (duration / timeSlots.length) * 100;

                      // Find current technician assignment
                      const currentTechId =
                        job.job_technicians?.find((jt: any) => jt.is_primary)
                          ?.technician_id || tech.id;

                      return (
                        <div
                          key={job.id}
                          draggable={!!dragModeActive}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "application/json",
                              JSON.stringify({
                                ...job,
                                currentTechId: tech.id,
                                techId: tech.id,
                              })
                            );
                            onJobDragStart(job, {
                              type: "technician",
                              id: tech.id,
                            });
                          }}
                          onDragEnd={onJobDragEnd}
                          onClick={() => {
                            if (!dragModeActive) {
                              // Single click - pan to map location
                              if (onJobCardClick) {
                                onJobCardClick(job.id);
                              } else if (typeof onJobClick === "function") {
                                // Fallback to original behavior
                                console.log("Job clicked in schedule:", job.id);
                                onJobClick(job.id);
                              }
                            }
                          }}
                          onDoubleClick={() => {
                            if (!dragModeActive) {
                              // Double click - show job details modal
                              if (onJobCardDoubleClick) {
                                onJobCardDoubleClick(job.id);
                              } else if (typeof onJobClick === "function") {
                                // Fallback to original behavior
                                console.log(
                                  "Job double-clicked in schedule:",
                                  job.id
                                );
                                onJobClick(job.id);
                              }
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Get the dragged job data
                            const draggedJobData =
                              e.dataTransfer.getData("application/json");
                            if (draggedJobData) {
                              try {
                                const draggedJob = JSON.parse(draggedJobData);
                                const draggedJobTechId =
                                  draggedJob.currentTechId || draggedJob.techId;

                                if (
                                  draggedJobTechId &&
                                  draggedJobTechId !== tech.id
                                ) {
                                  handleJobReassignDrop(
                                    draggedJob,
                                    draggedJobTechId,
                                    tech.id
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "Error parsing dragged job data:",
                                  error
                                );
                              }
                            }
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          className={`absolute top-1 h-10 rounded text-xs p-1 overflow-hidden border shadow-sm z-20 ${
                            isDraggingEnabled === job.id
                              ? "cursor-move border-2 border-primary-500"
                              : "cursor-pointer"
                          } ${getJobTypeColorClass(job.type)} ${
                            selectedJobId === job.id
                              ? "ring-2 ring-primary-500"
                              : ""
                          } ${
                            dragModeActive && selectedJobToDrag === job.id
                              ? "bg-primary-100"
                              : ""
                          } ${
                            highlightedJobId === job.id
                              ? "ring-4 ring-yellow-400 bg-yellow-100"
                              : ""
                          }`}
                          style={{
                            left: `${Math.max(0, left)}%`,
                            width: `${Math.max(8, Math.min(width, 30))}%`,
                            minHeight: 32,
                          }}
                          title={`${job.name} - ${job.locations?.name || ""} (Click to pan to map, double-click for details)`}
                          data-job-id={job.id}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate flex-1">
                              {job.name}
                              {isJobPastDue && isJobPastDue(job) && (
                                <span className="ml-1 text-red-600 font-bold">
                                  ⚠
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Show units if available */}
                          {(job.units && job.units.length > 0) ||
                          (job.job_units && job.job_units.length > 0) ? (
                            <div className="truncate text-xs text-gray-500">
                              Units:{" "}
                              {job.units
                                ? job.units
                                    .map((unit: any) => unit.unit_number)
                                    .join(", ")
                                : job.job_units
                                    ?.map((ju: any) => ju.units?.unit_number)
                                    .filter(Boolean)
                                    .join(", ")}
                            </div>
                          ) : null}
                          <div className="truncate text-xs opacity-75">
                            {job.locations?.zip}
                            {job.type === "maintenance" &&
                              job.additional_type && (
                                <span className="ml-1">
                                  • {job.additional_type}
                                </span>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {technicians.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No technicians found</p>
          </div>
        )}
      </div>

      {/* Technician Reassignment Modal */}
      {showReassignModal && reassignData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-center mb-4">
              Reassign Job
            </h3>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Would you like to reassign the job to this technician, or share
                it with another technician?
              </p>

              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Job:</span>
                  <span className="font-medium">{reassignData.job.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">
                    {reassignData.fromTechName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium">{reassignData.toTechName}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleReassignAction("switch")}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <UserCheck size={16} className="mr-2" />
                Reassign this job to {reassignData.toTechName}
              </button>

              <button
                onClick={() => handleReassignAction("share")}
                className="btn btn-secondary w-full flex items-center justify-center"
              >
                <Users size={16} className="mr-2" />
                Share this job with another technician
              </button>

              <button
                onClick={handleReassignCancel}
                className="btn btn-secondary w-full flex items-center justify-center"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianSchedule;
