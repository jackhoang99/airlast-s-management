import { useState, useEffect } from "react";
import { Clock, Play, Pause, StopCircle, AlertTriangle } from "lucide-react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";

type JobTimeTrackingProps = {
  jobId: string;
};

type ClockEvent = Database["public"]["Tables"]["job_clock_events"]["Row"];

const JobTimeTracking = ({ jobId }: JobTimeTrackingProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [technicians, setTechnicians] = useState<{
    [key: string]: { first_name: string; last_name: string };
  }>({});
  const [authUserMap, setAuthUserMap] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchClockEvents = async () => {
      if (!supabase || !jobId) return;

      try {
        setIsLoading(true);

        // Fetch clock events
        const { data: clockData, error: clockError } = await supabase
          .from("job_clock_events")
          .select("*")
          .eq("job_id", jobId)
          .order("event_time", { ascending: true });

        if (clockError) throw clockError;
        setClockEvents(clockData || []);

        // Calculate total hours
        if (clockData && clockData.length > 0) {
          let totalMilliseconds = 0;
          let clockInTime: Date | null = null;

          // Get unique technician IDs
          const techIds = [...new Set(clockData.map((event) => event.user_id))];

          // Fetch technician details from users table
          if (techIds.length > 0) {
            // First try to fetch users directly
            const { data: techData, error: techError } = await supabase
              .from("users")
              .select("id, first_name, last_name")
              .in("id", techIds);

            if (techError) {
              console.error("Error fetching users:", techError);
            } else if (techData) {
              // Create a map of technician IDs to names
              const techMap: {
                [key: string]: { first_name: string; last_name: string };
              } = {};

              techData.forEach((tech) => {
                techMap[tech.id] = {
                  first_name: tech.first_name || "",
                  last_name: tech.last_name || "",
                };
              });

              setTechnicians(techMap);
            }

            // Now try to map auth IDs to user IDs
            try {
              // Get all users with auth_id
              const { data: usersWithAuth, error: usersError } = await supabase
                .from("users")
                .select("id, auth_id, first_name, last_name")
                .not("auth_id", "is", null);

              if (!usersError && usersWithAuth) {
                const authMap: { [key: string]: string } = {};
                const additionalTechMap: {
                  [key: string]: { first_name: string; last_name: string };
                } = {};

                usersWithAuth.forEach((user) => {
                  if (user.auth_id) {
                    authMap[user.auth_id] = user.id;
                    additionalTechMap[user.id] = {
                      first_name: user.first_name || "",
                      last_name: user.last_name || "",
                    };
                  }
                });

                setAuthUserMap(authMap);
                setTechnicians((prev) => ({ ...prev, ...additionalTechMap }));
              }
            } catch (err) {
              console.error("Error mapping auth IDs to users:", err);
            }
          }

          // Calculate time for each technician
          const technicianTimes: { [key: string]: number } = {};

          clockData.forEach((event, index) => {
            const techId = event.user_id;

            if (event.event_type === "clock_in") {
              clockInTime = new Date(event.event_time);
            } else if (
              (event.event_type === "clock_out" ||
                event.event_type === "break_start") &&
              clockInTime
            ) {
              const clockOutTime = new Date(event.event_time);
              const duration = clockOutTime.getTime() - clockInTime.getTime();

              if (duration > 0) {
                totalMilliseconds += duration;

                // Add to technician's time
                technicianTimes[techId] =
                  (technicianTimes[techId] || 0) + duration;
              }

              clockInTime = null;
            } else if (event.event_type === "break_end") {
              clockInTime = new Date(event.event_time);
            }
          });

          // Check if the last event is a clock-in with no corresponding clock-out
          if (clockInTime) {
            const now = new Date();
            const duration = now.getTime() - clockInTime.getTime();

            if (duration > 0) {
              totalMilliseconds += duration;

              // Add to technician's time
              const lastEvent = clockData[clockData.length - 1];
              technicianTimes[lastEvent.user_id] =
                (technicianTimes[lastEvent.user_id] || 0) + duration;
            }
          }

          // Convert milliseconds to hours
          setTotalHours(totalMilliseconds / (1000 * 60 * 60));
        }
      } catch (err) {
        console.error("Error fetching clock events:", err);
        setError("Failed to load time tracking data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClockEvents();
  }, [supabase, jobId]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (hours: number) => {
    const totalMinutes = Math.floor(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    return `${h}h ${m}m`;
  };

  const getTechnicianName = (userId: string) => {
    // First check if this is a direct match in our technicians map
    const tech = technicians[userId];
    if (tech) {
      if (tech.first_name || tech.last_name) {
        return `${tech.first_name} ${tech.last_name}`.trim();
      }
    }

    // Next, check if this is an auth ID that maps to a user ID
    const mappedUserId = authUserMap[userId];
    if (mappedUserId) {
      const mappedTech = technicians[mappedUserId];
      if (mappedTech && (mappedTech.first_name || mappedTech.last_name)) {
        return `${mappedTech.first_name} ${mappedTech.last_name}`.trim();
      }
    }

    // If we still don't have a name, show a truncated ID
    return userId.substring(0, 8) + "...";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 text-error-700 p-3 rounded-md">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary-600" />
          Time Tracking
        </h3>
        <div className="text-lg font-semibold">
          Total: {formatDuration(totalHours)}
        </div>
      </div>

      {clockEvents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 text-sm font-medium text-gray-500">
                  TECHNICIAN
                </th>
                <th className="px-4 py-2 text-sm font-medium text-gray-500">
                  EVENT
                </th>
                <th className="px-4 py-2 text-sm font-medium text-gray-500">
                  TIME
                </th>
                <th className="px-4 py-2 text-sm font-medium text-gray-500">
                  NOTES
                </th>
              </tr>
            </thead>
            <tbody>
              {clockEvents.map((event, index) => (
                <tr
                  key={event.id}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-4 py-3">
                    {getTechnicianName(event.user_id)}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {event.event_type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    {formatDateTime(event.event_time)}
                  </td>
                  <td className="px-4 py-3">{event.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">
          No time tracking events recorded yet
        </p>
      )}
    </div>
  );
};

export default JobTimeTracking;
