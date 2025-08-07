import { useState, FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import { Wind, AlertCircle } from "lucide-react";

const TechnicianLogin = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/tech";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>("/airlast-logo.svg");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error("Supabase client not initialized");

      // Clear any existing auth data to prevent conflicts
      sessionStorage.removeItem("isAuthenticated"); // Clear admin auth
      sessionStorage.removeItem("isTechAuthenticated");
      sessionStorage.removeItem("techUsername");
      sessionStorage.removeItem("username");

      // First check if the user exists in the users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, role, username, auth_id")
        .eq("username", credentials.username)
        .maybeSingle();

      // If there's an error that's not just "no rows found", throw it
      if (userError && !userError.message.includes("contains 0 rows")) {
        console.error("User lookup error:", userError);
        throw new Error("Error checking user credentials");
      }

      // Check if this is an admin trying to log in to the technician portal
      if (userData?.role !== "technician" && userData?.role) {
        throw new Error(
          "This account does not have technician access. Please use the admin login."
        );
      }

      // Use the email from users table if available, otherwise construct demo email
      const email =
        userData?.email || `${credentials.username}@airlast-demo.com`;

      // Handle different scenarios based on auth_id
      if (userData && !userData.auth_id) {
        // User exists but has no auth_id - create auth account
        console.log(
          "User exists but has no auth_id, creating Supabase auth user..."
        );

        try {
          // Call the edge function to create auth user
          const functionUrl = `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/create-auth-user`;

          const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
              email: email,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || "Failed to create authentication account"
            );
          }

          const result = await response.json();
          console.log("Auth account created successfully:", result);

          // Now try to sign in with the newly created auth account
          const { data, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: email,
              password: credentials.password,
            });

          if (signInError) {
            console.error("Sign in error after auth creation:", signInError);
            throw new Error(
              "Authentication account created but sign-in failed. Please try again."
            );
          }

          // Successfully signed in
          console.log("Auth account created and signed in successfully");
          sessionStorage.setItem("isTechAuthenticated", "true");
          sessionStorage.setItem("techUsername", credentials.username);

          // Clear any auth attempts from previous failed refreshes
          sessionStorage.removeItem("authAttempts");

          // Wait a moment for the session to be properly established
          await new Promise((resolve) => setTimeout(resolve, 500));

          console.log("Navigating to:", from);
          navigate(from, { replace: true });
          return;
        } catch (authErr) {
          console.error("Error creating auth account:", authErr);
          throw new Error(
            authErr instanceof Error
              ? authErr.message
              : "Failed to create authentication account"
          );
        }
      } else if (userData && userData.auth_id) {
        // User exists and has auth_id - normal sign in
        console.log("User exists with auth_id, attempting normal sign in");
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email,
            password: credentials.password,
          });

        if (signInError) {
          console.error("Sign in error:", signInError);
          throw new Error("Invalid username or password");
        }

        // If we get here, login is successful
        console.log("Login successful, setting session storage");
        sessionStorage.setItem("isTechAuthenticated", "true");
        sessionStorage.setItem("techUsername", credentials.username);

        // Clear any auth attempts from previous failed refreshes
        sessionStorage.removeItem("authAttempts");

        // Wait a moment for the session to be properly established
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log("Navigating to:", from);
        navigate(from, { replace: true });
      } else {
        // User doesn't exist in users table
        throw new Error("User not found. Please contact your administrator.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error ? err.message : "Invalid username or password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 px-2 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto sm:mx-auto">
        <div className="flex justify-center pt-6 pb-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Airlast" className="h-12" />
          ) : (
            <div className="flex items-center">
              <Wind className="h-12 w-12 text-primary-600" />
              <span className="ml-3 text-3xl font-bold text-primary-700">
                AIRLAST
              </span>
            </div>
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Technician Portal
        </h2>
      </div>

      <div className="mt-6 w-full max-w-md mx-auto sm:mx-auto">
        <div className="bg-white py-6 px-2 shadow-none rounded-none sm:rounded-lg sm:shadow sm:px-10">
          {isLoading && !error ? (
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              <p className="ml-2 text-gray-600">Checking authentication...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-error-500" />
                    <div className="ml-3">
                      <p className="text-sm text-error-700">{error}</p>
                      {error.includes("account setup") && (
                        <p className="text-xs text-error-600 mt-1">
                          Your account is being set up. Please try signing in
                          again.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    type="text"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    required
                    className="input text-base h-12 px-4 w-full"
                    autoComplete="username"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500"></p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    required
                    className="input text-base h-12 px-4 w-full"
                    autoComplete="current-password"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500"></p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary h-12 text-base"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>

              <div className="text-center mt-4">
                <Link
                  to="/login"
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Admin? Login here
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="h-16 sm:h-0" />
    </div>
  );
};

export default TechnicianLogin;
