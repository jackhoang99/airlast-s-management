import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Building,
  Calendar,
  Clock,
  Tag,
  Plus,
  Package,
  Users,
  Mail,
  Phone,
} from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import BackLink from "../components/ui/BackLink";
import BackButton from "../components/ui/BackButton";
import ArrowBack from "../components/ui/ArrowBack";
import { Database } from "../types/supabase";
import Map from "../components/ui/Map";
import UnitQRCode from "../components/units/UnitQRCode";
import AssetSummary from "../components/locations/AssetSummary";
import { Dialog } from "@headlessui/react";
import AddAssetForm from "../components/locations/AddAssetForm";

type Unit = Database["public"]["Tables"]["units"]["Row"] & {
  locations: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    company_id: string;
    companies: {
      name: string;
    };
  };
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
  job_items?: {
    total_cost: number;
  }[];
};

type Asset = {
  id: string;
  unit_id: string;
  model: {
    model_number: string;
    serial_number: string;
    age: number;
    tonnage: string;
    unit_type: string;
    system_type: string;
    job_id: string;
    inspection_id: string;
  };
  inspection_date: string;
  created_at: string;
  updated_at: string;
};

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UnitDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);

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
      } catch (err) {
        console.error("Error fetching unit:", err);
        setError("Failed to fetch unit details");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchJobs = async () => {
      if (!supabase || !id) return;

      // Don't fetch jobs if UUID is invalid
      if (!UUID_REGEX.test(id)) return;

      try {
        // Fetch job IDs for this unit via job_units join table
        const { data: jobUnitsData, error: jobUnitsError } = await supabase
          .from("job_units")
          .select("job_id")
          .eq("unit_id", id);
        if (jobUnitsError) throw jobUnitsError;

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
              ),
              job_items (
                total_cost
              )
            `
            )
            .in("id", jobIds)
            .order("updated_at", { ascending: false });

          if (jobsError) throw jobsError;
          setJobs(jobsData || []);
        } else {
          setJobs([]);
        }
      } catch (err) {
        console.error("Error fetching jobs for unit:", err);
      }
    };

    const fetchAssets = async () => {
      if (!supabase || !id) return;

      // Don't fetch assets if UUID is invalid
      if (!UUID_REGEX.test(id)) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("assets")
          .select(
            `*, units(id, unit_number, location_id, locations(id, name, company_id, companies(id, name)))`
          )
          .eq("unit_id", id)
          .order("inspection_date", { ascending: false });

        if (fetchError) throw fetchError;
        setAssets(data || []);
      } catch (err) {
        console.error("Error fetching assets for unit:", err);
      }
    };

    fetchUnit();
    fetchJobs();
    fetchAssets();
  }, [supabase, id, assetsRefreshKey]);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "unscheduled":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type?.toLowerCase()) {
      case "preventative maintenance":
      case "planned maintenance":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "service call":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "repair":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "installation":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "inspection":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Calculate total cost from job items
  const getJobTotalCost = (job: Job) => {
    if (!job.job_items || job.job_items.length === 0) return 0;
    return job.job_items.reduce(
      (sum, item) => sum + Number(item.total_cost),
      0
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || "Unit not found"}</p>
        <BackLink
          fallbackRoute="/units"
          className="text-primary-600 hover:text-primary-800"
        >
          Back to Units
        </BackLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowBack
            fallbackRoute={`/locations/${unit?.location_id || ""}`}
            className="text-gray-500 hover:text-gray-700"
          />
          <h1 className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {unit.unit_number}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/units/${unit.id}/edit`} className="btn btn-primary">
            Edit Unit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Unit Details Card */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-4">Unit Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Unit Number
                    </label>
                    <p className="text-lg font-medium">{unit.unit_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <p>
                      <span
                        className={`badge ${
                          unit.status.toLowerCase() === "active"
                            ? "bg-success-100 text-success-800"
                            : "bg-error-100 text-error-800"
                        }`}
                      >
                        {unit.status.toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Primary Contact Type
                    </label>
                    <p>{unit.primary_contact_type || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Primary Contact Email
                    </label>
                    <p>{unit.primary_contact_email || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Primary Contact Phone
                    </label>
                    <p>{unit.primary_contact_phone || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-6" />

            {/* Billing Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Billing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing Entity
                  </label>
                  <p>{unit.billing_entity || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing Email
                  </label>
                  <p>{unit.billing_email || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing City
                  </label>
                  <p>{unit.billing_city || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing State
                  </label>
                  <p>{unit.billing_state || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing Zip
                  </label>
                  <p>{unit.billing_zip || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Office
                  </label>
                  <p>{unit.office || "Main Office"}</p>
                </div>
              </div>
            </div>

            <hr className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Location Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <div>
                    <Link
                      to={`/locations/${unit.location_id}`}
                      className="text-lg font-medium text-primary-600 hover:text-primary-800"
                    >
                      {unit.locations.name}
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p>{unit.locations.address}</p>
                    <p>
                      {unit.locations.city}, {unit.locations.state}{" "}
                      {unit.locations.zip}
                    </p>
                  </div>
                </div>
                <div>
                  <Link
                    to={`/companies/${unit.locations.company_id}`}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    {unit.locations.companies.name}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Map
                address={unit.locations.address}
                city={unit.locations.city}
                state={unit.locations.state}
                zip={unit.locations.zip}
                className="mt-4"
              />
            </div>
          </div>

          {/* Jobs Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                Jobs
              </h2>
              <div className="flex items-center gap-2">
                <span className="badge">{jobs.length} Jobs</span>
                <Link
                  to={`/jobs/create?unitId=${unit.id}`}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} className="mr-1" />
                  Create Job
                </Link>
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
                            {(job.type === "preventative maintenance" ||
                              job.type === "planned maintenance") &&
                              job.additional_type && (
                                <span className="ml-1">
                                  • {job.additional_type}
                                </span>
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
                            {job.contact_name && (
                              <span>{job.contact_name}</span>
                            )}
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
                  No jobs found for this unit
                </p>
                <Link
                  to={`/jobs/create?unitId=${unit.id}`}
                  className="btn btn-primary"
                >
                  <Plus size={16} className="mr-2" />
                  Create Job
                </Link>
              </div>
            )}
          </div>

          {/* Asset Summary Section */}
          <div className="card mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Unit Asset Summary
              </h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddAssetModal(true)}
              >
                <Plus size={16} className="mr-1" /> Add Asset
              </button>
            </div>
            <AssetSummary
              assets={assets}
              title="Unit Asset Summary"
              viewAllLink={`/units/${unit.id}/assets`}
            />
          </div>
          <Dialog
            open={showAddAssetModal}
            onClose={() => setShowAddAssetModal(false)}
            className="fixed z-50 inset-0 overflow-y-auto"
          >
            <div className="flex items-center justify-center min-h-screen">
              <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-4">Add Asset</h3>
                <AddAssetForm
                  unitId={id}
                  locationId={unit?.location_id}
                  companyId={unit?.locations?.company_id}
                  onSuccess={() => {
                    setShowAddAssetModal(false);
                    // Refresh assets after adding new asset
                    setAssetsRefreshKey((prev) => prev + 1);
                  }}
                  onCancel={() => setShowAddAssetModal(false)}
                />
              </div>
            </div>
          </Dialog>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to={`/jobs/create?unitId=${unit.id}`}
                className="btn btn-primary w-full justify-start"
              >
                <Calendar size={16} className="mr-2" />
                Create Job
              </Link>
              <Link
                to={`/units/${unit.id}/edit`}
                className="btn btn-secondary w-full justify-start"
              >
                Edit Unit
              </Link>
              <Link
                to={`/units/${unit.id}/assets`}
                className="btn btn-secondary w-full justify-start"
              >
                <Package size={16} className="mr-2" />
                View Assets
              </Link>
            </div>
          </div>

          {/* QR Code Section */}
          <UnitQRCode unitId={unit.id} unitNumber={unit.unit_number} />

          {/* Job Statistics */}
          {jobs.length > 0 && (
            <div className="card mt-6">
              <h2 className="text-lg font-semibold mb-4">Job Statistics</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Jobs</span>
                  <span className="font-medium">{jobs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed Jobs</span>
                  <span className="font-medium">
                    {jobs.filter((job) => job.status === "completed").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Scheduled Jobs</span>
                  <span className="font-medium">
                    {jobs.filter((job) => job.status === "scheduled").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unscheduled Jobs</span>
                  <span className="font-medium">
                    {jobs.filter((job) => job.status === "unscheduled").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium">
                    $
                    {jobs
                      .reduce((sum, job) => sum + getJobTotalCost(job), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitDetails;
