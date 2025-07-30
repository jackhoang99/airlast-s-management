import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSupabase } from "../../../lib/supabase-context";

const RequireTechAuth = () => {
  const location = useLocation();
  const { supabase, session, isLoading: supabaseLoading } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTechnician, setIsTechnician] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    const ensureAuthenticated = async () => {
      if (!supabase) {
        console.log("No Supabase client available");
        setIsLoading(false);
        return;
      }

      // Wait for Supabase to finish loading
      if (supabaseLoading) {
        return;
      }

      // If we've already checked auth and confirmed technician status, don't check again
      if (hasCheckedAuth && isTechnician) {
        return;
      }

      // Add a small delay to ensure session is fully restored
      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        setIsLoading(true);

        // Double-check session from Supabase directly
        const {
          data: { session: directSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        // Use the session from context or direct check
        const currentSession = session || directSession;

        // Check if we have a session
        if (currentSession) {
          console.log(
            "Checking technician role for:",
            currentSession.user.email
          );

          // Check if user exists in users table and is a technician
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, role, auth_id, username")
            .eq("email", currentSession.user.email)
            .maybeSingle();

          if (userError && !userError.message.includes("contains 0 rows")) {
            console.error("Error checking user role:", userError);
            setError("Error checking user role");
            setIsLoading(false);
            setHasCheckedAuth(true);
            return;
          }

          if (userData && userData.role === "technician") {
            // Check if user has auth_id, if not, they need to sign up first
            if (!userData.auth_id) {
              console.log(
                "User is technician but has no auth_id, redirecting to login"
              );
              setIsTechnician(false);
              setIsLoading(false);
              setHasCheckedAuth(true);
              return;
            }

            console.log("User confirmed as technician:", userData.username);

            // Update session storage for consistency
            sessionStorage.setItem("isTechAuthenticated", "true");
            sessionStorage.setItem(
              "techUsername",
              userData.username ||
                currentSession.user.email?.split("@")[0] ||
                "user"
            );

            setIsTechnician(true);
            setIsLoading(false);
            setHasCheckedAuth(true);
            return;
          }

          console.log("User found but not a technician, role:", userData?.role);
          setIsTechnician(false);
          setIsLoading(false);
          setHasCheckedAuth(true);
          return;
        }

        // No session: not authenticated
        console.log("No session found, redirecting to login");

        setIsTechnician(false);
        setIsLoading(false);
        setHasCheckedAuth(true);
      } catch (err) {
        console.error("Authentication error:", err);
        setError("Authentication error");
        setIsTechnician(false);
        setIsLoading(false);
        setHasCheckedAuth(true);
      }
    };

    ensureAuthenticated();
  }, [supabase, session, supabaseLoading, hasCheckedAuth, isTechnician]);

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
      isTechnician,
      "hasCheckedAuth:",
      hasCheckedAuth,
      "pathname:",
      location.pathname
    );

    return <Navigate to="/tech/login" state={{ from: location }} replace />;
  }

  if (error) {
    console.warn("Auth warning:", error);
  }

  return <Outlet />;
};

export default RequireTechAuth;
