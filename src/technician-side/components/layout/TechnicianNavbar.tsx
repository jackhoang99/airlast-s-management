import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Briefcase, User, LogOut, X, Home, Clock, CheckSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSupabase } from '../../../lib/supabase-context';

type TechnicianNavbarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TechnicianNavbar = ({ open, setOpen }: TechnicianNavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const [logoUrl, setLogoUrl] = useState<string | null>('/airlast-logo.svg');
  const [technicianName, setTechnicianName] = useState('Technician');
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    sessionStorage.removeItem('isTechAuthenticated');
    sessionStorage.removeItem('techUsername');
    navigate('/tech/login');
  };

  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', user.id)
            .maybeSingle();
            
          if (!error && data) {
            setTechnicianName(`${data.first_name} ${data.last_name}`);
          }
        }
      } catch (err) {
        console.error('Error fetching technician info:', err);
      }
    };
    
    fetchTechnicianInfo();
  }, [supabase]);

  return (
    <>
      {/* Mobile sidebar backdrop */}
      <div 
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:z-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button (mobile only) */}
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-600 md:hidden"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        
        {/* Logo */}
        <div className="flex items-center px-6 py-4 h-16 border-b border-gray-200">
          {logoUrl ? (
            <img src={logoUrl} alt="Airlast" className="h-8" />
          ) : (
            <span className="text-xl font-bold text-primary-700">AIRLAST</span>
          )}
        </div>
        
        {/* Technician info */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium">
                {technicianName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{technicianName}</p>
              <p className="text-xs text-gray-500">Technician</p>
            </div>
          </div>
        </div>
        
        {/* Main navigation */}
        <nav className="px-4 py-4">
          <ul className="space-y-1">
            <li>
              <Link 
                to="/tech"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive('/tech') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setOpen(false)}
              >
                <Home size={16} className="mr-3" />
                Home
              </Link>
            </li>

            <li>
              <Link 
                to="/tech/jobs"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive('/tech/jobs') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setOpen(false)}
              >
                <Briefcase size={16} className="mr-3" />
                My Jobs
              </Link>
            </li>

            <li>
              <Link 
                to="/tech/schedule"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive('/tech/schedule') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setOpen(false)}
              >
                <Calendar size={16} className="mr-3" />
                Schedule
              </Link>
            </li>

            <li>
              <Link 
                to="/tech/map"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive('/tech/map') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setOpen(false)}
              >
                <MapPin size={16} className="mr-3" />
                Map
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Account and settings */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 mt-8">
          <div className="px-4 py-4">
            <ul className="space-y-1">
              <li>
                <Link 
                  to="/tech/profile"
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive('/tech/profile') 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <User size={16} className="mr-3" />
                  My Profile
                </Link>
              </li>
              <li>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-3" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default TechnicianNavbar;