import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSupabase } from '../../lib/supabase-context';

const RequireAuth = () => {
  const location = useLocation();
  const { supabase, session } = useSupabase();
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('isAuthenticated') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setIsAuthenticated(true);
          sessionStorage.setItem('isAuthenticated', 'true');
          sessionStorage.setItem('username', session.user.email?.split('@')[0] || 'user');
          setIsLoading(false);
          return;
        }
        
        // If session storage says we're authenticated but Supabase doesn't have a session,
        // try to sign in with stored credentials
        if (isAuthenticated && !session) {
          const username = sessionStorage.getItem('username') || 'user';
          const email = `${username}@airlast-demo.com`;
          
          // Try to sign in with demo credentials
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: 'hvac123'
          });
          
          if (signInError) {
            console.warn('Auto-authentication failed:', signInError);
            setError('Failed to authenticate automatically');
            setIsAuthenticated(false);
            sessionStorage.removeItem('isAuthenticated');
          } else if (data.session) {
            // Successfully signed in
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Error during auto-authentication:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
        setIsAuthenticated(false);
        sessionStorage.removeItem('isAuthenticated');
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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (error) {
    console.warn('Auth warning:', error);
  }

  return <Outlet />;
};

export default RequireAuth;