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

  useEffect(() => {
    const initializeSupabase = async () => {
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
              storageKey: "airlast-tech-auth",
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          }
        );

        setSupabase(supabaseClient);

        // Get initial session with better error handling
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabaseClient.auth.getSession();
          if (sessionError) {
            console.error("Error getting initial session:", sessionError);
            // Don't throw here, just continue without session
          } else {
            console.log("Initial session restored:", session ? "Yes" : "No");
            setSession(session);
          }
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
            console.log("Session established, user:", session.user.email);
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
