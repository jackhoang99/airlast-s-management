import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSupabase } from "../../lib/supabase-context";

const RequireAuth = () => {
  const location = useLocation();
  const { supabase, session, isLoading: supabaseLoading } = useSupabase();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication state once when component mounts
  useEffect(() => {
    const initializeAuth = async () => {
      if (!supabase || supabaseLoading) return;

      try {
        // If we have a session, check user role once
        if (session) {
          console.log("Session found, checking user role...");

          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("email", session.user.email)
            .maybeSingle();

          if (userError) {
            console.error("Error fetching user role:", userError);
            setUserRole(null);
          } else if (userData) {
            console.log("User role determined:", userData.role);
            setUserRole(userData.role);
          }
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
        setUserRole(null);
      } finally {
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
