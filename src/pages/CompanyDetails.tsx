import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Plus, Edit, FileText, Tag, Building as Buildings, Phone, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import UnitsList from '../components/locations/UnitsList';
import Map from '../components/ui/Map';

type Company = Database['public']['Tables']['companies']['Row'];
type Location = Database['public']['Tables']['locations']['Row'];

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase, error: supabaseError } = useSupabase();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!supabase || !id) {
        setError(supabaseError || 'Supabase client not initialized');
        setIsLoading(false);
        return;
      }

      try {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);

        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*')
          .eq('company_id', id)
          .order('name');

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch company details';
        console.error('Error fetching company details:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [supabase, id, supabaseError]);

  const handleDeleteCompany = async () => {
    if (!supabase || !company) return;

    try {
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (deleteError) throw deleteError;
      navigate('/companies');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete company';
      console.error('Error deleting company:', errorMessage);
      setError(errorMessage);
    }
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocationId(expandedLocationId === locationId ? null : locationId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error}</p>
        <Link to="/companies" className="text-primary-600 hover:text-primary-800">
          Back to Companies
        </Link>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Company not found.</p>
        <Link to="/companies" className="text-primary-600 hover:text-primary-800 mt-2 inline-block">
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade">
      {/* Back link and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link 
          to="/companies" 
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Companies
        </Link>
        <div className="flex space-x-2">
          <Link 
            to={`/companies/${company.id}/edit`} 
            className="btn btn-secondary"
          >
            <Edit size={16} className="mr-2" />
            Edit
          </Link>
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="btn btn-error"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Company details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            
            <div className="mt-4 space-y-3">
              <div className="flex items-start">
                <MapPin size={18} className="text-gray-500 mt-0.5 mr-2" />
                <div>
                  <p>{company.address}</p>
                  <p>{company.city}, {company.state} {company.zip}</p>
                </div>
              </div>
              
              {company.phone && (
                <div className="flex items-center">
                  <Phone size={18} className="text-gray-500 mr-2" />
                  <p>{company.phone}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Map 
                address={company.address}
                city={company.city}
                state={company.state}
                zip={company.zip}
                className="mt-4"
              />
            </div>
          </div>
        </div>
        
        <div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <Link 
                to={`/companies/${company.id}/location/new`}
                className="btn btn-primary w-full justify-start"
              >
                <Plus size={16} className="mr-2" />
                Add Location
              </Link>
              <Link 
                to={`/companies/${company.id}/report`}
                className="btn btn-secondary w-full justify-start"
              >
                <FileText size={16} className="mr-2" />
                Generate Report
              </Link>
              <button className="btn btn-secondary w-full justify-start">
                <Tag size={16} className="mr-2" />
                Manage Tags
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Buildings size={20} className="mr-2" /> 
            Locations ({locations.length})
          </h2>
          <Link 
            to={`/companies/${company.id}/location/new`}
            className="btn btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Add Location
          </Link>
        </div>

        <div className="space-y-4">
          {locations.map((location) => (
            <div key={location.id} className="bg-white rounded-lg shadow">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{location.name}</h3>
                    <p className="text-sm text-gray-500">
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
                      to={`/companies/${company.id}/locations/${location.id}/edit`}
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

          {locations.length === 0 && (
            <div className="text-center py-8 bg-white rounded-lg shadow">
              <p className="text-gray-500">No locations found.</p>
              <Link 
                to={`/companies/${company.id}/location/new`}
                className="text-primary-600 hover:text-primary-800 mt-2 inline-block"
              >
                Add your first location
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Company
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete <strong>{company.name}</strong>? 
              This will also delete all locations and cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteCompany}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetails;