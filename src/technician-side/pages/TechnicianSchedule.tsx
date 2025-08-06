import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import TechnicianJobDetailSheet from "../components/jobs/TechnicianJobDetailSheet";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Building2,
  Calendar,
} from "lucide-react";

const TechnicianSchedule = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [currentTechnician, setCurrentTechnician] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showJobSheet, setShowJobSheet] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [jobsByDate, setJobsByDate] = useState<{ [key: string]: number }>({});

  // Fetch current technician
  useEffect(() => {
    const fetchCurrentTechnician = async () => {
      if (!supabase) return;
      setIsLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Not authenticated");
          setIsLoading(false);
          return;
        }

        console.log("Auth user:", user);

        // Try to find user by email first
        const { data, error } = await supabase
          .from("users")
          .select("id, first_name, last_name, role, status")
          .eq("email", user.email)
          .single();

        if (error) {
          console.error("Error fetching user by email:", error);
          // Try by auth_id as fallback
          const { data: authData, error: authError } = await supabase
            .from("users")
            .select("id, first_name, last_name, role, status")
            .eq("auth_id", user.id)
            .single();

          if (authError) {
            console.error("Error fetching user by auth_id:", authError);
            throw authError;
          }

          console.log("Fetched user data by auth_id:", authData);

          // Check if user has technician role
          if (authData.role !== "technician") {
            setError("User does not have technician role");
            setIsLoading(false);
            return;
          }

          setCurrentTechnician(authData);
          setIsLoading(false);
        } else {
          console.log("Fetched user data by email:", data);

          // Check if user has technician role
          if (data.role !== "technician") {
            setError("User does not have technician role");
            setIsLoading(false);
            return;
          }

          setCurrentTechnician(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error in fetchCurrentTechnician:", err);
        setError("Failed to load technician information");
        setIsLoading(false);
      }
    };
    fetchCurrentTechnician();
  }, [supabase]);

  // Fetch jobs for the current technician on the selected day
  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase || !currentTechnician) return;

      try {
        const start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);

        console.log("Fetching jobs for technician:", currentTechnician.id);
        console.log(
          "Date range:",
          start.toISOString(),
          "to",
          end.toISOString()
        );

        const { data, error } = await supabase
          .from("jobs")
          .select(
            `*,
              job_technicians:job_technicians!inner (
                technician_id, is_primary, schedule_date, schedule_time, users:technician_id (first_name, last_name)
              ),
              locations (name, address, city, state, zip),
              job_units:job_units!inner (
                unit_id,
                units:unit_id (id, unit_number)
              )
            `
          )
          .eq("job_technicians.technician_id", currentTechnician.id)
          .not("job_technicians.schedule_date", "is", null)
          .not("job_technicians.schedule_time", "is", null)
          .gte(
            "job_technicians.schedule_date",
            start.toISOString().split("T")[0]
          )
          .lte("job_technicians.schedule_date", end.toISOString().split("T")[0])
          .order(
            "job_technicians.schedule_date, job_technicians.schedule_time"
          );

        if (error) {
          console.error("Error fetching jobs:", error);
          throw error;
        }

        console.log("Fetched jobs:", data);

        // Flatten units
        const jobsWithUnits = (data || []).map((job: any) => ({
          ...job,
          units: (job.job_units || []).map((ju: any) => ju.units),
        }));
        setJobs(jobsWithUnits);
      } catch (err) {
        console.error("Error in fetchJobs:", err);
        setError("Failed to load jobs");
      }
    };
    fetchJobs();
  }, [supabase, currentDate, currentTechnician]);

  // Fetch jobs for all dates to populate calendar
  useEffect(() => {
    const fetchJobsForCalendar = async () => {
      if (!supabase || !currentTechnician) return;

      try {
        // Get jobs for the next 30 days
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() + 30);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("jobs")
          .select("job_technicians(schedule_date)")
          .eq("job_technicians.technician_id", currentTechnician.id)
          .not("job_technicians.schedule_date", "is", null)
          .gte(
            "job_technicians.schedule_date",
            start.toISOString().split("T")[0]
          )
          .lte(
            "job_technicians.schedule_date",
            end.toISOString().split("T")[0]
          );

        if (error) {
          console.error("Error fetching jobs for calendar:", error);
          return;
        }

        // Group jobs by date
        const jobsByDateMap: { [key: string]: number } = {};
        data?.forEach((job) => {
          if (job.job_technicians && job.job_technicians.length > 0) {
            job.job_technicians.forEach((tech: any) => {
              if (tech.schedule_date) {
                const dateKey = tech.schedule_date;
                jobsByDateMap[dateKey] = (jobsByDateMap[dateKey] || 0) + 1;
              }
            });
          }
        });

        setJobsByDate(jobsByDateMap);
      } catch (err) {
        console.error("Error in fetchJobsForCalendar:", err);
      }
    };

    fetchJobsForCalendar();
  }, [supabase, currentTechnician]);

  // Helper functions for calendar display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const getJobTypeColorClass = (type: string) => {
    const colorMap: { [key: string]: string } = {
      maintenance: "bg-purple-100 text-purple-800 border-purple-200",
      "service call": "bg-teal-100 text-teal-800 border-teal-200",
      inspection: "bg-blue-100 text-blue-800 border-blue-200",
      repair: "bg-orange-100 text-orange-800 border-orange-200",
      installation: "bg-green-100 text-green-800 border-green-200",
    };
    return (
      colorMap[type.toLowerCase()] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

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

  // Handler for job click (show details)
  const handleJobClick = (job: any) => {
    setSelectedJob(job);
    setShowJobSheet(true);
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const formatCalendarDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isDateHasJobs = (date: Date) => {
    const dateKey = formatCalendarDate(date);
    return jobsByDate[dateKey] && jobsByDate[dateKey] > 0;
  };

  const isCurrentDate = (date: Date) => {
    return formatCalendarDate(date) === formatCalendarDate(currentDate);
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setShowCalendar(false);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <p className="text-sm text-error-700">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  My Schedule
                </h1>
                {currentTechnician && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
                      {currentTechnician.first_name.charAt(0)}
                      {currentTechnician.last_name.charAt(0)}
                    </div>
                    <span>
                      {currentTechnician.first_name}{" "}
                      {currentTechnician.last_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Date Navigation */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePrevDay}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-primary-100 hover:bg-primary-200 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-lg font-medium text-gray-900">
                    {formatDate(currentDate)}
                  </span>
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Popup */}
          {showCalendar && (
            <div className="absolute top-20 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Date
                </h3>
                <button
                  onClick={() => setShowCalendar(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-xs font-medium text-gray-500 text-center py-1"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const { daysInMonth, startingDayOfWeek } =
                    getDaysInMonth(currentDate);
                  const days = [];

                  // Add empty cells for days before the first day of the month
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="h-8"></div>);
                  }

                  // Add days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      day
                    );
                    const hasJobs = isDateHasJobs(date);
                    const isCurrent = isCurrentDate(date);

                    days.push(
                      <button
                        key={day}
                        onClick={() => handleDateSelect(date)}
                        className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                          isCurrent
                            ? "bg-primary-600 text-white"
                            : hasJobs
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  }

                  return days;
                })()}
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Time slots from 8 AM to 8 PM */}
              {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => {
                const timeString = `${hour.toString().padStart(2, "0")}:00`;
                const jobsInThisHour = jobs.filter((job) => {
                  if (!job.job_technicians || job.job_technicians.length === 0)
                    return false;
                  const techSchedule = job.job_technicians.find(
                    (tech: any) => tech.technician_id === currentTechnician?.id
                  );
                  if (!techSchedule || !techSchedule.schedule_time)
                    return false;
                  const [hours] = techSchedule.schedule_time
                    .split(":")
                    .map(Number);
                  return hours === hour;
                });

                return (
                  <div
                    key={hour}
                    className="flex items-start space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Time Label */}
                    <div className="w-20 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {hour === 0
                            ? "12 AM"
                            : hour < 12
                            ? `${hour} AM`
                            : hour === 12
                            ? "12 PM"
                            : `${hour - 12} PM`}
                        </span>
                      </div>
                    </div>

                    {/* Jobs for this time slot */}
                    <div className="flex-1 space-y-2">
                      {jobsInThisHour.length === 0 ? (
                        <div className="text-gray-400 text-sm italic">
                          No jobs scheduled
                        </div>
                      ) : (
                        jobsInThisHour.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => handleJobClick(job)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getJobTypeColorClass(
                              job.type
                            )}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">
                                    {job.name}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-70 text-gray-700">
                                    {job.type}
                                    {job.type === "maintenance" &&
                                      job.additional_type && (
                                        <span className="ml-1">
                                          • {job.additional_type}
                                        </span>
                                      )}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {(() => {
                                        const techSchedule =
                                          job.job_technicians.find(
                                            (tech: any) =>
                                              tech.technician_id ===
                                              currentTechnician?.id
                                          );
                                        if (
                                          !techSchedule ||
                                          !techSchedule.schedule_time
                                        )
                                          return "No time set";
                                        const [hours, minutes] =
                                          techSchedule.schedule_time
                                            .split(":")
                                            .map(Number);
                                        const ampm = hours >= 12 ? "PM" : "AM";
                                        const displayHours = hours % 12 || 12;
                                        return `${displayHours}:${minutes
                                          .toString()
                                          .padStart(2, "0")} ${ampm}`;
                                      })()}
                                    </span>
                                  </div>

                                  {job.locations?.name && (
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="h-3 w-3" />
                                      <span>{job.locations.name}</span>
                                    </div>
                                  )}

                                  {job.units && job.units.length > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <Building2 className="h-3 w-3" />
                                      <span>
                                        Unit {job.units[0].unit_number}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Sheet */}
      {showJobSheet && selectedJob && (
        <TechnicianJobDetailSheet
          job={selectedJob}
          isNavigating={false}
          estimatedTime={null}
          estimatedDistance={null}
          arrivalTime={null}
          directionsSteps={[]}
          currentStepIndex={0}
          showDirections={false}
          setShowDirections={() => {}}
          prevStep={() => {}}
          nextStep={() => {}}
          onClose={() => setShowJobSheet(false)}
          onRecalculate={() => {}}
          onReschedule={() => {}}
          onReassign={() => {}}
        />
      )}
    </div>
  );
};

export default TechnicianSchedule;
