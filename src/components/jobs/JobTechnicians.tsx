import { Plus, Phone, Mail } from "lucide-react";
import { Job } from "../../types/job";

type JobTechniciansProps = {
  job: Job;
  onAssignTechnicians: () => void;
  onRemoveTechnician?: (technicianId: string) => void;
};

const JobTechnicians = ({
  job,
  onAssignTechnicians,
  onRemoveTechnician,
}: JobTechniciansProps) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Technicians</h3>
        <button onClick={onAssignTechnicians} className="btn btn-primary">
          <Plus size={16} className="mr-2" />
          Assign Technicians
        </button>
      </div>

      {job.job_technicians && job.job_technicians.length > 0 ? (
        <div className="space-y-4">
          {job.job_technicians.map((tech) => (
            <div
              key={tech.id}
              className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-50 rounded-lg relative"
            >
              <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {tech.users.first_name?.[0] || "?"}
                  {tech.users.last_name?.[0] || "?"}
                </span>
              </div>
              <div className="w-full">
                <div className="font-medium flex items-center flex-wrap">
                  {tech.users.first_name} {tech.users.last_name}
                  {tech.is_primary && (
                    <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                {onRemoveTechnician && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTechnician(tech.technician_id);
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-error-600 p-1 rounded-full hover:bg-gray-100"
                    title="Remove Technician"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
                <div className="text-sm text-gray-500 space-y-1 mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Phone size={14} />
                    {tech.users.phone ? (
                      <a
                        href={`tel:${tech.users.phone}`}
                        className="text-primary-600 hover:text-primary-800 break-all"
                      >
                        {tech.users.phone}
                      </a>
                    ) : (
                      "No phone"
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Mail size={14} />
                    {tech.users.email ? (
                      <a
                        href={`mailto:${tech.users.email}`}
                        className="text-primary-600 hover:text-primary-800 break-all"
                      >
                        {tech.users.email}
                      </a>
                    ) : (
                      ""
                    )}
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
