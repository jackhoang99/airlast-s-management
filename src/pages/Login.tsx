import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import { Wind } from "lucide-react";

const Login = () => {
  const { supabase, session } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>('/airlast-logo.svg');
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      // If already authenticated in session storage, redirect
      if (sessionStorage.getItem("isAuthenticated") === "true") {
        navigate(from, { replace: true });
        return;
      }

      // If supabase is available and we have a session, set as authenticated
      if (supabase && session) {
        sessionStorage.setItem("isAuthenticated", "true");
        sessionStorage.setItem("username", session.user.email?.split('@')[0] || "user");
        navigate(from, { replace: true });
      }
    };

    checkAuthStatus();
  }, [supabase, session, navigate, from]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) throw new Error("Supabase client not initialized");

      // Check if the username exists in our users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("username, email, role")
        .eq("username", credentials.username)
        .maybeSingle();

      // If user doesn't exist in our users table, show error
      if (userError && !userError.message.includes("The result contains 0 rows")) {
        console.error("User lookup error:", userError);
        throw new Error("Error checking user credentials");
      }

      // Check if this is a technician trying to log in to the admin portal
      if (userData?.role === 'technician') {
        // Redirect to technician login
        navigate('/tech/login', { state: { from: location } });
        return;
      }

      // Use the email from users table if available, otherwise construct demo email
      const email = userData?.email || `${credentials.username}@airlast-demo.com`;
      
      // Try to sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password
      });

      if (signInError) {
        // If sign-in fails with invalid credentials, show error
        console.error("Sign in error:", signInError);
        throw new Error("Invalid username or password");
      }

      // If we get here, login is successful
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("username", credentials.username);
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
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
          HVAC Administration
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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
                    <div className="ml-3">
                      <p className="text-sm text-error-700">{error}</p>
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
                    className="input"
                  />
                </div>
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
                    className="input"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  For demo purposes, use "hvac123" as the password
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary"
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
                <Link to="/tech/login" className="text-sm text-primary-600 hover:text-primary-800">
                  Technician? Login here
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;