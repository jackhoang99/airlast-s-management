import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  ArrowLeft,
  Wrench,
  Search,
  Filter,
  AlertTriangle,
  DollarSign,
  Calendar,
  Building2,
  MapPin,
  TrendingUp,
  Target,
} from "lucide-react";

const ServiceOpportunities = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    priority: "all",
    location: "",
    dateFrom: "",
    dateTo: "",
  });
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    highPriority: 0,
    estimatedRevenue: 0,
    avgOpportunityValue: 0,
  });

  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!supabase) return;

      try {
        setIsLoading(true);

        // Fetch jobs that could be service opportunities
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(
            `
            *,
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
            job_units:job_units!inner (
              unit_id,
              units:unit_id (
                id,
                unit_number
              )
            ),
            job_items (
              total_cost
            )
          `
          )
          .eq("status", "completed")
          .order("updated_at", { ascending: false })
          .limit(50);

        if (jobsError) throw jobsError;

        // Flatten units from job_units
        const jobsWithUnits = (jobsData || []).map((job: any) => ({
          ...job,
          units: (job.job_units || []).map((ju: any) => ju.units),
        }));
        // Transform jobs into service opportunities
        const opportunitiesData = (jobsWithUnits || []).map((job) => {
          const totalCost =
            job.job_items?.reduce(
              (sum, item) => sum + Number(item.total_cost),
              0
            ) || 0;
          const priority =
            totalCost > 1000 ? "high" : totalCost > 500 ? "medium" : "low";

          return {
            id: job.id,
            jobNumber: job.number,
            jobName: job.name,
            type: job.type,
            priority,
            estimatedValue: Math.round(totalCost * 1.2), // 20% markup for opportunity
            location: job.locations,
            unit: job.units,
            completedDate: job.updated_at,
            description: `Follow-up opportunity based on ${job.type} service`,
            recommendedAction: getRecommendedAction(job.type, totalCost),
          };
        });

        setOpportunities(opportunitiesData);

        // Calculate stats
        const totalOpportunities = opportunitiesData.length;
        const highPriority = opportunitiesData.filter(
          (opp) => opp.priority === "high"
        ).length;
        const estimatedRevenue = opportunitiesData.reduce(
          (sum, opp) => sum + opp.estimatedValue,
          0
        );
        const avgOpportunityValue =
          totalOpportunities > 0 ? estimatedRevenue / totalOpportunities : 0;

        setStats({
          totalOpportunities,
          highPriority,
          estimatedRevenue,
          avgOpportunityValue,
        });
      } catch (err) {
        console.error("Error fetching service opportunities:", err);
        setError("Failed to load service opportunities");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpportunities();
  }, [supabase, filters]);

  const getRecommendedAction = (jobType: string, cost: number) => {
    if (jobType === "inspection") {
      return "Schedule maintenance";
    } else if (jobType === "repair" && cost > 500) {
      return "Recommend system upgrade";
    } else if (jobType === "maintenance") {
      return "Schedule next PM visit";
    }
    return "Follow up for additional services";
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-error-100 text-error-800";
      case "medium":
        return "bg-warning-100 text-warning-800";
      case "low":
        return "bg-success-100 text-success-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      type: "all",
      priority: "all",
      location: "",
      dateFrom: "",
      dateTo: "",
    });
    setSearchTerm("");
  };

  const filteredOpportunities = opportunities.filter((opportunity) => {
    if (!searchTerm && filters.type === "all" && filters.priority === "all")
      return true;

    const matchesSearch =
      !searchTerm ||
      opportunity.jobName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.location?.companies?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      opportunity.location?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesType =
      filters.type === "all" || opportunity.type === filters.type;
    const matchesPriority =
      filters.priority === "all" || opportunity.priority === filters.priority;

    return matchesSearch && matchesType && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Service Opportunities
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Opportunities
              </p>
              <p className="text-3xl font-semibold mt-1">
                {stats.totalOpportunities}
              </p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">High Priority</p>
              <p className="text-3xl font-semibold mt-1">
                {stats.highPriority}
              </p>
            </div>
            <div className="h-12 w-12 bg-error-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-error-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Estimated Revenue
              </p>
              <p className="text-3xl font-semibold mt-1">
                ${stats.estimatedRevenue.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Avg Opportunity Value
              </p>
              <p className="text-3xl font-semibold mt-1">
                ${Math.round(stats.avgOpportunityValue).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-warning-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>

          <div className="flex gap-4">
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="all">All Types</option>
              <option value="inspection">Inspection</option>
              <option value="repair">Repair</option>
              <option value="maintenance">Maintenance</option>
              <option value="service call">Service Call</option>
            </select>

            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Filter size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-gray-500">
              Showing {filteredOpportunities.length} of {opportunities.length}{" "}
              opportunities
            </span>
          </div>
          {(Object.values(filters).some(Boolean) || searchTerm) && (
            <button
              onClick={resetFilters}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Reset filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No service opportunities found. Complete more jobs to generate
            opportunities.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{opportunity.jobName}</h3>
                      <span
                        className={`badge ${getPriorityBadgeClass(
                          opportunity.priority
                        )}`}
                      >
                        {opportunity.priority} priority
                      </span>
                      <span className="badge bg-blue-100 text-blue-800">
                        {opportunity.type}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {opportunity.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building2 size={14} />
                        <span>{opportunity.location?.companies?.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{opportunity.location?.name}</span>
                      </div>
                      {opportunity.unit && (
                        <div className="flex items-center gap-1">
                          <span>Unit {opportunity.unit.unit_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>
                          {new Date(
                            opportunity.completedDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <p className="text-sm font-medium text-primary-600">
                        Recommended: {opportunity.recommendedAction}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold text-success-600">
                      ${opportunity.estimatedValue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Est. Value</div>
                    <Link
                      to={`/jobs/${opportunity.id}`}
                      className="btn btn-primary btn-sm mt-2"
                    >
                      View Job
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceOpportunities;
