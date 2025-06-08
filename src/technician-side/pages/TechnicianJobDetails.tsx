import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Briefcase, MapPin, Calendar, Clock, CheckSquare, AlertTriangle, ArrowLeft, Phone, Mail, MessageSquare, Clipboard, Home, Package, FileText, Wrench, Plus, Edit, Trash2, Send, ChevronDown, ChevronUp, Navigation, DollarSign, FileInput } from 'lucide-react';
import JobServiceSection from '../../components/jobs/JobServiceSection';
import JobQuoteSection from '../../components/jobs/JobQuoteSection';
import JobInvoiceSection from '../../components/jobs/JobInvoiceSection';
import TechnicianNavigation from '../components/navigation/TechnicianNavigation';

const TechnicianJobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [inspectionData, setInspectionData] = useState<any[]>([]);
  const [repairData, setRepairData] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianName, setTechnicianName] = useState('');
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [showCompleteJobModal, setShowCompleteJobModal] = useState(false);
  const [jobStatus, setJobStatus] = useState<'scheduled' | 'unscheduled' | 'completed' | 'cancelled'>('scheduled');
  const [clockEvents, setClockEvents] = useState<any[]>([]);
  const [currentClockStatus, setCurrentClockStatus] = useState<'clocked_out' | 'clocked_in' | 'on_break'>('clocked_out');
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [showAdminFeatures, setShowAdminFeatures] = useState(false);
  const [quoteNeedsUpdate, setQuoteNeedsUpdate] = useState(false);
  const [lastQuoteUpdateTime, setLastQuoteUpdateTime] = useState<string | null>(null);
  
  // Service section visibility states
  const [showInspectionSection, setShowInspectionSection] = useState(true);
  const [showRepairSection, setShowRepairSection] = useState(false);
  const [showItemsSection, setShowItemsSection] = useState(false);

  // Get technician ID
  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;
      
      try {
        // Get username from session storage
        const username = sessionStorage.getItem('techUsername');
        
        if (username) {
          console.log("Looking up technician with username:", username);
          
          // Try to find user by username
          const { data, error } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('username', username)
            .maybeSingle();
            
          if (error && !error.message.includes("contains 0 rows")) {
            console.error('Error fetching technician by username:', error);
            throw error;
          }
          
          if (data) {
            console.log("Found technician by username:", data);
            setTechnicianId(data.id);
            setTechnicianName(`${data.first_name || ''} ${data.last_name || ''}`);
          } else {
            // Try with email format
            const email = `${username}@airlast-demo.com`;
            console.log("Trying with email:", email);
            
            const { data: emailData, error: emailError } = await supabase
              .from('users')
              .select('id, first_name, last_name')
              .eq('email', email)
              .maybeSingle();
              
            if (emailError && !emailError.message.includes("contains 0 rows")) {
              console.error('Error fetching technician by email:', emailError);
              throw emailError;
            }
            
            if (emailData) {
              console.log("Found technician by email:", emailData);
              setTechnicianId(emailData.id);
              setTechnicianName(`${emailData.first_name || ''} ${emailData.last_name || ''}`);
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
              .select('id, username, first_name, last_name')
              .eq('email', user.email)
              .maybeSingle();
              
            if (error && !error.message.includes("contains 0 rows")) {
              console.error('Error fetching technician by email:', error);
              throw error;
            }
            
            if (data) {
              console.log("Found technician by email:", data);
              setTechnicianId(data.id);
              setTechnicianName(`${data.first_name || ''} ${data.last_name || ''}`);
              sessionStorage.setItem('techUsername', data.username);
            } else {
              // Try with username from email
              const username = user.email.split('@')[0];
              console.log("Trying with username from email:", username);
              
              const { data: usernameData, error: usernameError } = await supabase
                .from('users')
                .select('id, first_name, last_name')
                .eq('username', username)
                .maybeSingle();
                
              if (usernameError && !usernameError.message.includes("contains 0 rows")) {
                console.error('Error fetching technician by username from email:', usernameError);
                throw usernameError;
              }
              
              if (usernameData) {
                console.log("Found technician by username from email:", usernameData);
                setTechnicianId(usernameData.id);
                setTechnicianName(`${usernameData.first_name || ''} ${usernameData.last_name || ''}`);
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
        setIsLoading(true);
        
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
            )
          `)
          .eq('id', id)
          .single();

        if (jobError) {
          console.error('Error fetching job:', jobError);
          throw new Error('Error fetching job details');
        }

        setJob(jobData);
        setJobStatus(jobData.status as any);

        // If the job has a quote sent, store the timestamp for comparison
        if (jobData.quote_sent && jobData.quote_sent_at) {
          setLastQuoteUpdateTime(jobData.quote_sent_at);
        }

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (itemsError) {
          console.error('Error fetching job items:', itemsError);
          // Don't throw here, just log the error
        } else {
          setJobItems(itemsData || []);
        }

        // Check if any items were updated after the quote was sent
        if (jobData.quote_sent && jobData.quote_sent_at) {
          const quoteTime = new Date(jobData.quote_sent_at).getTime();
          const needsUpdate = itemsData?.some((item) => {
            const itemTime = new Date(item.created_at).getTime();
            return itemTime > quoteTime;
          });

          setQuoteNeedsUpdate(needsUpdate || false);
        }

        // Fetch inspection data
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', id)
          .order('created_at', { ascending: false });

        if (inspectionError) {
          console.error('Error fetching inspection data:', inspectionError);
          // Don't throw here, just log the error
        } else {
          setInspectionData(inspectionData || []);
        }

        // Fetch repair data - Fixed to handle multiple rows
        const { data: repairData, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', id)
          .limit(1);

        if (repairError) {
          console.error('Error fetching repair data:', repairError);
          // Don't throw here, just log the error
        } else if (repairData && repairData.length > 0) {
          setRepairData(repairData[0]);
        }

        // Fetch job comments - Modified to avoid the foreign key issue
        const { data: commentsData, error: commentsError } = await supabase
          .from('job_comments')
          .select(`
            id,
            job_id,
            user_id,
            content,
            created_at
          `)
          .eq('job_id', id)
          .order('created_at', { ascending: false });

        if (commentsError) {
          console.error('Error fetching job comments:', commentsError);
          // Don't throw here, just log the error
        } else {
          // For each comment, fetch the user details separately
          const commentsWithUsers = await Promise.all(
            (commentsData || []).map(async (comment) => {
              try {
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('first_name, last_name')
                  .eq('id', comment.user_id)
                  .single();
                
                if (userError) {
                  console.error('Error fetching user for comment:', userError);
                  return {
                    ...comment,
                    user: { first_name: 'Unknown', last_name: 'User' }
                  };
                }
                
                return {
                  ...comment,
                  user: userData
                };
              } catch (err) {
                console.error('Error processing comment user:', err);
                return {
                  ...comment,
                  user: { first_name: 'Unknown', last_name: 'User' }
                };
              }
            })
          );
          
          setComments(commentsWithUsers);
        }

        // Fetch clock events
        const { data: clockData, error: clockError } = await supabase
          .from('job_clock_events')
          .select('*')
          .eq('job_id', id)
          .order('event_time', { ascending: true });

        if (clockError) {
          console.error('Error fetching clock events:', clockError);
          // Don't throw here, just log the error
        } else {
          setClockEvents(clockData || []);
          
          // Determine current clock status
          if (clockData && clockData.length > 0) {
            const lastEvent = clockData[clockData.length - 1];
            if (lastEvent.event_type === 'clock_in') {
              setCurrentClockStatus('clocked_in');
            } else if (lastEvent.event_type === 'break_start') {
              setCurrentClockStatus('on_break');
            } else {
              setCurrentClockStatus('clocked_out');
            }
          }
        }

      } catch (err) {
        console.error('Error in fetchJobDetails:', err);
        setError(err instanceof Error ? err.message : 'Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [supabase, id]);

  const handleAddComment = async () => {
    if (!supabase || !id || !technicianId || !newComment.trim()) return;

    setIsSubmittingComment(true);

    try {
      const { data, error } = await supabase
        .from('job_comments')
        .insert({
          job_id: id,
          user_id: technicianId,
          content: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new comment to the list with user info
      setComments([
        {
          ...data,
          user: {
            first_name: technicianName.split(' ')[0] || 'Unknown',
            last_name: technicianName.split(' ')[1] || 'User'
          }
        },
        ...comments
      ]);
      
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleClockEvent = async (eventType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end') => {
    if (!supabase || !id || !technicianId) return;

    // Set the appropriate loading state
    if (eventType === 'clock_in') setIsClockingIn(true);
    else if (eventType === 'clock_out') setIsClockingOut(true);
    else if (eventType === 'break_start') setIsStartingBreak(true);
    else if (eventType === 'break_end') setIsEndingBreak(true);

    try {
      const { data, error } = await supabase
        .from('job_clock_events')
        .insert({
          job_id: id,
          user_id: technicianId,
          event_type: eventType,
          event_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update clock events and current status
      setClockEvents([...clockEvents, data]);
      
      if (eventType === 'clock_in') {
        setCurrentClockStatus('clocked_in');
      } else if (eventType === 'clock_out') {
        setCurrentClockStatus('clocked_out');
      } else if (eventType === 'break_start') {
        setCurrentClockStatus('on_break');
      } else if (eventType === 'break_end') {
        setCurrentClockStatus('clocked_in');
      }
    } catch (err) {
      console.error(`Error recording ${eventType}:`, err);
      setError(`Failed to record ${eventType.replace('_', ' ')}. Please try again.`);
    } finally {
      // Reset all loading states
      setIsClockingIn(false);
      setIsClockingOut(false);
      setIsStartingBreak(false);
      setIsEndingBreak(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!supabase || !id || !technicianId) return;

    setIsCompletingJob(true);

    try {
      // First check if the technician is clocked in
      if (currentClockStatus === 'clocked_in') {
        // Clock out automatically
        await supabase
          .from('job_clock_events')
          .insert({
            job_id: id,
            user_id: technicianId,
            event_type: 'clock_out',
            event_time: new Date().toISOString(),
            notes: 'Auto clock-out on job completion'
          });
      }

      // Update job status to completed
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setJobStatus('completed');
      setShowCompleteJobModal(false);
      setCurrentClockStatus('clocked_out');
    } catch (err) {
      console.error('Error completing job:', err);
      setError('Failed to complete job. Please try again.');
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleItemsUpdated = async () => {
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

      // Check if any items were updated after the quote was sent
      if (job?.quote_sent && lastQuoteUpdateTime) {
        const quoteTime = new Date(lastQuoteUpdateTime).getTime();
        const needsUpdate = data?.some((item) => {
          const itemTime = new Date(item.created_at).getTime();
          return itemTime > quoteTime;
        });

        setQuoteNeedsUpdate(needsUpdate || false);
      }
    } catch (err) {
      console.error('Error refreshing job items:', err);
    }
  };

  const handleQuoteSent = (updatedJob: any) => {
    setJob(updatedJob);
    setLastQuoteUpdateTime(updatedJob.quote_sent_at || null);
    setQuoteNeedsUpdate(false);
  };

  const handleInvoiceCreated = (invoiceId: string) => {
    // Refresh the page to show the new invoice
    window.location.reload();
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
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
      case 'inspection':
        return 'bg-blue-100 text-blue-800';
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
        <p className="text-gray-500 mb-4">{error || 'Failed to load job details'}</p>
        <Link to="/tech/jobs" className="btn btn-primary">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Job Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center mb-4">
          <Link to="/tech/jobs" className="text-gray-500 hover:text-gray-700 mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Job #{job.number}</h1>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge ${getStatusBadgeClass(job.status)}`}>
            {job.status}
          </span>
          <span className={`badge ${getTypeBadgeClass(job.type)}`}>
            {job.type}
          </span>
          {job.service_line && (
            <span className="badge bg-blue-100 text-blue-800">
              {job.service_line}
            </span>
          )}
          {job.is_training && (
            <span className="badge bg-purple-100 text-purple-800">
              Training
            </span>
          )}
        </div>
        
        <h2 className="text-lg font-semibold">{job.name}</h2>
        
        {job.description && (
          <p className="text-gray-600 mt-2">{job.description}</p>
        )}
        
        {job.problem_description && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-800">Problem Description</h3>
            <p className="text-yellow-700">{job.problem_description}</p>
          </div>
        )}
        
        <div className="mt-4 flex flex-wrap justify-between items-center">
          <div className="text-sm text-gray-500">
            <div className="flex items-center gap-1 mb-1">
              <Calendar size={14} />
              <span>Start: {job.time_period_start}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>Due: {job.time_period_due}</span>
            </div>
            {job.schedule_start && (
              <div className="flex items-center gap-1 mt-1">
                <Clock size={14} />
                <span>Scheduled: {formatDateTime(job.schedule_start)}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-4 sm:mt-0">
            {jobStatus !== 'completed' && jobStatus !== 'cancelled' && (
              <button
                onClick={() => setShowCompleteJobModal(true)}
                className="btn btn-success"
              >
                <CheckSquare size={16} className="mr-2" />
                Complete Job
              </button>
            )}
            
            <button
              onClick={() => setShowNavigationModal(true)}
              className="btn btn-primary"
            >
              <Navigation size={16} className="mr-2" />
              Navigate
            </button>
          </div>
        </div>
      </div>

      {/* Clock In/Out Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary-600" />
          Time Tracking
        </h2>
        
        <div className="flex flex-wrap gap-3 mb-4">
          {currentClockStatus === 'clocked_out' ? (
            <button
              onClick={() => handleClockEvent('clock_in')}
              className="btn btn-primary"
              disabled={isClockingIn || jobStatus === 'completed' || jobStatus === 'cancelled'}
            >
              {isClockingIn ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <Clock size={16} className="mr-2" />
              )}
              Clock In
            </button>
          ) : currentClockStatus === 'clocked_in' ? (
            <>
              <button
                onClick={() => handleClockEvent('clock_out')}
                className="btn btn-error"
                disabled={isClockingOut}
              >
                {isClockingOut ? (
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                ) : (
                  <Clock size={16} className="mr-2" />
                )}
                Clock Out
              </button>
              <button
                onClick={() => handleClockEvent('break_start')}
                className="btn btn-secondary"
                disabled={isStartingBreak}
              >
                {isStartingBreak ? (
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                ) : (
                  <Clock size={16} className="mr-2" />
                )}
                Start Break
              </button>
            </>
          ) : (
            <button
              onClick={() => handleClockEvent('break_end')}
              className="btn btn-primary"
              disabled={isEndingBreak}
            >
              {isEndingBreak ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <Clock size={16} className="mr-2" />
              )}
              End Break
            </button>
          )}
        </div>
        
        {clockEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2 text-sm font-medium text-gray-500">EVENT</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-500">TIME</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-500">NOTES</th>
                </tr>
              </thead>
              <tbody>
                {clockEvents.map((event, index) => (
                  <tr key={event.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 capitalize">
                      {event.event_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      {formatDateTime(event.event_time)}
                    </td>
                    <td className="px-4 py-3">
                      {event.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No time tracking events recorded yet</p>
        )}
      </div>

      {/* Location and Contact */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Location & Contact</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium mb-2">Location</h3>
            {job.locations ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Home className="h-5 w-5 text-gray-400 mt-1" />
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
                <div className="mt-2">
                  <button 
                    onClick={() => setShowNavigationModal(true)}
                    className="btn btn-primary"
                  >
                    <Navigation size={16} className="mr-2" />
                    Navigate
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No location assigned</p>
            )}
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Contact</h3>
            {job.contact_name ? (
              <div className="space-y-2">
                <p className="font-medium">{job.contact_name}</p>
                {job.contact_type && (
                  <p className="text-sm text-gray-500 capitalize">{job.contact_type} Contact</p>
                )}
                {job.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    <a href={`tel:${job.contact_phone}`} className="text-primary-600">
                      {job.contact_phone}
                    </a>
                  </div>
                )}
                {job.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <a href={`mailto:${job.contact_email}`} className="text-primary-600">
                      {job.contact_email}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No contact information</p>
            )}
          </div>
        </div>
      </div>

      {/* Admin Features Toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <button 
          onClick={() => setShowAdminFeatures(!showAdminFeatures)}
          className="w-full flex justify-between items-center"
        >
          <h2 className="text-lg font-semibold flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-primary-600" />
            Advanced Features
          </h2>
          {showAdminFeatures ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Admin Features (Service, Quote, Invoice) */}
      {showAdminFeatures && (
        <>
          {/* Service Section */}
          <JobServiceSection
            jobId={id || ''}
            jobItems={jobItems}
            onItemsUpdated={handleItemsUpdated}
            onQuoteStatusChange={() => job?.quote_sent && setQuoteNeedsUpdate(true)}
          />

          {/* Quote Section */}
          <JobQuoteSection
            job={job}
            jobItems={jobItems}
            onQuoteSent={handleQuoteSent}
            onPreviewQuote={() => {}}
            quoteNeedsUpdate={quoteNeedsUpdate}
          />

          {/* Invoice Section */}
          <JobInvoiceSection
            job={job}
            jobItems={jobItems}
            onInvoiceCreated={handleInvoiceCreated}
          />
        </>
      )}

      {/* Service Details - Collapsible Sections */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Wrench className="h-5 w-5 mr-2 text-primary-600" />
          Service Details
        </h2>
        
        {/* Inspection Section - Collapsible */}
        <div className="mb-4 border rounded-lg overflow-hidden">
          <button 
            onClick={() => setShowInspectionSection(!showInspectionSection)}
            className="w-full flex justify-between items-center p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <h3 className="text-md font-medium flex items-center">
              <Clipboard size={16} className="mr-2 text-blue-500" />
              Inspection Details
            </h3>
            {showInspectionSection ? (
              <ChevronUp className="h-5 w-5 text-blue-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-blue-500" />
            )}
          </button>
          
          {showInspectionSection && (
            <div className="p-3">
              {inspectionData.length > 0 ? (
                <div className="space-y-4">
                  {inspectionData.map((inspection) => (
                    <div 
                      key={inspection.id} 
                      className={`bg-gray-50 p-4 rounded-lg border ${
                        inspection.completed ? 'border-success-200' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium">
                          Inspection from {new Date(inspection.created_at).toLocaleDateString()}
                          {inspection.completed && (
                            <span className="ml-2 text-xs bg-success-100 text-success-800 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Model Number</p>
                          <p className="font-medium">{inspection.model_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Serial Number</p>
                          <p className="font-medium">{inspection.serial_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Age (Years)</p>
                          <p className="font-medium">{inspection.age || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Tonnage</p>
                          <p className="font-medium">{inspection.tonnage || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Unit Type</p>
                          <p className="font-medium">{inspection.unit_type || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">System Type</p>
                          <p className="font-medium">{inspection.system_type || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No inspection data available</p>
              )}
            </div>
          )}
        </div>
        
        {/* Repair Section - Collapsible */}
        <div className="mb-4 border rounded-lg overflow-hidden">
          <button 
            onClick={() => setShowRepairSection(!showRepairSection)}
            className="w-full flex justify-between items-center p-3 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <h3 className="text-md font-medium flex items-center">
              <Wrench size={16} className="mr-2 text-green-500" />
              Repair Details
            </h3>
            {showRepairSection ? (
              <ChevronUp className="h-5 w-5 text-green-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-green-500" />
            )}
          </button>
          
          {showRepairSection && (
            <div className="p-3">
              {repairData ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Selected Option</p>
                      <p className="font-medium">
                        {repairData.selected_phase === 'phase1' ? 'Economy Option' : 
                         repairData.selected_phase === 'phase2' ? 'Standard Option' : 
                         'Premium Option'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Cost</p>
                      <p className="font-medium">${Number(repairData.total_cost).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Requires Crane</p>
                      <p className="font-medium">{repairData.needs_crane ? 'Yes' : 'No'}</p>
                    </div>
                    {repairData.warranty && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Warranty</p>
                        <p className="font-medium">{repairData.warranty}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Phase Details */}
                  {repairData.selected_phase && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">
                        {repairData.selected_phase === 'phase1' ? 'Economy Option' : 
                         repairData.selected_phase === 'phase2' ? 'Standard Option' : 
                         'Premium Option'} Details
                      </h4>
                      <p className="text-blue-700">
                        {repairData[repairData.selected_phase]?.description || 'No description available'}
                      </p>
                      <p className="text-blue-700 font-medium mt-1">
                        Cost: ${Number(repairData[repairData.selected_phase]?.cost || 0).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No repair data available</p>
              )}
            </div>
          )}
        </div>
        
        {/* Items Section - Collapsible */}
        <div className="border rounded-lg overflow-hidden">
          <button 
            onClick={() => setShowItemsSection(!showItemsSection)}
            className="w-full flex justify-between items-center p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <h3 className="text-md font-medium flex items-center">
              <Package size={16} className="mr-2 text-purple-500" />
              Items & Materials
            </h3>
            {showItemsSection ? (
              <ChevronUp className="h-5 w-5 text-purple-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-purple-500" />
            )}
          </button>
          
          {showItemsSection && (
            <div className="p-3">
              {jobItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">ITEM</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">QTY</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">UNIT PRICE</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.code}</div>
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">${Number(item.unit_cost).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">${Number(item.total_cost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-3" colSpan={3} align="right">Total</td>
                        <td className="px-4 py-3 text-right">
                          ${jobItems.reduce((sum, item) => sum + Number(item.total_cost), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No items added to this job</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-primary-600" />
          Comments
        </h2>
        
        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="input w-full h-24"
            disabled={isSubmittingComment}
          ></textarea>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddComment}
              className="btn btn-primary"
              disabled={isSubmittingComment || !newComment.trim()}
            >
              {isSubmittingComment ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <Send size={16} className="mr-2" />
              )}
              Add Comment
            </button>
          </div>
        </div>
        
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="font-medium">
                    {comment.user?.first_name} {comment.user?.last_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                </div>
                <p className="mt-2 text-gray-700">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No comments yet</p>
        )}
      </div>

      {/* Complete Job Modal */}
      {showCompleteJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <CheckSquare size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Complete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to mark Job #{job.number} as completed? This will update the job status and notify the office.
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

      {/* Navigation Modal */}
      {showNavigationModal && job.locations && (
        <TechnicianNavigation
          isOpen={showNavigationModal}
          onClose={() => setShowNavigationModal(false)}
          location={{
            address: job.locations.address,
            city: job.locations.city,
            state: job.locations.state,
            zip: job.locations.zip,
            name: job.locations.name
          }}
          job={job}
        />
      )}
    </div>
  );
};

export default TechnicianJobDetails;