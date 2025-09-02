import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ClearAuth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const clearAuthData = () => {
      try {
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear specific Supabase tokens
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("supabase.auth.expires_at");
        localStorage.removeItem("supabase.auth.refresh_token");

        console.log("✅ Authentication data cleared successfully!");

        // Redirect to login page
        navigate("/login", { replace: true });
      } catch (error) {
        console.error("❌ Error clearing authentication data:", error);
        // Still try to redirect even if clearing fails
        navigate("/login", { replace: true });
      }
    };

    // Clear auth data immediately when component mounts
    clearAuthData();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Clearing authentication data...</p>
      </div>
    </div>
  );
};

export default ClearAuth;
