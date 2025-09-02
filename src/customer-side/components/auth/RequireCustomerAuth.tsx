import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSupabase } from "../../../lib/supabase-context";

const RequireCustomerAuth = () => {
  const location = useLocation();
  const { supabase } = useSupabase();
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("customerPortalCompanyId") !== null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Check if we have company info in session storage
        const companyId = sessionStorage.getItem("customerPortalCompanyId");

        if (!companyId) {
          // Not logged in, will redirect to login
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Fetch company details to verify it exists
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .single();

        if (error) throw error;

        if (!data) {
          // Company not found, will redirect to login
          sessionStorage.removeItem("customerPortalCompanyId");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Company exists, user is authenticated
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Error checking auth:", err);
        setError("Authentication error. Please log in again.");
        sessionStorage.removeItem("customerPortalCompanyId");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  if (error) {
    console.warn("Auth warning:", error);
  }

  return <Outlet />;
};

export default RequireCustomerAuth;
