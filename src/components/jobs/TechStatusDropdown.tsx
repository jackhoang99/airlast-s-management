import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Square,
} from "lucide-react";

interface TechStatusDropdownProps {
  jobId: string;
  technicianId: string;
  technicianName: string;
  isPrimary?: boolean;
  scheduledTime?: string;
  onStatusChange?: (status: string) => void;
  showClockInOut?: boolean;
  currentClockStatus?: "clocked_out" | "clocked_in" | "on_break";
  onClockStatusChange?: (
    status: "clocked_out" | "clocked_in" | "on_break"
  ) => void;
  onTimeEvent?: () => void;
}

const TechStatusDropdown = ({
  jobId,
  technicianId,
  technicianName,
  isPrimary = false,
  scheduledTime,
  onStatusChange,
  showClockInOut = false,
  currentClockStatus = "clocked_out",
  onClockStatusChange,
  onTimeEvent,
}: TechStatusDropdownProps) => {
  const { supabase } = useSupabase();
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");

  // Fetch current status and history on component mount
  useEffect(() => {
    const fetchCurrentStatus = async () => {
      if (!supabase || !jobId || !technicianId) return;

      try {
        // Fetch current status
        const { data, error } = await supabase
          .from("job_technician_status")
          .select("status")
          .eq("job_id", jobId)
          .eq("technician_id", technicianId)
          .single();

        if (error && !error.message.includes("contains 0 rows")) {
          console.error("Error fetching tech status:", error);
        } else if (data) {
          setCurrentStatus(data.status);
        }
        // If no status exists, don't create one - let user choose

        // Fetch status history
        const { data: historyData, error: historyError } = await supabase
          .from("job_technician_status_history")
          .select("*")
          .eq("job_id", jobId)
          .eq("technician_id", technicianId)
          .order("created_at", { ascending: false });

        console.log("Status history fetch result:", {
          historyData,
          historyError,
        });

        if (historyError) {
          console.error("Error fetching status history:", historyError);
        } else {
          setStatusHistory(historyData || []);
        }
      } catch (err) {
        console.error("Error fetching tech status:", err);
      }
    };

    fetchCurrentStatus();
  }, [supabase, jobId, technicianId]);

  // Check current user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (!supabase) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from("users")
            .select("role")
            .eq("email", user.email)
            .maybeSingle();

          if (!error && userData) {
            setUserRole(userData.role);
          }
        }
      } catch (err) {
        console.error("Error checking user role:", err);
      } finally {
        setIsLoadingRole(false);
      }
    };

    checkUserRole();
  }, [supabase]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (!supabase || !jobId || !technicianId) return;

    // If clicking the same status, do nothing
    if (newStatus === currentStatus) return;

    // Show confirmation modal
    setPendingStatus(newStatus);
    setShowConfirmation(true);
  };

  const confirmStatusChange = async () => {
    if (!supabase || !jobId || !technicianId) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, end the current status by adding it to history with an end note
      if (currentStatus !== pendingStatus) {
        const { error: endCurrentError } = await supabase
          .from("job_technician_status_history")
          .insert({
            job_id: jobId,
            technician_id: technicianId,
            status: currentStatus,
            notes: `Status ended - switching to ${pendingStatus}`,
          });

        if (endCurrentError) {
          console.error("Error ending current status:", endCurrentError);
        }
      }

      // Update the current status
      const { error } = await supabase.from("job_technician_status").upsert(
        {
          job_id: jobId,
          technician_id: technicianId,
          status: pendingStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id,technician_id" }
      );

      if (error) throw error;

      // Add the new status to history
      const { error: historyError } = await supabase
        .from("job_technician_status_history")
        .insert({
          job_id: jobId,
          technician_id: technicianId,
          status: pendingStatus,
          notes: `Status started`,
        });

      if (historyError) {
        console.error("Error recording status history:", historyError);
      }

      // Refresh the status history
      const { data: newHistoryData, error: refreshError } = await supabase
        .from("job_technician_status_history")
        .select("*")
        .eq("job_id", jobId)
        .eq("technician_id", technicianId)
        .order("created_at", { ascending: false });

      if (refreshError) {
        console.error("Error refreshing status history:", refreshError);
      } else {
        setStatusHistory(newHistoryData || []);
      }

      // If status is "completed" or "tech completed", clock out the technician
      if (pendingStatus === "completed" || pendingStatus === "tech completed") {
        // Check if the technician is clocked in and clock them out
        if (currentClockStatus === "clocked_in") {
          await supabase.from("job_clock_events").insert({
            job_id: jobId,
            user_id: technicianId,
            event_type: "clock_out",
            event_time: new Date().toISOString(),
            notes: `Auto clock-out on ${
              pendingStatus === "tech completed" ? "technician" : "admin"
            } completion`,
          });
        }

        // For tech completed, also end any break if they're on break
        if (
          pendingStatus === "tech completed" &&
          currentClockStatus === "on_break"
        ) {
          await supabase.from("job_clock_events").insert({
            job_id: jobId,
            user_id: technicianId,
            event_type: "break_end",
            event_time: new Date().toISOString(),
            notes: "Auto end break on technician completion",
          });
        }
      }

      setCurrentStatus(pendingStatus);
      if (onStatusChange) {
        onStatusChange(pendingStatus);
      }
    } catch (err) {
      console.error("Error updating tech status:", err);
      setError("Failed to update status. Please try again.");
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
      setPendingStatus("");
    }
  };

  const cancelStatusChange = () => {
    setShowConfirmation(false);
    setPendingStatus("");
  };

  const handleClockEvent = async (
    eventType: "clock_in" | "clock_out" | "break_start" | "break_end"
  ) => {
    if (!supabase || !jobId || !technicianId) {
      setError("Unable to record time - missing required information");
      return;
    }

    // Set the appropriate loading state
    if (eventType === "clock_in") setIsClockingIn(true);
    else if (eventType === "clock_out") setIsClockingOut(true);
    else if (eventType === "break_start") setIsStartingBreak(true);
    else if (eventType === "break_end") setIsEndingBreak(true);

    try {
      console.log("Recording clock event:", {
        job_id: jobId,
        user_id: technicianId,
        event_type: eventType,
        event_time: new Date().toISOString(),
      });

      // Insert the clock event
      const { data, error } = await supabase
        .from("job_clock_events")
        .insert({
          job_id: jobId,
          user_id: technicianId,
          event_type: eventType,
          event_time: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error(`Error recording ${eventType}:`, error);
        throw error;
      }

      console.log("Clock event recorded successfully:", data);

      // Update current status
      let newStatus: "clocked_out" | "clocked_in" | "on_break";
      if (eventType === "clock_in") {
        newStatus = "clocked_in";
        if (onTimeEvent) onTimeEvent();
      } else if (eventType === "clock_out") {
        newStatus = "clocked_out";
        if (onTimeEvent) onTimeEvent();
      } else if (eventType === "break_start") {
        newStatus = "on_break";
        if (onTimeEvent) onTimeEvent();
      } else {
        newStatus = "clocked_in";
        if (onTimeEvent) onTimeEvent();
      }

      if (onClockStatusChange) {
        onClockStatusChange(newStatus);
      }
      setError(null);
    } catch (err) {
      console.error(`Error recording ${eventType}:`, err);
      setError(
        `Failed to record ${eventType.replace("_", " ")}. Please try again.`
      );
    } finally {
      // Reset all loading states
      setIsClockingIn(false);
      setIsClockingOut(false);
      setIsStartingBreak(false);
      setIsEndingBreak(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "traveling":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "working":
        return <User className="h-4 w-4 text-yellow-500" />;
      case "waiting on site":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "tech completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "traveling":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "working":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "waiting on site":
        return "bg-red-50 text-red-700 border-red-200";
      case "tech completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderStatusHistory = () => {
    if (statusHistory.length === 0) {
      return (
        <div className="text-center text-gray-500 text-xs py-2">
          No status history yet
        </div>
      );
    }

    // Filter out "end" entries and get only "start" entries
    const startEntries = statusHistory.filter(
      (history) => !history.notes || !history.notes.includes("Status ended")
    );

    return startEntries.map((history) => (
      <div
        key={history.id}
        className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon(history.status)}
          <span className="font-medium capitalize">{history.status}</span>
        </div>
        <div className="text-right">
          <div className="text-gray-500">
            {formatDateTime(history.created_at)}
          </div>
        </div>
      </div>
    ));
  };

  const renderCompletionOptions = () => {
    // Tech Completed Option - Only show for technicians
    if (userRole === "technician") {
      return (
        <div
          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
            currentStatus === "tech completed"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-green-300"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !isLoading && handleStatusChange("tech completed")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium text-gray-900">Tech Completed</div>
                <div className="text-sm text-gray-600">
                  Work finished, waiting for admin review (auto clock-out)
                </div>
              </div>
            </div>
            {currentStatus === "tech completed" && (
              <div className="text-green-600 text-sm font-medium">
                ✓ Selected
              </div>
            )}
          </div>
        </div>
      );
    }

    // Admin Completed Option - Only show for admins
    if (userRole === "admin") {
      return (
        <div
          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
            currentStatus === "completed"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-green-300"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !isLoading && handleStatusChange("completed")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium text-gray-900">Admin Completed</div>
                <div className="text-sm text-gray-600">
                  Job fully completed and approved
                </div>
              </div>
            </div>
            {currentStatus === "completed" && (
              <div className="text-green-600 text-sm font-medium">
                ✓ Selected
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show regular completed for both roles if no role is determined yet
    if (!userRole && !isLoadingRole) {
      return (
        <div
          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
            currentStatus === "completed"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-green-300"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !isLoading && handleStatusChange("completed")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium text-gray-900">Completed</div>
                <div className="text-sm text-gray-600">Job is finished</div>
              </div>
            </div>
            {currentStatus === "completed" && (
              <div className="text-green-600 text-sm font-medium">
                ✓ Selected
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderStatusOptions = () => {
    return (
      <div className="grid grid-cols-1 gap-3">
        {/* Traveling Option */}
        <div
          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
            currentStatus === "traveling"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-blue-300"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !isLoading && handleStatusChange("traveling")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium text-gray-900">Traveling</div>
                <div className="text-sm text-gray-600">
                  En route to job site
                </div>
              </div>
            </div>
            {currentStatus === "traveling" && (
              <div className="text-blue-600 text-sm font-medium">
                ✓ Selected
              </div>
            )}
          </div>
        </div>

        {/* Waiting on Site Option */}
        <div
          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
            currentStatus === "waiting on site"
              ? "border-red-500 bg-red-50"
              : "border-gray-200 hover:border-red-300"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !isLoading && handleStatusChange("waiting on site")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="font-medium text-gray-900">Waiting on Site</div>
                <div className="text-sm text-gray-600">
                  Waiting for parts, access, or customer
                </div>
              </div>
            </div>
            {currentStatus === "waiting on site" && (
              <div className="text-red-600 text-sm font-medium">✓ Selected</div>
            )}
          </div>
        </div>

        {/* Working Option */}
        <div
          className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
            currentStatus === "working"
              ? "border-yellow-500 bg-yellow-50"
              : "border-gray-200 hover:border-yellow-300"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !isLoading && handleStatusChange("working")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium text-gray-900">Working</div>
                <div className="text-sm text-gray-600">
                  Actively working on the job
                </div>
              </div>
            </div>
            {currentStatus === "working" && (
              <div className="text-yellow-600 text-sm font-medium">
                ✓ Selected
              </div>
            )}
          </div>
        </div>

        {/* Completion Options */}
        {renderCompletionOptions()}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {technicianName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
            <div>
              <div className="font-medium">
                {technicianName}
                {isPrimary && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                    Primary
                  </span>
                )}
              </div>
              {scheduledTime && (
                <div className="text-sm text-gray-600">{scheduledTime}</div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentStatus ? (
              <div
                className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs ${getStatusColor(
                  currentStatus
                )}`}
              >
                {getStatusIcon(currentStatus)}
                <span className="capitalize">{currentStatus}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-2 py-1 rounded border text-xs bg-gray-50 text-gray-500 border-gray-200">
                <span className="text-xs">No status selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Technician Side - Column Layout with Confirmation */}
        {showClockInOut ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-3">
              Status Options
            </h4>

            {renderStatusOptions()}

            {/* Time Display */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">
                  Current Time
                </div>
                <div className="text-lg font-mono text-gray-900">
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Clock In/Out Section - Only show when status is "working" */}
            {currentStatus === "working" && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Time Tracking
                  </h4>
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                      currentClockStatus === "clocked_in"
                        ? "bg-green-100 text-green-700"
                        : currentClockStatus === "on_break"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Clock size={12} />
                    <span className="capitalize">
                      {currentClockStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {currentClockStatus === "clocked_out" && (
                    <button
                      onClick={() => handleClockEvent("clock_in")}
                      disabled={isClockingIn}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      <Play size={16} />
                      <span>
                        {isClockingIn ? "Clocking In..." : "Clock In"}
                      </span>
                    </button>
                  )}

                  {currentClockStatus === "clocked_in" && (
                    <>
                      <button
                        onClick={() => handleClockEvent("break_start")}
                        disabled={isStartingBreak}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
                      >
                        <Pause size={16} />
                        <span>
                          {isStartingBreak
                            ? "Starting Break..."
                            : "Start Break"}
                        </span>
                      </button>
                      <button
                        onClick={() => handleClockEvent("clock_out")}
                        disabled={isClockingOut}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                      >
                        <Square size={16} />
                        <span>
                          {isClockingOut ? "Clocking Out..." : "Clock Out"}
                        </span>
                      </button>
                    </>
                  )}

                  {currentClockStatus === "on_break" && (
                    <button
                      onClick={() => handleClockEvent("break_end")}
                      disabled={isEndingBreak}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      <Play size={16} />
                      <span>
                        {isEndingBreak ? "Ending Break..." : "End Break"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Status History Section */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-800">
                  Status History
                </h5>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {renderStatusHistory()}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-3">
              Status Options
            </h4>

            {renderStatusOptions()}

            {/* Status History Section */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-800">
                  Status History
                </h5>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {renderStatusHistory()}
              </div>
            </div>
          </div>
        )}

        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Status Change
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to change your status to{" "}
              <strong className="capitalize">{pendingStatus}</strong>?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelStatusChange}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TechStatusDropdown;
