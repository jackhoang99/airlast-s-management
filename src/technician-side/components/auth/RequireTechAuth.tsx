import { useEffect, useState, useRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useSupabase } from "../../../lib/supabase-context";

// Cache for user role to avoid repeated database queries
const userRoleCache = new Map<
  string,
  { role: string; username: string; auth_id: string | null }
>();

// Function to clear cache (useful for logout)
export const clearUserRoleCache = () => {
  userRoleCache.clear();
};

// Custom hook for technician profile data
const useTechProfile = (userEmail: string | undefined) => {
  const { supabase } = useSupabase();
  const [techData, setTechData] = useState<{
    role: string;
    username: string;
    auth_id: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!userEmail || !supabase) {
      setTechData(null);
      setIsLoading(false);
      setHasAttempted(false);
      return;
    }

    const fetchTechProfile = async () => {
      setIsLoading(true);
      setError(null);
      setHasAttempted(false);

      try {
        // Check cache first
        const cachedUser = userRoleCache.get(userEmail);
        if (cachedUser) {
          console.log("Using cached technician data:", cachedUser);
          setTechData(cachedUser);
          setIsLoading(false);
          setHasAttempted(true);
          return;
        }

        console.log("Fetching technician profile for:", userEmail);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, role, auth_id, username")
          .eq("email", userEmail)
          .maybeSingle();

        if (userError && !userError.message.includes("contains 0 rows")) {
          console.error("Error fetching user profile:", userError);
          setError("Error fetching user profile");
          setIsLoading(false);
          setHasAttempted(true);
          return;
        }

        if (!userData) {
          console.log("No user data found for:", userEmail);
          setTechData(null);
          setIsLoading(false);
          setHasAttempted(true);
          return;
        }

        const profileData = {
          role: userData.role,
          username: userData.username || userEmail?.split("@")[0] || "user",
          auth_id: userData.auth_id,
        };

        // Cache the data
        userRoleCache.set(userEmail, profileData);

        console.log("Technician profile loaded:", profileData);
        setTechData(profileData);
        setIsLoading(false);
        setHasAttempted(true);
      } catch (err) {
        console.error("Error in fetchTechProfile:", err);
        setError("Error fetching technician profile");
        setIsLoading(false);
        setHasAttempted(true);
      }
    };

    fetchTechProfile();
  }, [userEmail, supabase]);

  return { techData, isLoading: isLoading || !hasAttempted, error };
};

const RequireTechAuth = () => {
  const { supabase, session, isLoading: authLoading } = useSupabase();
  const location = useLocation();

  const [authState, setAuthState] = useState<"loading" | "allowed" | "denied">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const hasDecidedRef = useRef<string | null>(null);

  // Get technician profile data
  const {
    techData,
    isLoading: techLoading,
    error: techError,
  } = useTechProfile(session?.user?.email);

  useEffect(() => {
    console.log("Auth state effect running:", {
      authLoading,
      hasSession: !!session,
      techLoading,
      hasTechData: !!techData,
      techError,
      currentAuthState: authState,
      hasDecided: hasDecidedRef.current,
    });

    // Reset decision flag when session changes or when tech data changes
    const currentUser = session?.user?.email;
    if (
      currentUser !== hasDecidedRef.current ||
      (techData && hasDecidedRef.current === "no-session")
    ) {
      hasDecidedRef.current = null;
      setAuthState("loading");
    }

    // Prevent multiple decisions for the same user
    if (hasDecidedRef.current === currentUser) {
      console.log("Already made decision for this user, skipping");
      return;
    }

    // Don't make any decisions while auth is still loading
    if (authLoading) {
      console.log("Auth still loading, waiting...");
      return;
    }

    // If no session, user is not authenticated
    if (!session) {
      console.log("No session found, access denied");
      hasDecidedRef.current = "no-session";
      setAuthState("denied");
      return;
    }

    // If we have a session but tech profile is still loading, wait
    if (techLoading) {
      console.log("Session exists but tech profile loading, waiting...");
      return;
    }

    // If there was an error fetching tech profile
    if (techError) {
      console.log("Error fetching tech profile:", techError);
      hasDecidedRef.current = session.user.email;
      setError(techError);
      setAuthState("denied");
      return;
    }

    // If no tech data found, user is not a technician
    if (!techData) {
      console.log("No technician profile found for user");
      hasDecidedRef.current = session.user.email;
      setAuthState("denied");
      return;
    }

    // Check if user is a technician
    if (techData.role !== "technician") {
      console.log("User is not a technician, role:", techData.role);
      hasDecidedRef.current = session.user.email;
      setAuthState("denied");
      return;
    }

    // Check if user has auth_id (required for technician access)
    if (!techData.auth_id) {
      console.log("Technician has no auth_id, access denied");
      hasDecidedRef.current = session.user.email;
      setAuthState("denied");
      return;
    }

    // User is authenticated and is a technician
    console.log("User authenticated as technician:", techData.username);

    // Update session storage for consistency
    sessionStorage.setItem("isTechAuthenticated", "true");
    sessionStorage.setItem("techUsername", techData.username);

    hasDecidedRef.current = session.user.email;
    setAuthState("allowed");
  }, [session, authLoading, techData, techLoading, techError]);

  // Cleanup function to reset ref when component unmounts
  useEffect(() => {
    return () => {
      hasDecidedRef.current = null;
    };
  }, []);

  // Show loading while auth or tech profile is loading
  if (authLoading || techLoading || authState === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        <p className="ml-2 text-gray-600">Verifying technician access...</p>
      </div>
    );
  }

  // Show error if there was a problem
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Authentication Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Redirect based on auth state
  if (authState === "denied") {
    console.log("Access denied, redirecting to login");
    return <Navigate to="/tech/login" replace state={{ from: location }} />;
  }

  // User is authenticated and authorized
  return <Outlet />;
};

export default RequireTechAuth;
