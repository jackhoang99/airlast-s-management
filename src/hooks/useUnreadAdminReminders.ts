import { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";

export const useUnreadAdminReminders = (adminId: string | null) => {
  const { supabase } = useSupabase();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!adminId || !supabase) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from("job_reminders")
          .select("*", { count: "exact", head: true })
          .eq("recipient", "admin")
          .eq("reminder_type", "in_app")
          .in("status", ["sent", "pending"]);

        if (error) throw error;
        setUnreadCount(count || 0);
      } catch (err) {
        console.error("Error fetching unread admin reminders count:", err);
        setUnreadCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for admin reminders
    const subscription = supabase
      .channel("admin-reminders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_reminders",
          filter: `recipient=eq.admin AND reminder_type=eq.in_app AND status=in.(sent,pending)`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [adminId, supabase]);

  return { unreadCount, isLoading };
};
