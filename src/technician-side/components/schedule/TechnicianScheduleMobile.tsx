import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMediaQuery } from "react-responsive";

interface Job {
  id: string;
  name: string;
  type: string;
  additional_type?: string;
  schedule_start?: string;
  schedule_duration?: string;
  job_technicians?: any[];
  locations?: { name: string; zip: string };
  units?: { id: string; unit_number: string }[];
}

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
}

interface TechnicianScheduleMobileProps {
  technicians: Technician[];
  jobs: Job[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onJobScheduleUpdate: (
    jobId: string,
    technicianId: string,
    newTime: string
  ) => void;
  onJobReassign: (jobId: string, fromTechId: string, toTechId: string) => void;
  onJobClick: (job: Job) => void;
}

const timeSlots = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

const getJobTypeColorClass = (type: string) => {
  const colorMap: { [key: string]: string } = {
    "preventative maintenance":
      "bg-purple-100 text-purple-800 border-purple-200",
    "service call": "bg-teal-100 text-teal-800 border-teal-200",
    inspection: "bg-blue-100 text-blue-800 border-blue-200",
    repair: "bg-orange-100 text-orange-800 border-orange-200",
    installation: "bg-green-100 text-green-800 border-green-200",
    "planned maintenance": "bg-indigo-100 text-indigo-800 border-indigo-200",
  };

  return (
    colorMap[type.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200"
  );
};

const TechnicianScheduleMobile = ({
  technicians,
  jobs,
  currentDate,
  onDateChange,
  onJobScheduleUpdate,
  onJobReassign,
  onJobClick,
}: TechnicianScheduleMobileProps) => {
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [dragOverTechId, setDragOverTechId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery({ maxWidth: 767 });

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
  const formatDate = (date: Date) =>
    date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const formatTime = (date: string) => {
    const d = new Date(date);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12;
    const displayHour = h ? h : 12;
    return `${displayHour}${ampm}`;
  };
  const getJobsForTech = (techId: string) => {
    return jobs
      .filter(
        (job) =>
          job.job_technicians?.some((jt: any) => jt.technician_id === techId) &&
          job.schedule_start
      )
      .sort(
        (a, b) =>
          new Date(a.schedule_start!).getTime() -
          new Date(b.schedule_start!).getTime()
      );
  };

  // Restore getJobsForTechAndHour for desktop grid view
  const getJobsForTechAndHour = (techId: string, hour: number) => {
    return jobs.filter((job) => {
      const assigned = job.job_technicians?.some(
        (jt: any) => jt.technician_id === techId
      );
      if (!assigned || !job.schedule_start) return false;
      const jobDate = new Date(job.schedule_start);
      return (
        jobDate.getDate() === currentDate.getDate() &&
        jobDate.getMonth() === currentDate.getMonth() &&
        jobDate.getFullYear() === currentDate.getFullYear() &&
        jobDate.getHours() === hour
      );
    });
  };

  const handleDragStart = (job: Job, techId: string) => {
    setDraggedJob(job);
  };
  const handleDragEnd = () => {
    setDraggedJob(null);
    setDragOverTechId(null);
    setDragOverHour(null);
  };
  const handleDrop = (techId: string, hour: number) => {
    if (!draggedJob) return;
    const newDate = new Date(currentDate);
    newDate.setHours(hour, 0, 0, 0);
    if (
      draggedJob.job_technicians?.some((jt: any) => jt.technician_id !== techId)
    ) {
      // Reassign
      onJobReassign(
        draggedJob.id,
        draggedJob.job_technicians[0].technician_id,
        techId
      );
    }
    // Reschedule
    onJobScheduleUpdate(draggedJob.id, techId, newDate.toISOString());
    handleDragEnd();
  };

  if (isMobile) {
    // MOBILE: stacked card view
    return (
      <div className="bg-white rounded-lg shadow p-2 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-xl font-semibold">
            {formatDate(currentDate)}
          </span>
          <button
            onClick={handleNextDay}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
        {technicians.map((tech) => (
          <div
            key={tech.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-center mb-2">
              <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-2 text-lg font-bold">
                {tech.first_name.charAt(0)}
                {tech.last_name.charAt(0)}
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {tech.first_name} {tech.last_name}
              </div>
            </div>
            <div className="space-y-2">
              {getJobsForTech(tech.id).length === 0 ? (
                <div className="text-gray-400 text-base italic">
                  No jobs scheduled
                </div>
              ) : (
                getJobsForTech(tech.id).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onJobClick(job)}
                    className={`rounded-lg border px-3 py-2 flex flex-col bg-white shadow-sm cursor-pointer ${getJobTypeColorClass(
                      job.type
                    )} hover:ring-2 hover:ring-primary-400`}
                    style={{ fontSize: 16 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-base truncate">
                        {job.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 ml-2">
                        {job.type}
                        {(job.type === "preventative maintenance" ||
                          job.type === "planned maintenance") &&
                          job.additional_type && (
                            <span className="ml-1">
                              • {job.additional_type}
                            </span>
                          )}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm">
                      {job.schedule_start
                        ? formatTime(job.schedule_start)
                        : "Unscheduled"}
                    </div>
                    {job.locations?.name && (
                      <div className="text-xs text-gray-500 mt-1">
                        {job.locations.name}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  // DESKTOP: original grid view
  return (
    <div className="bg-white rounded-lg shadow p-2">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={handlePrevDay}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-medium">{formatDate(currentDate)}</span>
        <button
          onClick={handleNextDay}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-x-auto" ref={gridRef}>
        <div className="min-w-[700px]">
          {/* Time Header */}
          <div className="flex sticky top-0 bg-white z-10">
            <div className="w-24 text-xs font-medium text-gray-500 p-1">
              Tech
            </div>
            {timeSlots.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-xs text-center text-gray-500 p-1 border-l border-gray-100 min-w-[56px]"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>
          {/* Technician Rows */}
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className="flex border-b border-gray-200 min-h-[56px]"
            >
              {/* Technician Name */}
              <div className="w-24 p-1 border-r border-gray-200 flex items-center bg-gray-50">
                <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-1">
                  <span className="text-xs font-medium">
                    {tech.first_name.charAt(0)}
                    {tech.last_name.charAt(0)}
                  </span>
                </div>
                <div className="text-xs font-medium truncate text-gray-700">
                  {tech.first_name}
                </div>
              </div>
              {/* Time Slots */}
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className={`flex-1 relative border-l border-gray-100 min-h-[56px] flex items-center justify-center transition-colors
                    ${
                      dragOverTechId === tech.id && dragOverHour === hour
                        ? "bg-blue-100"
                        : "bg-white"
                    }
                  `}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTechId(tech.id);
                    setDragOverHour(hour);
                  }}
                  onDrop={() => handleDrop(tech.id, hour)}
                  onDragLeave={() => {
                    setDragOverTechId(null);
                    setDragOverHour(null);
                  }}
                >
                  {getJobsForTechAndHour(tech.id, hour).map((job: Job) => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={() => handleDragStart(job, tech.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onJobClick(job)}
                      className={`border rounded p-1 text-xs cursor-move w-full text-center truncate ${getJobTypeColorClass(
                        job.type
                      )}`}
                      style={{ minHeight: 40 }}
                    >
                      {job.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechnicianScheduleMobile;
