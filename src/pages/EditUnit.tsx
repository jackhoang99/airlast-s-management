import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';
import type { Database } from '../types/supabase';

type Unit = Database['public']['Tables']['units']['Row'];
type Location = Database['public']['Tables']['locations']['Row'] & {
  companies: {
    name: string;
  };
};

const EditUnit = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    unitNumber: '',
    status: 'active' as 'active' | 'inactive',
    primary_contact_email: '',
    primary_contact_phone: '',
    primary_contact_type: '',
    // Billing fields
    billing_entity: '',
    billing_email: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    // Additional fields
    office: '',
    taxable: false,
    tax_group_name: '',
    tax_group_code: ''
  });

  useEffect(() => {
    const fetchUnitAndLocation = async () => {
      if (!supabase || !id) return;

      try {
        // Fetch unit
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('*')
          .eq('id', id)
          .single();

        if (unitError) throw unitError;
        setUnit(unitData);
        setFormData({
          unitNumber: unitData.unit_number,
          status: unitData.status.toLowerCase() as 'active' | 'inactive',
          primary_contact_email: unitData.primary_contact_email || '',
          primary_contact_phone: unitData.primary_contact_phone || '',
          primary_contact_type: unitData.primary_contact_type || 'Management',
          // Billing fields
          billing_entity: unitData.billing_entity || '',
          billing_email: unitData.billing_email || '',
          billing_city: unitData.billing_city || '',
          billing_state: unitData.billing_state || '',
          billing_zip: unitData.billing_zip || '',
          // Additional fields
          office: unitData.office || 'Main Office',
          taxable: unitData.taxable || false,
          tax_group_name: unitData.tax_group_name || '',
          tax_group_code: unitData.tax_group_code || ''
        });

        // Fetch location
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select(`
            *,
            companies:company_id(name)
          `)
          .eq('id', unitData.location_id)
          .single();

        if (locationError) throw locationError;
        setLocation(locationData);
      } catch (err) {
        console.error('Error fetching unit details:', err);
        setError('Failed to fetch unit details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnitAndLocation();
  }, [supabase, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !unit) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('units')
        .update({
          unit_number: formData.unitNumber,
          status: formData.status,
          primary_contact_email: formData.primary_contact_email || null,
          primary_contact_phone: formData.primary_contact_phone || null,
          primary_contact_type: formData.primary_contact_type || null,
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
        })
        .eq('id', unit.id);

      if (updateError) throw updateError;
      navigate(`/locations/${unit.location_id}`);
    } catch (err) {
      console.error('Error updating unit:', err);
      setError('Failed to update unit. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !unit) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('units')
        .delete()
        .eq('id', unit.id);

      if (deleteError) throw deleteError;
      navigate(`/locations/${unit.location_id}`);
    } catch (err) {
      console.error('Error deleting unit:', err);
      setError('Failed to delete unit. Please try again.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit || !location) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || 'Unit not found'}</p>
        <Link to="/units" className="text-primary-600 hover:text-primary-800">
          Back to Units
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/locations/${unit.location_id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Edit Unit</h1>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
        >
          Delete Unit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-50 text-error-700 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <div className="text-gray-900 p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{location.name}</div>
                <div className="text-sm text-gray-500">
                  {location.address}, {location.city}, {location.state}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {location.companies?.name}
                </div>
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
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                className="select"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
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
              to={`/locations/${unit.location_id}`}
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Unit
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete unit <strong>{unit.unit_number}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditUnit;