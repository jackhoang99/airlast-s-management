import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSupabase } from "../../../lib/supabase-context";

const RequireTechAuth = () => {
  const location = useLocation();
  const { supabase, session } = useSupabase();
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("isTechAuthenticated") === "true"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTechnician, setIsTechnician] = useState(false);

  useEffect(() => {
    const ensureAuthenticated = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Check if we already have a session
        if (session) {
          console.log("Session found, checking if user is a technician");

          // Check if user exists in users table
          const username = sessionStorage.getItem("techUsername");

          if (username) {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("id, role")
              .eq("username", username)
              .maybeSingle();

            if (userError && !userError.message.includes("contains 0 rows")) {
              console.error("Error checking user:", userError);
              throw userError;
            }

            // If user exists and is a technician, we're good
            if (userData && userData.role === "technician") {
              console.log("User is a technician");
              setIsTechnician(true);
              setIsAuthenticated(true);
              sessionStorage.setItem("isTechAuthenticated", "true");
              setIsLoading(false);
              return;
            }

            // If user exists but is not a technician, deny access
            if (userData && userData.role !== "technician") {
              console.log("User found but not a technician:", userData);
              setError("Access denied. Only technicians can access this area.");
              setIsAuthenticated(false);
              setIsTechnician(false);
              sessionStorage.removeItem("isTechAuthenticated");
              sessionStorage.removeItem("techUsername");
              setIsLoading(false);
              return;
            }

            // If user doesn't exist, we'll check by email next
          }

          // Try to find user by email
          const { data: emailUser, error: emailError } = await supabase
            .from("users")
            .select("id, username, role")
            .eq("email", session.user.email)
            .maybeSingle();

          if (emailError && !emailError.message.includes("contains 0 rows")) {
            console.error("Error checking user by email:", emailError);
            throw emailError;
          }

          // If user exists by email and is a technician, we're good
          if (emailUser && emailUser.role === "technician") {
            console.log("User is a technician (found by email)");
            setIsTechnician(true);
            setIsAuthenticated(true);
            sessionStorage.setItem("isTechAuthenticated", "true");
            sessionStorage.setItem("techUsername", emailUser.username);
            setIsLoading(false);
            return;
          }

          // If user exists by email but is not a technician, deny access
          if (emailUser && emailUser.role !== "technician") {
            console.log("User found by email but not a technician:", emailUser);
            setError("Access denied. Only technicians can access this area.");
            setIsAuthenticated(false);
            setIsTechnician(false);
            sessionStorage.removeItem("isTechAuthenticated");
            sessionStorage.removeItem("techUsername");
            setIsLoading(false);
            return;
          }

          // If we get here, the user doesn't exist in our users table
          // We'll create a new user record with technician role
          const usernameToUse =
            username || session.user.email?.split("@")[0] || "tech";

          // Create a unique username to avoid conflicts
          const timestamp = new Date().getTime().toString().slice(-6);
          const uniqueUsername = `${usernameToUse}_${timestamp}`;

          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              id: session.user.id,
              auth_id: session.user.id,
              email: session.user.email,
              username: uniqueUsername,
              role: "technician",
              status: "active",
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating user:", createError);
            throw createError;
          }

          console.log("Created new technician user:", newUser);
          setIsTechnician(true);
          setIsAuthenticated(true);
          sessionStorage.setItem("isTechAuthenticated", "true");
          sessionStorage.setItem("techUsername", uniqueUsername);
          setIsLoading(false);
          return;
        }

        // If session storage says we're authenticated but Supabase doesn't have a session,
        // try to sign in with stored credentials
        if (isAuthenticated && !session) {
          const username = sessionStorage.getItem("techUsername") || "tech";
          const email = `${username}@airlast-demo.com`;

          console.log("Attempting to sign in with stored credentials:", {
            username,
            email,
          });

          // Try to sign in with demo credentials
          const { data, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: email,
              password: "hvac123",
            });

          if (signInError) {
            console.warn("Auto-authentication failed:", signInError);
            setError("Failed to authenticate automatically");
            setIsAuthenticated(false);
            setIsTechnician(false);
            sessionStorage.removeItem("isTechAuthenticated");
            sessionStorage.removeItem("techUsername");
          } else if (data.session) {
            // Successfully signed in
            setIsTechnician(true);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error("Error during auto-authentication:", err);
        setError(err instanceof Error ? err.message : "Authentication error");
        setIsAuthenticated(false);
        setIsTechnician(false);
        sessionStorage.removeItem("isTechAuthenticated");
        sessionStorage.removeItem("techUsername");
      } finally {
        setIsLoading(false);
      }
    };

    ensureAuthenticated();
  }, [supabase, session, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        <p className="ml-2 text-gray-600">Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isTechnician) {
    return <Navigate to="/tech/login" state={{ from: location }} replace />;
  }

  if (error) {
    console.warn("Auth warning:", error);
  }

  return <Outlet />;
};

export default RequireTechAuth;
