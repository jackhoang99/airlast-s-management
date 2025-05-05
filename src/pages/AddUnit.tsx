import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';

type Location = Database['public']['Tables']['locations']['Row'] & {
  companies: {
    name: string;
  };
};

const AddUnit = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('location');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    unitNumber: '',
    status: 'Active' as 'Active' | 'Inactive',
    locationId: locationId || ''
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (locationId && supabase) {
      const fetchLocation = async () => {
        const { data, error } = await supabase
          .from('locations')
          .select(`
            *,
            companies:company_id(name)
          `)
          .eq('id', locationId)
          .single();

        if (error) {
          console.error('Error fetching location:', error);
          return;
        }

        if (data) {
          setSelectedLocation(data);
          setSearchQuery(`${data.name} - ${data.address}`);
        }
      };

      fetchLocation();
    }
  }, [locationId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('units')
        .insert({
          unit_number: formData.unitNumber,
          status: formData.status,
          location_id: formData.locationId
        });

      if (insertError) throw insertError;

      navigate(`/locations/${formData.locationId}`);
    } catch (err) {
      console.error('Error adding unit:', err);
      setError('Failed to add unit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSearch = async (query: string) => {
    setSearchQuery(query);
    if (!supabase || query.length < 2) {
      setLocations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          companies:company_id(name)
        `)
        .or(`name.ilike.%${query}%, address.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setLocations(data || []);
    } catch (err) {
      console.error('Error searching locations:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={locationId ? `/locations/${locationId}` : "/units"} 
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Add Unit</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-50 text-error-700 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  id="location"
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => handleLocationSearch(e.target.value)}
                  className="input"
                  disabled={!!locationId}
                />

                {locations.length > 0 && !locationId && (
                  <div className="bg-white rounded-md shadow-lg border border-gray-200">
                    <ul className="divide-y divide-gray-100">
                      {locations.map((location) => (
                        <li
                          key={location.id}
                          className="p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, locationId: location.id }));
                            setSearchQuery(`${location.name} - ${location.address}`);
                            setSelectedLocation(location);
                            setLocations([]);
                          }}
                        >
                          <div className="font-medium">{location.name}</div>
                          <div className="text-sm text-gray-500">
                            {location.address}, {location.city}, {location.state}
                          </div>
                          <div className="text-xs text-gray-400">
                            {location.companies?.name}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Unit Number *
              </label>
              <input
                type="text"
                id="unitNumber"
                value={formData.unitNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, unitNumber: e.target.value }))}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' }))}
                className="select"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Link 
              to={locationId ? `/locations/${locationId}` : "/units"}
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !formData.locationId || !formData.unitNumber}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                  Adding...
                </>
              ) : (
                'Add Unit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUnit;