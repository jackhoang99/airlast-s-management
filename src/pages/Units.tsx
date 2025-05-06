import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { Building2, Plus, Filter } from 'lucide-react';

type Unit = Database['public']['Tables']['units']['Row'] & {
  locations: {
    name: string;
    building_name: string;
    company_id: string;
    companies: {
      name: string;
    };
  };
};

const Units = () => {
  const { supabase } = useSupabase();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    unitNumber: '',
    location: '',
    company: '',
    status: '',
  });

  useEffect(() => {
    const fetchUnits = async () => {
      if (!supabase) return;

      try {
        let query = supabase
          .from('units')
          .select(`
            *,
            locations (
              name,
              building_name,
              company_id,
              companies (
                name
              )
            )
          `);

        // Apply filters
        if (filters.unitNumber) {
          query = query.ilike('unit_number', `%${filters.unitNumber}%`);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query.order('unit_number');

        if (error) throw error;
        setUnits(data || []);
      } catch (err) {
        console.error('Error fetching units:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnits();
  }, [supabase, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      unitNumber: '',
      location: '',
      company: '',
      status: '',
    });
  };

  const filteredUnits = units.filter(unit => {
    const matchesSearch = searchQuery.toLowerCase().split(' ').every(term =>
      unit.unit_number.toLowerCase().includes(term) ||
      unit.locations?.name.toLowerCase().includes(term) ||
      unit.locations?.companies?.name.toLowerCase().includes(term)
    );

    const matchesLocation = !filters.location || 
      unit.locations?.name.toLowerCase().includes(filters.location.toLowerCase());

    const matchesCompany = !filters.company ||
      unit.locations?.companies?.name.toLowerCase().includes(filters.company.toLowerCase());

    return matchesSearch && matchesLocation && matchesCompany;
  });

  return (
    <div className="space-y-6 animate-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="flex items-center">
          <Building2 size={24} className="mr-2" />
          Units
        </h1>
        <Link to="/units/add" className="btn btn-primary">
          <Plus size={16} className="mr-2" />
          Add Unit
        </Link>
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
            placeholder="Search units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Unit Number
            </label>
            <input
              type="text"
              id="unitNumber"
              name="unitNumber"
              value={filters.unitNumber}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={filters.company}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
        ) : filteredUnits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No units found.</p>
            <Link to="/units/add" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
              Add your first unit
            </Link>
          </div>
        ) : (
          <div className="table-container animate-fade">
            <table className="table table-row-hover">
              <thead>
                <tr>
                  <th>Unit Number</th>
                  <th>Location</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td className="font-medium">
                      <Link 
                        to={`/units/${unit.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {unit.unit_number}
                      </Link>
                    </td>
                    <td>
                      <Link 
                        to={`/locations/${unit.location_id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {unit.locations?.name}
                      </Link>
                    </td>
                    <td>
                      <Link 
                        to={`/companies/${unit.locations?.company_id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {unit.locations?.companies?.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${unit.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/units/${unit.id}/edit`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Edit
                        </Link>
                      </div>
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

export default Units;