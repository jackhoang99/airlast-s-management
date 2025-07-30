import { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";

export const useUnreadReminders = (technicianId: string | null) => {
  const { supabase } = useSupabase();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!technicianId || !supabase) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from("job_reminders")
          .select("*", { count: "exact", head: true })
          .eq("reminder_type", "in_app")
          .eq("recipient", technicianId)
          .in("status", ["sent", "pending"]);

        if (error) throw error;
        setUnreadCount(count || 0);
      } catch (err) {
        console.error("Error fetching unread reminders:", err);
        setUnreadCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for new reminders
    const subscription = supabase
      .channel("reminders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_reminders",
          filter: `recipient=eq.${technicianId} AND reminder_type=eq.in_app AND status=in.(sent,pending)`,
        },
        () => {
          // Refetch count when reminders change
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [technicianId, supabase]);

  return { unreadCount, isLoading };
};
