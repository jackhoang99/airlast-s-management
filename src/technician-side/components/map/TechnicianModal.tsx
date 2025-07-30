import { Dialog } from "@headlessui/react";
import {
  X,
  MapPin,
  LogIn,
  LogOut,
  Navigation,
  Play,
  Square,
} from "lucide-react";
import { Technician } from "../../types/technician";

interface TechnicianModalProps {
  technician: Technician | null;
  isOpen: boolean;
  enRouteTechnicians: Set<string>;
  onClose: () => void;
  onCheckInOut: (technician: Technician) => void;
  onEnRoute: (technician: Technician) => void;
  onStartJob: (jobId: string) => void;
  onEndJob: (jobId: string) => void;
  getTechnicianJobs: (technicianId: string) => any[];
  onUpdateLocation?: (technicianId: string, latitude: number, longitude: number) => void;
}

const TechnicianModal = ({
  technician,
  isOpen,
  enRouteTechnicians,
  onClose,
  onCheckInOut,
  onEnRoute,
  onStartJob,
  onEndJob,
  getTechnicianJobs,
  onUpdateLocation,
}: TechnicianModalProps) => {
  if (!technician) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Technician Details
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Technician Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-700">
                    {technician.first_name[0]}
                    {technician.last_name[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {technician.first_name} {technician.last_name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      technician.status === "available"
                        ? "bg-green-100 text-green-800"
                        : technician.status === "on_job"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {technician.status === "available"
                      ? "Available"
                      : technician.status === "on_job"
                      ? "On Job"
                      : "Offline"}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {technician.job_count}
                  </p>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {technician.current_job_id ? "1" : "0"}
                  </p>
                  <p className="text-sm text-gray-600">Current Job</p>
                </div>
              </div>

              {/* Location Info */}
              <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {technician.technician_location
                      ? "Current Location:"
                      : "Assigned Location:"}
                  </span>
                  <span className="font-semibold text-blue-600 flex items-center gap-1">
                    <MapPin size={14} />
                    {technician.technician_location
                      ? "Current Location"
                      : "Atlanta, GA"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Coordinates:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {technician.technician_location
                      ? `${technician.technician_location.latitude.toFixed(4)}, ${technician.technician_location.longitude.toFixed(4)}`
                      : technician.current_location
                      ? `${technician.current_location.lat.toFixed(4)}, ${technician.current_location.lng.toFixed(4)}`
                      : `${technician.location?.lat?.toFixed(4)}, ${technician.location?.lng?.toFixed(4)}`
                    }
                  </span>
                </div>
                {technician.technician_location && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="font-mono text-xs text-gray-500">
                      {new Date(technician.technician_location.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Manual Update Location Button (for testing/debugging) */}
              {onUpdateLocation && (
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          onUpdateLocation(
                            technician.id,
                            position.coords.latitude,
                            position.coords.longitude
                          );
                        },
                        (error) => {
                          console.log("Error getting location:", error);
                        }
                      );
                    }
                  }}
                  className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Force Update Location (Debug)
                </button>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-2">
                <button
                  onClick={() => onCheckInOut(technician)}
                  className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                    technician.status === "available"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {technician.status === "available" ? (
                    <>
                      <LogIn size={16} />
                      Check In
                    </>
                  ) : (
                    <>
                      <LogOut size={16} />
                      Check Out
                    </>
                  )}
                </button>

                {technician.current_job_id && (
                  <button
                    onClick={() => onEnRoute(technician)}
                    className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                      enRouteTechnicians.has(technician.id)
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    <Navigation size={16} />
                    {enRouteTechnicians.has(technician.id)
                      ? "En Route"
                      : "En Route"}
                  </button>
                )}
              </div>

              {/* Assigned Jobs List */}
              <div className="pt-4">
                <h5 className="font-semibold mb-2">Today's Jobs</h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getTechnicianJobs(technician.id).map((job) => (
                    <div
                      key={job.id}
                      className="p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{job.name}</p>
                          <p className="text-xs text-gray-600">
                            {job.locations?.address}, {job.locations?.city}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {job.status === "scheduled" && (
                            <button
                              onClick={() => onStartJob(job.id)}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                              title="Start Job"
                            >
                              <Play size={12} />
                            </button>
                          )}
                          {job.status === "in_progress" && (
                            <button
                              onClick={() => onEndJob(job.id)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                              title="End Job"
                            >
                              <Square size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default TechnicianModal;
