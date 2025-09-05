import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

type SupabaseCtx = {
  supabase: SupabaseClient<Database> | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
};

const SupabaseContext = createContext<SupabaseCtx>({
  supabase: null,
  session: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
});

type Props = { children: React.ReactNode };

// Module-level singleton - this ensures only one client ever exists
let globalSupabaseClient: SupabaseClient<Database> | null = null;
let globalClientPromise: Promise<SupabaseClient<Database>> | null = null;

const createSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  // If we already have a client, return it
  if (globalSupabaseClient) {
    console.log("🔍 Returning existing Supabase client instance");
    return globalSupabaseClient;
  }

  // If we're already creating a client, wait for it
  if (globalClientPromise) {
    console.log("🔍 Waiting for existing Supabase client creation");
    return globalClientPromise;
  }

  // Create the client
  console.log("🔍 Creating new Supabase client instance");
  globalClientPromise = (async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase credentials missing");
    }

    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: "supabase.auth.token",
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: {
          getItem: (k) => {
            try {
              return localStorage.getItem(k);
            } catch (e) {
              console.warn("localStorage.getItem error:", e);
              return null;
            }
          },
          setItem: (k, v) => {
            try {
              localStorage.setItem(k, v);
            } catch (e) {
              console.warn("localStorage.setItem error:", e);
            }
          },
          removeItem: (k) => {
            try {
              localStorage.removeItem(k);
            } catch (e) {
              console.warn("localStorage.removeItem error:", e);
            }
          },
        },
      },
    });

    // Store the client globally
    globalSupabaseClient = client;
    globalClientPromise = null;

    console.log("🔍 Supabase client created and stored globally");
    return client;
  })();

  return globalClientPromise;
};

export const SupabaseProvider = ({ children }: Props) => {
  // Keep these as state because consumers actually care about them:
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(
    null
  );
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No throttling needed - Supabase handles token refresh automatically

  // Track component mounting
  useEffect(() => {
    console.log("🔍 SupabaseProvider mounted");
    return () => {
      console.log("🔍 SupabaseProvider unmounted");
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    // No visibility change handling needed - tokens persist naturally

    const init = async () => {
      try {
        console.log("🔍 Initializing Supabase in provider");
        // Get or create the singleton client
        const client = await createSupabaseClient();

        if (!mounted) return;
        setSupabase(client);

        // Initial session (retry w/ simple backoff)
        let attempt = 0;
        let initial: Session | null = null;
        while (attempt < 5) {
          try {
            const { data, error } = await client.auth.getSession();
            if (error) throw error;
            initial = data.session ?? null;
            break;
          } catch {
            attempt++;
            if (attempt >= 5) break;
            await new Promise((r) =>
              setTimeout(r, Math.min(1000 * 2 ** (attempt - 1), 5000))
            );
          }
        }
        if (!mounted) return;

        setSession(initial);

        // Subscribe to auth events
        const { data } = client.auth.onAuthStateChange((event, newSession) => {
          if (!mounted) return;

          console.log("🔍 Auth state change:", event, newSession?.user?.email);

          // Handle different auth events appropriately
          switch (event) {
            case "SIGNED_IN":
              console.log("🔍 User signed in, updating session");
              setSession(newSession);
              break;

            case "SIGNED_OUT":
              console.log("🔍 User signed out, clearing session");
              setSession(null);
              break;

            case "TOKEN_REFRESHED":
              console.log("🔍 Token refreshed, updating session");
              setSession(newSession);
              break;

            case "USER_UPDATED":
              console.log("🔍 User updated, updating session");
              setSession(newSession);
              break;

            default:
              // For other events, only update if user ID changes
              setSession((prev) => {
                if (prev?.user?.id === newSession?.user?.id) {
                  console.log(
                    "🔍 Session updated (same user):",
                    newSession?.user?.email
                  );
                  return newSession ?? prev;
                }
                console.log(
                  "🔍 Session updated (different user):",
                  newSession?.user?.email
                );
                return newSession ?? null;
              });
              break;
          }
        });

        unsubscribeAuth = () => data.subscription.unsubscribe();

        // No visibility change listener - tokens persist across tab switches
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to initialize Supabase");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Keep the Provider value STABLE so children don't remount:
  const ctxValue = useMemo(
    () => ({
      supabase,
      session,
      isLoading,
      error,
      isAuthenticated: !!session,
    }),
    [supabase, session, isLoading, error]
  );

  return (
    <SupabaseContext.Provider value={ctxValue}>
      {children}
    </SupabaseContext.Provider>
  );
};

// Export the hook after the provider is defined to ensure Fast Refresh compatibility
export function useSupabase() {
  return useContext(SupabaseContext);
}
