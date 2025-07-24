import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Plus, User } from "lucide-react";
import { useSupabase } from "../../lib/supabase-context";

type Job = {
  id: string;
  number: string;
  name: string;
  status: string;
  type: string;
  service_line: string | null;
  schedule_start: string | null;
  schedule_duration: string | null;
  time_period_start: string;
  time_period_due: string;
  updated_at: string;
  created_at: string;
  description: string | null;
  problem_description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_type: string | null;
  service_contract: string | null;
  customer_po: string | null;
  office: string | null;
  is_training: boolean | null;
  additional_type?: string;
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    companies: {
      name: string;
    };
  };
  job_technicians?: {
    users: {
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
    };
  }[];
  job_items?: {
    total_cost: number;
  }[];
  units?: Array<{
    id?: string;
    unit_number: string;
  }>;
};

interface JobsSectionProps {
  locationId?: string;
  companyId?: string;
  unitId?: string;
  title?: string;
  createJobLink?: string;
}

const JobsSection: React.FC<JobsSectionProps> = ({
  locationId,
  companyId,
  unitId,
  title = "Jobs",
  createJobLink,
}) => {
  const { supabase } = useSupabase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase) return;

      try {
        setLoading(true);
        let query = supabase
          .from("jobs")
          .select(
            `
            id,
            number,
            name,
            status,
            type,
            service_line,
            schedule_start,
            schedule_duration,
            time_period_start,
            time_period_due,
            updated_at,
            created_at,
            description,
            problem_description,
            contact_name,
            contact_phone,
            contact_email,
            contact_type,
            service_contract,
            customer_po,
            office,
            is_training,
            additional_type,
            locations (
              id,
              name,
              address,
              city,
              state,
              zip,
              company_id,
              companies (
                id,
                name
              )
            ),
            job_technicians (
              users (
                first_name,
                last_name,
                email,
                phone
              )
            ),
            job_items (
              total_cost
            ),
            job_units (
              units (
                id,
                unit_number
              )
            )
          `
          )
          .order("updated_at", { ascending: false });

        // Filter by location, company, or unit
        if (locationId) {
          query = query.eq("location_id", locationId);
        } else if (companyId) {
          query = query.eq("locations.company_id", companyId);
        } else if (unitId) {
          // For unit filtering, we need to use a different approach
          // First get job IDs that are associated with this unit
          const { data: jobUnitsData, error: jobUnitsError } = await supabase
            .from("job_units")
            .select("job_id")
            .eq("unit_id", unitId);
          
          if (jobUnitsError) throw jobUnitsError;
          
          if (jobUnitsData && jobUnitsData.length > 0) {
            const jobIds = jobUnitsData.map((ju: any) => ju.job_id);
            query = query.in("id", jobIds);
          } else {
            // No jobs found for this unit
            setJobs([]);
            setLoading(false);
            return;
          }
        }

        const { data, error } = await query;

        if (error) throw error;

        // Transform the data to flatten units
        const transformedJobs = (data || []).map((job: any) => ({
          ...job,
          units: unitId 
            ? job.job_units?.filter((ju: any) => ju.units?.id === unitId).map((ju: any) => ju.units) || []
            : job.job_units?.map((ju: any) => ju.units) || [],
        }));

        setJobs(transformedJobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [supabase, locationId, companyId, unitId]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "unscheduled":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeBadgeClass = (type: string) => {
    const colorMap: { [key: string]: string } = {
      maintenance: "bg-purple-500 text-white",
      "service call": "bg-teal-500 text-white",
      inspection: "bg-blue-500 text-white",
      repair: "bg-orange-500 text-white",
      installation: "bg-green-500 text-white",
    };

    return colorMap[type.toLowerCase()] || "bg-gray-500 text-white";
  };

  const getJobTotalCost = (job: Job) => {
    return job.job_items?.reduce((sum, item) => sum + item.total_cost, 0) || 0;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <span className="badge">{jobs.length} Jobs</span>
          {createJobLink && (
            <Link to={createJobLink} className="btn btn-primary btn-sm">
              <Plus size={14} className="mr-1" />
              Create Job
            </Link>
          )}
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Top row with job number and badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Job #{job.number}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getTypeBadgeClass(
                        job.type
                      )}`}
                    >
                      {job.type}
                      {job.type === "maintenance" && job.additional_type && (
                        <span className="ml-1">• {job.additional_type}</span>
                      )}
                    </span>
                    {job.service_contract && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                        {job.service_contract}
                      </span>
                    )}
                    {job.job_items && job.job_items.length > 0 && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        ${getJobTotalCost(job).toFixed(2)}
                      </span>
                    )}
                    {job.is_training && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        training
                      </span>
                    )}
                  </div>

                  {/* Job name */}
                  <Link
                    to={`/jobs/${job.id}`}
                    className="text-lg font-bold text-primary-600 hover:text-primary-800 mb-1 block"
                  >
                    {job.name}
                  </Link>

                  {/* Client and location info */}
                  {job.locations && (
                    <div className="text-sm text-gray-600 mb-1">
                      {job.locations.companies?.name &&
                        job.locations.companies?.id && (
                          <span>
                            <Link
                              to={`/companies/${job.locations.companies.id}`}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              {job.locations.companies.name}
                            </Link>
                          </span>
                        )}
                      {job.locations.name && job.locations.id && (
                        <span>
                          {job.locations.companies?.name &&
                          job.locations.companies?.id
                            ? " "
                            : ""}
                          •{" "}
                          <Link
                            to={`/locations/${job.locations.id}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {job.locations.name}
                          </Link>
                        </span>
                      )}
                      {job.locations.address && (
                        <div className="text-gray-500">
                          {job.locations.address} • {job.locations.city},{" "}
                          {job.locations.state}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Units */}
                  {job.units && job.units.length > 0 && (
                    <div className="text-sm text-gray-600 mb-1">
                      Unit{job.units.length > 1 ? "s" : ""}:{" "}
                      {job.units
                        .filter((unit) => unit && unit.unit_number)
                        .map((unit, idx) => (
                          <span key={unit?.id || idx}>
                            {unit?.id ? (
                              <Link
                                to={`/units/${unit.id}`}
                                className="text-primary-600 hover:text-primary-800"
                              >
                                {unit.unit_number}
                              </Link>
                            ) : (
                              unit.unit_number
                            )}
                            {idx <
                              job.units!.filter((u) => u && u.unit_number)
                                .length -
                                1 && ", "}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Technicians */}
                  {job.job_technicians && job.job_technicians.length > 0 && (
                    <div className="text-sm text-gray-600 mb-1">
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-gray-400" />
                        <span>
                          {job.job_technicians
                            .filter((tech) => tech && tech.users)
                            .map((tech) =>
                              `${tech.users.first_name || ""} ${
                                tech.users.last_name || ""
                              }`.trim()
                            )
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {job.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </div>

                <div className="text-right text-sm">
                  <div className="text-gray-500 mb-1">
                    Start: {job.time_period_start}
                  </div>
                  <div className="text-gray-500 mb-1">
                    Due: {job.time_period_due}
                  </div>
                  {job.schedule_start && (
                    <div className="text-gray-500">
                      Schedule: {formatDateTime(job.schedule_start)}
                      {job.schedule_duration && (
                        <span> ({job.schedule_duration})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">
            No jobs found
            {locationId && " for this location"}
            {companyId && " for this company"}
          </p>
          {createJobLink && (
            <Link to={createJobLink} className="btn btn-primary">
              <Plus size={16} className="mr-2" />
              Create Job
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default JobsSection;
