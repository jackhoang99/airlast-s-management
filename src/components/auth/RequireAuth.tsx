import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSupabase } from "../../lib/supabase-context";

const RequireAuth = () => {
  const location = useLocation();
  const { supabase, session, isLoading: supabaseLoading } = useSupabase();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("🔍 RequireAuth: Timeout reached, forcing initialization");
      setTimeoutReached(true);
      setIsInitialized(true);
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, []);

  // Initialize authentication state once when component mounts
  useEffect(() => {
    const initializeAuth = async () => {
      console.log("🔍 RequireAuth: Starting initialization", {
        hasSupabase: !!supabase,
        supabaseLoading,
        hasSession: !!session,
        sessionEmail: session?.user?.email,
      });

      if (!supabase || supabaseLoading) {
        console.log("🔍 RequireAuth: Waiting for Supabase client");
        return;
      }

      try {
        // If we have a session, check user role once
        if (session) {
          console.log(
            "🔍 RequireAuth: Session found, checking user role for:",
            session.user.email
          );

          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("email", session.user.email)
            .maybeSingle();

          console.log("🔍 RequireAuth: User query result", {
            userData,
            userError,
            hasData: !!userData,
            role: userData?.role,
          });

          if (userError) {
            console.error(
              "🔍 RequireAuth: Error fetching user role:",
              userError
            );
            setUserRole(null);
          } else if (userData) {
            console.log("🔍 RequireAuth: User role determined:", userData.role);
            setUserRole(userData.role);
          } else {
            console.log(
              "🔍 RequireAuth: No user data found for email:",
              session.user.email
            );
            setUserRole(null);
          }
        } else {
          console.log("🔍 RequireAuth: No session found");
        }
      } catch (err) {
        console.error("🔍 RequireAuth: Error initializing auth:", err);
        setUserRole(null);
      } finally {
        console.log("🔍 RequireAuth: Initialization complete");
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [supabase, session, supabaseLoading]);

  // Show loading only during initial Supabase setup
  if (supabaseLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Show loading while we're checking the user role
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying user permissions...</p>
        </div>
      </div>
    );
  }

  // No session - redirect to login
  if (!session) {
    console.log("No session, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is a technician - redirect to tech portal
  if (userRole === "technician") {
    console.log("Technician detected, redirecting to tech portal");
    return <Navigate to="/tech" replace />;
  }

  // User is admin or other role - allow access
  if (userRole === "admin" || userRole === "user") {
    console.log("Access granted for role:", userRole);
    return <Outlet />;
  }

  // Unknown role - redirect to login
  console.log("Unknown role, redirecting to login");
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default RequireAuth;
