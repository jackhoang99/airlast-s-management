import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Building,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Map from "../../components/ui/Map";

const CustomerUnitDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const companyId = sessionStorage.getItem("customerPortalCompanyId");
    if (!companyId) {
      navigate("/customer/login");
      return;
    }
    setCompanyId(companyId);

    const fetchUnitDetails = async () => {
      if (!supabase || !id) return;

      try {
        setIsLoading(true);

        // Fetch unit details with location
        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select(
            `
            *,
            locations (
              id,
              name,
              address,
              city,
              state,
              zip,
              company_id
            )
          `
          )
          .eq("id", id)
          .single();

        if (unitError) throw unitError;

        if (!unitData) {
          throw new Error("Unit not found");
        }

        // Verify this unit belongs to the logged-in company
        if (unitData.locations?.company_id !== companyId) {
          throw new Error("You do not have access to this unit");
        }

        setUnit(unitData);

        // Fetch jobs for this unit via job_units join table
        const { data: jobUnitsData, error: jobUnitsError } = await supabase
          .from("job_units")
          .select("job_id, jobs:job_id(*)")
          .eq("unit_id", id);
        if (jobUnitsError) throw jobUnitsError;
        const jobs = (jobUnitsData || []).map((ju: any) => ju.jobs);
        setJobs(jobs);
      } catch (err) {
        console.error("Error fetching unit details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load unit details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnitDetails();
  }, [supabase, id, navigate]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Unit
        </h3>
        <p className="text-gray-500 mb-4">{error || "Unit not found"}</p>
        <Link to="/customer/units" className="btn btn-primary">
          Back to Units
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/customer/units"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Unit {unit.unit_number}</h1>
        </div>
        <span
          className={`badge ${
            unit.status === "active"
              ? "bg-success-100 text-success-800"
              : "bg-error-100 text-error-800"
          }`}
        >
          {unit.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Unit Details</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Unit Number
                </label>
                <p className="text-lg font-medium">{unit.unit_number}</p>
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
                      to={`/customer/locations/${unit.location_id}`}
                      className="text-lg font-medium text-primary-600 hover:text-primary-800"
                    >
                      {unit.locations?.name}
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p>{unit.locations?.address}</p>
                    <p>
                      {unit.locations?.city}, {unit.locations?.state}{" "}
                      {unit.locations?.zip}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Map
                address={unit.locations?.address}
                city={unit.locations?.city}
                state={unit.locations?.state}
                zip={unit.locations?.zip}
              />

              <div className="mt-4 space-y-2">
                <Link
                  to={`/customer/jobs?unitId=${unit.id}`}
                  className="btn btn-primary w-full justify-start"
                >
                  <Calendar size={16} className="mr-2" />
                  View Service History
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/customer/units/${unit.id}/assets`}
                className="btn btn-secondary w-full justify-start"
              >
                <Building2 size={16} className="mr-2" />
                View Assets
              </Link>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Service History</h2>

            {jobs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No service history found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/customer/jobs/${job.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{job.name}</h3>
                        <p className="text-xs text-gray-500">
                          Job #{job.number}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      {job.schedule_start ? (
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(job.schedule_start)}
                        </div>
                      ) : (
                        <div className="text-yellow-600">Not scheduled</div>
                      )}
                    </div>

                    {job.description && (
                      <div className="mt-2 text-sm text-gray-500 line-clamp-2">
                        {job.description}
                      </div>
                    )}
                  </Link>
                ))}

                <Link
                  to={`/customer/jobs?unitId=${unit.id}`}
                  className="block text-center text-primary-600 hover:text-primary-800 text-sm font-medium mt-4"
                >
                  View All Service History
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerUnitDetails;
