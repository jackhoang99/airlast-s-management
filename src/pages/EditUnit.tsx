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
    status: 'Active' as 'Active' | 'Inactive'
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
          status: unitData.status
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
          status: formData.status
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

          <div className="space-y-4">
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