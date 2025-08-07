import { Calendar, Clock } from "lucide-react";
import { Job } from "../../types/job";
import {
  formatJobDate,
  formatJobTime,
  formatJobDateTime,
  getScheduledDate,
  getScheduledTime,
} from "../../utils/dateUtils";

type JobDetailsCardProps = {
  job: Job;
};

const JobDetailsCard = ({ job }: JobDetailsCardProps) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "unscheduled":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type?.toLowerCase()) {
      case "maintenance":
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

  // Using centralized date utilities instead of local formatting functions
  const formatDateTime = (date: string) => formatJobDateTime(date);
  const formatTime = (timeString: string) => formatJobTime(timeString);
  const formatDate = (dateString: string) => formatJobDate(dateString);

  return (
    <div className="card">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`badge ${getStatusBadgeClass(job.status)}`}>
              {job.status}
            </span>
            <span className={`badge ${getTypeBadgeClass(job.type)}`}>
              {job.type}
              {job.type === "maintenance" && job.additional_type && (
                <span className="ml-1">• {job.additional_type}</span>
              )}
            </span>
            {job.service_line && (
              <span className="badge bg-blue-100 text-blue-800">
                {job.service_line}
              </span>
            )}
            {job.is_training && (
              <span className="badge bg-purple-100 text-purple-800">
                Training
              </span>
            )}
            {job.quote_confirmed && (
              <span className="badge bg-blue-100 text-blue-800">
                Quote Confirmed
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold">{job.name}</h2>
          {job.locations && (
            <div className="mt-1 text-sm text-gray-700">
              {job.locations.companies?.name}{" "}
              {job.locations.name && `• ${job.locations.name}`}
              {job.units && job.units.length > 0 && (
                <span>
                  {" "}
                  • Unit{job.units.length > 1 ? "s" : ""}:{" "}
                  {job.units.map((u: any) => u.unit_number).join(", ")}
                </span>
              )}
            </div>
          )}
          {job.description && (
            <p className="text-gray-600 mt-2">{job.description}</p>
          )}
          {job.problem_description && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">
                Problem Description
              </h3>
              <p className="text-gray-700">{job.problem_description}</p>
            </div>
          )}
          {job.job_technicians && job.job_technicians.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">
                Assigned Technicians
              </h3>
              <div className="space-y-1">
                {job.job_technicians.map((tech, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <span>
                      {tech.users.first_name} {tech.users.last_name}
                      {tech.is_primary && (
                        <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </span>
                    {tech.scheduled_at && (
                      <span className="text-xs text-gray-500">
                        • {getScheduledDate(tech.scheduled_at)} at{" "}
                        {getScheduledTime(tech.scheduled_at)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm">
            <div className="flex items-center justify-end gap-1 text-gray-500">
              <Calendar size={14} />
              <span>Start: {job.time_period_start}</span>
            </div>
            <div className="flex items-center justify-end gap-1 text-gray-500">
              <Calendar size={14} />
              <span>Due: {job.time_period_due}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsCard;
