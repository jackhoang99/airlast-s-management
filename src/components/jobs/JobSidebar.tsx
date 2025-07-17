import { Calendar, Building2 } from "lucide-react";
import { Job } from "../../types/job";
import Map from "../ui/Map";

type JobSidebarProps = {
  job: Job;
};

const JobSidebar = ({ job }: JobSidebarProps) => {
  return (
    <div>
      <div className="card">
        <h2 className="text-lg font-medium mb-4">Job Information</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Job Number</h3>
            <p>{job.number}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="capitalize">{job.status}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <p className="capitalize">{job.type}</p>
          </div>
          {job.service_line && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Service Line
              </h3>
              <p>{job.service_line}</p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p>{new Date(job.created_at).toLocaleDateString()}</p>
          </div>
          {job.customer_po && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Customer PO</h3>
              <p>{job.customer_po}</p>
            </div>
          )}
          {job.service_contract && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Service Contract
              </h3>
              <p>{job.service_contract}</p>
            </div>
          )}
          {job.units && job.units.length > 0 && (
            <div className="mb-2">
              <span className="font-medium">Units:</span>{" "}
              {job.units.map((u: any) => u.unit_number).join(", ")}
            </div>
          )}
        </div>
      </div>

      {job.locations && (
        <div className="card mt-6">
          <h2 className="text-lg font-medium mb-4">Location</h2>
          <Map
            address={job.locations.address}
            city={job.locations.city}
            state={job.locations.state}
            zip={job.locations.zip}
            className="mt-4"
          />
        </div>
      )}
    </div>
  );
};

export default JobSidebar;
