import { Calendar, Clock } from 'lucide-react';
import { Job } from '../../types/job';

type JobDetailsCardProps = {
  job: Job;
};

const JobDetailsCard = ({ job }: JobDetailsCardProps) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'unscheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'preventative maintenance':
        return 'bg-purple-100 text-purple-800';
      case 'service call':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

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
          </div>
          <h2 className="text-xl font-semibold">{job.name}</h2>
          {job.description && (
            <p className="text-gray-600 mt-2">{job.description}</p>
          )}
          {job.problem_description && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">Problem Description</h3>
              <p className="text-gray-700">{job.problem_description}</p>
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
            {job.schedule_start && (
              <div className="flex items-center justify-end gap-1 text-gray-500">
                <Clock size={14} />
                <span>Scheduled: {formatDateTime(job.schedule_start)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsCard;