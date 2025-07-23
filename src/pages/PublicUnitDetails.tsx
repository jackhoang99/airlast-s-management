import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Building,
  Calendar,
  Tag,
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  Package,
  Eye,
  Users,
} from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";

type Unit = Database["public"]["Tables"]["units"]["Row"] & {
  locations: {
    name: string;
    building_name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    company_id: string;
    companies: {
      name: string;
    };
  };
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  primary_contact_type?: string | null;
};

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
};

type Asset = {
  id: string;
  unit_id: string;
  model?: {
    model_number: string;
    serial_number: string;
    age: string;
    tonnage: string;
    unit_type: string;
    system_type: string;
    comment: string;
  };
  inspection_date: string | null;
  created_at: string;
  updated_at: string;
};

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PublicUnitDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnit = async () => {
      if (!supabase || !id) return;

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        setError("Invalid unit ID format");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("units")
          .select(
            `
            *,
            locations (
              name,
              address,
              city,
              state,
              zip,
              company_id,
              companies (
                name
              )
            )
          `
          )
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        setUnit(data);

        // Fetch recent jobs for public view via job_units join table
        if (data) {
          const { data: jobUnitsData, error: jobUnitsError } = await supabase
            .from("job_units")
            .select("job_id")
            .eq("unit_id", id);
          if (jobUnitsError) throw jobUnitsError;

          console.log("Job units data:", jobUnitsData);

          if (jobUnitsData && jobUnitsData.length > 0) {
            const jobIds = jobUnitsData.map((ju: any) => ju.job_id);

            // Fetch detailed job information directly from jobs table
            const { data: jobsData, error: jobsError } = await supabase
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
                locations (
                  name,
                  address,
                  city,
                  state,
                  zip,
                  companies (
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
                )
              `
              )
              .in("id", jobIds)
              .order("updated_at", { ascending: false })
              .limit(10);

            if (jobsError) throw jobsError;

            console.log("Detailed jobs data:", jobsData);
            setRecentJobs((jobsData as unknown as Job[]) || []);
          } else {
            setRecentJobs([]);
          }

          // Fetch assets for this unit
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select("*")
            .eq("unit_id", id)
            .order("inspection_date", { ascending: false });

          if (assetsError) throw assetsError;
          setAssets(assetsData || []);
        }
      } catch (err) {
        console.error("Error fetching unit:", err);
        setError("Failed to fetch unit details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnit();
  }, [supabase, id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-center mb-4">
            Unit Not Found
          </h1>
          <p className="text-gray-600 text-center mb-6">
            {error || "The requested unit could not be found."}
          </p>
          <div className="flex justify-center">
            <a href="/" className="btn btn-primary">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with logo */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/airlast-logo.svg"
              alt="Airlast HVAC"
              className="h-8 mr-3"
            />
            <h1 className="text-xl font-bold">Unit Information</h1>
          </div>
          <a
            href="/"
            className="text-primary-600 hover:text-primary-800 text-sm"
          >
            Airlast HVAC
          </a>
        </div>

        {/* Unit Details Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary-600" />
              Unit {unit.unit_number}
            </h2>
            <span
              className={`badge ${
                unit.status.toLowerCase() === "active"
                  ? "bg-success-100 text-success-800"
                  : "bg-error-100 text-error-800"
              }`}
            >
              {unit.status.toLowerCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium mb-3">Location</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="font-medium">
                      {unit.locations.companies.name}
                    </p>
                    <p>{unit.locations.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-medium mb-3">Contact Information</h3>
              {unit.primary_contact_email || unit.primary_contact_phone ? (
                <div className="space-y-2">
                  {unit.primary_contact_type && (
                    <div className="text-sm">
                      <span className="text-gray-500">Contact Type:</span>{" "}
                      {unit.primary_contact_type}
                    </div>
                  )}
                  {unit.primary_contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <a
                        href={`mailto:${unit.primary_contact_email}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {unit.primary_contact_email}
                      </a>
                    </div>
                  )}
                  {unit.primary_contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <a
                        href={`tel:${unit.primary_contact_phone}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {unit.primary_contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">
                  No contact information available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Location Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium mb-3">Address</h3>
              <div className="space-y-2">
                <p className="font-medium">{unit.locations.name}</p>
                <p>{unit.locations.address}</p>
                <p>
                  {unit.locations.city}, {unit.locations.state}{" "}
                  {unit.locations.zip}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-md font-medium mb-3">Company</h3>
              <div className="space-y-2">
                <p className="font-medium">{unit.locations.companies.name}</p>
                <p className="text-sm text-gray-600">Unit {unit.unit_number}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            Assets
          </h2>
          {assets.length > 0 ? (
            <div className="space-y-4">
              {assets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-4">
                  <div className="font-medium text-primary-700 mb-2">
                    {asset.model?.model_number || "(No Model #)"} -{" "}
                    {asset.model?.serial_number || "(No Serial #)"}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                    <div>
                      <span className="font-semibold">Age:</span>{" "}
                      {asset.model?.age ?? "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Tonnage:</span>{" "}
                      {asset.model?.tonnage ?? "-"}
                    </div>
                    <div>
                      <span className="font-semibold">Unit Type:</span>{" "}
                      {asset.model?.unit_type ?? "-"}
                    </div>
                    <div>
                      <span className="font-semibold">System Type:</span>{" "}
                      {asset.model?.system_type ?? "-"}
                    </div>
                  </div>
                  {asset.model?.comment && (
                    <div className="text-sm text-gray-600 mt-2">
                      <span className="font-semibold">Notes:</span>{" "}
                      {asset.model.comment}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Inspection Date:{" "}
                    {asset.inspection_date
                      ? formatDate(asset.inspection_date)
                      : "Not inspected"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No assets found</p>
              <p className="text-xs text-gray-500 mt-1">
                Asset information will appear after inspections
              </p>
            </div>
          )}
        </div>

        {/* Recent Service History */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            Recent Service History
          </h2>

          {recentJobs.length > 0 ? (
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Top row with job number and badges */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Job #{job.number}
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            job.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : job.status === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : job.status === "unscheduled"
                              ? "bg-yellow-100 text-yellow-800"
                              : job.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {job.status || "unknown"}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                          {job.type}
                        </span>
                        {job.service_contract && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                            {job.service_contract}
                          </span>
                        )}
                        {job.is_training && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            training
                          </span>
                        )}
                      </div>

                      {/* Job name */}
                      <h3 className="text-lg font-bold text-primary-600 mb-1">
                        {job.name}
                      </h3>

                      {/* Client and location info */}
                      {job.locations && (
                        <div className="text-sm text-gray-600 mb-1">
                          {job.locations.companies?.name && (
                            <span>{job.locations.companies.name}</span>
                          )}
                          {job.locations.name && (
                            <span> • {job.locations.name}</span>
                          )}
                          {job.locations.address && (
                            <div className="text-gray-500">
                              {job.locations.address} • {job.locations.city},{" "}
                              {job.locations.state}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Technicians */}
                      {job.job_technicians &&
                        job.job_technicians.length > 0 && (
                          <div className="text-sm text-gray-600 mb-1">
                            Technicians:{" "}
                            {job.job_technicians
                              .map((jt, idx) => {
                                const fullName = `${
                                  jt.users.first_name || ""
                                } ${jt.users.last_name || ""}`.trim();
                                return fullName;
                              })
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}

                      {/* Contact info */}
                      {(job.contact_name || job.contact_email) && (
                        <div className="text-sm text-gray-600">
                          {job.contact_name && <span>{job.contact_name}</span>}
                          {job.contact_email && (
                            <span>
                              {job.contact_name ? " • " : ""}
                              {job.contact_email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side - dates and scheduling */}
                    <div className="text-right text-xs sm:text-sm min-w-0 flex-shrink-0 ml-2">
                      <div className="text-gray-500 mb-1">
                        <span className="hidden sm:inline">Start: </span>
                        <span className="sm:hidden">S: </span>
                        {formatDate(job.time_period_start)}
                      </div>
                      <div className="text-gray-500 mb-1">
                        <span className="hidden sm:inline">Due: </span>
                        <span className="sm:hidden">D: </span>
                        {formatDate(job.time_period_due)}
                      </div>
                      {job.schedule_start && (
                        <div className="text-gray-500">
                          <span className="hidden sm:inline">Schedule: </span>
                          <span className="sm:hidden">Sch: </span>
                          {formatDate(job.schedule_start)}
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
              <p className="text-gray-500">No service history available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This information is provided by Airlast HVAC for reference purposes
            only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicUnitDetails;
