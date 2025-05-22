import { Plus, Phone, Mail } from 'lucide-react';
import { Job } from '../../types/job';

type JobTechniciansProps = {
  job: Job;
  onAssignTechnicians: () => void;
};

const JobTechnicians = ({ job, onAssignTechnicians }: JobTechniciansProps) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Technicians</h3>
        <button
          onClick={onAssignTechnicians}
          className="btn btn-primary"
        >
          <Plus size={16} className="mr-2" />
          Assign Technicians
        </button>
      </div>

      {job.job_technicians && job.job_technicians.length > 0 ? (
        <div className="space-y-4">
          {job.job_technicians.map(tech => (
            <div key={tech.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {tech.users.first_name?.[0] || '?'}{tech.users.last_name?.[0] || '?'}
                </span>
              </div>
              <div>
                <div className="font-medium flex items-center">
                  {tech.users.first_name} {tech.users.last_name}
                  {tech.is_primary && (
                    <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 space-y-1 mt-1">
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    {tech.users.phone || 'No phone'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    {tech.users.email}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No technicians assigned</p>
      )}
    </div>
  );
};

export default JobTechnicians;