import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { 
  ArrowLeft, MapPin, Calendar, DollarSign, FileText, Clock, Package, 
  AlertTriangle, FileInput as FileInvoice, MessageSquare, Paperclip, 
  Building2, Tag, Send, Copy, Plus, Phone, Mail, Globe, Building,
  Settings, ChevronDown, User, PenTool as Tool, Filter, Search, Trash2,
  CheckCircle
} from 'lucide-react';
import Map from '../components/ui/Map';
import AddJobItemModal from '../components/jobs/AddJobItemModal';
import AppointmentModal from '../components/jobs/AppointmentModal';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    companies: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
    };
  };
  units?: {
    id: string;
    unit_number: string;
    status: string;
  };
};

type JobItem = Database['public']['Tables']['job_items']['Row'];
type JobClockEvent = Database['public']['Tables']['job_clock_events']['Row'];
type JobAsset = Database['public']['Tables']['job_assets']['Row'];
type JobDeficiency = Database['public']['Tables']['job_deficiencies']['Row'];
type JobInvoice = Database['public']['Tables']['job_invoices']['Row'];
type JobComment = Database['public']['Tables']['job_comments']['Row'];
type JobAttachment = Database['public']['Tables']['job_attachments']['Row'];
type User = Database['public']['Tables']['users']['Row'];

