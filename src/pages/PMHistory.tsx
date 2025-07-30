import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Wrench,
  Building,
  User,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";

type Job = Database["public"]["Tables"]["jobs"]["Row"] & {
  locations?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    companies?: {
      name: string;
    };
  };
  job_technicians?: {
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
    };
  }[];
  units?: {
    id: string;
    unit_number: string;
  }[];
};

const PMHistory = () => {
  const { supabase } = useSupabase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState<"date" | "name" | "status">(
    "date"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPMJobs();
  }, []);

  const fetchPMJobs = async () => {
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
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
            companies (
              name
            )
          ),
          job_technicians (
            technician_id,
            is_primary,
            users (
              first_name,
              last_name
            )
          ),
          units (
            id,
            unit_number
          )
        `
        )
        .eq("type", "maintenance")
        .in("additional_type", [
          "PM Filter Change",
          "PM Cleaning AC",
          "PM Cleaning HEAT",
        ])
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setJobs(data || []);
    } catch (err) {
      console.error("Error fetching PM jobs:", err);
      setError("Failed to fetch PM jobs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const toggleSort = (field: "date" | "name" | "status") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: "date" | "name" | "status") => {
    if (sortField !== field) {
      return <ChevronDown size={14} className="text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp size={14} className="text-primary-600" />
    ) : (
      <ChevronDown size={14} className="text-primary-600" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
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

  const getTypeBadgeClass = (additionalType: string) => {
    switch (additionalType) {
      case "PM Filter Change":
        return "bg-blue-100 text-blue-800";
      case "PM Cleaning AC":
        return "bg-cyan-100 text-cyan-800";
      case "PM Cleaning HEAT":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  const filteredJobs = jobs
    .filter((job) => {
      const matchesSearch =
        !searchTerm ||
        job.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.locations?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.locations?.companies?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        job.status?.toLowerCase() === filterStatus.toLowerCase();

      const matchesType =
        filterType === "all" || job.additional_type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "date":
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case "name":
          aValue = a.name || "";
          bValue = b.name || "";
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const pmTypes = ["PM Filter Change", "PM Cleaning AC", "PM Cleaning HEAT"];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PM history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Wrench className="h-8 w-8 mr-3 text-purple-600" />
              PM History
            </h1>
            <p className="text-gray-600 mt-2">
              View all preventive maintenance jobs and their history
            </p>
          </div>
          <Link to="/jobs" className="btn btn-secondary">
            Back to Jobs
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wrench className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total PM Jobs
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter((job) => job.status === "completed").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter((job) => job.status === "scheduled").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unscheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter((job) => job.status === "unscheduled").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs, locations, or companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input w-full"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="select"
              >
                <option value="all">All PM Types</option>
                {pmTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Details
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort("date")}
                  >
                    <div className="flex items-center">
                      Date Created
                      {getSortIcon("date")}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSort("status")}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleJobExpansion(job.id)}
                          className="mr-2 text-gray-400 hover:text-gray-600"
                        >
                          {expandedJobs.has(job.id) ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronUp size={16} />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {job.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{job.number}
                          </div>
                          {job.additional_type && (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(
                                job.additional_type
                              )}`}
                            >
                              {job.additional_type}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedJobs.has(job.id) && (
                        <div className="mt-4 pl-6 border-l-2 border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">
                                <strong>Description:</strong>{" "}
                                {job.description || "No description"}
                              </p>
                              {job.problem_description && (
                                <p className="text-gray-600 mt-1">
                                  <strong>Problem:</strong>{" "}
                                  {job.problem_description}
                                </p>
                              )}
                              {job.schedule_start && (
                                <p className="text-gray-600 mt-1">
                                  <strong>Scheduled:</strong>{" "}
                                  {formatDateTime(job.schedule_start)}
                                </p>
                              )}
                            </div>
                            <div>
                              {job.units && job.units.length > 0 && (
                                <p className="text-gray-600">
                                  <strong>Units:</strong>{" "}
                                  {job.units
                                    .map((u) => u.unit_number)
                                    .join(", ")}
                                </p>
                              )}
                              {job.customer_po && (
                                <p className="text-gray-600 mt-1">
                                  <strong>PO:</strong> {job.customer_po}
                                </p>
                              )}
                              {job.service_contract && (
                                <p className="text-gray-600 mt-1">
                                  <strong>Contract:</strong>{" "}
                                  {job.service_contract}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-gray-400" />
                          {job.locations?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.locations?.address}, {job.locations?.city},{" "}
                          {job.locations?.state}
                        </div>
                        {job.locations?.companies?.name && (
                          <div className="text-xs text-gray-400">
                            {job.locations.companies.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.job_technicians && job.job_technicians.length > 0 ? (
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-gray-400" />
                            {job.job_technicians
                              .filter((tech) => tech.is_primary)
                              .map(
                                (tech) =>
                                  `${tech.users.first_name} ${tech.users.last_name}`
                              )
                              .join(", ")}
                          </div>
                          {job.job_technicians.filter(
                            (tech) => !tech.is_primary
                          ).length > 0 && (
                            <div className="text-xs text-gray-500">
                              +
                              {
                                job.job_technicians.filter(
                                  (tech) => !tech.is_primary
                                ).length
                              }{" "}
                              more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                      >
                        <Eye size={14} />
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterStatus !== "all" || filterType !== "all"
                  ? "No PM jobs match your filters"
                  : "No PM jobs found"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PMHistory;
