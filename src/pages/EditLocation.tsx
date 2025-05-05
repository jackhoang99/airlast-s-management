import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';
import LocationForm from '../components/locations/LocationForm';
import type { Database } from '../types/supabase';

type Location = Database['public']['Tables']['locations']['Row'];

const EditLocation = () => {
  const { id, companyId } = useParams<{ id: string; companyId?: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!supabase || !id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setLocation(data);
      } catch (err) {
        console.error('Error fetching location:', err);
        setError('Failed to fetch location details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocation();
  }, [supabase, id]);

  const handleDelete = async () => {
    if (!supabase || !location) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('id', location.id);

      if (deleteError) throw deleteError;
      navigate(companyId ? `/companies/${companyId}` : '/locations');
    } catch (err) {
      console.error('Error deleting location:', err);
      setError('Failed to delete location. Please try again.');
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

  if (error || !location) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || 'Location not found'}</p>
        <Link 
          to={companyId ? `/companies/${companyId}` : '/locations'} 
          className="text-primary-600 hover:text-primary-800"
        >
          Back to {companyId ? 'Company' : 'Locations'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={companyId ? `/companies/${companyId}` : '/locations'} 
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Edit Location</h1>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
        >
          Delete Location
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <LocationForm 
          initialData={location}
          onSuccess={() => navigate(companyId ? `/companies/${companyId}` : '/locations')}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Location
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete <strong>{location.name}</strong>? 
              This will also delete all associated units and cannot be undone.
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

export default EditLocation;