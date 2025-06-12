import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSupabase } from '../../../lib/supabase-context';

const RequireTechAuth = () => {
  const location = useLocation();
  const { supabase, session } = useSupabase();
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('isTechAuthenticated') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTechnician, setIsTechnician] = useState(false);

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
          console.log("Session found, checking if user is a technician");
          
          // Verify that the user is a technician
          try {
            // First try by email
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, username, role')
              .eq('email', session.user.email)
              .maybeSingle();
              
            if (userError && !userError.message.includes("contains 0 rows")) {
              console.error("Error fetching user role by email:", userError);
              throw userError;
            }
            
            // If found by email and is a technician
            if (userData && userData.role === 'technician') {
              console.log("User is a technician (found by email)");
              setIsTechnician(true);
              setIsAuthenticated(true);
              sessionStorage.setItem('isTechAuthenticated', 'true');
              sessionStorage.setItem('techUsername', userData.username || session.user.email?.split('@')[0] || 'tech');
              setIsLoading(false);
              return;
            }
            
            // Try with username from email
            const username = session.user.email?.split('@')[0];
            if (username) {
              console.log("Trying to find user by username:", username);
              const { data: usernameData, error: usernameError } = await supabase
                .from('users')
                .select('id, role')
                .eq('username', username)
                .maybeSingle();
                
              if (usernameError && !usernameError.message.includes("contains 0 rows")) {
                console.error("Error fetching user role by username:", usernameError);
                throw usernameError;
              }
                
              if (usernameData && usernameData.role === 'technician') {
                console.log("User is a technician (found by username)");
                setIsTechnician(true);
                setIsAuthenticated(true);
                sessionStorage.setItem('isTechAuthenticated', 'true');
                sessionStorage.setItem('techUsername', username);
                setIsLoading(false);
                return;
              }
            }
            
            // If we get here, user is not a technician
            console.log("User is not a technician or not found in users table");
            setError('Access denied. Only technicians can access this area.');
            setIsAuthenticated(false);
            setIsTechnician(false);
            sessionStorage.removeItem('isTechAuthenticated');
          } catch (err) {
            console.error("Error in technician verification:", err);
            setError('Error verifying technician status');
            setIsAuthenticated(false);
            setIsTechnician(false);
            sessionStorage.removeItem('isTechAuthenticated');
          }
          
          setIsLoading(false);
          return;
        }
        
        // If session storage says we're authenticated but Supabase doesn't have a session,
        // try to sign in with stored credentials
        if (isAuthenticated && !session) {
          const username = sessionStorage.getItem('techUsername') || 'tech';
          const email = `${username}@airlast-demo.com`;
          
          console.log("Attempting to sign in with stored credentials:", { username, email });
          
          // Try to sign in with demo credentials
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: 'hvac123'
          });
          
          if (signInError) {
            console.warn('Auto-authentication failed:', signInError);
            setError('Failed to authenticate automatically');
            setIsAuthenticated(false);
            setIsTechnician(false);
            sessionStorage.removeItem('isTechAuthenticated');
          } else if (data.session) {
            // Successfully signed in, now verify if this user is a technician
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('username', username)
                .maybeSingle();
                
              if (userError && !userError.message.includes("contains 0 rows")) {
                throw userError;
              }
              
              if (userData && userData.role === 'technician') {
                setIsTechnician(true);
                setIsAuthenticated(true);
              } else {
                setError('Access denied. Only technicians can access this area.');
                setIsAuthenticated(false);
                setIsTechnician(false);
                sessionStorage.removeItem('isTechAuthenticated');
              }
            } catch (verifyError) {
              console.error("Error verifying technician role:", verifyError);
              setError('Error verifying technician status');
              setIsAuthenticated(false);
              setIsTechnician(false);
              sessionStorage.removeItem('isTechAuthenticated');
            }
          }
        }
      } catch (err) {
        console.error('Error during auto-authentication:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
        setIsAuthenticated(false);
        setIsTechnician(false);
        sessionStorage.removeItem('isTechAuthenticated');
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

  if (!isAuthenticated || !isTechnician) {
    return <Navigate to="/tech/login" state={{ from: location }} replace />;
  }

  if (error) {
    console.warn('Auth warning:', error);
  }

  return <Outlet />;
};

export default RequireTechAuth;