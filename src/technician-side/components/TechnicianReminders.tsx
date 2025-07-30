import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Bell, Mail, MessageSquare, X, CheckCircle } from "lucide-react";
import { useUnreadReminders } from "../../hooks/useUnreadReminders";

interface TechnicianRemindersProps {
  technicianId: string;
}

const TechnicianReminders = ({ technicianId }: TechnicianRemindersProps) => {
  const { supabase } = useSupabase();
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { unreadCount } = useUnreadReminders(technicianId);

  useEffect(() => {
    fetchReminders();
  }, [technicianId]);

  const fetchReminders = async () => {
    if (!supabase || !technicianId) return;

    try {
      setIsLoading(true);

      // Fetch in-app reminders for this technician
      const { data, error } = await supabase
        .from("job_reminders")
        .select(
          `
          id,
          job_id,
          reminder_type,
          subject,
          message,
          scheduled_for,
          sent_at,
          status,
          jobs (
            id,
            number,
            name,
            schedule_start,
            locations (
              name,
              address,
              city,
              state,
              zip
            )
          )
        `
        )
        .eq("reminder_type", "in_app")
        .eq("recipient", technicianId)
        .in("status", ["sent", "pending"])
        .order("scheduled_for", { ascending: false })
        .limit(10);

      if (error) throw error;
      setReminders(data || []);
    } catch (err) {
      console.error("Error fetching technician reminders:", err);
      setError("Failed to load reminders");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (reminderId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("job_reminders")
        .update({ status: "read" })
        .eq("id", reminderId);

      if (error) throw error;

      // Remove from local state
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (err) {
      console.error("Error marking reminder as read:", err);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail size={16} className="text-blue-500" />;
      case "in_app":
        return <MessageSquare size={16} className="text-green-500" />;
      case "sms":
        return <Bell size={16} className="text-purple-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-yellow-50 border-b border-yellow-100">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="h-5 w-5 text-yellow-600 mr-2" />
            Reminders
          </h2>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-yellow-50 border-b border-yellow-100">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="h-5 w-5 text-yellow-600 mr-2" />
            Reminders
          </h2>
        </div>
        <div className="p-6 text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return null; // Don't show the section if no reminders
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-yellow-50 border-b border-yellow-100">
        <h2 className="text-lg font-semibold flex items-center">
          <Bell className="h-5 w-5 text-yellow-600 mr-2" />
          Reminders
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
      </div>

      <div className="divide-y divide-gray-200">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  {getReminderTypeIcon(reminder.reminder_type)}
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {reminder.subject || "Reminder"}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {formatDateTime(reminder.scheduled_for)}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-2">{reminder.message}</p>

                {reminder.jobs && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <strong>Job:</strong> {reminder.jobs.name} (Job #
                    {reminder.jobs.number})
                    {reminder.jobs.locations && (
                      <span> • {reminder.jobs.locations.name}</span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => markAsRead(reminder.id)}
                className="ml-3 p-1 text-gray-400 hover:text-gray-600"
                title="Mark as read"
              >
                <CheckCircle size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TechnicianReminders;
