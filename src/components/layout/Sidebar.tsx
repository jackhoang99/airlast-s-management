import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, FileText, Users, MapPin, Settings, HelpCircle, LogOut, X, User, Wind, Building, Phone, Contact as FileContract, Upload, ChevronDown, Calendar, Wrench, ClipboardList, Building2, Home, FileInput as FileInvoice, DollarSign, FileEdit, FileCheck, FileSpreadsheet, AlertTriangle, Tag, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';

type SidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isJobsOpen, setIsJobsOpen] = useState(false);
  const [isQuotesOpen, setIsQuotesOpen] = useState(false);
  const [isInvoicesOpen, setIsInvoicesOpen] = useState(false);
  const { supabase } = useSupabase();
  const [logoUrl, setLogoUrl] = useState<string | null>('/airlast-logo.svg');
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

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
            <>
              <Wind className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-primary-700">AIRLAST</span>
            </>
          )}
        </div>
        
        {/* Demo badge */}
        <div className="px-6 py-2">
          <div className="bg-blue-50 text-xs font-semibold text-blue-700 px-2 py-1 rounded text-center">
            DEMO
          </div>
        </div>
        
        {/* Main navigation */}
        <nav className="px-4 py-4">
          <ul className="space-y-1">
            <li>
              <Link 
                to="/"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive('/') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home size={16} className="mr-3" />
                Home
              </Link>
            </li>

            {/* Customers Section */}
            <li className="pt-4 mt-4">
              <button 
                onClick={() => setIsCustomersOpen(!isCustomersOpen)}
                className="w-full px-2 mb-2 flex items-center justify-between text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <div className="flex items-center">
                  <Users size={18} className="mr-3 text-gray-400" />
                  <span>Customers</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    isCustomersOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              <ul 
                className={`space-y-1 pl-7 overflow-hidden transition-all duration-200 ${
                  isCustomersOpen ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <li>
                  <Link 
                    to="/dashboard"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname === '/dashboard'
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ClipboardList size={16} className="mr-3" />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/companies"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/companies') 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Building size={16} className="mr-3" />
                    Companies
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/locations"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/locations') 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <MapPin size={16} className="mr-3" />
                    Locations
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/units"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/units') 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Building2 size={16} className="mr-3" />
                    Units
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/contacts"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/contacts') 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Phone size={16} className="mr-3" />
                    Contacts
                  </Link>
                </li>
              </ul>
            </li>

            {/* Jobs Section */}
            <li className="pt-4 mt-4">
              <button 
                onClick={() => setIsJobsOpen(!isJobsOpen)}
                className="w-full px-2 mb-2 flex items-center justify-between text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <div className="flex items-center">
                  <Briefcase size={18} className="mr-3 text-gray-400" />
                  <span>Jobs</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    isJobsOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              <ul 
                className={`space-y-1 pl-7 overflow-hidden transition-all duration-200 ${
                  isJobsOpen ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <li>
                  <Link 
                    to="/jobs"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname === '/jobs'
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ClipboardList size={16} className="mr-3" />
                    All Jobs
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/jobs/dispatch"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/jobs/dispatch')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Calendar size={16} className="mr-3" />
                    Dispatch & Schedule
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/jobs/opportunities"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/jobs/opportunities')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Wrench size={16} className="mr-3" />
                    Service Opportunities
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/jobs/scorecard"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/jobs/scorecard')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ClipboardList size={16} className="mr-3" />
                    Tech Scorecard
                  </Link>
                </li>
              </ul>
            </li>

            {/* Quotes Section */}
            <li className="pt-4 mt-4">
              <button 
                onClick={() => setIsQuotesOpen(!isQuotesOpen)}
                className="w-full px-2 mb-2 flex items-center justify-between text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <div className="flex items-center">
                  <FileText size={18} className="mr-3 text-gray-400" />
                  <span>Quotes</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    isQuotesOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              <ul 
                className={`space-y-1 pl-7 overflow-hidden transition-all duration-200 ${
                  isQuotesOpen ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <li>
                  <Link 
                    to="/quotes"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname === '/quotes'
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileText size={16} className="mr-3" />
                    All Quotes
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/quotes/deficiencies"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/quotes/deficiencies')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <AlertTriangle size={16} className="mr-3" />
                    Deficiencies
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/quotes/templates"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/quotes/templates')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileSpreadsheet size={16} className="mr-3" />
                    Quote Templates
                  </Link>
                </li>
              </ul>
            </li>

            {/* Invoices Section */}
            <li className="pt-4 mt-4">
              <button 
                onClick={() => setIsInvoicesOpen(!isInvoicesOpen)}
                className="w-full px-2 mb-2 flex items-center justify-between text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <div className="flex items-center">
                  <FileInvoice size={18} className="mr-3 text-gray-400" />
                  <span>Invoices</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    isInvoicesOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              <ul 
                className={`space-y-1 pl-7 overflow-hidden transition-all duration-200 ${
                  isInvoicesOpen ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <li>
                  <Link 
                    to="/invoices"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname === '/invoices'
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileInvoice size={16} className="mr-3" />
                    All Invoices
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/invoices/pending"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/invoices/pending')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileEdit size={16} className="mr-3" />
                    Pending Invoices
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/invoices/paid"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/invoices/paid')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <FileCheck size={16} className="mr-3" />
                    Paid Invoices
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/invoices/reports"
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location.pathname.includes('/invoices/reports')
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign size={16} className="mr-3" />
                    Financial Reports
                  </Link>
                </li>
              </ul>
            </li>

            {/* Item Prices */}
            <li className="pt-4 mt-4">
              <Link 
                to="/item-prices"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/item-prices'
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Package size={16} className="mr-3" />
                Pricing
              </Link>
            </li>

            {/* Settings */}
            <li className="pt-4 mt-4">
              <Link 
                to="/settings"
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/settings'
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings size={16} className="mr-3" />
                Settings
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
                  to="/account"
                  className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <User size={18} className="mr-3" />
                  My Account
                </Link>
              </li>
              <li>
                <Link 
                  to="/help"
                  className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <HelpCircle size={18} className="mr-3" />
                  Help
                </Link>
              </li>
              <li>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={18} className="mr-3" />
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

export default Sidebar;