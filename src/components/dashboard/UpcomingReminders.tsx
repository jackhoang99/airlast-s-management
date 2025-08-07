import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import { Bell, Calendar, Clock, ArrowRight, AlertTriangle } from "lucide-react";

const UpcomingReminders = () => {
  const { supabase } = useSupabase();
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReminders = async () => {
      if (!supabase) return;

      try {
        setIsLoading(true);

        // Fetch pending reminders with job details
        const { data, error } = await supabase
          .from("job_reminders")
          .select(
            `
            id,
            job_id,
            reminder_type,
            scheduled_for,
            status,
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
          .eq("status", "pending")
          .order("scheduled_for", { ascending: true })
          .limit(5);

        if (error) throw error;
        setReminders(data || []);
      } catch (err) {
        console.error("Error fetching reminders:", err);
        setError("Failed to load upcoming reminders");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReminders();
  }, [supabase]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border-l-4 border-error-500 p-3 rounded-md">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-error-500" />
          <div className="ml-3">
            <p className="text-sm text-error-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No upcoming reminders
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <Link
          key={reminder.id}
          to={`/jobs/${reminder.job_id}`}
          className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">
                {reminder.jobs?.name || "Unknown Job"}
              </div>
              <div className="text-sm text-gray-600">
                Job #{reminder.jobs?.number}
              </div>
              {reminder.jobs?.locations && (
                <div className="text-xs text-gray-500 mt-1">
                  {reminder.jobs.locations.name}
                </div>
              )}
            </div>
            <div className="text-right">
              {reminder.jobs?.job_technicians &&
                reminder.jobs.job_technicians.length > 0 &&
                reminder.jobs.job_technicians[0].scheduled_at && (
                  <>
                    <div className="flex items-center justify-end text-sm text-blue-700">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(
                        reminder.jobs.job_technicians[0].scheduled_at
                      )}
                    </div>
                    <div className="flex items-center justify-end text-xs text-gray-500 mt-1">
                      <Clock size={12} className="mr-1" />
                      {formatTime(
                        reminder.jobs.job_technicians[0].scheduled_at
                      )}
                    </div>
                  </>
                )}
              <div className="text-xs mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full inline-block">
                {reminder.reminder_type === "email"
                  ? "Email Reminder"
                  : "In-App Reminder"}
              </div>
            </div>
          </div>
        </Link>
      ))}

      {reminders.length > 0 && (
        <Link
          to="/settings"
          className="flex items-center justify-center text-sm text-primary-600 hover:text-primary-800 mt-2"
        >
          View all reminders <ArrowRight size={14} className="ml-1" />
        </Link>
      )}
    </div>
  );
};

export default UpcomingReminders;
