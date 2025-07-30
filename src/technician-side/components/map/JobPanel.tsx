import { X } from "lucide-react";
import { Technician } from "../../types/technician";

interface JobPanelProps {
  jobs: any[];
  technicians: Technician[];
  enRouteTechnicians: Set<string>;
  onNavigateToJob: (job: any) => void;
  onEnRouteToJob: (job: any, technician: Technician) => void;
  onClose: () => void;
}

const JobPanel = ({
  jobs,
  technicians,
  enRouteTechnicians,
  onNavigateToJob,
  onEnRouteToJob,
  onClose,
}: JobPanelProps) => {
  return (
    <div className="absolute top-20 left-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 w-80 max-h-96 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Jobs</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto max-h-80">
        {jobs.map((job) => {
          const assignedTechnician = technicians.find(
            (tech) => tech.current_job_id === job.id
          );

          return (
            <div
              key={job.id}
              className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-red-700">
                      🔧
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{job.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === "scheduled"
                            ? "bg-yellow-100 text-yellow-800"
                            : job.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {job.status.replace("_", " ")}
                      </span>
                      {assignedTechnician && (
                        <span className="text-xs text-gray-500">
                          {assignedTechnician.first_name}{" "}
                          {assignedTechnician.last_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Atlanta, GA</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToJob(job);
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Navigate
                </button>
                {assignedTechnician && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEnRouteToJob(job, assignedTechnician);
                    }}
                    className={`px-3 py-1 text-xs rounded ${
                      enRouteTechnicians.has(assignedTechnician.id)
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    En Route
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JobPanel;
