import { useState, useEffect } from "react";
import { Link, useOutletContext, useLocation } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Building2,
  AlertTriangle,
  Package,
} from "lucide-react";

const CustomerJobs = () => {
  const { supabase } = useSupabase();
  const { company, searchTerm: globalSearchTerm } = useOutletContext<{
    company: any;
    searchTerm: string;
  }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const statusParam = searchParams.get("status");
  const unitIdParam = searchParams.get("unitId");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    jobNumber: "",
    location: "",
    unit: "",
    status: statusParam || "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [assets, setAssets] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    // Set local search term from global search if provided
    if (globalSearchTerm) {
      setSearchTerm(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase || !company) return;

      try {
        setIsLoading(true);

        // First get all locations for this company
        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .select("id, name")
          .eq("company_id", company.id)
          .order("name");

        if (locationError) throw locationError;
        setLocations(locationData || []);

        const locationIds = locationData?.map((loc) => loc.id) || [];

        if (locationIds.length === 0) {
          setJobs([]);
          setIsLoading(false);
          return;
        }

        // Get all units for these locations
        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select("id, unit_number, location_id")
          .in("location_id", locationIds)
          .order("unit_number");

        if (unitError) throw unitError;
        setUnits(unitData || []);

        const unitIds = unitData?.map((unit) => unit.id) || [];

        // Then fetch all jobs for these locations
        let query = supabase
          .from("jobs")
          .select(
            `
            *,
            locations (
              id,
              name,
              address,
              city,
              state,
              zip
            ),
            job_units:job_units!inner (
              unit_id,
              units:unit_id (
                id,
                unit_number
              )
            )
          `
          )
          .in("location_id", locationIds);

        // Apply filters
        if (filters.jobNumber) {
          query = query.ilike("number", `%${filters.jobNumber}%`);
        }
        if (filters.location) {
          query = query.eq("location_id", filters.location);
        }
        if (filters.unit || unitIdParam) {
          query = query.eq("unit_id", filters.unit || unitIdParam);
        }
        if (filters.status) {
          query = query.eq("status", filters.status);
        }
        if (filters.dateFrom) {
          query = query.gte("schedule_start", filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte("schedule_start", filters.dateTo);
        }

        const { data, error: jobsError } = await query.order("updated_at", {
          ascending: false,
        });

        if (jobsError) throw jobsError;
        // Flatten units from job_units
        const jobsWithUnits = (data || []).map((job: any) => ({
          ...job,
          units: (job.job_units || []).map((ju: any) => ju.units),
        }));
        setJobs(jobsWithUnits);

        // Fetch assets for units
        if (unitIds.length > 0) {
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select(
              `
              *,
              units (
                id,
                unit_number
              )
            `
            )
            .in("unit_id", unitIds);

          if (assetsError) throw assetsError;

          // Group assets by unit_id
          const assetsByUnit: { [key: string]: any[] } = {};
          assetsData?.forEach((asset) => {
            if (!assetsByUnit[asset.unit_id]) {
              assetsByUnit[asset.unit_id] = [];
            }
            assetsByUnit[asset.unit_id].push(asset);
          });

          setAssets(assetsByUnit);
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load jobs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [supabase, company, filters, unitIdParam]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      jobNumber: "",
      location: "",
      unit: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    });
    setSearchTerm("");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
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

  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.number.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      job.locations?.name.toLowerCase().includes(searchLower) ||
      job.units?.unit_number.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service History</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label
                htmlFor="jobNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Job Number
              </label>
              <input
                type="text"
                id="jobNumber"
                name="jobNumber"
                value={filters.jobNumber}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location
              </label>
              <select
                id="location"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Unit
              </label>
              <select
                id="unit"
                name="unit"
                value={filters.unit || unitIdParam || ""}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Units</option>
                {units
                  .filter(
                    (unit) =>
                      !filters.location || unit.location_id === filters.location
                  )
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      Unit {unit.unit_number}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="dateFrom"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date From
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="dateTo"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date To
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end mb-4">
            <button
              onClick={resetFilters}
              className="text-primary-600 hover:text-primary-800"
            >
              Reset Filters
            </button>
          </div>
        )}

        {error && (
          <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-error-500" />
              <div className="ml-3">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No jobs found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    JOB #
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    SERVICE
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    LOCATION
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    UNIT
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    DATE
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {job.number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        to={`/customer/jobs/${job.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center">
                        <MapPin size={14} className="text-gray-400 mr-1" />
                        <span>{job.locations?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.job_units && job.job_units.length > 0 ? (
                        <div className="flex items-center">
                          <Building2 size={14} className="text-gray-400 mr-1" />
                          <span className="flex items-center">
                            {job.job_units.map((ju) => (
                              <span key={ju.unit_id} className="mr-1">
                                Unit {ju.units?.unit_number || ju.unit_id}
                              </span>
                            ))}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.schedule_start ? (
                        <div>
                          <div className="flex items-center">
                            <Calendar
                              size={14}
                              className="text-gray-400 mr-1"
                            />
                            <span>{formatDate(job.schedule_start)}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Clock size={12} className="mr-1" />
                            <span>{formatTime(job.schedule_start)}</span>
                          </div>
                        </div>
                      ) : (
                        "Not scheduled"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerJobs;
