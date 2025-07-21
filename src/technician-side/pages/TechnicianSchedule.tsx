import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  CheckSquare,
  Briefcase,
} from "lucide-react";

const TechnicianSchedule = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [timeSlots] = useState(Array.from({ length: 24 }, (_, i) => i)); // 24 hours

  // Get technician ID
  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;

      try {
        // Get username from session storage
        const username = sessionStorage.getItem("techUsername");

        if (username) {
          console.log("Looking up technician with username:", username);

          // Try to find user by username
          const { data, error } = await supabase
            .from("users")
            .select("id, role")
            .eq("username", username)
            .maybeSingle();

          if (error && !error.message.includes("contains 0 rows")) {
            console.error("Error fetching technician by username:", error);
            throw error;
          }

          if (data) {
            console.log("Found technician by username:", data);
            setTechnicianId(data.id);
          } else {
            // Try with email format
            const email = `${username}@airlast-demo.com`;
            console.log("Trying with email:", email);

            const { data: emailData, error: emailError } = await supabase
              .from("users")
              .select("id, role")
              .eq("email", email)
              .maybeSingle();

            if (emailError && !emailError.message.includes("contains 0 rows")) {
              console.error("Error fetching technician by email:", emailError);
              throw emailError;
            }

            if (emailData) {
              console.log("Found technician by email:", emailData);
              setTechnicianId(emailData.id);
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
              .select("id, username, role")
              .eq("email", user.email)
              .maybeSingle();

            if (error && !error.message.includes("contains 0 rows")) {
              console.error("Error fetching technician by email:", error);
              throw error;
            }

            if (data) {
              console.log("Found technician by email:", data);
              setTechnicianId(data.id);
              setTechnicianUsername(data.username);
              sessionStorage.setItem("techUsername", data.username);
            } else {
              // Try with username from email
              const username = user.email.split("@")[0];
              console.log("Trying with username from email:", username);

              const { data: usernameData, error: usernameError } =
                await supabase
                  .from("users")
                  .select("id, role")
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
                sessionStorage.setItem("techUsername", username);
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

  // Calculate week dates when current date changes
  useEffect(() => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Adjust to start from Sunday
    startOfWeek.setDate(startOfWeek.getDate() - day);

    // Generate 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }

    setWeekDates(dates);
  }, [currentDate]);

  // Fetch jobs for the selected date range
  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase || !technicianId) return;

      try {
        setIsLoading(true);

        // Determine date range based on view
        let startDate, endDate;

        if (view === "day") {
          // For day view, use the current date
          startDate = new Date(currentDate);
          startDate.setHours(0, 0, 0, 0);

          endDate = new Date(currentDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // For week view, use the first and last date of the week
          startDate = new Date(weekDates[0]);
          startDate.setHours(0, 0, 0, 0);

          endDate = new Date(weekDates[6]);
          endDate.setHours(23, 59, 59, 999);
        }

        // Fetch jobs assigned to this technician
        const { data: jobTechData, error: jobTechError } = await supabase
          .from("job_technicians")
          .select("job_id")
          .eq("technician_id", technicianId);

        if (jobTechError) throw jobTechError;

        const jobIds = jobTechData.map((jt) => jt.job_id);

        if (jobIds.length === 0) {
          setJobs([]);
          setIsLoading(false);
          return;
        }

        // Fetch jobs for the date range
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
          .gte("schedule_start", startDate.toISOString())
          .lte("schedule_start", endDate.toISOString())
          .order("schedule_start");

        if (jobsError) throw jobsError;
        // Flatten units from job_units
        const jobsWithUnits = (jobsData || []).map((job: any) => ({
          ...job,
          units: (job.job_units || []).map((ju: any) => ju.units),
        }));
        setJobs(jobsWithUnits);
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
  }, [supabase, technicianId, currentDate, view, weekDates]);

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Get hour from date string
  const getHour = (dateString: string) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    return date.getHours();
  };

  // Group jobs by date for week view
  const jobsByDate: Record<string, any[]> = {};

  if (view === "week") {
    // Initialize empty arrays for each date
    weekDates.forEach((date) => {
      const dateStr = date.toISOString().split("T")[0];
      jobsByDate[dateStr] = [];
    });

    // Group jobs by date
    jobs.forEach((job) => {
      if (job.schedule_start) {
        const jobDate = new Date(job.schedule_start)
          .toISOString()
          .split("T")[0];
        if (jobsByDate[jobDate]) {
          jobsByDate[jobDate].push(job);
        }
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center">
            <Calendar className="h-6 w-6 mr-2" />
            Schedule
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                view === "day"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                view === "week"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Week
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          {view === "day" ? (
            <>
              <button
                onClick={handlePrevDay}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-lg font-medium">
                {formatDate(currentDate)}
              </span>
              <button
                onClick={handleNextDay}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePrevWeek}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-lg font-medium">
                {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
              </span>
              <button
                onClick={handleNextWeek}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : view === "day" ? (
        // Day View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-primary-50 border-b border-primary-100">
            <h2 className="font-medium">Jobs for {formatDate(currentDate)}</h2>
          </div>

          <div className="relative min-h-[600px]">
            {/* Time slots */}
            <div className="absolute top-0 left-0 w-16 h-full border-r border-gray-200">
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="h-20 border-b border-gray-100 flex items-start justify-center pt-1"
                >
                  <span className="text-xs text-gray-500">
                    {hour === 0
                      ? "12 AM"
                      : hour < 12
                      ? `${hour} AM`
                      : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Jobs */}
            <div className="ml-16 relative">
              {timeSlots.map((hour) => (
                <div key={hour} className="h-20 border-b border-gray-100"></div>
              ))}

              {jobs.map((job) => {
                if (!job.schedule_start) return null;

                const startHour = getHour(job.schedule_start);
                const duration = job.schedule_duration
                  ? parseFloat(job.schedule_duration.replace(" hours", ""))
                  : 1;

                return (
                  <Link
                    key={job.id}
                    to={`/tech/jobs/${job.id}`}
                    className={`absolute left-2 right-2 p-2 rounded-md overflow-hidden ${
                      job.status === "completed"
                        ? "bg-green-100 border border-green-200"
                        : job.status === "cancelled"
                        ? "bg-red-100 border border-red-200"
                        : "bg-blue-100 border border-blue-200"
                    }`}
                    style={{
                      top: `${startHour * 80 + 4}px`,
                      height: `${duration * 80 - 8}px`,
                      maxHeight: `${duration * 80 - 8}px`,
                    }}
                  >
                    <div className="font-medium text-sm truncate">
                      {job.name}
                    </div>
                    <div className="text-xs truncate">
                      {job.locations?.name}
                    </div>
                    <div className="text-xs flex items-center mt-1">
                      <Clock size={10} className="mr-1" />
                      {formatTime(job.schedule_start)}
                    </div>
                  </Link>
                );
              })}

              {jobs.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">
                    No jobs scheduled for this day
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Week View
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {weekDates.map((date, index) => (
              <div
                key={index}
                className={`p-2 text-center ${
                  isToday(date) ? "bg-primary-50" : "bg-white"
                }`}
              >
                <div
                  className={`text-sm font-medium ${
                    isToday(date) ? "text-primary-700" : "text-gray-700"
                  }`}
                >
                  {date.toLocaleDateString([], { weekday: "short" })}
                </div>
                <div
                  className={`text-xs ${
                    isToday(date) ? "text-primary-600" : "text-gray-500"
                  }`}
                >
                  {date.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {weekDates.map((date, index) => {
              const dateStr = date.toISOString().split("T")[0];
              const dateJobs = jobsByDate[dateStr] || [];

              return (
                <div key={index} className="bg-white min-h-[600px] relative">
                  {/* Time slots */}
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="h-10 border-b border-gray-100"
                    ></div>
                  ))}

                  {/* Jobs */}
                  {dateJobs.map((job) => {
                    if (!job.schedule_start) return null;

                    const startHour = getHour(job.schedule_start);
                    const duration = job.schedule_duration
                      ? parseFloat(job.schedule_duration.replace(" hours", ""))
                      : 1;

                    return (
                      <Link
                        key={job.id}
                        to={`/tech/jobs/${job.id}`}
                        className={`absolute left-1 right-1 p-1 rounded-md overflow-hidden text-xs ${
                          job.status === "completed"
                            ? "bg-green-100 border border-green-200"
                            : job.status === "cancelled"
                            ? "bg-red-100 border border-red-200"
                            : "bg-blue-100 border border-blue-200"
                        }`}
                        style={{
                          top: `${startHour * 40 + 2}px`,
                          height: `${duration * 40 - 4}px`,
                          maxHeight: `${duration * 40 - 4}px`,
                        }}
                      >
                        <div className="font-medium truncate">{job.name}</div>
                        <div className="truncate">{job.locations?.name}</div>
                      </Link>
                    );
                  })}

                  {dateJobs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-xs text-gray-500">No jobs</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianSchedule;
