import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { ArrowLeft, Building, MapPin, Building2, FileText, Calendar, AlertTriangle } from 'lucide-react';
import Map from '../../components/ui/Map';

const CustomerLocationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const companyId = sessionStorage.getItem('customerPortalCompanyId');
    if (!companyId) {
      navigate('/customer/login');
      return;
    }
    setCompanyId(companyId);
    
    const fetchLocationDetails = async () => {
      if (!supabase || !id) return;

      try {
        setIsLoading(true);
        
        // Fetch location details
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', id)
          .eq('company_id', companyId)
          .single();
          
        if (locationError) throw locationError;
        
        if (!locationData) {
          throw new Error('Location not found or you do not have access to this location');
        }
        
        setLocation(locationData);
        
        // Fetch units for this location
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .eq('location_id', id)
          .order('unit_number');
          
        if (unitsError) throw unitsError;
        setUnits(unitsData || []);
        
        // Fetch recent jobs for this location
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select(`
            *,
            units (
              unit_number
            )
          `)
          .eq('location_id', id)
          .order('updated_at', { ascending: false })
          .limit(5);
          
        if (jobsError) throw jobsError;
        setRecentJobs(jobsData || []);
        
      } catch (err) {
        console.error('Error fetching location details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load location details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLocationDetails();
  }, [supabase, id, navigate]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'unscheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Location</h3>
        <p className="text-gray-500 mb-4">{error || 'Location not found'}</p>
        <Link to="/customer/locations" className="btn btn-primary">
          Back to Locations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/customer/locations" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{location.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Location Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Building className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium">{location.building_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p>{location.address}</p>
                  <p>{location.city}, {location.state} {location.zip}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Map 
                address={location.address}
                city={location.city}
                state={location.state}
                zip={location.zip}
                className="h-[300px] w-full rounded-lg"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Units</span>
                <span className="font-medium">{units.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Units</span>
                <span className="font-medium">{units.filter(unit => unit.status === 'active').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Recent Jobs</span>
                <span className="font-medium">{recentJobs.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Units */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Units</h2>
        
        {units.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No units found for this location</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(unit => (
              <Link
                key={unit.id}
                to={`/customer/units/${unit.id}`}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Building2 size={16} className="text-gray-400 mr-2" />
                    <h3 className="font-medium">Unit {unit.unit_number}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    unit.status === 'active' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                  }`}>
                    {unit.status}
                  </span>
                </div>
                
                {unit.primary_contact_type && (
                  <p className="text-xs text-gray-500">
                    Contact Type: {unit.primary_contact_type}
                  </p>
                )}
                
                {unit.primary_contact_email && (
                  <p className="text-xs text-gray-500 truncate">
                    Email: {unit.primary_contact_email}
                  </p>
                )}
                
                {unit.primary_contact_phone && (
                  <p className="text-xs text-gray-500">
                    Phone: {unit.primary_contact_phone}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Jobs */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Service History</h2>
        
        {recentJobs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No service history found for this location</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">JOB #</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">SERVICE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">UNIT</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">DATE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job, index) => (
                  <tr key={job.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-sm font-medium">{job.number}</td>
                    <td className="px-4 py-3 text-sm">
                      <Link 
                        to={`/customer/jobs/${job.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.units ? `Unit ${job.units.unit_number}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {job.schedule_start ? formatDate(job.schedule_start) : 'Not scheduled'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerLocationDetails;