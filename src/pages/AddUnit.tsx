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
  const { locationId } = useParams<{ locationId: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [location, setLocation] = useState<Location | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    unitNumber: '',
    status: 'active' as 'active' | 'inactive',
    phone: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    primary_contact_type: 'Management',
    email: '',
    // Billing fields
    billing_entity: '',
    billing_email: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    // Additional fields
    office: 'Main Office',
    taxable: true,
    tax_group_name: '',
    tax_group_code: ''
  });

  useEffect(() => {
    const fetchLocation = async () => {
      if (!supabase || !locationId) return;

      try {
        const { data, error: fetchError } = await supabase
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

        if (fetchError) throw fetchError;
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
          location_id: locationId,
          phone: formData.phone || null,
          primary_contact_email: formData.primary_contact_email || null,
          primary_contact_phone: formData.primary_contact_phone || null,
          primary_contact_type: formData.primary_contact_type || null,
          email: formData.email || null,
          // Billing fields
          billing_entity: formData.billing_entity || null,
          billing_email: formData.billing_email || null,
          billing_city: formData.billing_city || null,
          billing_state: formData.billing_state || null,
          billing_zip: formData.billing_zip || null,
          // Additional fields
          office: formData.office || 'Main Office',
          taxable: formData.taxable,
          tax_group_name: formData.tax_group_name || null,
          tax_group_code: formData.tax_group_code || null
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                className="select"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input"
                placeholder="(123) 456-7890"
              />
            </div>

            <div>
              <label htmlFor="primary_contact_type" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Contact Type
              </label>
              <select
                id="primary_contact_type"
                value={formData.primary_contact_type}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_contact_type: e.target.value }))}
                className="select"
              >
                <option value="Management">Management</option>
                <option value="Owner">Owner</option>
                <option value="Business Owner">Business Owner</option>
                <option value="Tenant">Tenant</option>
              </select>
            </div>

            <div>
              <label htmlFor="primary_contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Contact Email
              </label>
              <input
                type="email"
                id="primary_contact_email"
                value={formData.primary_contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_contact_email: e.target.value }))}
                className="input"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label htmlFor="primary_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Contact Phone
              </label>
              <input
                type="tel"
                id="primary_contact_phone"
                value={formData.primary_contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_contact_phone: e.target.value }))}
                className="input"
                placeholder="(123) 456-7890"
              />
            </div>

            {/* Billing Information */}
            <div className="md:col-span-2">
              <h3 className="text-md font-medium text-gray-900 mb-3">Billing Information</h3>
            </div>

            <div>
              <label htmlFor="billing_entity" className="block text-sm font-medium text-gray-700 mb-1">
                Billing Entity
              </label>
              <input
                type="text"
                id="billing_entity"
                value={formData.billing_entity}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_entity: e.target.value }))}
                className="input"
                placeholder="Billing Entity Name"
              />
            </div>

            <div>
              <label htmlFor="billing_email" className="block text-sm font-medium text-gray-700 mb-1">
                Billing Email
              </label>
              <input
                type="email"
                id="billing_email"
                value={formData.billing_email}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_email: e.target.value }))}
                className="input"
                placeholder="billing@example.com"
              />
            </div>

            <div>
              <label htmlFor="billing_city" className="block text-sm font-medium text-gray-700 mb-1">
                Billing City
              </label>
              <input
                type="text"
                id="billing_city"
                value={formData.billing_city}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="billing_state" className="block text-sm font-medium text-gray-700 mb-1">
                Billing State
              </label>
              <input
                type="text"
                id="billing_state"
                value={formData.billing_state}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_state: e.target.value }))}
                className="input"
                maxLength={2}
              />
            </div>

            <div>
              <label htmlFor="billing_zip" className="block text-sm font-medium text-gray-700 mb-1">
                Billing Zip
              </label>
              <input
                type="text"
                id="billing_zip"
                value={formData.billing_zip}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_zip: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="office" className="block text-sm font-medium text-gray-700 mb-1">
                Office
              </label>
              <input
                type="text"
                id="office"
                value={formData.office}
                onChange={(e) => setFormData(prev => ({ ...prev, office: e.target.value }))}
                className="input"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="taxable"
                checked={formData.taxable}
                onChange={(e) => setFormData(prev => ({ ...prev, taxable: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <label htmlFor="taxable" className="ml-2 text-sm text-gray-700">
                Taxable
              </label>
            </div>

            <div>
              <label htmlFor="tax_group_name" className="block text-sm font-medium text-gray-700 mb-1">
                Tax Group Name
              </label>
              <input
                type="text"
                id="tax_group_name"
                value={formData.tax_group_name}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_group_name: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="tax_group_code" className="block text-sm font-medium text-gray-700 mb-1">
                Tax Group Code
              </label>
              <input
                type="text"
                id="tax_group_code"
                value={formData.tax_group_code}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_group_code: e.target.value }))}
                className="input"
              />
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