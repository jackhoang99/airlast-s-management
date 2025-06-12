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

      // First check if the user exists in the users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, role, username")
        .eq("username", credentials.username)
        .maybeSingle();

      // If there's an error that's not just "no rows found", throw it
      if (userError && !userError.message.includes("contains 0 rows")) {
        console.error("User lookup error:", userError);
        throw new Error("Error checking user credentials");
      }

      // If user exists in users table
      if (userData) {
        console.log("Found user in users table:", userData);
        
        // Check if user is a technician
        if (userData.role !== 'technician') {
          throw new Error("This account does not have technician access");
        }
        
        // Determine email to use for auth
        const email = userData.email || `${credentials.username}@airlast-demo.com`;
        
        // Try to sign in with Supabase Auth
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: credentials.password
        });

        // If sign-in fails, try to create the user in auth
        if (signInError) {
          console.log("Sign in failed, attempting to create user:", signInError);
          
          // Create user in auth system
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: credentials.password,
            options: {
              data: {
                username: credentials.username,
                role: 'technician'
              }
            }
          });
          
          if (signUpError) {
            console.error("Error creating auth user:", signUpError);
            throw new Error("Failed to create user account. Please contact support.");
          }
          
          // If sign up was successful, update the user record with auth_id
          if (signUpData.user) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ auth_id: signUpData.user.id })
              .eq('id', userData.id);
              
            if (updateError) {
              console.error("Error updating user with auth_id:", updateError);
              // Don't throw here, just log the error
            }
            
            // Now try to sign in again
            const { error: retrySignInError } = await supabase.auth.signInWithPassword({
              email: email,
              password: credentials.password
            });
            
            if (retrySignInError) {
              console.error("Error signing in after account creation:", retrySignInError);
              throw new Error("Account created but login failed. Please try again.");
            }
          }
        }

        // If we get here, login is successful
        sessionStorage.setItem("isTechAuthenticated", "true");
        sessionStorage.setItem("techUsername", credentials.username);
        navigate(from, { replace: true });
        return;
      }
      
      // If user doesn't exist in users table, create them
      console.log("User not found in users table, creating new user");
      
      // First try to sign in with demo email format
      const email = `${credentials.username}@airlast-demo.com`;
      
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password
      });
      
      // If sign-in fails, try to create the user
      if (signInError) {
        console.log("Sign in failed, attempting to create user:", signInError);
        
        // Create user in auth system
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: credentials.password,
          options: {
            data: {
              username: credentials.username,
              role: 'technician'
            }
          }
        });
        
        if (signUpError) {
          console.error("Error creating auth user:", signUpError);
          throw new Error("Failed to create user account. Please contact support.");
        }
        
        // If sign up was successful, create a user record
        if (signUpData.user) {
          // Create user record in users table
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: signUpData.user.id,
              auth_id: signUpData.user.id,
              username: credentials.username,
              email: email,
              role: 'technician',
              status: 'active'
            })
            .select()
            .single();
            
          if (createError) {
            console.error("Error creating user record:", createError);
            throw new Error("Failed to create user record. Please contact support.");
          }
          
          // Now try to sign in again
          const { error: retrySignInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: credentials.password
          });
          
          if (retrySignInError) {
            console.error("Error signing in after account creation:", retrySignInError);
            throw new Error("Account created but login failed. Please try again.");
          }
        }
      }

      // If we get here, login is successful
      sessionStorage.setItem("isTechAuthenticated", "true");
      sessionStorage.setItem("techUsername", credentials.username);
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