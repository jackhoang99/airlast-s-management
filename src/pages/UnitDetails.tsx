import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Building, Wrench, FileText, Contact as FileContract, MessageSquare, Paperclip, Plus, Calendar, Clock, Tag } from 'lucide-react';
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

type Job = Database['public']['Tables']['jobs']['Row'] & {
  job_items?: {
    total_cost: number;
  }[];
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UnitDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnit = async () => {
      if (!supabase || !id) return;

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        setError('Invalid unit ID format');
        setIsLoading(false);
        return;
      }

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

    const fetchJobs = async () => {
      if (!supabase || !id) return;

      // Don't fetch jobs if UUID is invalid
      if (!UUID_REGEX.test(id)) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select(`
            *,
            job_items (
              total_cost
            )
          `)
          .eq('unit_id', id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setJobs(data || []);
      } catch (err) {
        console.error('Error fetching jobs for unit:', err);
      }
    };

    fetchUnit();
    fetchJobs();
  }, [supabase, id]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'unscheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'preventative maintenance':
        return 'bg-purple-100 text-purple-800';
      case 'service call':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate total cost from job items
  const getJobTotalCost = (job: Job) => {
    if (!job.job_items || job.job_items.length === 0) return 0;
    return job.job_items.reduce((sum, item) => sum + Number(item.total_cost), 0);
  };

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
                      <span className={`badge ${unit.status.toLowerCase() === 'active' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'}`}>
                        {unit.status.toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Primary Contact Type</label>
                    <p>{unit.primary_contact_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Primary Contact Email</label>
                    <p>{unit.primary_contact_email || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Primary Contact Phone</label>
                    <p>{unit.primary_contact_phone || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-6" />

            {/* Billing Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Billing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Entity</label>
                  <p>{unit.billing_entity || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Email</label>
                  <p>{unit.billing_email || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing City</label>
                  <p>{unit.billing_city || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing State</label>
                  <p>{unit.billing_state || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Zip</label>
                  <p>{unit.billing_zip || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Office</label>
                  <p>{unit.office || 'Main Office'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Taxable</label>
                  <p>{unit.taxable ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tax Group Name</label>
                  <p>{unit.tax_group_name || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tax Group Code</label>
                  <p>{unit.tax_group_code || 'Not specified'}</p>
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

          {/* Jobs Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                Jobs
              </h2>
              <div className="flex items-center gap-2">
                <span className="badge">{jobs.length} Jobs</span>
                <Link to={`/jobs/create?unitId=${unit.id}`} className="btn btn-primary btn-sm">
                  <Plus size={14} className="mr-1" />
                  Create Job
                </Link>
              </div>
            </div>

            {jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-500">Job #{job.number}</span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(job.status)}`}>
                            {job.status}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getTypeBadgeClass(job.type)}`}>
                            {job.type}
                          </span>
                          {job.is_training && (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              training
                            </span>
                          )}
                          {job.job_items && job.job_items.length > 0 && (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                              ${getJobTotalCost(job).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Link 
                          to={`/jobs/${job.id}`}
                          className="text-lg font-medium text-primary-600 hover:text-primary-800"
                        >
                          {job.name}
                        </Link>
                        <div className="text-sm text-gray-500 mt-1">
                          {job.service_line && (
                            <div className="flex items-center gap-1">
                              <Tag size={14} />
                              <span>{job.service_line}</span>
                            </div>
                          )}
                          {job.description && (
                            <p className="mt-1 line-clamp-2">{job.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          Start: {job.time_period_start}
                        </div>
                        <div className="text-sm text-gray-500">
                          Due: {job.time_period_due}
                        </div>
                        {job.schedule_start && (
                          <div className="text-sm text-gray-500 flex items-center justify-end gap-1 mt-1">
                            <Clock size={14} />
                            <span>{formatDateTime(job.schedule_start)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No jobs found for this unit</p>
                <Link to={`/jobs/create?unitId=${unit.id}`} className="btn btn-primary">
                  <Plus size={16} className="mr-2" />
                  Create Job
                </Link>
              </div>
            )}
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
              <Link 
                to={`/jobs/create?unitId=${unit.id}`}
                className="btn btn-primary w-full justify-start"
              >
                <Calendar size={16} className="mr-2" />
                Create Job
              </Link>
              <button className="btn btn-secondary w-full justify-start">
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

          {/* Job Statistics */}
          {jobs.length > 0 && (
            <div className="card mt-6">
              <h2 className="text-lg font-semibold mb-4">Job Statistics</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Jobs</span>
                  <span className="font-medium">{jobs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed Jobs</span>
                  <span className="font-medium">{jobs.filter(job => job.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Scheduled Jobs</span>
                  <span className="font-medium">{jobs.filter(job => job.status === 'scheduled').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Unscheduled Jobs</span>
                  <span className="font-medium">{jobs.filter(job => job.status === 'unscheduled').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium">
                    ${jobs.reduce((sum, job) => sum + getJobTotalCost(job), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitDetails;