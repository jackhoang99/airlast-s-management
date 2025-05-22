import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { MapPin, Filter, ArrowDownToLine, ChevronDown } from 'lucide-react';
import UnitsList from '../components/locations/UnitsList';

type Location = Database['public']['Tables']['locations']['Row'] & {
  companies: {
    name: string;
  };
};

const Locations = () => {
  const { supabase } = useSupabase();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    name: '',
    building_name: '',
    city: '',
    state: '',
    zipcode: '',
  });

  useEffect(() => {
    const fetchLocations = async () => {
      if (!supabase) return;

      try {
        let query = supabase
          .from('locations')
          .select(`
            *,
            companies:company_id(name)
          `);

        // Apply filters
        if (filters.name) {
          query = query.ilike('name', `%${filters.name}%`);
        }
        if (filters.building_name) {
          query = query.ilike('building_name', `%${filters.building_name}%`);
        }
        if (filters.city) {
          query = query.ilike('city', `%${filters.city}%`);
        }
        if (filters.state) {
          query = query.ilike('state', `%${filters.state}%`);
        }
        if (filters.zipcode) {
          query = query.ilike('zip', `%${filters.zipcode}%`);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [supabase, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      name: '',
      building_name: '',
      city: '',
      state: '',
      zipcode: '',
    });
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocationId(expandedLocationId === locationId ? null : locationId);
  };

  const filteredLocations = searchQuery 
    ? locations.filter(location => 
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.building_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.zip.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : locations;

  return (
    <div className="space-y-6 animate-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1>Locations</h1>
        <button className="btn btn-secondary">
          <ArrowDownToLine size={16} className="mr-2" />
          Export
        </button>
      </div>

      <div className="card">
        <div className="mb-6">
          <label htmlFor="search" className="sr-only">
            Search
          </label>
          <input
            type="search"
            id="search"
            className="input"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="building_name" className="block text-sm font-medium text-gray-700 mb-1">
              Building Name
            </label>
            <input
              type="text"
              id="building_name"
              name="building_name"
              value={filters.building_name}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
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
            <label htmlFor="zipcode" className="block text-sm font-medium text-gray-700 mb-1">
              Zipcode
            </label>
            <input
              type="text"
              id="zipcode"
              name="zipcode"
              value={filters.zipcode}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Filter size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-gray-500">
              Filters applied: {Object.values(filters).filter(Boolean).length}
            </span>
          </div>
          {Object.values(filters).some(Boolean) && (
            <button 
              onClick={resetFilters}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Reset filters
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No locations found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLocations.map((location) => (
              <div key={location.id} className="bg-white rounded-lg shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <MapPin size={16} className="text-gray-400 mr-2" />
                        <Link 
                          to={`/locations/${location.id}`}
                          className="text-primary-600 hover:text-primary-800 font-medium"
                        >
                          {location.name}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Building: {location.building_name}
                      </div>
                      <Link 
                        to={`/companies/${location.company_id}`}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        {location.companies?.name}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {location.address}
                        <br />
                        {location.city}, {location.state} {location.zip}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleLocation(location.id)}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        {expandedLocationId === location.id ? 'Hide Units' : 'Show Units'}
                      </button>
                      <Link
                        to={`/locations/${location.id}/edit`}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className={`
                  overflow-hidden transition-all duration-200 ease-in-out
                  ${expandedLocationId === location.id ? 'max-h-[500px]' : 'max-h-0'}
                `}>
                  <div className="border-t border-gray-100 p-4">
                    <UnitsList location={location} />
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

export default Locations;