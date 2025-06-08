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
  const [logoUrl, setLogoUrl] = useState<string | null>('/airlast-logo.svg');
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

      console.log("Attempting technician login with username:", credentials.username);

      // First, check if the user exists and is a technician
      const { data: techData, error: techError } = await supabase
        .from("users")
        .select("id, username, email, role")
        .eq("username", credentials.username)
        .maybeSingle();

      // If there's an error that's not just "no rows found", throw it
      if (techError && !techError.message.includes("contains 0 rows")) {
        console.error("Technician lookup error:", techError);
        throw new Error("Error checking technician credentials");
      }

      // If no user found by username, try by email format
      let techUser = techData;
      if (!techUser) {
        const email = `${credentials.username}@airlast-demo.com`;
        console.log("User not found by username, trying with email:", email);
        
        const { data: emailData, error: emailError } = await supabase
          .from("users")
          .select("id, username, email, role")
          .eq("email", email)
          .maybeSingle();
          
        if (emailError && !emailError.message.includes("contains 0 rows")) {
          console.error("Email lookup error:", emailError);
          throw new Error("Error checking technician credentials");
        }
        
        techUser = emailData;
      }

      // If no technician found, show error
      if (!techUser) {
        console.log("No user found with username or email");
        throw new Error("Invalid username or password");
      }

      // Check if user is a technician
      if (techUser.role !== 'technician') {
        console.log("User found but not a technician:", techUser);
        throw new Error("This account does not have technician access");
      }

      console.log("Technician found:", techUser);

      // Use the email from users table if available, otherwise construct demo email
      const email = techUser.email || `${credentials.username}@airlast-demo.com`;
      
      // Try to sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password
      });

      if (signInError) {
        // If sign-in fails, check if we need to create the user
        if (signInError.message.includes("Invalid login credentials")) {
          console.log("User doesn't exist in Auth, attempting to sign up");
          
          // Try to sign up the user
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: credentials.password
          });
          
          if (signUpError) {
            console.error("Sign up error:", signUpError);
            throw new Error(signUpError.message);
          }
          
          // If sign up successful, try signing in again
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: email,
            password: credentials.password
          });
          
          if (retryError) {
            console.error("Retry sign in error:", retryError);
            throw new Error("Failed to authenticate after account creation");
          }
        } else {
          console.error("Sign in error:", signInError);
          throw new Error(signInError.message);
        }
      }

      // If we get here, login is successful
      console.log("Login successful for technician:", techUser.username);
      sessionStorage.setItem("isTechAuthenticated", "true");
      sessionStorage.setItem("techUsername", techUser.username || credentials.username);
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
          Technician Portal
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
                    <AlertCircle className="h-5 w-5 text-error-500" />
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
                <p className="mt-1 text-xs text-gray-500">
                  For demo, try "mike.tech" as the username
                </p>
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
                <Link to="/login" className="text-sm text-primary-600 hover:text-primary-800">
                  Admin? Login here
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianLogin;