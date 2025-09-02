import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

type SupabaseCtx = {
  supabase: SupabaseClient<Database> | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  // Keep helpers, but make them stable & non-rerendering:
  canCheckAuth: () => boolean;
  setTabSwitchCooldown: () => void;
};

const SupabaseContext = createContext<SupabaseCtx>({
  supabase: null,
  session: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  canCheckAuth: () => false,
  setTabSwitchCooldown: () => {},
});

export const useSupabase = () => useContext(SupabaseContext);

type Props = { children: React.ReactNode };

export const SupabaseProvider = ({ children }: Props) => {
  // Keep these as state because consumers actually care about them:
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(
    null
  );
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use REFs for throttling so we don't rerender the whole tree
  const lastAuthCheckRef = useRef<number>(0);
  const tabCooldownRef = useRef<boolean>(false);

  const canCheckAuth = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastAuthCheckRef.current < 5000) return false;
    if (tabCooldownRef.current) return false;
    lastAuthCheckRef.current = now;
    return true;
  }, []);

  const setTabSwitchCooldown = useCallback(() => {
    tabCooldownRef.current = true;
    // Use a single timer; no state updates here → no app-wide rerender
    setTimeout(() => {
      tabCooldownRef.current = false;
    }, 2000);
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    const handleVisibilityChange = () => {
      // Only start cooldown when the tab becomes VISIBLE (focus returns)
      if (!document.hidden) setTabSwitchCooldown();
    };

    const init = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error("Supabase credentials missing");
        }

        // Create client ONCE
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
        if (initial) {
          sessionStorage.setItem("isAuthenticated", "true");
          sessionStorage.setItem(
            "username",
            initial.user.email?.split("@")[0] || "user"
          );
        }

        // Subscribe to auth events
        const { data } = client.auth.onAuthStateChange((event, newSession) => {
          // Always process SIGNED_IN / SIGNED_OUT immediately
          const highPriority = event === "SIGNED_IN" || event === "SIGNED_OUT";
          if (!highPriority && !canCheckAuth()) {
            // throttle low-priority events like TOKEN_REFRESHED
            return;
          }

          setSession((prev) => {
            // If you want to always reflect token refresh, just return newSession ?? null;
            if (prev?.user?.id === newSession?.user?.id)
              return newSession ?? prev;
            return newSession ?? null;
          });

          if (newSession) {
            sessionStorage.setItem("isAuthenticated", "true");
            sessionStorage.setItem(
              "username",
              newSession.user.email?.split("@")[0] || "user"
            );
          } else if (event === "SIGNED_OUT") {
            sessionStorage.removeItem("isAuthenticated");
            sessionStorage.removeItem("username");
            sessionStorage.removeItem("isTechAuthenticated");
            sessionStorage.removeItem("techUsername");
          }
        });

        unsubscribeAuth = () => data.subscription.unsubscribe();

        // Visibility listener AFTER client is ready
        document.addEventListener("visibilitychange", handleVisibilityChange);
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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canCheckAuth, setTabSwitchCooldown]);

  // Keep the Provider value STABLE so children don’t remount:
  const ctxValue = useMemo(
    () => ({
      supabase,
      session,
      isLoading,
      error,
      isAuthenticated: !!session,
      canCheckAuth,
      setTabSwitchCooldown,
    }),
    [supabase, session, isLoading, error, canCheckAuth, setTabSwitchCooldown]
  );

  return (
    <SupabaseContext.Provider value={ctxValue}>
      {children}
    </SupabaseContext.Provider>
  );
};
