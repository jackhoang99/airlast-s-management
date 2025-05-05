import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';

type Location = Database['public']['Tables']['locations']['Row'] & {
  companies: {
    name: string;
    id: string;
  };
};

const AddUnit = () => {
  const { locationId } = useParams();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [location, setLocation] = useState<Location | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    unitNumber: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  useEffect(() => {
    const fetchLocation = async () => {
      if (!supabase || !locationId) return;

      try {
        const { data, error } = await supabase
          .from('locations')
          .select(`
            *,
            companies (
              id,
              name
            )
          `)
          .eq('id', locationId)
          .single();

        if (error) throw error;
        setLocation(data);
      } catch (err) {
        console.error('Error fetching location:', err);
        setError('Failed to fetch location details');
      }
    };

    fetchLocation();
  }, [supabase, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !locationId || !location) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('units')
        .insert({
          unit_number: formData.unitNumber,
          status: formData.status,
          location_id: locationId
        });

      if (insertError) throw insertError;

      // Navigate back to the company's details page
      navigate(`/companies/${location.companies.id}`);
    } catch (err) {
      console.error('Error adding unit:', err);
      setError('Failed to add unit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!location) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/companies/${location.companies.id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Add Unit</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900">{location.name}</h2>
          <p className="text-sm text-gray-500">
            {location.address}, {location.city}, {location.state} {location.zip}
          </p>
          {location.companies && (
            <p className="text-sm text-gray-500 mt-1">
              {location.companies.name}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-50 text-error-700 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
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
              to={`/companies/${location.companies.id}`}
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !formData.unitNumber}
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