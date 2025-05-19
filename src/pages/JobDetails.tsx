import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Building, User, Phone, Mail, Tag, FileText, MessageSquare, Paperclip, Plus, CheckCircle, AlertTriangle, Trash2, Package, PenTool as Tool, ShoppingCart } from 'lucide-react';
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
    };
  };
  units?: {
    unit_number: string;
  };
};

type JobItem = Database['public']['Tables']['job_items']['Row'];
type User = Database['public']['Tables']['users']['Row'];

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'comments' | 'attachments'>('details');

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
                name
              )
            ),
            units (
              unit_number
            )
          `)
          .eq('id', id)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // Fetch assigned technicians from job_technicians table
        const { data: techData, error: techError } = await supabase
          .from('job_technicians')
          .select(`
            technician_id,
            is_primary,
            users:technician_id (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq('job_id', id)
          .order('is_primary', { ascending: false });

        if (techError) throw techError;
        
        // Extract user data from the joined query
        const technicians = techData?.map(t => t.users) || [];
        setAssignedTechnicians(technicians);
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to fetch job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [supabase, id]);

  const handleAddItem = async () => {
    if (!supabase || !id) return;

    try {
      // Refresh job items
      const { data, error } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', id)
        .order('created_at');

      if (error) throw error;
      setJobItems(data || []);
    } catch (err) {
      console.error('Error refreshing job items:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('job_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setJobItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Error deleting job item:', err);
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
      setError('Failed to complete job');
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!supabase || !job) return;
    
    setIsDeletingJob(true);
    
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);
      
      if (error) throw error;
      
      navigate('/jobs');
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job');
    } finally {
      setIsDeletingJob(false);
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
        .from('users')
        .select('*')
        .in('id', appointment.technicianIds);
        
      if (techError) throw techError;
      
      setAssignedTechnicians(techData || []);
      setShowAppointmentModal(false);
    } catch (err) {
      console.error('Error updating technicians:', err);
      setError('Failed to update technicians');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
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

  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1>Job #{job.number}</h1>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(job.status)}`}>
                {job.status}
              </span>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getTypeBadgeClass(job.type)}`}>
                {job.type}
              </span>
            </div>
            <p className="text-lg font-medium">{job.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="btn btn-success"
            >
              <CheckCircle size={16} className="mr-2" />
              Complete Job
            </button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-error"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'details'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'items'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Items
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'comments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'attachments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Attachments
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Job Details */}
                <div>
                  <h2 className="text-lg font-medium mb-4">Job Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Job Type</h3>
                      <p className="mt-1">{job.type}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Service Line</h3>
                      <p className="mt-1">{job.service_line || 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Description</h3>
                      <p className="mt-1">{job.description || 'No description provided'}</p>
                    </div>
                    {job.problem_description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Problem Description</h3>
                        <p className="mt-1">{job.problem_description}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
                      <p className="mt-1">{formatDate(job.time_period_start)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
                      <p className="mt-1">{formatDate(job.time_period_due)}</p>
                    </div>
                    {job.schedule_start && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Scheduled Time</h3>
                        <p className="mt-1">{formatDateTime(job.schedule_start)}</p>
                      </div>
                    )}
                    {job.schedule_duration && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                        <p className="mt-1">{job.schedule_duration}</p>
                      </div>
                    )}
                    {job.customer_po && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Customer PO</h3>
                        <p className="mt-1">{job.customer_po}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Service Contract</h3>
                      <p className="mt-1">{job.service_contract || 'Standard'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Office</h3>
                      <p className="mt-1">{job.office || 'Main Office'}</p>
                    </div>
                    {job.is_training && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Training</h3>
                        <p className="mt-1">Yes</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Information */}
                <div>
                  <h2 className="text-lg font-medium mb-4">Location Information</h2>
                  {job.locations ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <Building className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                          <p className="font-medium">{job.locations.companies.name}</p>
                          <p>{job.locations.name}</p>
                          {job.units && <p>Unit: {job.units.unit_number}</p>}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                          <p>{job.locations.address}</p>
                          <p>{job.locations.city}, {job.locations.state} {job.locations.zip}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No location information available</p>
                  )}
                </div>

                {/* Contact Information */}
                {job.contact_name && (
                  <div>
                    <h2 className="text-lg font-medium mb-4">Contact Information</h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <User className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                          <p className="font-medium">{job.contact_name}</p>
                          <p className="text-sm text-gray-500">{job.contact_type}</p>
                        </div>
                      </div>
                      {job.contact_phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-5 w-5 text-gray-400 mt-1" />
                          <p>{job.contact_phone}</p>
                        </div>
                      )}
                      {job.contact_email && (
                        <div className="flex items-start gap-2">
                          <Mail className="h-5 w-5 text-gray-400 mt-1" />
                          <p>{job.contact_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                {/* Assigned Technicians */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">Assigned Technicians</h2>
                    <button
                      onClick={() => setShowAppointmentModal(true)}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus size={14} className="mr-1" />
                      Assign
                    </button>
                  </div>
                  
                  {assignedTechnicians.length > 0 ? (
                    <div className="space-y-4">
                      {assignedTechnicians.map(tech => (
                        <div key={tech.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {tech.first_name?.[0] || '?'}{tech.last_name?.[0] || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{tech.first_name} {tech.last_name}</div>
                            <div className="text-xs text-gray-500">
                              {tech.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {tech.phone}
                                </div>
                              )}
                              {tech.email && (
                                <div className="flex items-center gap-1">
                                  <Mail size={12} />
                                  {tech.email}
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

                {/* Quick Actions */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAddItemModal(true)}
                      className="btn btn-secondary w-full justify-start"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Item
                    </button>
                    <button
                      onClick={() => setShowAppointmentModal(true)}
                      className="btn btn-secondary w-full justify-start"
                    >
                      <Calendar size={16} className="mr-2" />
                      Schedule Appointment
                    </button>
                    <button className="btn btn-secondary w-full justify-start">
                      <MessageSquare size={16} className="mr-2" />
                      Add Comment
                    </button>
                    <button className="btn btn-secondary w-full justify-start">
                      <Paperclip size={16} className="mr-2" />
                      Add Attachment
                    </button>
                    <button className="btn btn-secondary w-full justify-start">
                      <FileText size={16} className="mr-2" />
                      Generate Invoice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">Job Items</h2>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="btn btn-primary"
                >
                  <Plus size={16} className="mr-2" />
                  Add Item
                </button>
              </div>

              {jobItems.length > 0 ? (
                <div className="space-y-6">
                  {/* Parts */}
                  {jobItems.filter(item => item.type === 'part').length > 0 && (
                    <div>
                      <h3 className="text-md font-medium flex items-center mb-3">
                        <Package size={16} className="mr-2 text-blue-500" />
                        Parts
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {jobItems
                              .filter(item => item.type === 'part')
                              .map(item => (
                                <tr key={item.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(item.unit_cost).toFixed(2)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Number(item.total_cost).toFixed(2)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-error-600 hover:text-error-900"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Labor */}
                  {jobItems.filter(item => item.type === 'labor').length > 0 && (
                    <div>
                      <h3 className="text-md font-medium flex items-center mb-3">
                        <Tool size={16} className="mr-2 text-green-500" />
                        Labor
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {jobItems
                              .filter(item => item.type === 'labor')
                              .map(item => (
                                <tr key={item.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(item.unit_cost).toFixed(2)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Number(item.total_cost).toFixed(2)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-error-600 hover:text-error-900"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Other Items */}
                  {jobItems.filter(item => item.type === 'item').length > 0 && (
                    <div>
                      <h3 className="text-md font-medium flex items-center mb-3">
                        <ShoppingCart size={16} className="mr-2 text-purple-500" />
                        Other Items
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {jobItems
                              .filter(item => item.type === 'item')
                              .map(item => (
                                <tr key={item.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(item.unit_cost).toFixed(2)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Number(item.total_cost).toFixed(2)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-error-600 hover:text-error-900"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Total</h3>
                      <span className="text-xl font-semibold">${calculateTotalCost().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-4">No items added to this job yet</p>
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="btn btn-primary"
                  >
                    <Plus size={16} className="mr-2" />
                    Add First Item
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">Comments</h2>
                <button className="btn btn-primary">
                  <Plus size={16} className="mr-2" />
                  Add Comment
                </button>
              </div>
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No comments yet</p>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">Attachments</h2>
                <button className="btn btn-primary">
                  <Plus size={16} className="mr-2" />
                  Add Attachment
                </button>
              </div>
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No attachments yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      <AddJobItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        jobId={job.id}
        onItemAdded={handleAddItem}
      />

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSave={handleUpdateTechnicians}
        selectedTechnicianIds={assignedTechnicians.map(tech => tech.id)}
      />

      {/* Complete Job Modal */}
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
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
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

      {/* Delete Job Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete this job? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingJob}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteJob}
                disabled={isDeletingJob}
              >
                {isDeletingJob ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Job'
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