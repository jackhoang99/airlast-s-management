import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, Outlet, useLocation } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Building, MapPin, Building2, FileText, FileInput, Menu, X, LogOut, Home, User, Search } from 'lucide-react';

const CustomerPortal = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;

      try {
        setIsLoading(true);
        
        // Check if we have company info in session storage
        const companyId = sessionStorage.getItem('customerPortalCompanyId');
        
        if (!companyId) {
          // Not logged in, redirect to login
          navigate('/customer/login');
          return;
        }
        
        // Fetch company details
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();
          
        if (error) throw error;
        
        if (!data) {
          // Company not found, redirect to login
          sessionStorage.removeItem('customerPortalCompanyId');
          navigate('/customer/login');
          return;
        }
        
        setCompany(data);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Authentication error. Please log in again.');
        sessionStorage.removeItem('customerPortalCompanyId');
        navigate('/customer/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [supabase, navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('customerPortalCompanyId');
    navigate('/customer/login');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold text-center mb-4">Error</h2>
          <p className="text-center text-error-600 mb-6">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/customer/login')}
              className="btn btn-primary"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:z-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button (mobile only) */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-600 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center px-6 py-4 h-16 border-b border-gray-200">
          <img src="/airlast-logo.svg" alt="Airlast" className="h-8" />
        </div>

        {/* Company info */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
              <Building size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{company?.name}</p>
              <p className="text-xs text-gray-500">Customer Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-4">
          <ul className="space-y-1">
            <li>
              <Link
                to="/customer"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/customer'
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Home size={16} className="mr-3" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/customer/locations"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname.includes('/customer/locations')
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <MapPin size={16} className="mr-3" />
                Locations
              </Link>
            </li>
            <li>
              <Link
                to="/customer/units"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname.includes('/customer/units')
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Building2 size={16} className="mr-3" />
                Units
              </Link>
            </li>
            <li>
              <Link
                to="/customer/jobs"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname.includes('/customer/jobs')
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FileText size={16} className="mr-3" />
                Service History
              </Link>
            </li>
            <li>
              <Link
                to="/customer/invoices"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname.includes('/customer/invoices')
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FileInput size={16} className="mr-3" />
                Invoices
              </Link>
            </li>
          </ul>
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 mt-8">
          <div className="px-4 py-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
            >
              <LogOut size={18} className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 sm:px-6">
          <button
            type="button"
            className="md:hidden mr-4 text-gray-500 hover:text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">Customer Portal</h1>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 input w-full max-w-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                  <User size={16} />
                </div>
                <span className="text-sm font-medium hidden md:block">{company?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet context={{ company, searchTerm }} />
        </main>
      </div>
    </div>
  );
};

export default CustomerPortal;