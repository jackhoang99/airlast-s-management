import { X, MapPin } from "lucide-react";
import { Technician } from "../../types/technician";

interface TechnicianPanelProps {
  technicians: Technician[];
  onTechnicianClick: (technician: Technician) => void;
  onClose: () => void;
  onTechnicianCardClick?: (technician: Technician) => void;
}

const TechnicianPanel = ({
  technicians,
  onTechnicianClick,
  onClose,
  onTechnicianCardClick,
}: TechnicianPanelProps) => {
  return (
    <div className="absolute top-20 left-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 w-80 max-h-96 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Technicians</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto max-h-80">
        {technicians.map((technician) => {
          const statusColors = {
            available: "bg-green-100 text-green-800",
            on_job: "bg-yellow-100 text-yellow-800",
            offline: "bg-gray-100 text-gray-800",
          };

          const statusText = {
            available: "Available",
            on_job: "On Job",
            offline: "Offline",
          };

          return (
            <div
              key={technician.id}
              onClick={() => {
                onTechnicianClick(technician);
                if (onTechnicianCardClick) {
                  onTechnicianCardClick(technician);
                }
              }}
              className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-700">
                      {technician.first_name[0]}
                      {technician.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {technician.first_name} {technician.last_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[technician.status]
                        }`}
                      >
                        {statusText[technician.status]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {technician.job_count} job
                        {technician.job_count !== 1 ? "s" : ""}
                      </span>
                      {technician.technician_location && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <MapPin size={10} />
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {technician.current_job_name && (
                    <p className="text-xs text-gray-600 max-w-24 truncate">
                      {technician.current_job_name}
                    </p>
                  )}
                  {technician.next_job_time && (
                    <p className="text-xs text-blue-600">
                      {new Date(technician.next_job_time).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TechnicianPanel;
