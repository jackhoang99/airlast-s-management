import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Square,
} from "lucide-react";

interface TechnicianActivityHistoryProps {
  jobId: string;
  technicianId: string;
  technicianName: string;
  isPrimary?: boolean;
}

interface StatusHistory {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ClockEvent {
  id: string;
  event_type: string;
  event_time: string;
}

const TechnicianActivityHistory = ({
  jobId,
  technicianId,
  technicianName,
  isPrimary = false,
}: TechnicianActivityHistoryProps) => {
  const { supabase } = useSupabase();
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivityHistory = async () => {
      if (!supabase || !jobId || !technicianId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch status history
        const { data: statusData, error: statusError } = await supabase
          .from("job_technician_status")
          .select("*")
          .eq("job_id", jobId)
          .eq("technician_id", technicianId)
          .order("created_at", { ascending: false });

        if (statusError) throw statusError;

        // Fetch clock events
        const { data: clockData, error: clockError } = await supabase
          .from("job_clock_events")
          .select("*")
          .eq("job_id", jobId)
          .eq("user_id", technicianId)
          .order("event_time", { ascending: false });

        if (clockError) throw clockError;

        setStatusHistory(statusData || []);
        setClockEvents(clockData || []);

        // Set current status
        if (statusData && statusData.length > 0) {
          setCurrentStatus(statusData[0].status);
        }
      } catch (err) {
        console.error("Error fetching activity history:", err);
        setError("Failed to load activity history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityHistory();
  }, [supabase, jobId, technicianId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "traveling":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "working":
        return <User className="h-4 w-4 text-green-500" />;
      case "waiting on site":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "traveling":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "working":
        return "bg-green-50 text-green-700 border-green-200";
      case "waiting on site":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "completed":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getClockEventIcon = (eventType: string) => {
    switch (eventType) {
      case "clock_in":
        return <Play className="h-4 w-4 text-green-500" />;
      case "clock_out":
        return <Square className="h-4 w-4 text-red-500" />;
      case "break_start":
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case "break_end":
        return <Play className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getClockEventText = (eventType: string) => {
    switch (eventType) {
      case "clock_in":
        return "Clocked In";
      case "clock_out":
        return "Clocked Out";
      case "break_start":
        return "Started Break";
      case "break_end":
        return "Ended Break";
      default:
        return eventType.replace("_", " ");
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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
      <div className="bg-red-50 text-red-700 p-3 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
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
          </div>
        </div>

        {currentStatus && (
          <div
            className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs ${getStatusColor(
              currentStatus
            )}`}
          >
            {getStatusIcon(currentStatus)}
            <span className="capitalize">{currentStatus}</span>
          </div>
        )}
      </div>

      {/* Status History */}
      {statusHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">
            Status History
          </h4>
          <div className="space-y-2">
            {statusHistory.map((status, index) => (
              <div
                key={status.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status.status)}
                  <span className="text-sm font-medium capitalize">
                    {status.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDateTime(status.updated_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Tracking History */}
      {clockEvents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">
            Time Tracking History
          </h4>
          <div className="space-y-2">
            {clockEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-2">
                  {getClockEventIcon(event.event_type)}
                  <span className="text-sm font-medium">
                    {getClockEventText(event.event_type)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDateTime(event.event_time)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {statusHistory.length === 0 && clockEvents.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p>No activity history available</p>
        </div>
      )}
    </div>
  );
};

export default TechnicianActivityHistory;
