import {
  X,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { Link } from "react-router-dom";

interface TechnicianJobDetailSheetProps {
  job: any;
  onClose: () => void;
}

const TechnicianJobDetailSheet = ({
  job,
  onClose,
}: TechnicianJobDetailSheetProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 rounded-t-lg shadow-lg p-4 z-50 max-w-lg mx-auto">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-lg">{job.name}</h3>
          <div className="flex gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                job.status === "scheduled"
                  ? "bg-blue-100 text-blue-800"
                  : job.status === "unscheduled"
                  ? "bg-yellow-100 text-yellow-800"
                  : job.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {job.status}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
              {job.type}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400">
          <X size={20} />
        </button>
      </div>
      <div className="mb-2 text-sm text-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} />
          <span>{job.locations?.name}</span>
        </div>
        <div className="ml-6 text-xs text-gray-500">
          {job.locations?.address}, {job.locations?.city},{" "}
          {job.locations?.state} {job.locations?.zip}
        </div>
        {job.units && job.units.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Briefcase size={14} />
            <span>
              Units: {job.units.map((unit: any) => unit.unit_number).join(", ")}
            </span>
          </div>
        )}
        {job.schedule_start && (
          <div className="flex items-center gap-2 mt-2">
            <Calendar size={14} />
            <span>
              {new Date(job.schedule_start).toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
        {job.contact_name && (
          <div className="flex items-center gap-2 mt-2">
            <User size={14} />
            <span>{job.contact_name}</span>
          </div>
        )}
        {job.contact_phone && (
          <div className="flex items-center gap-2 mt-1">
            <Phone size={14} />
            <a
              href={`tel:${job.contact_phone}`}
              className="text-primary-600 hover:text-primary-800"
            >
              {job.contact_phone}
            </a>
          </div>
        )}
        {job.contact_email && (
          <div className="flex items-center gap-2 mt-1">
            <Mail size={14} />
            <a
              href={`mailto:${job.contact_email}`}
              className="text-primary-600 hover:text-primary-800"
            >
              {job.contact_email}
            </a>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <Link to={`/tech/jobs/${job.id}`} className="btn btn-primary flex-1">
          <Briefcase size={16} className="mr-2" />
          View Full Job
        </Link>
      </div>
    </div>
  );
};

export default TechnicianJobDetailSheet;
