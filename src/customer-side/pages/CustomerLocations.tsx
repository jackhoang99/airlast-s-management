import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { MapPin, Building, Building2, Search, Filter, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import Map from '../../components/ui/Map';

const CustomerLocations = () => {
  const { supabase } = useSupabase();
  const { company, searchTerm: globalSearchTerm } = useOutletContext<{ company: any, searchTerm: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    zip: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Set local search term from global search if provided
    if (globalSearchTerm) {
      setSearchTerm(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!supabase || !company) return;

      try {
        setIsLoading(true);
        
        let query = supabase
          .from('locations')
          .select(`
            *,
            units (
              id,
              unit_number,
              status
            )
          `)
          .eq('company_id', company.id);
          
        // Apply filters
        if (filters.city) {
          query = query.ilike('city', `%${filters.city}%`);
        }
        if (filters.state) {
          query = query.ilike('state', `%${filters.state}%`);
        }
        if (filters.zip) {
          query = query.ilike('zip', `%${filters.zip}%`);
        }
        
        const { data, error: fetchError } = await query.order('name');
        
        if (fetchError) throw fetchError;
        setLocations(data || []);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLocations();
  }, [supabase, company, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      city: '',
      state: '',
      zip: '',
    });
    setSearchTerm('');
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocationId(expandedLocationId === locationId ? null : locationId);
  };

  const filteredLocations = locations.filter(location => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      location.name.toLowerCase().includes(searchLower) ||
      location.building_name?.toLowerCase().includes(searchLower) ||
      location.address.toLowerCase().includes(searchLower) ||
      location.city.toLowerCase().includes(searchLower) ||
      location.state.toLowerCase().includes(searchLower) ||
      location.zip.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locations</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                id="zip"
                name="zip"
                value={filters.zip}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end mb-4">
            <button
              onClick={resetFilters}
              className="text-primary-600 hover:text-primary-800"
            >
              Reset Filters
            </button>
          </div>
        )}

        {error && (
          <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-error-500" />
              <div className="ml-3">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No locations found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLocations.map((location) => (
              <div key={location.id} className="bg-white border rounded-lg shadow-sm">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <MapPin size={16} className="text-gray-400 mr-2" />
                        <Link 
                          to={`/customer/locations/${location.id}`}
                          className="text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {location.name}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Building: {location.building_name}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {location.address}
                        <br />
                        {location.city}, {location.state} {location.zip}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {location.units ? location.units.length : 0} Units
                        </div>
                        <div className="text-xs text-gray-500">
                          {location.units ? location.units.filter((unit: any) => unit.status === 'active').length : 0} Active
                        </div>
                      </div>
                      <button
                        onClick={() => toggleLocation(location.id)}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        {expandedLocationId === location.id ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className={`
                  overflow-hidden transition-all duration-200 ease-in-out
                  ${expandedLocationId === location.id ? 'max-h-[500px]' : 'max-h-0'}
                `}>
                  <div className="border-t border-gray-100 p-4">
                    <div className="mb-4">
                      <Map 
                        address={location.address}
                        city={location.city}
                        state={location.state}
                        zip={location.zip}
                        className="h-[200px] w-full rounded-lg"
                      />
                    </div>
                    
                    <h3 className="font-medium mb-2">Units</h3>
                    {location.units && location.units.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {location.units.map((unit: any) => (
                          <Link
                            key={unit.id}
                            to={`/customer/units/${unit.id}`}
                            className="p-2 bg-gray-50 rounded hover:bg-gray-100"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Building2 size={14} className="text-gray-400 mr-1" />
                                <span className="font-medium">Unit {unit.unit_number}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                unit.status === 'active' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                              }`}>
                                {unit.status}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No units found for this location</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerLocations;