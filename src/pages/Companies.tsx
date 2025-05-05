import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft } from 'lucide-react';

type Company = Database['public']['Tables']['companies']['Row'];

const Companies = () => {
  const { supabase } = useSupabase();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    company: '',
    city: '',
    state: '',
    zipcode: '',
  });
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (!supabase) {
        setError('Supabase client not initialized');
        setIsLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('companies')
          .select('*');

        // Apply filters
        if (filters.company) {
          query = query.ilike('name', `%${filters.company}%`);
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

        query = query.limit(limit).order('name');

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw supabaseError;
        }

        setCompanies(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Failed to fetch companies. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [supabase, filters, limit]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      company: '',
      city: '',
      state: '',
      zipcode: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Companies</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            Export to Spreadsheet
          </button>
          <Link to="/companies/create" className="btn btn-primary">
            Create Customer Company
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              name="company"
              placeholder="Company"
              value={filters.company}
              onChange={handleFilterChange}
              className="input w-full"
            />
          </div>
          <div>
            <input
              type="text"
              name="city"
              placeholder="City"
              value={filters.city}
              onChange={handleFilterChange}
              className="input w-full"
            />
          </div>
          <div>
            <input
              type="text"
              name="state"
              placeholder="State"
              value={filters.state}
              onChange={handleFilterChange}
              className="input w-full"
            />
          </div>
          <div>
            <input
              type="text"
              name="zipcode"
              placeholder="Zipcode"
              value={filters.zipcode}
              onChange={handleFilterChange}
              className="input w-full"
            />
          </div>
          <div>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="select w-full"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <div className="flex items-center gap-2">
            <button className="btn btn-primary">
              Search
            </button>
            <button 
              onClick={resetFilters}
              className="text-primary-600 hover:text-primary-800"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No companies found.
          </div>
        ) : (
          companies.map((company) => (
            <div key={company.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <Link 
                    to={`/companies/${company.id}`}
                    className="text-primary-600 hover:text-primary-800 font-medium text-lg"
                  >
                    {company.name}
                  </Link>
                  <div className="text-gray-600 mt-1">
                    {company.address && (
                      <div>
                        {company.address}
                      </div>
                    )}
                    <div>
                      {company.city}, {company.state} {company.zip}
                    </div>
                    {company.phone && (
                      <div>
                        {company.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex gap-2">
                    <Link 
                      to={`/companies/${company.id}/edit`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      Edit
                    </Link>
                    <span className="text-gray-300">•</span>
                    <Link 
                      to={`/companies/${company.id}/report`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      Asset Report
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Companies;
