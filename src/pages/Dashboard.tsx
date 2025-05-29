import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { Building, Users, Briefcase, Tag, Plus, Filter, Building2, Home, Users as UsersIcon, Calendar, Clock, ClipboardList, AlertTriangle, FileCheck2, Bell, FileInput as FileInvoice, CalendarClock, Send } from 'lucide-react';

const Dashboard = () => {
  const { supabase } = useSupabase();
  const [stats, setStats] = useState({
    totalCompanies: null,
    totalLocations: null,
    totalUnits: null,
    activeUnits: null,
    inactiveUnits: null,
  });
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return;
      
      setIsLoading(true);
      
      try {
        // Fetch companies count
        const { count: companiesCount, error: companiesError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });
        
        // Fetch locations count
        const { count: locationsCount, error: locationsError } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true });
        
        // Fetch units count
        const { count: unitsCount, error: unitsError } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true });
        
        // Fetch active units count
        const { count: activeUnitsCount, error: activeUnitsError } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        // Fetch inactive units count
        const { count: inactiveUnitsCount, error: inactiveUnitsError } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'inactive');
        
        // Fetch recent companies
        const { data: recentCompaniesData, error: recentCompaniesError } = await supabase
          .from('companies')
          .select('id, name, city, state')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!companiesError && !locationsError && !unitsError && 
            !activeUnitsError && !inactiveUnitsError) {
          setStats({
            totalCompanies: companiesCount || 0,
            totalLocations: locationsCount || 0,
            totalUnits: unitsCount || 0,
            activeUnits: activeUnitsCount || 0,
            inactiveUnits: inactiveUnitsCount || 0,
          });
        }
        
        if (!recentCompaniesError && recentCompaniesData) {
          setRecentCompanies(recentCompaniesData);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>Dashboard</h1>
        <Link to="/companies/create" className="btn btn-primary">
          <Plus size={16} className="mr-2" />
          Add New Company
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Companies</p>
              {isLoading ? (
                <div className="flex items-center h-9 mt-1">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <p className="text-3xl font-semibold mt-1">{stats.totalCompanies}</p>
              )}
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/companies" className="text-sm text-primary-600 hover:text-primary-800">
              View all companies →
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Locations</p>
              {isLoading ? (
                <div className="flex items-center h-9 mt-1">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-secondary-600"></div>
                </div>
              ) : (
                <p className="text-3xl font-semibold mt-1">{stats.totalLocations}</p>
              )}
            </div>
            <div className="h-12 w-12 bg-secondary-100 rounded-full flex items-center justify-center">
              <Building className="h-6 w-6 text-secondary-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/locations" className="text-sm text-primary-600 hover:text-primary-800">
              View all locations →
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Units</p>
              {isLoading ? (
                <div className="flex items-center h-9 mt-1">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-accent-600"></div>
                </div>
              ) : (
                <p className="text-3xl font-semibold mt-1">{stats.totalUnits}</p>
              )}
            </div>
            <div className="h-12 w-12 bg-accent-100 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-accent-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/units" className="text-sm text-primary-600 hover:text-primary-800">
              View all units →
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Units</p>
              {isLoading ? (
                <div className="flex items-center h-9 mt-1">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-success-600"></div>
                </div>
              ) : (
                <p className="text-3xl font-semibold mt-1">{stats.activeUnits}</p>
              )}
            </div>
            <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1 w-full bg-gray-200 rounded">
              <div 
                className="h-1 bg-success-500 rounded" 
                style={{ 
                  width: `${stats.totalUnits ? (stats.activeUnits / stats.totalUnits) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalUnits ? 
                Math.round((stats.activeUnits / stats.totalUnits) * 100) : 0}% of total
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inactive Units</p>
              {isLoading ? (
                <div className="flex items-center h-9 mt-1">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-error-600"></div>
                </div>
              ) : (
                <p className="text-3xl font-semibold mt-1">{stats.inactiveUnits}</p>
              )}
            </div>
            <div className="h-12 w-12 bg-error-100 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-error-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1 w-full bg-gray-200 rounded">
              <div 
                className="h-1 bg-error-500 rounded" 
                style={{ 
                  width: `${stats.totalUnits ? (stats.inactiveUnits / stats.totalUnits) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalUnits ? 
                Math.round((stats.inactiveUnits / stats.totalUnits) * 100) : 0}% of total
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Companies</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : recentCompanies.length > 0 ? (
            <div className="space-y-3">
              {recentCompanies.map((company) => (
                <Link 
                  key={company.id} 
                  to={`/companies/${company.id}`}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors duration-150"
                >
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-gray-500">
                      {company.city}, {company.state}
                    </p>
                  </div>
                  <Plus size={16} className="text-gray-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No companies found. Add your first company!
            </div>
          )}
          <div className="mt-4 pt-4 border-t">
            <Link to="/companies" className="text-sm text-primary-600 hover:text-primary-800">
              View all companies →
            </Link>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/companies/create" className="btn btn-primary w-full justify-start">
              <Briefcase className="h-4 w-4 mr-2" />
              Create Customer Company
            </Link>
            <Link to="/locations" className="btn btn-secondary w-full justify-start">
              <Building className="h-4 w-4 mr-2" />
              Manage Locations
            </Link>
            <Link to="/units" className="btn btn-secondary w-full justify-start">
              <Building2 className="h-4 w-4 mr-2" />
              Manage Units
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;