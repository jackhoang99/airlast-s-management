import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSupabase } from "../../../lib/supabase-context";

const RequireTechAuth = () => {
  const location = useLocation();
  const { supabase, session, isLoading: supabaseLoading } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTechnician, setIsTechnician] = useState(false);

  useEffect(() => {
    const ensureAuthenticated = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      // Wait for Supabase to finish loading
      if (supabaseLoading) return;

      try {
        setIsLoading(true);

        // Check if we have a session
        if (session) {
          console.log("Session found, checking technician role...");

          // Check if user exists in users table and is a technician
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, role")
            .eq("email", session.user.email)
            .maybeSingle();

          if (userError && !userError.message.includes("contains 0 rows")) {
            console.error("Error checking user role:", userError);
            setError("Error checking user role");
            setIsLoading(false);
            return;
          }

          if (userData && userData.role === "technician") {
            console.log("User confirmed as technician");
            setIsTechnician(true);
            setIsLoading(false);
            return;
          }

          console.log("User found but not a technician");
          setIsTechnician(false);
          setIsLoading(false);
          return;
        }

        // No session: not authenticated
        console.log("No session found");
        setIsTechnician(false);
        setIsLoading(false);
      } catch (err) {
        console.error("Authentication error:", err);
        setError("Authentication error");
        setIsTechnician(false);
        setIsLoading(false);
      }
    };

    ensureAuthenticated();
  }, [supabase, session, supabaseLoading]);

  // Show loading while Supabase is initializing or we're checking authentication
  if (supabaseLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        <p className="ml-2 text-gray-600">Verifying authentication...</p>
      </div>
    );
  }

  // Only redirect to login if we're sure there's no valid session
  if (!session || !isTechnician) {
    console.log(
      "Redirecting to login - session:",
      !!session,
      "isTechnician:",
      isTechnician
    );
    return <Navigate to="/tech/login" state={{ from: location }} replace />;
  }

  if (error) {
    console.warn("Auth warning:", error);
  }

  return <Outlet />;
};

export default RequireTechAuth;
