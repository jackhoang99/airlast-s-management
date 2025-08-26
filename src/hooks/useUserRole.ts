import { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";

export const useUserRole = () => {
  const { supabase, session } = useSupabase();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!supabase || !session?.user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from("users")
          .select("role")
          .eq("email", session.user.email)
          .maybeSingle();

        if (!error && userData) {
          setUserRole(userData.role);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [supabase, session]);

  return { userRole, isLoading, isAdmin: userRole === "admin" };
};
