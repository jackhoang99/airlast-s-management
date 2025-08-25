import { Building2, Calendar, Hash, FileText } from "lucide-react";
import { Job } from "../../types/job";

type JobPartsOrderedSectionProps = {
  job: Job;
};

const JobPartsOrderedSection = ({ job }: JobPartsOrderedSectionProps) => {
  // Only show this section if the job type is "parts ordered"
  if (job.type !== "parts ordered") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start space-x-3">
          <Building2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-700">Vendor</div>
            <div className="text-sm text-gray-900">{job.vendor || "N/A"}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Hash className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-700">Part Number</div>
            <div className="text-sm text-gray-900">
              {job.part_number || "N/A"}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-700">PO Number</div>
            <div className="text-sm text-gray-900">
              {job.po_number || "N/A"}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Calendar className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-700">
              Date Ordered
            </div>
            <div className="text-sm text-gray-900">
              {job.date_ordered
                ? new Date(job.date_ordered).toLocaleDateString()
                : "N/A"}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Calendar className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-700">
              Estimated Arrival
            </div>
            <div className="text-sm text-gray-900">
              {job.estimated_arrival_date
                ? new Date(job.estimated_arrival_date).toLocaleDateString()
                : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator based on arrival date */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-medium text-gray-700">Status:</div>
          {job.estimated_arrival_date ? (
            (() => {
              const today = new Date();
              const arrivalDate = new Date(job.estimated_arrival_date);
              const daysUntilArrival = Math.ceil(
                (arrivalDate.getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              if (daysUntilArrival < 0) {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                );
              } else if (daysUntilArrival === 0) {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Arriving Today
                  </span>
                );
              } else if (daysUntilArrival <= 3) {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Arriving Soon ({daysUntilArrival} day
                    {daysUntilArrival !== 1 ? "s" : ""})
                  </span>
                );
              } else {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    On Track ({daysUntilArrival} day
                    {daysUntilArrival !== 1 ? "s" : ""} remaining)
                  </span>
                );
              }
            })()
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              No arrival date set
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPartsOrderedSection;
