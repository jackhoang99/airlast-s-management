import { CheckCircle, Trash2 } from 'lucide-react';
import ArrowBack from '../ui/ArrowBack';
import { Job } from '../../types/job';

type JobHeaderProps = {
  job: Job;
  onCompleteJob: () => void;
  onDeleteJob: () => void;
};

const JobHeader = ({ job, onCompleteJob, onDeleteJob }: JobHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <ArrowBack fallbackRoute="/jobs" className="text-gray-500 hover:text-gray-700" />
        <h1>Job #{job.number}</h1>
      </div>
      <div className="flex gap-2">
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <button
            onClick={onCompleteJob}
            className="btn btn-success"
          >
            <CheckCircle size={16} className="mr-2" />
            Complete Job
          </button>
        )}
        <button
          onClick={onDeleteJob}
          className="btn btn-error"
        >
          <Trash2 size={16} className="mr-2" />
          Delete Job
        </button>
      </div>
    </div>
  );
};

export default JobHeader;