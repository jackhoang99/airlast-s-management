import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Building2, Calendar, User, ArrowRight, X } from "lucide-react";
import QuickAssetViewModal from "../locations/QuickAssetViewModal";

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    number: string;
    name: string;
    status: string;
    type: string;
    additional_type?: string;
    schedule_start?: string;
    description?: string;
    locations?: {
      id?: string;
      name: string;
      address?: string;
      city?: string;
      state?: string;
      companies?: {
        id?: string;
        name: string;
      };
    };
    job_technicians?: {
      technician_id: string;
      is_primary: boolean;
      users: {
        first_name: string;
        last_name: string;
      };
    }[];
    units?: Array<{
      id?: string;
      unit_number: string;
    }>;
  };
  onViewAssets?: (location: any, units: any[]) => void;
  showViewAssetsButton?: boolean;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  onViewAssets,
  showViewAssetsButton = true,
}) => {
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const getJobTypeColorClass = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      "preventative maintenance": "bg-purple-100 text-purple-800",
      "service call": "bg-teal-100 text-teal-800",
      inspection: "bg-blue-100 text-blue-800",
      repair: "bg-orange-100 text-orange-800",
      installation: "bg-green-100 text-green-800",
      "planned maintenance": "bg-indigo-100 text-indigo-800",
    };

    return colorMap[type.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Job Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-lg">{job.name}</h4>
            <p className="text-gray-600 text-sm">Job #{job.number}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getJobTypeColorClass(
                  job.status
                )}`}
              >
                {job.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getJobTypeColorClass(
                  job.type
                )}`}
              >
                {job.type}
                {(job.type === "preventative maintenance" ||
                  job.type === "planned maintenance") &&
                  job.additional_type && (
                    <span className="ml-1">• {job.additional_type}</span>
                  )}
              </span>
            </div>
          </div>
          {job.locations && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Location</p>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <Link
                    to={
                      job.locations.id ? `/locations/${job.locations.id}` : "#"
                    }
                    className="font-medium underline hover:text-primary-700"
                    onClick={onClose}
                  >
                    {job.locations.name}
                  </Link>
                  {job.locations.address && (
                    <p className="text-sm text-gray-600">
                      <Link
                        to={
                          job.locations.id
                            ? `/locations/${job.locations.id}`
                            : "#"
                        }
                        className="underline hover:text-primary-700"
                        onClick={onClose}
                      >
                        {job.locations.address}
                      </Link>
                    </p>
                  )}
                  {(job.locations.city || job.locations.state) && (
                    <p className="text-sm text-gray-600">
                      {job.locations.city}, {job.locations.state}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Company clickable if available */}
          {job.locations &&
            job.locations.companies &&
            job.locations.companies.id && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Company</p>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400" />
                  <Link
                    to={`/companies/${job.locations.companies.id}`}
                    className="font-medium underline hover:text-primary-700"
                    onClick={onClose}
                  >
                    {job.locations.companies.name || "View Company"}
                  </Link>
                </div>
              </div>
            )}
          {job.schedule_start && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Scheduled</p>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-sm">
                  {new Date(job.schedule_start).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          {job.job_technicians && job.job_technicians.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Assigned Technicians</p>
              <div className="space-y-1">
                {job.job_technicians.map((tech) => (
                  <div
                    key={tech.technician_id}
                    className="flex items-center gap-2"
                  >
                    <User size={14} className="text-gray-400" />
                    <span className="text-sm">
                      {tech.users.first_name} {tech.users.last_name}
                      {tech.is_primary && (
                        <span className="ml-1 text-xs bg-primary-100 text-primary-700 px-1 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Show units if available */}
          {job.units && job.units.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Units</p>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {job.units.map((unit, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    {unit.id ? (
                      <Link
                        to={`/units/${unit.id}`}
                        className="underline hover:text-primary-700"
                        onClick={onClose}
                      >
                        {unit.unit_number}
                      </Link>
                    ) : (
                      <span>{unit.unit_number}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {job.description && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700">{job.description}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href={`/jobs/${job.id}`}
            className="btn btn-primary flex items-center justify-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Full Job Page
            <ArrowRight size={16} className="ml-2" />
          </a>
          {showViewAssetsButton && job.units && job.units.length > 0 ? (
            <button
              className="btn btn-secondary flex items-center justify-center"
              onClick={() => {
                if (onViewAssets) {
                  onViewAssets(job.locations, job.units);
                } else {
                  setShowAssetsModal(true);
                }
              }}
            >
              View Assets
            </button>
          ) : null}
        </div>
      </div>

      {/* Assets Modal */}
      {job.locations && (
        <QuickAssetViewModal
          open={showAssetsModal}
          onClose={() => setShowAssetsModal(false)}
          location={job.locations as any}
          units={job.units as any}
        />
      )}
    </div>
  );
};

export default JobDetailsModal;