type JobTechnician = {
  id: string;
  job_id: string;
  technician_id: string;
  is_primary: boolean;
  created_at: string;
  users: User;
};

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<JobItem[]>([]);
  const [clockEvents, setClockEvents] = useState<JobClockEvent[]>([]);
  const [assets, setAssets] = useState<JobAsset[]>([]);
  const [deficiencies, setDeficiencies] = useState<JobDeficiency[]>([]);
  const [invoices, setInvoices] = useState<JobInvoice[]>([]);
  const [comments, setComments] = useState<JobComment[]>([]);
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [technicians, setTechnicians] = useState<JobTechnician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [itemsFilter, setItemsFilter] = useState('');
  const [groupByService, setGroupByService] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isCancellingJob, setIsCancellingJob] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!supabase || !id) return;

      try {
        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              zip,
              companies (
                name,
                address,
                city,
                state,
                zip,
                phone
              )
            ),
            units (
              id,
              unit_number,
              status
            )
          `)
          .eq('id', id)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        // Fetch technicians assigned to this job
        const { data: techData, error: techError } = await supabase
          .from('job_technicians')
          .select(`
            *,
            users:technician_id (
              id,
              first_name,
              last_name,
              email,
              phone,
              role
            )
          `)
          .eq('job_id', id)
          .order('is_primary', { ascending: false });

        if (techError) throw techError;
        setTechnicians(techData || []);

        // Fetch items
        const { data: itemData, error: itemError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (itemError) throw itemError;
        setItems(itemData || []);

        // Fetch clock events
        const { data: clockData, error: clockError } = await supabase
          .from('job_clock_events')
          .select('*')
          .eq('job_id', id)
          .order('event_time');

        if (clockError) throw clockError;
        setClockEvents(clockData || []);

        // Fetch assets
        const { data: assetData, error: assetError } = await supabase
          .from('job_assets')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (assetError) throw assetError;
        setAssets(assetData || []);

        // Fetch deficiencies
        const { data: deficiencyData, error: deficiencyError } = await supabase
          .from('job_deficiencies')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (deficiencyError) throw deficiencyError;
        setDeficiencies(deficiencyData || []);

        // Fetch invoices
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('job_invoices')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (invoiceError) throw invoiceError;
        setInvoices(invoiceData || []);

        // Fetch comments
        const { data: commentData, error: commentError } = await supabase
          .from('job_comments')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (commentError) throw commentError;
        setComments(commentData || []);

        // Fetch attachments
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('job_attachments')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (attachmentError) throw attachmentError;
        setAttachments(attachmentData || []);

      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Error fetching job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [supabase, id]);

  const refreshItems = async () => {
    if (!supabase || !id) return;

    try {
      const { data, error } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', id)
        .order('created_at');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error refreshing items:', err);
    }
  };

  const handleCompleteJob = async () => {
    if (!supabase || !job) return;
    
    setIsCompletingJob(true);
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      if (error) throw error;
      
      // Update local state
      setJob(prev => prev ? { ...prev, status: 'completed' } : null);
      setShowCompleteModal(false);
      
    } catch (err) {
      console.error('Error completing job:', err);
      setError('Failed to complete job. Please try again.');
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleCancelJob = async () => {
    if (!supabase || !job) return;
    
    setIsCancellingJob(true);
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      if (error) throw error;
      
      // Update local state
      setJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      setShowCancelModal(false);
      
    } catch (err) {
      console.error('Error cancelling job:', err);
      setError('Failed to cancel job. Please try again.');
    } finally {
      setIsCancellingJob(false);
    }
  };

  const handleUpdateTechnicians = async (appointment: { technicianIds: string[] }) => {
    if (!supabase || !job) return;
    
    try {
      // First, delete existing technician assignments
      const { error: deleteError } = await supabase
        .from('job_technicians')
        .delete()
        .eq('job_id', job.id);
        
      if (deleteError) throw deleteError;
      
      // Then, add new technician assignments
      if (appointment.technicianIds.length > 0) {
        const technicianEntries = appointment.technicianIds.map((techId, index) => ({
          job_id: job.id,
          technician_id: techId,
          is_primary: index === 0 // First technician is primary
        }));
        
        const { error: insertError } = await supabase
          .from('job_technicians')
          .insert(technicianEntries);
          
        if (insertError) throw insertError;
      }
      
      // Fetch updated technician data
      const { data: techData, error: techError } = await supabase
        .from('job_technicians')
        .select(`
          *,
          users:technician_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            role
          )
        `)
        .eq('job_id', job.id)
        .order('is_primary', { ascending: false });
        
      if (techError) throw techError;
      
      setTechnicians(techData || []);
      setShowAppointmentModal(false);
    } catch (err) {
      console.error('Error updating technicians:', err);
      setError('Failed to update technicians');
    }
  };

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

  const filteredItems = items.filter(item => {
    if (!itemsFilter) return true;
    return (
      item.code.toLowerCase().includes(itemsFilter.toLowerCase()) ||
      item.name.toLowerCase().includes(itemsFilter.toLowerCase()) ||
      item.service_line.toLowerCase().includes(itemsFilter.toLowerCase())
    );
  });

  // Group items by service line if groupByService is true
  const groupedItems = groupByService 
    ? filteredItems.reduce((groups, item) => {
        const key = item.service_line;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      }, {} as Record<string, JobItem[]>)
    : { 'All Items': filteredItems };

  // Calculate total cost
  const totalCost = filteredItems.reduce((sum, item) => sum + Number(item.total_cost), 0);

  const handleDeleteItem = async (itemId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('job_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      refreshItems();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || 'Job not found'}</p>
        <Link to="/jobs" className="text-primary-600 hover:text-primary-800">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`badge ${getTypeBadgeClass(job.type)}`}>
                {job.type}
              </span>
              {job.is_training && (
                <span className="badge badge-purple">training</span>
              )}
              {job.units && (
                <span className="badge bg-green-100 text-green-800">
                  Unit: {job.units.unit_number}
                </span>
              )}
              <span className={`badge ${getStatusBadgeClass(job.status)}`}>
                {job.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-1">Job {job.number}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn btn-secondary">
            <Tag className="h-4 w-4 mr-2" />
            Edit Tags
          </button>
          <button className="btn btn-primary">
            <Send className="h-4 w-4 mr-2" />
            Send Service Link
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Job Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Job Contact</label>
                <p>{job.contact_name || 'Not specified'}</p>
                {job.contact_phone && (
                  <p className="text-sm text-gray-500">{job.contact_phone}</p>
                )}
                {job.contact_email && (
                  <p className="text-sm text-gray-500">{job.contact_email}</p>
                )}
              </div>

              {job.locations?.companies && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company</label>
                  <p>{job.locations.companies.name}</p>
                  <p className="text-sm text-gray-500">{job.locations.companies.phone}</p>
                </div>
              )}

              {job.service_contract && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Contract</label>
                  <p className="text-primary-600 hover:text-primary-800 cursor-pointer">
                    {job.service_contract}
                  </p>
                </div>
              )}

              {job.office && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Office</label>
                  <p>{job.office}</p>
                </div>
              )}
            </div>
          </div>

          {/* Unit Information */}
          {job.units && (
            <div className="card bg-gray-50 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 rounded-md">
                  <Building2 className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Unit Information</h2>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">Unit Number:</span>
                      <Link 
                        to={`/units/${job.units.id}`}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        {job.units.unit_number}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">Status:</span>
                      <span className={`badge ${job.units.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                        {job.units.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Link 
                        to={`/units/${job.units.id}`}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        View Unit Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          {job.locations && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Location</h2>
              <div className="flex items-start gap-2 mb-4">
                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium">{job.locations.name}</p>
                  <p>{job.locations.address}</p>
                  <p>{job.locations.city}, {job.locations.state} {job.locations.zip}</p>
                </div>
              </div>
              <Map 
                address={job.locations.address}
                city={job.locations.city}
                state={job.locations.state}
                zip={job.locations.zip}
                className="h-[300px] rounded-lg"
              />
            </div>
          )}

          {/* Description */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Job Description</h2>
            {job.description ? (
              <p className="text-gray-700">{job.description}</p>
            ) : (
              <div className="flex justify-center items-center py-4 bg-gray-50 rounded-md">
                <button className="text-primary-600 hover:text-primary-800 flex items-center gap-1">
                  <Plus size={16} />
                  Add Description
                </button>
              </div>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`${
                  activeTab === 'details'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`${
                  activeTab === 'items'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Parts | Labor | Items
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'details' && (
              <>
                {/* Clock Events */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                      Clock Events
                    </h2>
                    <span className="badge">{clockEvents.length} Events</span>
                  </div>
                  {clockEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Event</th>
                            <th>User</th>
                            <th>Time</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clockEvents.map((event) => (
                            <tr key={event.id}>
                              <td>{event.event_type}</td>
                              <td>{event.user_id}</td>
                              <td>{formatDateTime(event.event_time)}</td>
                              <td>{event.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No clock events found</p>
                  )}
                </div>

                {/* Assets */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      Assets
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="badge">{assets.length} Assets</span>
                      <button className="btn btn-primary btn-sm">
                        <Plus size={14} className="mr-1" />
                        Add Asset
                      </button>
                    </div>
                  </div>
                  {assets.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assets.map((asset) => (
                            <tr key={asset.id}>
                              <td>{asset.name}</td>
                              <td>{asset.type}</td>
                              <td>{asset.status}</td>
                              <td>
                                <button className="text-primary-600 hover:text-primary-800">
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No assets found</p>
                  )}
                </div>

                {/* Deficiencies */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-gray-400" />
                      Deficiencies
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="badge">{deficiencies.length} Deficiencies</span>
                      <button className="btn btn-primary btn-sm">
                        <Plus size={14} className="mr-1" />
                        Add Deficiency
                      </button>
                    </div>
                  </div>
                  {deficiencies.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deficiencies.map((deficiency) => (
                            <tr key={deficiency.id}>
                              <td>{deficiency.title}</td>
                              <td>
                                <span className={`badge ${
                                  deficiency.priority === 'high' ? 'badge-error' :
                                  deficiency.priority === 'medium' ? 'badge-warning' :
                                  'badge-info'
                                }`}>
                                  {deficiency.priority}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  deficiency.status === 'open' ? 'badge-error' :
                                  deficiency.status === 'in_progress' ? 'badge-warning' :
                                  deficiency.status === 'resolved' ? 'badge-success' :
                                  'badge-info'
                                }`}>
                                  {deficiency.status}
                                </span>
                              </td>
                              <td>
                                <button className="text-primary-600 hover:text-primary-800">
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No deficiencies found</p>
                  )}
                </div>

                {/* Invoices */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FileInvoice className="h-5 w-5 text-gray-400" />
                      Invoices
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="badge">{invoices.length} Invoices</span>
                      <span className="badge badge-success">
                        ${invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0).toFixed(2)}
                      </span>
                      <button className="btn btn-primary btn-sm">
                        <Plus size={14} className="mr-1" />
                        Create Invoice
                      </button>
                    </div>
                  </div>
                  {invoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Issued Date</th>
                            <th>Due Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((invoice) => (
                            <tr key={invoice.id}>
                              <td>{invoice.invoice_number}</td>
                              <td>${Number(invoice.amount).toFixed(2)}</td>
                              <td>
                                <span className={`badge ${
                                  invoice.status === 'paid' ? 'badge-success' :
                                  invoice.status === 'issued' ? 'badge-warning' :
                                  invoice.status === 'void' ? 'badge-error' :
                                  'badge-info'
                                }`}>
                                  {invoice.status}
                                </span>
                              </td>
                              <td>{invoice.issued_date}</td>
                              <td>{invoice.due_date}</td>
                              <td>
                                <button className="text-primary-600 hover:text-primary-800">
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No invoices found</p>
                  )}
                </div>

                {/* Comments */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                      Comments
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="badge">{comments.length} Comments</span>
                      <button className="btn btn-primary btn-sm">
                        <Plus size={14} className="mr-1" />
                        Add Comment
                      </button>
                    </div>
                  </div>
                  {comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between">
                            <div className="font-medium">{comment.user_id}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </div>
                          </div>
                          <p className="mt-2">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No comments found</p>
                  )}
                </div>

                {/* Attachments */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Paperclip className="h-5 w-5 text-gray-400" />
                      Attachments
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="badge">{attachments.length} Attachments</span>
                      <button className="btn btn-primary btn-sm">
                        <Plus size={14} className="mr-1" />
                        Add Attachment
                      </button>
                    </div>
                  </div>
                  {attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center p-3 border rounded-lg">
                          <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(attachment.file_size / 1024).toFixed(2)} KB • {attachment.file_type}
                            </p>
                          </div>
                          <a 
                            href={attachment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No attachments found</p>
                  )}
                </div>
              </>
            )}

            {activeTab === 'items' && (
              <div className="card">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Parts | Labor | Items</h2>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-blue-100 text-blue-800">{filteredItems.length} Items</span>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddItemModal(true)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Add Pricing
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filter items..."
                        value={itemsFilter}
                        onChange={(e) => setItemsFilter(e.target.value)}
                        className="pl-9 input w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Group by service</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={groupByService}
                          onChange={() => setGroupByService(!groupByService)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {filteredItems.length > 0 ? (
                  <div className="mt-4">
                    {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                      <div key={groupName} className="mb-4">
                        {groupByService && groupName !== 'All Items' && (
                          <div className="bg-gray-50 p-2 font-medium text-gray-700 rounded-t-lg border border-gray-200">
                            {groupName}
                          </div>
                        )}
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full">
                            <thead className="bg-gray-50 text-left">
                              <tr>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500">CODE</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500">ITEM</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500">SERVICE LINE</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500">QUANTITY</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500">UNIT COST</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500">TOTAL</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-500">ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupItems.map((item, index) => (
                                <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                  <td className="px-4 py-3 text-sm">{item.code}</td>
                                  <td className="px-4 py-3 text-sm">{item.name}</td>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="flex items-center">
                                      <Package className="h-4 w-4 mr-2 text-gray-500" />
                                      {item.service_line}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">{item.quantity}</td>
                                  <td className="px-4 py-3 text-sm">${Number(item.unit_cost).toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm">${Number(item.total_cost).toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm">
                                    <button 
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-end mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">TOTAL COST</span>
                        <span className="text-lg font-semibold">${totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No items found</p>
                    <button 
                      className="mt-4 btn btn-primary"
                      onClick={() => setShowAddItemModal(true)}
                    >
                      <Plus size={16} className="mr-2" />
                      Add Pricing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Job Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Job Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`badge ${getStatusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Time Period</label>
                <p>Start: {job.time_period_start}</p>
                <p>Due: {job.time_period_due}</p>
              </div>
              {job.schedule_start && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Schedule</label>
                  <p>{formatDateTime(job.schedule_start)}</p>
                  {job.schedule_duration && (
                    <p className="text-sm text-gray-500">Duration: {job.schedule_duration}</p>
                  )}
                </div>
              )}
              
              {/* Total Cost from Items */}
              <div>
                <label className="block text-sm font-medium text-gray-500">Total Cost</label>
                <p className="text-xl font-semibold">${totalCost.toFixed(2)}</p>
                <p className="text-xs text-gray-500">From {items.length} items</p>
              </div>
            </div>
          </div>

          {/* Assigned Technicians */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Assigned Technicians</h2>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} className="mr-1" />
                Assign
              </button>
            </div>
            
            {technicians.length > 0 ? (
              <div className="space-y-4">
                {technicians.map(tech => (
                  <div key={tech.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {tech.users.first_name?.[0] || '?'}{tech.users.last_name?.[0] || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {tech.users.first_name} {tech.users.last_name}
                        {tech.is_primary && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {tech.users.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={12} />
                            {tech.users.phone}
                          </div>
                        )}
                        {tech.users.email && (
                          <div className="flex items-center gap-1">
                            <Mail size={12} />
                            {tech.users.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No technicians assigned
              </div>
            )}
          </div>

          {/* Unit Information Card */}
          {job.units && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Unit Details</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Unit Number</span>
                  <span className="font-medium">{job.units.unit_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`badge ${job.units.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                    {job.units.status}
                  </span>
                </div>
                <div className="pt-2">
                  <Link 
                    to={`/units/${job.units.id}`}
                    className="btn btn-secondary w-full justify-center"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    View Unit Details
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Act on this Job</h2>
            <div className="space-y-3">
              {job.status !== 'completed' && job.status !== 'cancelled' && (
                <button 
                  className="btn btn-primary w-full justify-start"
                  onClick={() => setShowCompleteModal(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Job
                </button>
              )}
              <button className="btn btn-secondary w-full justify-start">
                <Send className="h-4 w-4 mr-2" />
                Send Service Link
              </button>
              <button className="btn btn-success w-full justify-start">
                <FileInvoice className="h-4 w-4 mr-2" />
                Invoice Job
              </button>
              {job.status !== 'completed' && job.status !== 'cancelled' && (
                <button 
                  className="btn btn-error w-full justify-start"
                  onClick={() => setShowCancelModal(true)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancel Job
                </button>
              )}
              <button className="btn btn-secondary w-full justify-start">
                <Copy className="h-4 w-4 mr-2" />
                Copy Job
              </button>
              <button className="btn btn-secondary w-full justify-start">
                <Tool className="h-4 w-4 mr-2" />
                Edit Job
              </button>
            </div>
          </div>

          {/* Job Information */}
          {(job.service_line || job.description || job.problem_description) && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Service Information</h2>
              <div className="space-y-4">
                {job.service_line && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Service Line</label>
                    <p>{job.service_line}</p>
                  </div>
                )}
                {job.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p>{job.description}</p>
                  </div>
                )}
                {job.problem_description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Problem Description</label>
                    <p>{job.problem_description}</p>
                  </div>
                )}
                {job.customer_po && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Customer PO</label>
                    <p>{job.customer_po}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <AddJobItemModal 
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        jobId={id || ''}
        onItemAdded={refreshItems}
      />

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSave={handleUpdateTechnicians}
        selectedTechnicianIds={technicians.map(tech => tech.technician_id)}
      />

      {/* Complete Job Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Complete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to mark this job as completed? This will update the job status and notify relevant parties.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCompleteModal(false)}
                disabled={isCompletingJob}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={handleCompleteJob}
                disabled={isCompletingJob}
              >
                {isCompletingJob ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Completing...
                  </>
                ) : (
                  'Complete Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Job Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Cancel Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to cancel this job? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancellingJob}
              >
                Go Back
              </button>
              <button 
                className="btn btn-error"
                onClick={handleCancelJob}
                disabled={isCancellingJob}
              >
                {isCancellingJob ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Cancelling...
                  </>
                ) : (
                  'Cancel Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;