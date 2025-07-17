import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  Briefcase,
  Calendar,
  MapPin,
  Clock,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Navigation,
  Phone,
  Mail,
  Settings,
  Thermometer,
  Wind,
  Wrench,
  FileText,
} from "lucide-react";

const TechnicianHome = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicianName, setTechnicianName] = useState("");
  const [todayJobs, setTodayJobs] = useState<any[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianUsername, setTechnicianUsername] = useState<string | null>(
    null
  );
  const [weatherData, setWeatherData] = useState<any>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [technicianLocation, setTechnicianLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [hvacTips, setHvacTips] = useState<string[]>([
    "Check and replace air filters regularly to maintain system efficiency.",
    "Keep outdoor units clear of debris and vegetation for optimal airflow.",
    "Inspect refrigerant lines for frost or ice buildup, which may indicate a leak.",
    "Verify thermostat settings match customer preferences before leaving.",
    "Document all repairs and replacements in detail for future reference.",
    "Clean condenser coils to improve system performance and energy efficiency.",
    "Check electrical connections and tighten if necessary to prevent hazards.",
    "Measure refrigerant pressure to ensure proper system operation.",
    "Inspect ductwork for leaks or damage during routine maintenance.",
    "Test safety controls to ensure they're functioning properly.",
  ]);
  const [randomTip, setRandomTip] = useState<string>("");

  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;

      try {
        // Get username from session storage
        const username = sessionStorage.getItem("techUsername");
        setTechnicianUsername(username);

        if (username) {
          console.log("Looking up technician with username:", username);

          // Try to find user by username
          const { data, error } = await supabase
            .from("users")
            .select("id, first_name, last_name, role")
            .eq("username", username)
            .maybeSingle();

          if (error && !error.message.includes("contains 0 rows")) {
            console.error("Error fetching technician by username:", error);
            throw error;
          }

          if (data) {
            console.log("Found technician by username:", data);
            setTechnicianId(data.id);
            setTechnicianName(
              `${data.first_name || ""} ${data.last_name || ""}`
            );

            if (data.role !== "technician") {
              console.warn("User found but not a technician:", data);
              setError("This account does not have technician access");
            }
          } else {
            // Try with email format
            const email = `${username}@airlast-demo.com`;
            console.log("Trying with email:", email);

            const { data: emailData, error: emailError } = await supabase
              .from("users")
              .select("id, first_name, last_name, role")
              .eq("email", email)
              .maybeSingle();

            if (emailError && !emailError.message.includes("contains 0 rows")) {
              console.error("Error fetching technician by email:", emailError);
              throw emailError;
            }

            if (emailData) {
              console.log("Found technician by email:", emailData);
              setTechnicianId(emailData.id);
              setTechnicianName(
                `${emailData.first_name || ""} ${emailData.last_name || ""}`
              );

              if (emailData.role !== "technician") {
                console.warn("User found but not a technician:", emailData);
                setError("This account does not have technician access");
              }
            } else {
              console.error("Could not find technician with username or email");
              setError("Could not find technician record");
            }
          }
        } else {
          // Fallback to auth user if username not in session
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            console.log("Looking up technician with auth user:", user.email);

            // Try to find by email
            const { data, error } = await supabase
              .from("users")
              .select("id, username, first_name, last_name, role")
              .eq("email", user.email)
              .maybeSingle();

            if (error && !error.message.includes("contains 0 rows")) {
              console.error("Error fetching technician by email:", error);
              throw error;
            }

            if (data) {
              console.log("Found technician by email:", data);
              setTechnicianId(data.id);
              setTechnicianName(
                `${data.first_name || ""} ${data.last_name || ""}`
              );
              setTechnicianUsername(data.username);
              sessionStorage.setItem("techUsername", data.username);

              if (data.role !== "technician") {
                console.warn("User found but not a technician:", data);
                setError("This account does not have technician access");
              }
            } else {
              // Try with username from email
              const username = user.email.split("@")[0];
              console.log("Trying with username from email:", username);

              const { data: usernameData, error: usernameError } =
                await supabase
                  .from("users")
                  .select("id, first_name, last_name, role")
                  .eq("username", username)
                  .maybeSingle();

              if (
                usernameError &&
                !usernameError.message.includes("contains 0 rows")
              ) {
                console.error(
                  "Error fetching technician by username from email:",
                  usernameError
                );
                throw usernameError;
              }

              if (usernameData) {
                console.log(
                  "Found technician by username from email:",
                  usernameData
                );
                setTechnicianId(usernameData.id);
                setTechnicianName(
                  `${usernameData.first_name || ""} ${
                    usernameData.last_name || ""
                  }`
                );
                setTechnicianUsername(username);
                sessionStorage.setItem("techUsername", username);

                if (usernameData.role !== "technician") {
                  console.warn(
                    "User found but not a technician:",
                    usernameData
                  );
                  setError("This account does not have technician access");
                }
              } else {
                console.error("Could not find technician with any method");
                setError("Could not find technician record");
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching technician info:", err);
        setError("Failed to load technician information");
      }
    };

    fetchTechnicianInfo();
  }, [supabase]);

  // Get technician's current location for weather
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTechnicianLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Atlanta if location access is denied
          setTechnicianLocation({ lat: 33.7489954, lng: -84.3902397 });
        }
      );
    } else {
      // Default to Atlanta if geolocation is not supported
      setTechnicianLocation({ lat: 33.7489954, lng: -84.3902397 });
    }
  }, []);

  // Fetch weather data when location is available
  useEffect(() => {
    const fetchWeather = async () => {
      if (!technicianLocation) return;

      setIsLoadingWeather(true);
      setWeatherError(null);

      try {
        // Mock weather data since we don't have a real API key
        const mockWeatherData = {
          location: "Atlanta, GA",
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
        };

        setWeatherData(mockWeatherData);
      } catch (err) {
        console.error("Error fetching weather:", err);
        setWeatherError("Failed to load weather information");
      } finally {
        setIsLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [technicianLocation]);

  // Select a random HVAC tip
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * hvacTips.length);
    setRandomTip(hvacTips[randomIndex]);
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase || !technicianId) return;

      try {
        setIsLoading(true);
        console.log("Fetching jobs for technician ID:", technicianId);

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        // Get tomorrow's date
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString();

        // Get next 7 days date
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString();

        // Fetch jobs assigned to this technician
        const { data: jobTechData, error: jobTechError } = await supabase
          .from("job_technicians")
          .select("job_id")
          .eq("technician_id", technicianId);

        if (jobTechError) {
          console.error("Error fetching job_technicians:", jobTechError);
          throw jobTechError;
        }

        console.log("Found job assignments:", jobTechData);
        const jobIds = jobTechData.map((jt) => jt.job_id);

        if (jobIds.length === 0) {
          console.log("No jobs assigned to this technician");
          setTodayJobs([]);
          setUpcomingJobs([]);
          setCompletedJobs([]);
          setIsLoading(false);
          return;
        }

        // Fetch today's jobs
        const { data: todayJobsData, error: todayError } = await supabase
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
          .in("id", jobIds)
          .gte("schedule_start", todayStr)
          .lt("schedule_start", tomorrowStr)
          .neq("status", "completed")
          .neq("status", "cancelled")
          .order("schedule_start");

        if (todayError) {
          console.error("Error fetching today's jobs:", todayError);
          throw todayError;
        }

        console.log("Today's jobs:", todayJobsData);
        setTodayJobs(todayJobsData || []);

        // Fetch upcoming jobs
        const { data: upcomingJobsData, error: upcomingError } = await supabase
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
          .in("id", jobIds)
          .gte("schedule_start", tomorrowStr)
          .lt("schedule_start", nextWeekStr)
          .neq("status", "completed")
          .neq("status", "cancelled")
          .order("schedule_start")
          .limit(5);

        if (upcomingError) {
          console.error("Error fetching upcoming jobs:", upcomingError);
          throw upcomingError;
        }

        console.log("Upcoming jobs:", upcomingJobsData);
        setUpcomingJobs(upcomingJobsData || []);

        // Fetch recently completed jobs
        const { data: completedJobsData, error: completedError } =
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
            .in("id", jobIds)
            .eq("status", "completed")
            .order("updated_at", { ascending: false })
            .limit(5);

        if (completedError) {
          console.error("Error fetching completed jobs:", completedError);
          throw completedError;
        }

        console.log("Completed jobs:", completedJobsData);
        setCompletedJobs(completedJobsData || []);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load job information");
      } finally {
        setIsLoading(false);
      }
    };

    if (technicianId) {
      fetchJobs();
    }
  }, [supabase, technicianId]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {technicianName || technicianUsername || "Technician"}
        </h1>
        <p className="text-gray-600">Here's your schedule for today</p>
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

      {/* HVAC Tip of the Day */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium flex items-center text-primary-700">
          <Settings className="h-5 w-5 mr-2" />
          HVAC Tip of the Day
        </h2>
        <p className="mt-2 text-gray-700">{randomTip}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Today's Jobs */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-primary-50 border-b border-primary-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center">
                <Calendar className="h-5 w-5 text-primary-600 mr-2" />
                Today's Jobs
              </h2>
              <Link
                to="/tech/schedule"
                className="text-primary-600 text-sm flex items-center"
              >
                View Schedule <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>

            {todayJobs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No jobs scheduled for today</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {todayJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/tech/jobs/${job.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {job.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {job.locations?.name}
                          {job.job_units && job.job_units.length > 0
                            ? ` • Units ${job.job_units
                                .map((unit) => unit.units.unit_number)
                                .join(", ")}`
                            : ""}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <MapPin size={12} className="mr-1" />
                          <span>
                            {job.locations?.address}, {job.locations?.city}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-sm font-medium text-primary-600">
                          <Clock size={14} className="mr-1" />
                          {job.schedule_start
                            ? formatTime(job.schedule_start)
                            : "Unscheduled"}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full mt-1 inline-block
                          ${
                            job.status === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : job.status === "unscheduled"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/tech/map"
              className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50"
            >
              <MapPin size={24} className="text-primary-600 mb-2" />
              <span className="font-medium">View Map</span>
              <span className="text-xs text-gray-500 mt-1">
                Navigate to jobs
              </span>
            </Link>

            <Link
              to="/tech/schedule"
              className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50"
            >
              <Calendar size={24} className="text-primary-600 mb-2" />
              <span className="font-medium">Schedule</span>
              <span className="text-xs text-gray-500 mt-1">
                View your calendar
              </span>
            </Link>
          </div>

          {/* HVAC Reference Tools */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-medium flex items-center mb-4">
              <Wrench className="h-5 w-5 text-primary-600 mr-2" />
              HVAC Reference Tools
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                <Thermometer className="h-8 w-8 text-primary-500 mr-3" />
                <div>
                  <h3 className="font-medium">Temperature Converter</h3>
                  <p className="text-xs text-gray-500">F° to C° conversion</p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                <Wind className="h-8 w-8 text-primary-500 mr-3" />
                <div>
                  <h3 className="font-medium">Airflow Calculator</h3>
                  <p className="text-xs text-gray-500">CFM measurements</p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                <FileText className="h-8 w-8 text-primary-500 mr-3" />
                <div>
                  <h3 className="font-medium">Refrigerant Guide</h3>
                  <p className="text-xs text-gray-500">
                    Pressure-temperature charts
                  </p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex items-center">
                <Wrench className="h-8 w-8 text-primary-500 mr-3" />
                <div>
                  <h3 className="font-medium">Troubleshooting</h3>
                  <p className="text-xs text-gray-500">Common HVAC issues</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Jobs */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <h2 className="text-lg font-semibold flex items-center">
                <Briefcase className="h-5 w-5 text-blue-600 mr-2" />
                Upcoming Jobs
              </h2>
            </div>

            {upcomingJobs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No upcoming jobs scheduled</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {upcomingJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/tech/jobs/${job.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {job.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {job.locations?.name}
                          {job.job_units && job.job_units.length > 0
                            ? ` • Units ${job.job_units
                                .map((unit) => unit.units.unit_number)
                                .join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {job.schedule_start
                            ? formatDate(job.schedule_start)
                            : "Unscheduled"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {job.schedule_start
                            ? formatTime(job.schedule_start)
                            : ""}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Completed Jobs */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-success-50 border-b border-success-100">
              <h2 className="text-lg font-semibold flex items-center">
                <CheckSquare className="h-5 w-5 text-success-600 mr-2" />
                Recently Completed
              </h2>
            </div>

            {completedJobs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No completed jobs</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {completedJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/tech/jobs/${job.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {job.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {job.locations?.name}
                          {job.job_units && job.job_units.length > 0
                            ? ` • Units ${job.job_units
                                .map((unit) => unit.units.unit_number)
                                .join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs bg-success-100 text-success-800 px-2 py-1 rounded-full">
                          Completed
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {job.updated_at ? formatDate(job.updated_at) : ""}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TechnicianHome;
