import { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";
import { Bell, Mail, MessageSquare, X, CheckCircle } from "lucide-react";
import { useUnreadAdminReminders } from "../hooks/useUnreadAdminReminders";

interface AdminRemindersProps {
  adminId: string;
}

const AdminReminders = ({ adminId }: AdminRemindersProps) => {
  const { supabase } = useSupabase();
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { unreadCount } = useUnreadAdminReminders(adminId);

  useEffect(() => {
    fetchReminders();
  }, [adminId]);

  const fetchReminders = async () => {
    if (!supabase || !adminId) {
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("job_reminders")
        .select(
          `
          *,
          jobs (
            id,
            number,
            name,
            contact_name
          )
        `
        )
        .eq("recipient", "admin")
        .eq("reminder_type", "in_app")
        .in("status", ["sent", "pending"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setReminders(data || []);
    } catch (err) {
      console.error("Error fetching admin reminders:", err);
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

      // Refresh the reminders list
      fetchReminders();
    } catch (err) {
      console.error("Error marking reminder as read:", err);
    }
  };

  const formatDateTime = (dateString: string) => {
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
        return <Mail className="h-4 w-4" />;
      case "in_app":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="h-5 w-5 text-blue-600 mr-2" />
            Admin Reminders
          </h2>
        </div>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-red-50 border-b border-red-100">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="h-5 w-5 text-red-600 mr-2" />
            Admin Reminders
          </h2>
        </div>
        <div className="p-4 text-red-600">{error}</div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="h-5 w-5 text-blue-600 mr-2" />
            Admin Reminders
          </h2>
        </div>
        <div className="p-4 text-center text-gray-500">No admin reminders</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <h2 className="text-lg font-semibold flex items-center">
          <Bell className="h-5 w-5 text-blue-600 mr-2" />
          Admin Reminders
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
      </div>
      <div className="divide-y divide-gray-200">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`p-4 hover:bg-gray-50 transition-colors ${
              reminder.status === "sent" ? "bg-yellow-50" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getReminderTypeIcon(reminder.reminder_type)}
                  <span className="font-medium text-gray-900">
                    {reminder.subject}
                  </span>
                  {reminder.status === "sent" && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      New
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-2">{reminder.message}</p>
                {reminder.jobs && (
                  <div className="text-xs text-gray-500 mb-2">
                    Job: {reminder.jobs.number} - {reminder.jobs.name}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {formatDateTime(reminder.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {reminder.status === "sent" && (
                  <button
                    onClick={() => markAsRead(reminder.id)}
                    className="text-green-600 hover:text-green-800"
                    title="Mark as read"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReminders;
