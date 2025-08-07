import { createContext, useContext, useEffect, useState } from "react";
import { SupabaseClient, createClient, Session } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

type SupabaseContext = {
  supabase: SupabaseClient<Database> | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
};

const SupabaseContext = createContext<SupabaseContext>({
  supabase: null,
  session: null,
  isLoading: true,
  error: null,
});

export const useSupabase = () => useContext(SupabaseContext);

type SupabaseProviderProps = {
  children: React.ReactNode;
};

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(
    null
  );
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeSupabase = async () => {
      // Prevent multiple initializations
      if (isInitialized) {
        return;
      }
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error(
            "Supabase credentials not found in environment variables"
          );
        }

        const supabaseClient = createClient<Database>(
          supabaseUrl,
          supabaseAnonKey,
          {
            auth: {
              persistSession: true,
              storageKey: "supabase.auth.token",
              autoRefreshToken: true,
              detectSessionInUrl: true,
              flowType: "pkce",
              storage: {
                getItem: (key) => {
                  try {
                    return localStorage.getItem(key);
                  } catch (error) {
                    console.warn("Error reading from localStorage:", error);
                    return null;
                  }
                },
                setItem: (key, value) => {
                  try {
                    localStorage.setItem(key, value);
                  } catch (error) {
                    console.warn("Error writing to localStorage:", error);
                  }
                },
                removeItem: (key) => {
                  try {
                    localStorage.removeItem(key);
                  } catch (error) {
                    console.warn("Error removing from localStorage:", error);
                  }
                },
              },
            },
          }
        );

        setSupabase(supabaseClient);
        setIsInitialized(true);

        // Check what's in localStorage before getting session
        const storedAuth = localStorage.getItem("supabase.auth.token");

        // Get initial session with retry logic
        let retryCount = 0;
        const maxRetries = 3; // Reduced from 5 to 3

        const getInitialSession = async (): Promise<Session | null> => {
          try {
            console.log(
              `Session restoration attempt ${retryCount + 1}/${maxRetries}`
            );

            const {
              data: { session },
              error: sessionError,
            } = await supabaseClient.auth.getSession();

            if (sessionError) {
              console.error("Error getting initial session:", sessionError);
              throw sessionError;
            }

            if (session) {
              console.log("Session found:", session.user.email);
            } else {
              console.log("No session found in attempt", retryCount + 1);
            }

            return session;
          } catch (err) {
            console.error(
              `Session restoration attempt ${retryCount + 1} failed:`,
              err
            );
            if (retryCount < maxRetries) {
              retryCount++;
              // Wait longer between retries for page refresh scenarios
              console.log(
                `Waiting 2 seconds before retry ${retryCount + 1}...`
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              return getInitialSession();
            }
            throw err;
          }
        };

        try {
          const initialSession = await getInitialSession();
          if (initialSession) {
            console.log("Session restored for:", initialSession.user.email);
            // Set session storage immediately for technician auth
            sessionStorage.setItem("isAuthenticated", "true");
            sessionStorage.setItem(
              "username",
              initialSession.user.email?.split("@")[0] || "user"
            );
          } else {
            console.log("No session restored after all attempts");
          }
          setSession(initialSession);
        } catch (sessionErr) {
          console.error("Error during session restoration:", sessionErr);
          // Continue without session
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabaseClient.auth.onAuthStateChange((event, session) => {
          console.log(
            "Auth state change:",
            event,
            session ? "Session present" : "No session"
          );
          setSession(session);

          // Update session storage when session changes
          if (session) {
            sessionStorage.setItem("isAuthenticated", "true");
            sessionStorage.setItem(
              "username",
              session.user.email?.split("@")[0] || "user"
            );
          } else {
            // Only clear session storage on explicit logout, not on refresh
            if (event === "SIGNED_OUT") {
              sessionStorage.removeItem("isAuthenticated");
              sessionStorage.removeItem("username");
              sessionStorage.removeItem("isTechAuthenticated");
              sessionStorage.removeItem("techUsername");
              console.log("User signed out, cleared session storage");
            }
          }
        });

        return () => subscription.unsubscribe();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to initialize Supabase client";
        console.error("Supabase initialization error:", errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSupabase();
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase, session, isLoading, error }}>
      {children}
    </SupabaseContext.Provider>
  );
};
