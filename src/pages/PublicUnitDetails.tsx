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
};

type Job = Database["public"]["Tables"]["jobs"]["Row"] & {
  job_items?: {
    total_cost: number;
  }[];
};

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PublicUnitDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
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
              building_name,
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

        // Fetch only recent completed jobs for public view
        if (data) {
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
              updated_at
            `
            )
            .eq("unit_id", id)
            .eq("status", "completed")
            .order("updated_at", { ascending: false })
            .limit(5);

          if (jobsError) throw jobsError;
          setRecentJobs(jobsData || []);
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
                  <Building className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium">
                      {unit.locations.companies.name}
                    </p>
                    <p>{unit.locations.name}</p>
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
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-500">
                          Job #{job.number}
                        </span>
                        <span className="badge bg-green-100 text-green-800">
                          completed
                        </span>
                      </div>
                      <p className="font-medium">{job.name}</p>
                      {job.service_line && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <Tag size={14} />
                          <span>{job.service_line}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 flex items-center justify-end gap-1">
                        <Clock size={14} />
                        <span>{formatDate(job.updated_at)}</span>
                      </div>
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
          <p className="mt-1">
            For full access or to schedule service, please contact our office.
          </p>
          <p className="mt-4">
            © {new Date().getFullYear()} Airlast HVAC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicUnitDetails;
