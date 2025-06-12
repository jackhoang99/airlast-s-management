import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  CheckSquare, 
  AlertTriangle, 
  Navigation, 
  FileText, 
  Clipboard, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  FileInput as FileInvoice,
  Plus,
  DollarSign,
  Send,
  Printer,
  Eye
} from 'lucide-react';
import TechnicianNavigation from '../components/navigation/TechnicianNavigation';

const TechnicianJobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockEvents, setClockEvents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [showCompleteJobModal, setShowCompleteJobModal] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'standard' | 'inspection' | 'repair' | 'replacement'>('standard');
  const [repairData, setRepairData] = useState<any>(null);
  const [repairDataByInspection, setRepairDataByInspection] = useState<{[key: string]: any}>({});
  const [showInvoicePDF, setShowInvoicePDF] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customerEmail, setCustomerEmail] = useState('');

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
              building_name,
              company_id,
              companies (
                name
              )
            ),
            units (
              unit_number,
              status,
              primary_contact_type,
              primary_contact_email,
              primary_contact_phone
            ),
            job_technicians (
              id,
              technician_id,
              is_primary,
              users:technician_id (
                first_name,
                last_name,
                email,
                phone
              )
            )
          `)
          .eq('id', id)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);
        
        if (jobData.contact_email) {
          setCustomerEmail(jobData.contact_email);
        }

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // Fetch clock events
        const { data: clockData, error: clockError } = await supabase
          .from('job_clock_events')
          .select('*')
          .eq('job_id', id)
          .order('event_time');

        if (clockError) throw clockError;
        setClockEvents(clockData || []);

        // Check if technician is currently clocked in
        const { data: { user } } = await supabase.auth.getUser();
        if (user && clockData) {
          const userEvents = clockData.filter(event => event.user_id === user.id);
          if (userEvents.length > 0) {
            const lastEvent = userEvents[userEvents.length - 1];
            setIsClockedIn(lastEvent.event_type === 'clock_in' || lastEvent.event_type === 'break_end');
          }
        }

        // Fetch repair data
        const { data: repairData, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', id);

        if (repairError && !repairError.message.includes("contains 0 rows")) {
          throw repairError;
        }
        
        if (repairData && repairData.length > 0) {
          // Organize by inspection_id
          const repairDataMap: {[key: string]: any} = {};
          
          repairData.forEach(item => {
            if (item.inspection_id) {
              repairDataMap[item.inspection_id] = {
                needsCrane: item.needs_crane,
                phase1: item.phase1,
                phase2: item.phase2,
                phase3: item.phase3,
                labor: item.labor,
                refrigerationRecovery: item.refrigeration_recovery,
                startUpCosts: item.start_up_costs,
                accessories: item.accessories,
                thermostatStartup: item.thermostat_startup,
                removalCost: item.removal_cost,
                warranty: item.warranty,
                additionalItems: item.additional_items,
                permitCost: item.permit_cost,
                selectedPhase: item.selected_phase,
                totalCost: item.total_cost
              };
            } else {
              // For backward compatibility with old data that doesn't have inspection_id
              setRepairData(item);
            }
          });
          
          setRepairDataByInspection(repairDataMap);
        }

        // Fetch invoices
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('job_invoices')
          .select('*')
          .eq('job_id', id)
          .order('created_at', { ascending: false });
          
        if (invoiceError) throw invoiceError;
        setInvoices(invoiceData || []);
        
        // Set the most recent invoice as selected
        if (invoiceData && invoiceData.length > 0) {
          setSelectedInvoice(invoiceData[0]);
        }

      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [supabase, id]);

  const handleClockIn = async () => {
    if (!supabase || !job) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('job_clock_events')
        .insert({
          job_id: job.id,
          user_id: user.id,
          event_type: 'clock_in',
          event_time: new Date().toISOString(),
          notes: notes
        });

      if (error) throw error;
      setIsClockedIn(true);
      setShowClockInModal(false);
      setNotes('');

      // Refresh clock events
      const { data, error: fetchError } = await supabase
        .from('job_clock_events')
        .select('*')
        .eq('job_id', job.id)
        .order('event_time');

      if (fetchError) throw fetchError;
      setClockEvents(data || []);
    } catch (err) {
      console.error('Error clocking in:', err);
      setError('Failed to clock in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!supabase || !job) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('job_clock_events')
        .insert({
          job_id: job.id,
          user_id: user.id,
          event_type: 'clock_out',
          event_time: new Date().toISOString(),
          notes: notes
        });

      if (error) throw error;
      setIsClockedIn(false);
      setShowClockOutModal(false);
      setNotes('');

      // Refresh clock events
      const { data, error: fetchError } = await supabase
        .from('job_clock_events')
        .select('*')
        .eq('job_id', job.id)
        .order('event_time');

      if (fetchError) throw fetchError;
      setClockEvents(data || []);
    } catch (err) {
      console.error('Error clocking out:', err);
      setError('Failed to clock out');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!supabase || !job) return;

    setIsCompletingJob(true);
    try {
      // Update job status to completed
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      // Clock out if still clocked in
      if (isClockedIn) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('job_clock_events')
            .insert({
              job_id: job.id,
              user_id: user.id,
              event_type: 'clock_out',
              event_time: new Date().toISOString(),
              notes: 'Auto clock-out on job completion'
            });
          setIsClockedIn(false);
        }
      }

      // Update local state
      setJob(prev => ({ ...prev, status: 'completed' }));
      setShowCompleteJobModal(false);
    } catch (err) {
      console.error('Error completing job:', err);
      setError('Failed to complete job');
    } finally {
      setIsCompletingJob(false);
    }
  };

  // Calculate total cost from job items
  const calculateTotalCost = () => {
    // For standard invoice, include all items
    if (invoiceType === 'standard') {
      // Include all items except inspection fee if it exists separately
      const inspectionItem = jobItems.find(item => item.code === 'INSP-FEE');
      const inspectionFee = inspectionItem ? Number(inspectionItem.total_cost) : 0;
      
      // Calculate total of all other items
      const otherItemsTotal = jobItems
        .filter(item => item.code !== 'INSP-FEE')
        .reduce((total, item) => total + Number(item.total_cost), 0);
      
      // If there are no items but we have repair data, use that total
      if (otherItemsTotal === 0 && Object.values(repairDataByInspection).length > 0) {
        // Sum up all repair costs from all inspections
        const repairTotal = Object.values(repairDataByInspection).reduce(
          (sum, data: any) => sum + (data.totalCost || 0), 
          0
        );
        return repairTotal;
      }
      
      return otherItemsTotal;
    }
    
    // For replacement invoice, include only part items
    if (invoiceType === 'replacement') {
      const partItemsTotal = jobItems
        .filter(item => item.type === 'part')
        .reduce((total, item) => total + Number(item.total_cost), 0);
        
      // If there are no part items but we have replacement data, use that total
      if (partItemsTotal === 0 && Object.values(repairDataByInspection).length > 0) {
        // Sum up all replacement costs from all inspections
        const replacementTotal = Object.values(repairDataByInspection).reduce(
          (sum, data: any) => sum + (data.totalCost || 0), 
          0
        );
        return replacementTotal;
      }
        
      // If there are no part items, return 0
      return partItemsTotal;
    }
    
    // For repair invoice, include only labor and other items (not parts or inspection)
    if (invoiceType === 'repair') {
      // Only include labor and other items (not parts or inspection)
      const invoiceAmount = jobItems
        .filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE')
        .reduce((total, item) => total + Number(item.total_cost), 0);
        
      // If we have repair data and no labor/service items, use the repair total
      if (invoiceAmount === 0 && Object.values(repairDataByInspection).length > 0) {
        // Sum up all repair costs from all inspections
        const repairTotal = Object.values(repairDataByInspection).reduce(
          (sum, data: any) => sum + (data.totalCost || 0), 
          0
        );
        return repairTotal;
      }
      
      return invoiceAmount;
    }
    
    // For inspection invoice, only include the inspection fee
    if (invoiceType === 'inspection') {
      const inspectionItem = jobItems.find(item => item.code === 'INSP-FEE');
      return inspectionItem ? Number(inspectionItem.total_cost) : 180.00;
    }
    
    // Default fallback
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  const handleCreateInvoice = async () => {
    if (!supabase || !job) {
      setError('Cannot create invoice at this time');
      return;
    }
    
    setIsCreatingInvoice(true);
    setError(null);
    
    try {
      // Generate invoice number (JOB-INV-XXXX)
      const invoiceNumber = `JOB-${job.number}-INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      let invoiceAmount = 0;
      
      // Determine invoice amount based on type
      if (invoiceType === 'inspection') {
        invoiceAmount = 180.00; // Fixed inspection fee
        
        // Add inspection item to job_items if it doesn't exist
        const { data: existingItems, error: checkError } = await supabase
          .from('job_items')
          .select('id')
          .eq('job_id', job.id)
          .eq('code', 'INSP-FEE')
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (!existingItems) {
          const { error: itemError } = await supabase
            .from('job_items')
            .insert({
              job_id: job.id,
              code: 'INSP-FEE',
              name: 'Inspection Fee',
              service_line: 'INSP',
              quantity: 1,
              unit_cost: 180.00,
              total_cost: 180.00,
              type: 'item'
            });
            
          if (itemError) throw itemError;
        }
      } else {
        // Calculate the invoice amount based on the selected type
        invoiceAmount = calculateTotalCost();
      }
      
      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('job_invoices')
        .insert({
          job_id: job.id,
          invoice_number: invoiceNumber,
          amount: invoiceAmount,
          status: 'draft',
          issued_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0]
        })
        .select()
        .single();
        
      if (invoiceError) throw invoiceError;
      
      // Update invoices list
      setInvoices(prev => [invoiceData, ...prev]);
      setSelectedInvoice(invoiceData);
      
      setShowCreateInvoiceModal(false);
      
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
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
    if (!dateString) return '';
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

  const getInvoiceStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'issued':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'void':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Job</h3>
        <p className="text-gray-500 mb-4">{error || 'Job not found'}</p>
        <Link to="/tech/jobs" className="btn btn-primary">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Job Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/tech/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Job #{job.number}</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge ${getStatusBadgeClass(job.status)}`}>
            {job.status}
          </span>
          <span className="badge bg-blue-100 text-blue-800">
            {job.type}
          </span>
          {job.service_line && (
            <span className="badge bg-purple-100 text-purple-800">
              {job.service_line}
            </span>
          )}
        </div>

        <h2 className="text-lg font-medium">{job.name}</h2>
        {job.description && (
          <p className="text-gray-600 mt-2">{job.description}</p>
        )}
        {job.problem_description && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500">Problem Description</h3>
            <p className="text-gray-700">{job.problem_description}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowNavigationModal(true)}
            className="btn btn-primary"
          >
            <Navigation size={16} className="mr-2" />
            Navigate
          </button>
          {!isClockedIn ? (
            <button
              onClick={() => setShowClockInModal(true)}
              className="btn btn-success"
            >
              <Clock size={16} className="mr-2" />
              Clock In
            </button>
          ) : (
            <button
              onClick={() => setShowClockOutModal(true)}
              className="btn btn-warning"
            >
              <Clock size={16} className="mr-2" />
              Clock Out
            </button>
          )}
          {job.status !== 'completed' && (
            <button
              onClick={() => setShowCompleteJobModal(true)}
              className="btn btn-secondary"
            >
              <CheckSquare size={16} className="mr-2" />
              Complete Job
            </button>
          )}
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="btn btn-secondary"
          >
            <FileInvoice size={16} className="mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Location and Contact */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-4">Location & Contact</h2>
        
        <div className="space-y-4">
          {job.locations && (
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">{job.locations.name}</p>
                <p>{job.locations.address}</p>
                <p>{job.locations.city}, {job.locations.state} {job.locations.zip}</p>
                {job.units && <p>Unit: {job.units.unit_number}</p>}
              </div>
            </div>
          )}

          {job.contact_name && (
            <div className="flex items-start gap-2">
              <div>
                <p className="font-medium">{job.contact_name}</p>
                {job.contact_type && (
                  <p className="text-sm text-gray-500 capitalize">{job.contact_type} Contact</p>
                )}
                {job.contact_phone && (
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 text-gray-400 mr-1" />
                    <a href={`tel:${job.contact_phone}`} className="text-primary-600">
                      {job.contact_phone}
                    </a>
                  </div>
                )}
                {job.contact_email && (
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 text-gray-400 mr-1" />
                    <a href={`mailto:${job.contact_email}`} className="text-primary-600">
                      {job.contact_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-4">Schedule</h2>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Start Date:</span>
            <span>{formatDate(job.time_period_start)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Due Date:</span>
            <span>{formatDate(job.time_period_due)}</span>
          </div>
          {job.schedule_start && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Scheduled:</span>
              <span>{formatDateTime(job.schedule_start)}</span>
            </div>
          )}
          {job.schedule_duration && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Duration:</span>
              <span>{job.schedule_duration}</span>
            </div>
          )}
        </div>
      </div>

      {/* Technicians */}
      {job.job_technicians && job.job_technicians.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-4">Technicians</h2>
          
          <div className="space-y-3">
            {job.job_technicians.map((tech: any) => (
              <div key={tech.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {tech.users.first_name?.[0] || '?'}{tech.users.last_name?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <div className="font-medium flex items-center">
                    {tech.users.first_name} {tech.users.last_name}
                    {tech.is_primary && (
                      <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1 mt-1">
                    <div className="flex items-center gap-1">
                      <Phone size={14} />
                      <a href={`tel:${tech.users.phone}`} className="text-primary-600">
                        {tech.users.phone || 'No phone'}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail size={14} />
                      <a href={`mailto:${tech.users.email}`} className="text-primary-600">
                        {tech.users.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clock Events */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-4">Time Tracking</h2>
        
        {clockEvents.length > 0 ? (
          <div className="space-y-2">
            {clockEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b border-gray-100">
                <div>
                  <span className={`inline-block w-24 text-sm font-medium ${
                    event.event_type === 'clock_in' ? 'text-green-600' :
                    event.event_type === 'clock_out' ? 'text-red-600' :
                    event.event_type === 'break_start' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {event.event_type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    {formatDateTime(event.event_time)}
                  </span>
                </div>
                {event.notes && (
                  <span className="text-sm text-gray-500 italic">
                    "{event.notes}"
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No time tracking events recorded</p>
        )}
      </div>

      {/* Job Items */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-4">Service Items</h2>
        
        {jobItems.length > 0 ? (
          <div className="space-y-3">
            {jobItems.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.code}</div>
                    <div className="text-xs text-gray-400 mt-1 capitalize">{item.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Qty: {item.quantity}</div>
                    <div className="font-medium">${Number(item.total_cost).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-lg">
                  ${jobItems.reduce((sum, item) => sum + Number(item.total_cost), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No service items added</p>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Invoices</h2>
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} className="mr-1" />
            Create Invoice
          </button>
        </div>
        
        {invoices.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">INVOICE #</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">DATE</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">AMOUNT</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">STATUS</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr 
                      key={invoice.id} 
                      className={`border-b cursor-pointer hover:bg-gray-50 ${selectedInvoice?.id === invoice.id ? 'bg-primary-50' : ''}`}
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                      <td className="px-4 py-3">{invoice.issued_date || '-'}</td>
                      <td className="px-4 py-3 font-medium">${Number(invoice.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getInvoiceStatusBadgeClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowInvoicePDF(true);
                          }}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {selectedInvoice && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-md font-medium mb-3">Invoice Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice Number</p>
                    <p className="font-medium">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium capitalize">{selectedInvoice.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Issue Date</p>
                    <p className="font-medium">{selectedInvoice.issued_date || 'Not issued'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">{selectedInvoice.due_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">${Number(selectedInvoice.amount).toFixed(2)}</p>
                  </div>
                  {selectedInvoice.paid_date && (
                    <div>
                      <p className="text-sm text-gray-500">Paid Date</p>
                      <p className="font-medium">{selectedInvoice.paid_date}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600 text-center">
              {jobItems.length === 0 && Object.keys(repairDataByInspection).length === 0
                ? "Add items to the job before creating an invoice." 
                : "No invoices created yet. Click 'Create Invoice' to generate an invoice."}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Modal */}
      <TechnicianNavigation
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        location={job.locations}
        job={job}
      />

      {/* Clock In Modal */}
      {showClockInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Clock In</h3>
            <p className="text-gray-600 mb-4">
              You are about to clock in for Job #{job.number}: {job.name}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Add any notes about this clock-in event"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClockInModal(false)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleClockIn}
                className="btn btn-success"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <Clock size={16} className="mr-2" />
                    Clock In
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clock Out Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Clock Out</h3>
            <p className="text-gray-600 mb-4">
              You are about to clock out from Job #{job.number}: {job.name}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Add any notes about this clock-out event"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClockOutModal(false)}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleClockOut}
                className="btn btn-warning"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <Clock size={16} className="mr-2" />
                    Clock Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Job Modal */}
      {showCompleteJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Complete Job</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to mark this job as completed? This action will:
            </p>
            <ul className="list-disc pl-5 mb-4 text-gray-600">
              <li>Change the job status to "completed"</li>
              <li>Clock you out if you're currently clocked in</li>
              <li>Make the job appear in your completed jobs list</li>
            </ul>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCompleteJobModal(false)}
                className="btn btn-secondary"
                disabled={isCompletingJob}
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteJob}
                className="btn btn-success"
                disabled={isCompletingJob}
              >
                {isCompletingJob ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} className="mr-2" />
                    Complete Job
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <FileInvoice size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Create New Invoice
            </h3>
            
            {error && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Select the type of invoice you want to create:
              </p>
              
              <div className="space-y-3">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'standard' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('standard')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Standard Invoice</h4>
                      <p className="text-sm text-gray-500">Create an invoice with all replacement parts and repair costs</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'standard' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> ${calculateTotalCost().toFixed(2)}
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'replacement' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('replacement')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Replacement Invoice</h4>
                      <p className="text-sm text-gray-500">Create an invoice for replacement parts only</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'replacement' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> ${(() => {
                      // Only include part items for replacement invoice
                      const partItemsTotal = jobItems
                        .filter(item => item.type === 'part')
                        .reduce((total, item) => total + Number(item.total_cost), 0);
                        
                      // If there are no part items but we have replacement data, use that total
                      if (partItemsTotal === 0 && Object.keys(repairDataByInspection).length > 0) {
                        // Sum up all replacement costs from all inspections
                        const replacementTotal = Object.values(repairDataByInspection).reduce(
                          (sum, data: any) => sum + (data.totalCost || 0), 
                          0
                        );
                        return replacementTotal.toFixed(2);
                      }
                        
                      return partItemsTotal.toFixed(2);
                    })()}
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'repair' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('repair')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Repair Invoice</h4>
                      <p className="text-sm text-gray-500">Create an invoice for labor and service costs only</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'repair' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> ${(() => {
                      // Only include labor and other items (not parts or inspection)
                      const laborItemsTotal = jobItems
                        .filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE')
                        .reduce((total, item) => total + Number(item.total_cost), 0);
                        
                      // If we have repair data and no labor/service items, use the repair total
                      if (laborItemsTotal === 0 && Object.keys(repairDataByInspection).length > 0) {
                        // Sum up all repair costs from all inspections
                        const repairTotal = Object.values(repairDataByInspection).reduce(
                          (sum, data: any) => sum + (data.totalCost || 0), 
                          0
                        );
                        return repairTotal.toFixed(2);
                      }
                      
                      return laborItemsTotal.toFixed(2);
                    })()}
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'inspection' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('inspection')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Inspection Invoice</h4>
                      <p className="text-sm text-gray-500">Fixed fee for inspection service</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'inspection' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> $180.00
                  </div>
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{job.contact_name || 'Not specified'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{job.contact_email || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateInvoiceModal(false)}
                disabled={isCreatingInvoice}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateInvoice}
                disabled={isCreatingInvoice || 
                  (invoiceType === 'standard' && jobItems.length === 0 && Object.keys(repairDataByInspection).length === 0) ||
                  (invoiceType === 'replacement' && jobItems.filter(item => item.type === 'part').length === 0 && Object.keys(repairDataByInspection).length === 0) ||
                  (invoiceType === 'repair' && jobItems.filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE').length === 0 && Object.keys(repairDataByInspection).length === 0)}
              >
                {isCreatingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <DollarSign size={16} className="mr-2" />
                    Create Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice PDF Viewer */}
      {showInvoicePDF && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
          <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
            <button 
              onClick={() => setShowInvoicePDF(false)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Job Details
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="btn btn-secondary"
              >
                <Printer size={16} className="mr-2" />
                Print Invoice
              </button>
            </div>
          </div>
          <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
              <div>
                <h1 className="text-2xl font-bold text-blue-700">INVOICE</h1>
                <h2 className="text-xl font-bold">Airlast HVAC</h2>
                <p>1650 Marietta Boulevard Northwest</p>
                <p>Atlanta, GA 30318</p>
                <p>(404) 632-9074</p>
                <p>www.airlast.com</p>
              </div>
              <div className="text-right">
                <img src="/airlast-logo.svg" alt="Airlast Logo" className="h-16 mb-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-gray-500 font-medium mb-2">Bill to</h3>
                <p className="font-medium">{job.locations?.companies?.name}</p>
                <p>{job.locations?.name}</p>
                <p>{job.locations?.address}</p>
                <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
                {job.contact_name && <p>Attn: {job.contact_name}</p>}
              </div>

              <div>
                <h3 className="text-gray-500 font-medium mb-2">Invoice details</h3>
                <div className="grid grid-cols-2 gap-1">
                  <p className="text-gray-600">Invoice no:</p>
                  <p className="font-medium">{selectedInvoice.invoice_number}</p>
                  
                  <p className="text-gray-600">Terms:</p>
                  <p className="font-medium">Net 30</p>
                  
                  <p className="text-gray-600">Invoice date:</p>
                  <p className="font-medium">{selectedInvoice.issued_date || new Date().toLocaleDateString()}</p>
                  
                  <p className="text-gray-600">Due date:</p>
                  <p className="font-medium">{selectedInvoice.due_date || '-'}</p>
                  
                  <p className="text-gray-600">Job #:</p>
                  <p className="font-medium">{job.number}</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-gray-500 font-medium mb-2">Service Location</h3>
              <p>{job.locations?.name}</p>
              <p>{job.locations?.address}</p>
              <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
              {job.units && <p>Unit: {job.units.unit_number}</p>}
            </div>

            <table className="w-full mb-8">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="py-2 px-4 border-b">#</th>
                  <th className="py-2 px-4 border-b">Date</th>
                  <th className="py-2 px-4 border-b">Description</th>
                  <th className="py-2 px-4 border-b text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 px-4 border-b">1.</td>
                  <td className="py-4 px-4 border-b">{selectedInvoice.issued_date || new Date().toLocaleDateString()}</td>
                  <td className="py-4 px-4 border-b">
                    {job.name}
                    {job.units && <span> - Unit {job.units.unit_number}</span>}
                    
                    <div className="text-sm text-gray-500 mt-2">
                      <p>Service Items:</p>
                      <ul className="list-disc pl-5 mt-1">
                        {jobItems.map((item, index) => (
                          <li key={index}>
                            {item.name} ({item.quantity} x ${Number(item.unit_cost).toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </td>
                  <td className="py-4 px-4 border-b text-right font-medium">${Number(selectedInvoice.amount).toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="py-4 px-4" colSpan={3} align="right">Total</td>
                  <td className="py-4 px-4 text-right">${Number(selectedInvoice.amount).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="mb-8">
              <h3 className="text-lg font-bold mb-2">Ways to pay</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium mb-1">Bank Transfer</h4>
                  <p>Airlast HVAC</p>
                  <p>Account #: 123456789</p>
                  <p>Routing #: 987654321</p>
                  <p>Bank: First National Bank</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Check</h4>
                  <p>Make checks payable to:</p>
                  <p>Airlast HVAC</p>
                  <p>1650 Marietta Boulevard Northwest</p>
                  <p>Atlanta, GA 30318</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium mb-2">Notes</h3>
              <p className="text-gray-600">Thank you for your business! Please include the invoice number on your payment.</p>
              <p className="text-gray-600">For questions regarding this invoice, please contact our office at (404) 632-9074.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianJobDetails;