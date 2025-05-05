import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Briefcase, MapPin, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

const Dashboard = () => {
  const { supabase } = useSupabase();
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalLocations: 0,
    totalUnits: 0,
    activeUnits: 0,
    inactiveUnits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return;

      try {
        // Get total companies
        const { count: companiesCount, error: companiesError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        if (companiesError) throw companiesError;

        // Get total locations
        const { count: locationsCount, error: locationsError } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true });

        if (locationsError) throw locationsError;

        // Get total units
        const { count: unitsCount, error: unitsError } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true });

        if (unitsError) throw unitsError;

        // Get active units
        const { count: activeCount, error: activeError } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Active');

        if (activeError) throw activeError;

        // Get inactive units
        const { count: inactiveCount, error: inactiveError } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Inactive');

        if (inactiveError) throw inactiveError;

        setStats({
          totalCompanies: companiesCount || 0,
          totalLocations: locationsCount || 0,
          totalUnits: unitsCount || 0,
          activeUnits: activeCount || 0,
          inactiveUnits: inactiveCount || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [supabase]);

  if (isLoading && supabase) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <Link to="/companies/new" className="btn btn-primary">
          Add New Company
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Companies</p>
              <p className="text-3xl font-semibold mt-1">{stats.totalCompanies}</p>
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
              <p className="text-3xl font-semibold mt-1">{stats.totalLocations}</p>
            </div>
            <div className="h-12 w-12 bg-secondary-100 rounded-full flex items-center justify-center">
              <MapPin className="h-6 w-6 text-secondary-600" />
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
              <p className="text-3xl font-semibold mt-1">{stats.totalUnits}</p>
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
              <p className="text-3xl font-semibold mt-1">{stats.activeUnits}</p>
            </div>
            <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success-600" />
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
              <p className="text-3xl font-semibold mt-1">{stats.inactiveUnits}</p>
            </div>
            <div className="h-12 w-12 bg-error-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-error-600" />
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
          <RecentCompaniesList />
        </div>
        
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/companies/new" className="btn btn-primary w-full justify-start">
              <Briefcase className="h-4 w-4 mr-2" />
              Create Customer Company
            </Link>
            <Link to="/locations" className="btn btn-secondary w-full justify-start">
              <MapPin className="h-4 w-4 mr-2" />
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

const RecentCompaniesList = () => {
  const { supabase } = useSupabase();
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentCompanies = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setCompanies(data || []);
      } catch (error) {
        console.error('Error fetching recent companies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentCompanies();
  }, [supabase]);

  if (isLoading && supabase) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No companies found.</p>
        <Link to="/companies/new" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
          Add your first company
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {companies.map((company) => (
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
          <span className={`badge ${company.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
            {company.status}
          </span>
        </Link>
      ))}
      <div className="pt-2">
        <Link to="/companies" className="text-sm text-primary-600 hover:text-primary-800">
          View all companies →
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;