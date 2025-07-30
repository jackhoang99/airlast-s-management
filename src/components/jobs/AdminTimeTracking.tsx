import { useState, useEffect } from "react";
import {
  Clock,
  Play,
  Pause,
  StopCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  User,
  Calendar,
  Save,
  X,
} from "lucide-react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";

type AdminTimeTrackingProps = {
  jobId: string;
  onRefresh?: () => void;
  jobTechnicians?: {
    id: string;
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  }[];
};

type ClockEvent = Database["public"]["Tables"]["job_clock_events"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

const AdminTimeTracking = ({
  jobId,
  onRefresh,
  jobTechnicians,
}: AdminTimeTrackingProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [technicians, setTechnicians] = useState<{
    [key: string]: { first_name: string; last_name: string };
  }>({});
  const [availableTechnicians, setAvailableTechnicians] = useState<User[]>([]);
  const [authUserMap, setAuthUserMap] = useState<{ [key: string]: string }>({});

  // Admin editing states
  const [editingEvent, setEditingEvent] = useState<ClockEvent | null>(null);
  const [showClockInOut, setShowClockInOut] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [eventType, setEventType] = useState<
    "clock_in" | "clock_out" | "break_start" | "break_end"
  >("clock_in");
  const [eventTime, setEventTime] = useState<string>("");
  const [eventNotes, setEventNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to refresh data locally
  const refreshData = async () => {
    if (!supabase || !jobId) return;

    try {
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

        clockData.forEach((event) => {
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
          }
        }

        // Convert milliseconds to hours
        setTotalHours(totalMilliseconds / (1000 * 60 * 60));
      } else {
        setTotalHours(0);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError("Failed to refresh time tracking data");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
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

        // Fetch only technicians assigned to this job
        let techData: any[] = [];
        let techError: any = null;

        if (jobTechnicians && jobTechnicians.length > 0) {
          const technicianIds = jobTechnicians.map((jt) => jt.technician_id);
          const { data: assignedTechData, error: assignedTechError } =
            await supabase
              .from("users")
              .select("id, first_name, last_name, auth_id")
              .in("id", technicianIds)
              .eq("role", "technician")
              .eq("status", "active")
              .order("first_name");

          if (assignedTechError) {
            console.error(
              "Error fetching assigned technicians:",
              assignedTechError
            );
            techError = assignedTechError;
          } else if (assignedTechData) {
            techData = assignedTechData;
          }
        }

        if (techError) {
          console.error("Error fetching technicians:", techError);
        } else if (techData) {
          setAvailableTechnicians(techData);

          // Create technician map
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

          // Create auth ID mapping
          const authMap: { [key: string]: string } = {};
          techData.forEach((tech) => {
            if (tech.auth_id) {
              authMap[tech.auth_id] = tech.id;
            }
          });
          setAuthUserMap(authMap);
        }

        // Calculate total hours
        if (clockData && clockData.length > 0) {
          let totalMilliseconds = 0;
          let clockInTime: Date | null = null;

          clockData.forEach((event) => {
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
            }
          }

          // Convert milliseconds to hours
          setTotalHours(totalMilliseconds / (1000 * 60 * 60));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load time tracking data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  const handleEditEvent = (event: ClockEvent) => {
    setEditingEvent(event);
    setEventType(event.event_type as any);
    setEventTime(new Date(event.event_time).toISOString().slice(0, 16));
    setEventNotes(event.notes || "");

    // Find the technician ID (could be auth_id or user_id)
    const tech = availableTechnicians.find(
      (t) => t.id === event.user_id || t.auth_id === event.user_id
    );
    setSelectedTechnician(tech?.id || "");
  };

  const handleSaveEdit = async () => {
    if (!editingEvent || !selectedTechnician || !eventTime) return;

    setIsSubmitting(true);
    try {
      // Get the auth_id for the selected technician
      const selectedTech = availableTechnicians.find(
        (t) => t.id === selectedTechnician
      );
      if (!selectedTech?.auth_id) {
        throw new Error("Selected technician does not have an auth ID");
      }

      const { error } = await supabase
        .from("job_clock_events")
        .update({
          user_id: selectedTech.auth_id, // Use auth_id instead of user id
          event_type: eventType,
          event_time: new Date(eventTime).toISOString(),
          notes: eventNotes,
        })
        .eq("id", editingEvent.id);

      if (error) throw error;

      // Refresh data locally
      await refreshData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error updating event:", err);
      setError("Failed to update time tracking event");
    } finally {
      setIsSubmitting(false);
      setEditingEvent(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this time tracking event?"))
      return;

    try {
      const { error } = await supabase
        .from("job_clock_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      // Refresh data locally
      await refreshData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error deleting event:", err);
      setError("Failed to delete time tracking event");
    }
  };

  const handleClockInOut = async () => {
    if (!selectedTechnician) return;

    setIsSubmitting(true);
    try {
      // Get the auth_id for the selected technician
      const selectedTech = availableTechnicians.find(
        (t) => t.id === selectedTechnician
      );
      if (!selectedTech?.auth_id) {
        throw new Error("Selected technician does not have an auth ID");
      }

      const { error } = await supabase.from("job_clock_events").insert({
        job_id: jobId,
        user_id: selectedTech.auth_id, // Use auth_id instead of user id
        event_type: eventType,
        event_time: new Date().toISOString(),
        notes: eventNotes || `Admin clock ${eventType.replace("_", " ")}`,
      });

      if (error) throw error;

      // Refresh data locally
      await refreshData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error recording clock event:", err);
      setError("Failed to record clock event");
    } finally {
      setIsSubmitting(false);
      setShowClockInOut(false);
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setShowClockInOut(false);
    setSelectedTechnician("");
    setEventType("clock_in");
    setEventTime("");
    setEventNotes("");
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
          Admin Time Tracking
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">
            Total: {formatDuration(totalHours)}
          </div>
          <button
            onClick={() => setShowClockInOut(true)}
            className="btn btn-primary btn-sm flex items-center gap-1"
          >
            <User className="h-4 w-4" />
            Clock In/Out
          </button>
        </div>
      </div>

      {/* Clock In/Out Modal */}
      {showClockInOut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium mb-4">
              Clock In/Out for Technician
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Technician
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select Technician</option>
                  {availableTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="input w-full"
                >
                  <option value="clock_in">Clock In</option>
                  <option value="clock_out">Clock Out</option>
                  <option value="break_start">Break Start</option>
                  <option value="break_end">Break End</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={resetForm}
                className="btn btn-outline"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleClockInOut}
                className="btn btn-primary"
                disabled={isSubmitting || !selectedTechnician}
              >
                {isSubmitting ? "Recording..." : "Record Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-medium mb-4">
              Edit Time Tracking Event
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Technician
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select Technician</option>
                  {availableTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="input w-full"
                >
                  <option value="clock_in">Clock In</option>
                  <option value="clock_out">Clock Out</option>
                  <option value="break_start">Break Start</option>
                  <option value="break_end">Break End</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={resetForm}
                className="btn btn-outline"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn btn-primary"
                disabled={isSubmitting || !selectedTechnician || !eventTime}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <th className="px-4 py-2 text-sm font-medium text-gray-500">
                  ACTIONS
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
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit event"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
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

export default AdminTimeTracking;
