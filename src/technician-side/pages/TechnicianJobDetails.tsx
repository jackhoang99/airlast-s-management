import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Navigation, 
  FileText, 
  FileInput as FileInvoice,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Info
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
  const [showCompleteJobModal, setShowCompleteJobModal] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianUsername, setTechnicianUsername] = useState<string | null>(null);
  const [repairData, setRepairData] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showQuoteDetails, setShowQuoteDetails] = useState(false);
  const [quoteData, setQuoteData] = useState<any | null>(null);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);

  // Get technician ID
  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;
      
      try {
        // Get username from session storage
        const username = sessionStorage.getItem('techUsername');
        setTechnicianUsername(username);
        
        if (username) {
          console.log("Looking up technician with username:", username);
          
          // Try to find user by username
          const { data, error } = await supabase
            .from('users')
            .select('id, role')
            .eq('username', username)
            .maybeSingle();
            
          if (error && !error.message.includes("contains 0 rows")) {
            console.error('Error fetching technician by username:', error);
            throw error;
          }
          
          if (data) {
            console.log("Found technician by username:", data);
            setTechnicianId(data.id);
          } else {
            // Try with email format
            const email = `${username}@airlast-demo.com`;
            console.log("Trying with email:", email);
            
            const { data: emailData, error: emailError } = await supabase
              .from('users')
              .select('id, role')
              .eq('email', email)
              .maybeSingle();
              
            if (emailError && !emailError.message.includes("contains 0 rows")) {
              console.error('Error fetching technician by email:', emailError);
              throw emailError;
            }
            
            if (emailData) {
              console.log("Found technician by email:", emailData);
              setTechnicianId(emailData.id);
            } else {
              console.error("Could not find technician with username or email");
              setError('Could not find technician record');
            }
          }
        } else {
          // Fallback to auth user if username not in session
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            console.log("Looking up technician with auth user:", user.email);
            
            // Try to find by email
            const { data, error } = await supabase
              .from('users')
              .select('id, username, role')
              .eq('email', user.email)
              .maybeSingle();
              
            if (error && !error.message.includes("contains 0 rows")) {
              console.error('Error fetching technician by email:', error);
              throw error;
            }
            
            if (data) {
              console.log("Found technician by email:", data);
              setTechnicianId(data.id);
              setTechnicianUsername(data.username);
              sessionStorage.setItem('techUsername', data.username);
            } else {
              // Try with username from email
              const username = user.email.split('@')[0];
              console.log("Trying with username from email:", username);
              
              const { data: usernameData, error: usernameError } = await supabase
                .from('users')
                .select('id, role')
                .eq('username', username)
                .maybeSingle();
                
              if (usernameError && !usernameError.message.includes("contains 0 rows")) {
                console.error('Error fetching technician by username from email:', usernameError);
                throw usernameError;
              }
              
              if (usernameData) {
                console.log("Found technician by username from email:", usernameData);
                setTechnicianId(usernameData.id);
                setTechnicianUsername(username);
                sessionStorage.setItem('techUsername', username);
              } else {
                console.error("Could not find technician with any method");
                setError('Could not find technician record');
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching technician info:', err);
        setError('Failed to load technician information');
      }
    };
    
    fetchTechnicianInfo();
  }, [supabase]);

  // Fetch job details
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!supabase || !id) return;

      try {
        // First validate that we have a valid UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          setError("Invalid job ID format");
          setIsLoading(false);
          return;
        }

        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
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
              primary_contact_phone,
              billing_entity,
              billing_email,
              billing_city,
              billing_state,
              billing_zip,
              office,
              taxable,
              tax_group_name,
              tax_group_code
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
          .eq("id", id)
          .limit(1)
          .maybeSingle();

        if (jobError) throw jobError;

        if (!jobData) {
          setError("Job not found");
          setIsLoading(false);
          return;
        }

        setJob(jobData);

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from("job_items")
          .select("*")
          .eq("job_id", id)
          .order("created_at");

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // Fetch repair data
        const { data: repairData, error: repairError } = await supabase
          .from("job_repairs")
          .select("*")
          .eq("job_id", id)
          .limit(1)
          .maybeSingle();

        if (repairError && !repairError.message.includes("contains 0 rows")) {
          throw repairError;
        }
        
        if (repairData) {
          setRepairData(repairData);
        }

        // Fetch invoices
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("job_invoices")
          .select("*")
          .eq("job_id", id)
          .order("created_at", { ascending: false });

        if (invoiceError) throw invoiceError;
        setInvoices(invoiceData || []);

        // Fetch quotes
        const { data: quoteData, error: quoteError } = await supabase
          .from("job_quotes")
          .select("*")
          .eq("job_id", id)
          .order("created_at", { ascending: false });

        if (quoteError) throw quoteError;
        setQuoteData(quoteData || []);

        // Fetch notes
        const { data: notesData, error: notesError } = await supabase
          .from("job_notes")
          .select("notes")
          .eq("job_id", id)
          .eq("technician_id", technicianId)
          .maybeSingle();

        if (notesError && !notesError.message.includes("contains 0 rows")) {
          throw notesError;
        }
        
        if (notesData) {
          setNotes(notesData.notes || '');
        }

      } catch (err: any) {
        console.error("Error fetching job details:", err);
        setError(err.message || "Failed to fetch job details");
      } finally {
        setIsLoading(false);
      }
    };

    if (technicianId) {
      fetchJobDetails();
    }
  }, [supabase, id, technicianId]);

  const handleCompleteJob = async () => {
    if (!supabase || !job || !technicianId) return;

    setIsCompletingJob(true);
    setError(null);

    try {
      // Update job status to completed
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (updateError) throw updateError;

      // Save notes if any
      if (notes.trim()) {
        const { data: existingNote, error: checkError } = await supabase
          .from("job_notes")
          .select("id")
          .eq("job_id", job.id)
          .eq("technician_id", technicianId)
          .maybeSingle();

        if (checkError && !checkError.message.includes("contains 0 rows")) {
          throw checkError;
        }

        if (existingNote) {
          // Update existing note
          const { error: updateNoteError } = await supabase
            .from("job_notes")
            .update({
              notes: notes,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingNote.id);

          if (updateNoteError) throw updateNoteError;
        } else {
          // Create new note
          const { error: insertNoteError } = await supabase
            .from("job_notes")
            .insert({
              job_id: job.id,
              technician_id: technicianId,
              notes: notes
            });

          if (insertNoteError) throw insertNoteError;
        }
      }

      // Update local state
      setJob((prev: any) => (prev ? { ...prev, status: "completed" } : null));
      setShowCompleteJobModal(false);
      setShowConfirmationMessage(true);

      // Hide confirmation message after 3 seconds
      setTimeout(() => {
        setShowConfirmationMessage(false);
        navigate('/tech/jobs');
      }, 3000);
    } catch (err) {
      console.error("Error completing job:", err);
      setError("Failed to complete job. Please try again.");
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!supabase || !job || !technicianId) return;

    setIsSavingNotes(true);
    setError(null);

    try {
      const { data: existingNote, error: checkError } = await supabase
        .from("job_notes")
        .select("id")
        .eq("job_id", job.id)
        .eq("technician_id", technicianId)
        .maybeSingle();

      if (checkError && !checkError.message.includes("contains 0 rows")) {
        throw checkError;
      }

      if (existingNote) {
        // Update existing note
        const { error: updateNoteError } = await supabase
          .from("job_notes")
          .update({
            notes: notes,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingNote.id);

        if (updateNoteError) throw updateNoteError;
      } else {
        // Create new note
        const { error: insertNoteError } = await supabase
          .from("job_notes")
          .insert({
            job_id: job.id,
            technician_id: technicianId,
            notes: notes
          });

        if (insertNoteError) throw insertNoteError;
      }

      // Show confirmation message
      setShowConfirmationMessage(true);

      // Hide confirmation message after 3 seconds
      setTimeout(() => {
        setShowConfirmationMessage(false);
      }, 3000);
    } catch (err) {
      console.error("Error saving notes:", err);
      setError("Failed to save notes. Please try again.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
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
        <p className="text-error-600 mb-4">{error || "Job not found"}</p>
        <Link to="/tech/jobs" className="text-primary-600 hover:text-primary-800">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <Link to="/tech/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-medium">Job #{job.number}</h1>
          <button
            onClick={() => setShowNavigationModal(true)}
            className="text-primary-600 hover:text-primary-800"
          >
            <Navigation className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showConfirmationMessage && (
        <div className="fixed top-4 left-0 right-0 mx-auto w-5/6 bg-success-100 border border-success-300 text-success-700 px-4 py-3 rounded z-50 flex items-center justify-between">
          <div className="flex items-center">
            <Check className="h-5 w-5 mr-2" />
            <span>{job.status === 'completed' ? 'Job marked as completed!' : 'Notes saved successfully!'}</span>
          </div>
          <button onClick={() => setShowConfirmationMessage(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => {
            setShowJobDetails(true);
            setShowServiceDetails(false);
            setShowQuoteDetails(false);
            setShowInvoiceDetails(false);
            setShowNotes(false);
          }}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            showJobDetails
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Job Details
        </button>
        <button
          onClick={() => {
            setShowJobDetails(false);
            setShowServiceDetails(true);
            setShowQuoteDetails(false);
            setShowInvoiceDetails(false);
            setShowNotes(false);
          }}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            showServiceDetails
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Service
        </button>
        <button
          onClick={() => {
            setShowJobDetails(false);
            setShowServiceDetails(false);
            setShowQuoteDetails(true);
            setShowInvoiceDetails(false);
            setShowNotes(false);
          }}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            showQuoteDetails
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Quotes
        </button>
        <button
          onClick={() => {
            setShowJobDetails(false);
            setShowServiceDetails(false);
            setShowQuoteDetails(false);
            setShowInvoiceDetails(true);
            setShowNotes(false);
          }}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            showInvoiceDetails
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => {
            setShowJobDetails(false);
            setShowServiceDetails(false);
            setShowQuoteDetails(false);
            setShowInvoiceDetails(false);
            setShowNotes(true);
          }}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            showNotes
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Notes
        </button>
      </div>

      {/* Job Details */}
      {showJobDetails && (
        <div className="space-y-4">
          {/* Job Status */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">{job.name}</h2>
              <span className={`text-xs px-2 py-1 rounded-full ${
                job.status === 'completed' ? 'bg-success-100 text-success-800' :
                job.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                job.status === 'unscheduled' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {job.status}
              </span>
            </div>
            <p className="text-gray-600 text-sm">{job.description}</p>
            {job.problem_description && (
              <div className="mt-3">
                <h3 className="text-sm font-medium text-gray-700">Problem Description</h3>
                <p className="text-sm text-gray-600">{job.problem_description}</p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                {job.type}
              </span>
              {job.service_line && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  {job.service_line}
                </span>
              )}
              {job.is_training && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                  Training
                </span>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-md font-medium mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              Schedule
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date:</span>
                <span>{job.time_period_start}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span>{job.time_period_due}</span>
              </div>
              {job.schedule_start && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Scheduled:</span>
                  <span>{formatDateTime(job.schedule_start)}</span>
                </div>
              )}
              {job.schedule_duration && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span>{job.schedule_duration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-md font-medium mb-3 flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              Location
            </h2>
            {job.locations ? (
              <div className="space-y-2">
                <p className="font-medium">{job.locations.name}</p>
                <p>{job.locations.address}</p>
                <p>{job.locations.city}, {job.locations.state} {job.locations.zip}</p>
                {job.units && <p>Unit: {job.units.unit_number}</p>}
                <p className="text-sm text-gray-500 mt-1">{job.locations.companies.name}</p>
                
                <button
                  onClick={() => setShowNavigationModal(true)}
                  className="btn btn-primary w-full mt-3"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate
                </button>
              </div>
            ) : (
              <p className="text-gray-500">No location information available</p>
            )}
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-md font-medium mb-3">Contact</h2>
            {job.contact_name ? (
              <div className="space-y-2">
                <p className="font-medium">{job.contact_name}</p>
                {job.contact_type && (
                  <p className="text-sm text-gray-500">{job.contact_type} Contact</p>
                )}
                {job.contact_phone && (
                  <div className="flex items-center mt-2">
                    <Phone className="h-4 w-4 text-gray-500 mr-2" />
                    <a href={`tel:${job.contact_phone}`} className="text-primary-600">
                      {job.contact_phone}
                    </a>
                  </div>
                )}
                {job.contact_email && (
                  <div className="flex items-center mt-2">
                    <Mail className="h-4 w-4 text-gray-500 mr-2" />
                    <a href={`mailto:${job.contact_email}`} className="text-primary-600">
                      {job.contact_email}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No contact information available</p>
            )}
          </div>

          {/* Complete Job Button */}
          {job.status !== 'completed' && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
              <button
                onClick={() => setShowCompleteJobModal(true)}
                className="btn btn-success w-full"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Complete Job
              </button>
            </div>
          )}
        </div>
      )}

      {/* Service Details */}
      {showServiceDetails && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-md font-medium mb-3">Service Items</h2>
            {jobItems.length > 0 ? (
              <div className="space-y-3">
                {jobItems.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{item.quantity} × ${Number(item.unit_cost).toFixed(2)}</p>
                        <p className="font-medium">${Number(item.total_cost).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-3 bg-gray-100 rounded-lg">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>${jobItems.reduce((sum, item) => sum + Number(item.total_cost), 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No service items found</p>
            )}
          </div>

          {/* Repair Data */}
          {repairData && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-md font-medium">Repair Details</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  {repairData.selected_phase === 'phase1' ? 'Economy' : 
                   repairData.selected_phase === 'phase2' ? 'Standard' : 'Premium'}
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Selected Phase */}
                {repairData[repairData.selected_phase || 'phase2'] && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">
                      {repairData[repairData.selected_phase || 'phase2'].description || 
                       (repairData.selected_phase === 'phase1' ? 'Economy Option' : 
                        repairData.selected_phase === 'phase2' ? 'Standard Option' : 'Premium Option')}
                    </p>
                    <p className="text-right font-medium mt-2">
                      ${Number(repairData[repairData.selected_phase || 'phase2'].cost || 0).toFixed(2)}
                    </p>
                  </div>
                )}
                
                {/* Additional Costs */}
                <div className="space-y-2">
                  {Number(repairData.labor) > 0 && (
                    <div className="flex justify-between">
                      <span>Labor</span>
                      <span>${Number(repairData.labor).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(repairData.refrigeration_recovery) > 0 && (
                    <div className="flex justify-between">
                      <span>Refrigeration Recovery</span>
                      <span>${Number(repairData.refrigeration_recovery).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(repairData.start_up_costs) > 0 && (
                    <div className="flex justify-between">
                      <span>Start Up Costs</span>
                      <span>${Number(repairData.start_up_costs).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(repairData.thermostat_startup) > 0 && (
                    <div className="flex justify-between">
                      <span>Thermostat Startup</span>
                      <span>${Number(repairData.thermostat_startup).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(repairData.removal_cost) > 0 && (
                    <div className="flex justify-between">
                      <span>Removal of Old Equipment</span>
                      <span>${Number(repairData.removal_cost).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(repairData.permit_cost) > 0 && (
                    <div className="flex justify-between">
                      <span>Permit Cost</span>
                      <span>${Number(repairData.permit_cost).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                {/* Accessories */}
                {Array.isArray(repairData.accessories) && repairData.accessories.length > 0 && 
                 repairData.accessories.some((acc: any) => acc.name && Number(acc.cost) > 0) && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Accessories</h3>
                    <div className="space-y-1">
                      {repairData.accessories.map((acc: any, idx: number) => 
                        acc.name && Number(acc.cost) > 0 ? (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{acc.name}</span>
                            <span>${Number(acc.cost).toFixed(2)}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
                
                {/* Additional Items */}
                {Array.isArray(repairData.additional_items) && repairData.additional_items.length > 0 && 
                 repairData.additional_items.some((item: any) => item.name && Number(item.cost) > 0) && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Additional Items</h3>
                    <div className="space-y-1">
                      {repairData.additional_items.map((item: any, idx: number) => 
                        item.name && Number(item.cost) > 0 ? (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.name}</span>
                            <span>${Number(item.cost).toFixed(2)}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
                
                {/* Total */}
                <div className="p-3 bg-gray-100 rounded-lg mt-3">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>${Number(repairData.total_cost || 0).toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Warranty */}
                {repairData.warranty && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium mb-1">Warranty</h3>
                    <p className="text-sm">{repairData.warranty}</p>
                  </div>
                )}
                
                {/* Crane Required */}
                {repairData.needs_crane && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="font-medium">Crane Required</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quote Details */}
      {showQuoteDetails && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-md font-medium mb-3">Quotes</h2>
            {Array.isArray(quoteData) && quoteData.length > 0 ? (
              <div className="space-y-3">
                {quoteData.map((quote) => (
                  <div key={quote.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Quote #{quote.quote_number}</p>
                        <p className="text-xs text-gray-500 capitalize">{quote.quote_type} Quote</p>
                        <p className="text-xs text-gray-500">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${Number(quote.amount).toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          quote.confirmed 
                            ? (quote.approved ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800')
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {quote.confirmed 
                            ? (quote.approved ? 'Approved' : 'Declined')
                            : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No quotes found</p>
            )}
          </div>

          {/* Quote Status */}
          {job.quote_sent && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-md font-medium mb-3">Quote Status</h2>
              <div className={`p-3 rounded-lg ${
                job.quote_confirmed 
                  ? (job.repair_approved ? 'bg-success-50 border border-success-200' : 'bg-error-50 border border-error-200')
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start">
                  {job.quote_confirmed ? (
                    job.repair_approved ? (
                      <CheckCircle className="h-5 w-5 text-success-500 mt-0.5 mr-2" />
                    ) : (
                      <X className="h-5 w-5 text-error-500 mt-0.5 mr-2" />
                    )
                  ) : (
                    <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                  )}
                  <div>
                    <p className="font-medium">
                      {job.quote_confirmed 
                        ? (job.repair_approved ? 'Quote Approved' : 'Quote Declined')
                        : 'Quote Sent'}
                    </p>
                    <p className="text-sm">
                      {job.quote_confirmed 
                        ? `Customer ${job.repair_approved ? 'approved' : 'declined'} the quote on ${job.quote_confirmed_at ? formatDate(job.quote_confirmed_at) : 'N/A'}`
                        : `Quote was sent to ${job.contact_email} on ${job.quote_sent_at ? formatDate(job.quote_sent_at) : 'N/A'}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice Details */}
      {showInvoiceDetails && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-md font-medium mb-3">Invoices</h2>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Invoice #{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-500">
                          Issued: {invoice.issued_date ? formatDate(invoice.issued_date) : 'Not issued'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Due: {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${Number(invoice.amount).toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          invoice.status === 'paid' ? 'bg-success-100 text-success-800' :
                          invoice.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                          invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-error-100 text-error-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No invoices found</p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {showNotes && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-md font-medium mb-3">Technician Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 min-h-[200px]"
              placeholder="Add your notes about this job here..."
            />
            <button
              onClick={handleSaveNotes}
              className="btn btn-primary w-full mt-3"
              disabled={isSavingNotes}
            >
              {isSavingNotes ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Notes
            </button>
          </div>
        </div>
      )}

      {/* Navigation Modal */}
      <TechnicianNavigation
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        location={job.locations}
        job={job}
      />

      {/* Complete Job Confirmation Modal */}
      {showCompleteJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Complete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to mark Job #{job.number} as completed? This will update the job status.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCompleteJobModal(false)}
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
    </div>
  );
};

export default TechnicianJobDetails;