import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database } from '../../types/supabase';
import { useSupabase } from '../../lib/supabase-context';
import { Search } from 'lucide-react';

type Company = Database['public']['Tables']['companies']['Row'];
type Location = Database['public']['Tables']['locations']['Row'];

type LocationFormProps = {
  companyId?: string;
  initialData?: Location;
  onSuccess?: () => void;
};

const LocationForm = ({ companyId: initialCompanyId, initialData, onSuccess }: LocationFormProps) => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyResults, setShowCompanyResults] = useState(false);
  const [existingCompanyError, setExistingCompanyError] = useState<Company | null>(null);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    building_name: initialData?.building_name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip: initialData?.zip || '',
  });

  useEffect(() => {
    if (initialCompanyId) {
      fetchCompany(initialCompanyId);
    } else if (initialData?.company_id) {
      fetchCompany(initialData.company_id);
    }
  }, [initialCompanyId, initialData]);

  const fetchCompany = async (id: string) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching company:', error);
      return;
    }

    if (data) {
      setSelectedCompany(data);
      setCompanySearch(data.name);
    }
  };

  const searchCompanies = async (query: string) => {
    if (!supabase || query.length < 2) {
      setCompanies([]);
      return;
    }

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(5);

    if (error) {
      console.error('Error searching companies:', error);
      return;
    }

    setCompanies(data || []);
  };

  const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanySearch(value);
    setShowCompanyResults(true);
    setExistingCompanyError(null);
    searchCompanies(value);

    if (!value) {
      setSelectedCompany(null);
    }
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setCompanySearch(company.name);
    setShowCompanyResults(false);
    setExistingCompanyError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!supabase || !selectedCompany) {
      setError('Please select a company first');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setExistingCompanyError(null);
    
    try {
      // Check if company with same name exists
      const { data: existingCompanies } = await supabase
        .from('companies')
        .select('*')
        .eq('name', companySearch.trim())
        .neq('id', selectedCompany.id)
        .limit(1);

      if (existingCompanies && existingCompanies.length > 0) {
        setExistingCompanyError(existingCompanies[0]);
        return;
      }

      if (initialData) {
        // Update existing location
        const { error } = await supabase
          .from('locations')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id);
        
        if (error) throw error;
      } else {
        // Create new location
        const { error } = await supabase
          .from('locations')
          .insert({
            ...formData,
            company_id: selectedCompany.id,
            created_at: new Date().toISOString(),
          });
        
        if (error) throw error;
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/companies/${selectedCompany.id}`);
      }
    } catch (err) {
      console.error('Error saving location:', err);
      setError('Failed to save location. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error-50 text-error-700 p-3 rounded-md">
          {error}
        </div>
      )}

      {existingCompanyError && (
        <div className="bg-warning-50 border-l-4 border-warning-500 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-warning-800">
                Company Already Exists
              </h3>
              <div className="mt-2 text-sm text-warning-700">
                <p>
                  A company with the name "{companySearch}" already exists. Would you like to{' '}
                  <button
                    type="button"
                    onClick={() => {
                      selectCompany(existingCompanyError);
                      setExistingCompanyError(null);
                    }}
                    className="text-warning-800 font-medium underline hover:text-warning-900"
                  >
                    add a location to the existing company
                  </button>
                  ?
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="relative">
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            Company *
          </label>
          <div className="relative">
            <input
              type="text"
              id="company"
              value={companySearch}
              onChange={handleCompanySearch}
              onFocus={() => setShowCompanyResults(true)}
              className="input pr-10"
              placeholder="Search for a company..."
              required
              disabled={!!initialCompanyId || !!initialData}
            />
            <Search className="absolute right-3 top-3 text-gray-400" size={16} />
          </div>
          
          {showCompanyResults && companies.length > 0 && !initialCompanyId && !initialData && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
              <ul className="py-1">
                {companies.map(company => (
                  <li
                    key={company.id}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => selectCompany(company)}
                  >
                    <div className="font-medium">{company.name}</div>
                    <div className="text-sm text-gray-500">
                      {company.city}, {company.state}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Location Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
        
        <div>
          <label htmlFor="building_name" className="block text-sm font-medium text-gray-700 mb-1">
            Building Name *
          </label>
          <input
            type="text"
            id="building_name"
            name="building_name"
            value={formData.building_name}
            onChange={handleChange}
            required
            className="input"
            placeholder="e.g., Main Office Building, North Tower, etc."
          />
        </div>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
        
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            className="input"
          />
        </div>
        
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            State *
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            className="input"
            maxLength={2}
          />
        </div>
        
        <div>
          <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
            Zip Code *
          </label>
          <input
            type="text"
            id="zip"
            name="zip"
            value={formData.zip}
            onChange={handleChange}
            required
            className="input"
            maxLength={10}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => navigate(selectedCompany ? `/companies/${selectedCompany.id}` : '/companies')}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !selectedCompany}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              Saving...
            </>
          ) : initialData ? 'Update Location' : 'Add Location'}
        </button>
      </div>
    </form>
  );
};

export default LocationForm;