import { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient, createClient, Session } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

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
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase credentials not found in environment variables');
        }

        const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
        setSupabase(supabaseClient);

        // Get initial session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        
        setSession(session);

        // If user is authenticated in session storage but not in Supabase,
        // we'll handle this in the RequireAuth component

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabaseClient.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          
          // Update session storage when session changes
          if (session) {
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('username', session.user.email?.split('@')[0] || 'user');
          } else if (sessionStorage.getItem('isAuthenticated') === 'true') {
            // Don't remove from session storage here - let RequireAuth handle re-authentication
            // This prevents logout on page refresh
          }
        });

        return () => subscription.unsubscribe();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Supabase client';
        console.error('Supabase initialization error:', errorMessage);
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