import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Building, Wrench, FileText, Contact as FileContract, MessageSquare, Paperclip, Plus } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import Map from '../components/ui/Map';

type Unit = Database['public']['Tables']['units']['Row'] & {
  locations: {
    name: string;
    building_name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    company_id: string;
    companies: {
      name: string;
    };
  };
};

const UnitDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnit = async () => {
      if (!supabase || !id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('units')
          .select(`
            *,
            locations (
              name,
              building_name,
              address,
              city,
              state,
              zip,
              company_id,
              companies (
                name
              )
            )
          `)
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setUnit(data);
      } catch (err) {
        console.error('Error fetching unit:', err);
        setError('Failed to fetch unit details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnit();
  }, [supabase, id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit) {
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
          <Link to="/units" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Unit {unit.unit_number}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/units/${unit.id}/edit`}
            className="btn btn-primary"
          >
            Edit Unit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Unit Details Card */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-4">Unit Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit Number</label>
                    <p className="text-lg font-medium">{unit.unit_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p>
                      <span className={`badge ${unit.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                        {unit.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Location Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Building className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <Link 
                      to={`/locations/${unit.location_id}`}
                      className="text-lg font-medium text-primary-600 hover:text-primary-800"
                    >
                      {unit.locations.name}
                    </Link>
                    <p className="text-gray-600">{unit.locations.building_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p>{unit.locations.address}</p>
                    <p>{unit.locations.city}, {unit.locations.state} {unit.locations.zip}</p>
                  </div>
                </div>
                <div>
                  <Link 
                    to={`/companies/${unit.locations.company_id}`}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    {unit.locations.companies.name}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Map 
                address={unit.locations.address}
                city={unit.locations.city}
                state={unit.locations.state}
                zip={unit.locations.zip}
                className="mt-4"
              />
            </div>
          </div>

          {/* Services Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Services</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Add Service
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No services found</p>
          </div>

          {/* Jobs Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Jobs</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Create Job
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No jobs found</p>
          </div>

          {/* Assets Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Assets</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Add Asset
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No assets found</p>
          </div>

          {/* Deficiencies Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Deficiencies</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Add Deficiency
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No deficiencies found</p>
          </div>

          {/* Quotes Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Quotes</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Create Quote
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No quotes found</p>
          </div>

          {/* Contracts Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Contracts</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Add Contract
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No contracts found</p>
          </div>

          {/* Comments Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Comments</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Add Comment
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No comments found</p>
          </div>

          {/* Attachments Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Attachments</h2>
              <button className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                Add Attachment
              </button>
            </div>
            <p className="text-gray-500 text-center py-4">No attachments found</p>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="btn btn-primary w-full justify-start">
                <Wrench size={16} className="mr-2" />
                Create Service
              </button>
              <button className="btn btn-secondary w-full justify-start">
                <FileText size={16} className="mr-2" />
                Create Quote
              </button>
              <button className="btn btn-secondary w-full justify-start">
                <FileContract size={16} className="mr-2" />
                Add Contract
              </button>
              <button className="btn btn-secondary w-full justify-start">
                <MessageSquare size={16} className="mr-2" />
                Add Comment
              </button>
              <button className="btn btn-secondary w-full justify-start">
                <Paperclip size={16} className="mr-2" />
                Add Attachment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitDetails;