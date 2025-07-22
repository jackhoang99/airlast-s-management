import { Briefcase, MapPin, Calendar, Clock, Navigation } from "lucide-react";
import { Link } from "react-router-dom";

interface TechnicianJobListProps {
  jobs: any[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onNavigateToJob: (job: any) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const TechnicianJobList = ({
  jobs,
  selectedJobId,
  onSelectJob,
  onNavigateToJob,
  searchTerm,
  setSearchTerm,
}: TechnicianJobListProps) => {
  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.number.toLowerCase().includes(searchLower) ||
      (job.locations?.name &&
        job.locations.name.toLowerCase().includes(searchLower)) ||
      (job.locations?.address &&
        job.locations.address.toLowerCase().includes(searchLower)) ||
      (job.locations?.city &&
        job.locations.city.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h2 className="font-medium flex items-center">
          <Briefcase size={16} className="mr-2 text-primary-600" />
          Jobs ({filteredJobs.length})
        </h2>
        <input
          type="text"
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full mt-2"
        />
      </div>
      {filteredJobs.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500">No jobs found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer ${
                selectedJobId === job.id
                  ? "bg-primary-50 border-l-4 border-primary-500"
                  : ""
              }`}
              onClick={() => onSelectJob(job.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{job.name}</h3>
                  <p className="text-sm text-gray-500">
                    {job.locations?.name}
                    {job.units && job.units.length > 0
                      ? ` • Units ${job.units
                          .map((unit: any) => unit.unit_number)
                          .join(", ")}`
                      : ""}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <MapPin size={12} className="mr-1" />
                    <span>
                      {job.locations?.address}, {job.locations?.city}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-xs text-gray-600">
                    <Calendar size={12} className="mr-1" />
                    {job.schedule_start
                      ? new Date(job.schedule_start).toLocaleDateString()
                      : "Unscheduled"}
                  </div>
                  {job.schedule_start && (
                    <div className="flex items-center text-xs text-gray-600 mt-1">
                      <Clock size={12} className="mr-1" />
                      {new Date(job.schedule_start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2 flex justify-between">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full
                  ${
                    job.status === "scheduled"
                      ? "bg-blue-100 text-blue-800"
                      : job.status === "unscheduled"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }
                `}
                >
                  {job.status}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToJob(job);
                    }}
                    className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full flex items-center"
                  >
                    <Navigation size={10} className="mr-1" />
                    Navigate
                  </button>
                  <Link
                    to={`/tech/jobs/${job.id}`}
                    className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TechnicianJobList;
