import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  Building,
  MapPin,
  Building2,
  FileText,
  FileInput,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Thermometer,
  Wind,
  ArrowRight,
} from "lucide-react";

const CustomerDashboard = () => {
  const { supabase } = useSupabase();
  const { company } = useOutletContext<{ company: any }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalUnits: 0,
    activeUnits: 0,
    pendingJobs: 0,
    completedJobs: 0,
    pendingInvoices: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !company) return;

      try {
        setIsLoading(true);

        // Fetch locations count
        const { count: locationsCount, error: locationsError } = await supabase
          .from("locations")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id);

        if (locationsError) throw locationsError;

        // Get location IDs for this company
        const { data: locationData, error: locationIdsError } = await supabase
          .from("locations")
          .select("id")
          .eq("company_id", company.id);

        if (locationIdsError) throw locationIdsError;

        const locationIds = locationData.map((loc) => loc.id);

        // Fetch units count
        let unitsCount = 0;
        let activeUnitsCount = 0;

        if (locationIds.length > 0) {
          const { count: totalUnits, error: unitsError } = await supabase
            .from("units")
            .select("*", { count: "exact", head: true })
            .in("location_id", locationIds);

          if (unitsError) throw unitsError;
          unitsCount = totalUnits || 0;

          const { count: activeUnits, error: activeUnitsError } = await supabase
            .from("units")
            .select("*", { count: "exact", head: true })
            .in("location_id", locationIds)
            .eq("status", "active");

          if (activeUnitsError) throw activeUnitsError;
          activeUnitsCount = activeUnits || 0;
        }

        // Fetch jobs counts
        let pendingJobsCount = 0;
        let completedJobsCount = 0;

        if (locationIds.length > 0) {
          const { count: pendingJobs, error: pendingJobsError } = await supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .in("location_id", locationIds)
            .not("status", "eq", "completed")
            .not("status", "eq", "cancelled");

          if (pendingJobsError) throw pendingJobsError;
          pendingJobsCount = pendingJobs || 0;

          const { count: completedJobs, error: completedJobsError } =
            await supabase
              .from("jobs")
              .select("*", { count: "exact", head: true })
              .in("location_id", locationIds)
              .eq("status", "completed");

          if (completedJobsError) throw completedJobsError;
          completedJobsCount = completedJobs || 0;
        }

        // Initialize jobIds to empty array
        let jobIds: string[] = [];

        // Fetch pending invoices count
        let pendingInvoicesCount = 0;

        if (locationIds.length > 0) {
          // First get job IDs for this company
          const { data: jobsData, error: jobsError } = await supabase
            .from("jobs")
            .select("id")
            .in("location_id", locationIds);

          if (jobsError) throw jobsError;

          jobIds = jobsData.map((job) => job.id);

          if (jobIds.length > 0) {
            const { count: pendingInvoices, error: pendingInvoicesError } =
              await supabase
                .from("job_invoices")
                .select("*", { count: "exact", head: true })
                .in("job_id", jobIds)
                .eq("status", "issued");

            if (pendingInvoicesError) throw pendingInvoicesError;
            pendingInvoicesCount = pendingInvoices || 0;
          }
        }

        // Set stats
        setStats({
          totalLocations: locationsCount || 0,
          totalUnits: unitsCount,
          activeUnits: activeUnitsCount,
          pendingJobs: pendingJobsCount,
          completedJobs: completedJobsCount,
          pendingInvoices: pendingInvoicesCount,
        });

        // Fetch recent jobs
        if (locationIds.length > 0) {
          const { data: recentJobsData, error: recentJobsError } =
            await supabase
              .from("jobs")
              .select(
                `
              *,
              locations (
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
              .in("location_id", locationIds)
              .order("updated_at", { ascending: false })
              .limit(5);

          if (recentJobsError) throw recentJobsError;
          setRecentJobs(recentJobsData || []);

          // Fetch upcoming jobs
          const today = new Date();
          const { data: upcomingJobsData, error: upcomingJobsError } =
            await supabase
              .from("jobs")
              .select(
                `
              *,
              locations (
                name,
                address,
                city,
                state,
                zip
              ),
              units (
                unit_number
              )
            `
              )
              .in("location_id", locationIds)
              .gt("schedule_start", today.toISOString())
              .not("status", "eq", "completed")
              .not("status", "eq", "cancelled")
              .order("schedule_start")
              .limit(5);

          if (upcomingJobsError) throw upcomingJobsError;
          setUpcomingJobs(upcomingJobsData || []);

          // Fetch pending invoices
          if (jobIds && jobIds.length > 0) {
            const { data: pendingInvoicesData, error: pendingInvoicesError } =
              await supabase
                .from("job_invoices")
                .select(
                  `
                *,
                jobs (
                  id,
                  number,
                  name,
                  locations (
                    name
                  )
                )
              `
                )
                .in("job_id", jobIds)
                .eq("status", "issued")
                .order("due_date")
                .limit(5);

            if (pendingInvoicesError) throw pendingInvoicesError;
            setPendingInvoices(pendingInvoicesData || []);
          }
        }

        // Mock weather data
        setWeatherData({
          location: `${company.city}, ${company.state}`,
          temperature: Math.round(70 + Math.random() * 20), // 70-90°F
          condition: [
            "Sunny",
            "Partly Cloudy",
            "Cloudy",
            "Light Rain",
            "Thunderstorm",
          ][Math.floor(Math.random() * 5)],
          humidity: Math.round(40 + Math.random() * 40), // 40-80%
          windSpeed: Math.round(5 + Math.random() * 15), // 5-20 mph
          feelsLike: Math.round(75 + Math.random() * 15), // 75-90°F
          highTemp: Math.round(80 + Math.random() * 15), // 80-95°F
          lowTemp: Math.round(60 + Math.random() * 10), // 60-70°F
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, company]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome, {company?.name}</h1>
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

      {/* Weather Card */}
      {weatherData && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{weatherData.location}</h2>
              <div className="flex items-center mt-1">
                <div className="text-3xl font-bold">
                  {weatherData.temperature}°F
                </div>
                <div className="ml-2 text-sm">
                  <div>Feels like {weatherData.feelsLike}°F</div>
                  <div>
                    H: {weatherData.highTemp}° L: {weatherData.lowTemp}°
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg">{weatherData.condition}</div>
              <div className="text-sm mt-1">
                Humidity: {weatherData.humidity}%
              </div>
              <div className="text-sm">Wind: {weatherData.windSpeed} mph</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Locations
              </p>
              <p className="text-3xl font-semibold mt-1">
                {stats.totalLocations}
              </p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/customer/locations"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View all locations →
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Units</p>
              <p className="text-3xl font-semibold mt-1">{stats.totalUnits}</p>
            </div>
            <div className="h-12 w-12 bg-secondary-100 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-secondary-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/customer/units"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View all units →
            </Link>
            <div className="mt-2">
              <Link
                to="/customer/assets"
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                View all assets →
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Jobs</p>
              <p className="text-3xl font-semibold mt-1">{stats.pendingJobs}</p>
            </div>
            <div className="h-12 w-12 bg-warning-100 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/customer/jobs"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View all jobs →
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Pending Invoices
              </p>
              <p className="text-3xl font-semibold mt-1">
                {stats.pendingInvoices}
              </p>
            </div>
            <div className="h-12 w-12 bg-error-100 rounded-full flex items-center justify-center">
              <FileInput className="h-6 w-6 text-error-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/customer/invoices"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View all invoices →
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Units</p>
              <p className="text-3xl font-semibold mt-1">{stats.activeUnits}</p>
            </div>
            <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1 w-full bg-gray-200 rounded">
              <div
                className="h-1 bg-success-500 rounded"
                style={{
                  width: `${
                    stats.totalUnits
                      ? (stats.activeUnits / stats.totalUnits) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalUnits
                ? Math.round((stats.activeUnits / stats.totalUnits) * 100)
                : 0}
              % of total
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Completed Jobs
              </p>
              <p className="text-3xl font-semibold mt-1">
                {stats.completedJobs}
              </p>
            </div>
            <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/customer/jobs?status=completed"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View completed jobs →
            </Link>
          </div>
        </div>
      </div>

      {/* HVAC Tip */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">HVAC Tip of the Day</h2>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <Wind className="h-5 w-5 text-blue-500 mt-1 mr-2" />
            <p className="text-blue-700">
              Regular maintenance of your HVAC system can extend its lifespan by
              up to 5 years and reduce energy costs by up to 15%. Schedule
                              maintenance twice a year - once before summer and
              once before winter - to ensure optimal performance.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Service */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Calendar className="h-5 w-5 text-primary-600 mr-2" />
              Upcoming Service
            </h2>
            <Link
              to="/customer/jobs"
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
            >
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming service scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/customer/jobs/${job.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{job.name}</h3>
                      <p className="text-sm text-gray-500">
                        {job.locations?.name}
                        {job.units && job.units.length > 0
                          ? ` • Units ${job.units
                              .map((unit) => unit.unit_number)
                              .join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm font-medium text-primary-600">
                        <Calendar size={14} className="mr-1" />
                        {formatDate(job.schedule_start)}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock size={12} className="mr-1" />
                        {formatTime(job.schedule_start)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invoices */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <FileInput className="h-5 w-5 text-primary-600 mr-2" />
              Pending Invoices
            </h2>
            <Link
              to="/customer/invoices"
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
            >
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>

          {pendingInvoices.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FileInput className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No pending invoices</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  to={`/customer/invoices/${invoice.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        Invoice #{invoice.invoice_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {invoice.jobs?.name}
                        {invoice.jobs?.locations
                          ? ` • ${invoice.jobs.locations.name}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-error-600">
                        ${Number(invoice.amount).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Due:{" "}
                        {invoice.due_date
                          ? formatDate(invoice.due_date)
                          : "Not set"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Service History */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 text-primary-600 mr-2" />
            Recent Service History
          </h2>
          <Link
            to="/customer/jobs"
            className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
          >
            View All <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No service history found</p>
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
                    DATE
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job, index) => (
                  <tr
                    key={job.id}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
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
                      {job.locations?.name}
                      {job.units && job.units.length > 0
                        ? ` • Units ${job.units
                            .map((unit) => unit.unit_number)
                            .join(", ")}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.schedule_start
                        ? formatDate(job.schedule_start)
                        : "Not scheduled"}
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

export default CustomerDashboard;
