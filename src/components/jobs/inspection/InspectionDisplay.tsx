import { useState, useEffect } from 'react';
import { Clipboard, Plus, CheckSquare, Trash2, Mail, Check, X, AlertTriangle } from 'lucide-react';
import { useSupabase } from '../../../lib/supabase-context';

type InspectionData = {
  id: string;
  job_id: string;
  model_number: string | null;
  serial_number: string | null;
  age: number | null;
  tonnage: string | null;
  unit_type: 'Gas' | 'Electric' | null;
  system_type: 'RTU' | 'Split System' | null;
  created_at: string;
  updated_at: string;
  completed: boolean;
};

type InspectionDisplayProps = {
  jobId: string;
  onAddInspection: () => void;
  onEditInspection: (inspection: InspectionData) => void;
  onInspectionComplete?: () => void;
  onSelectInspection?: (inspection: InspectionData) => void;
  selectedInspectionId?: string;
};

const InspectionDisplay = ({ 
  jobId, 
  onAddInspection, 
  onEditInspection, 
  onInspectionComplete,
  onSelectInspection,
  selectedInspectionId
}: InspectionDisplayProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [quoteReady, setQuoteReady] = useState(false);
  const [showResendPrompt, setShowResendPrompt] = useState(false);

  useEffect(() => {
    fetchInspectionData();
    fetchJobDetails();
  }, [supabase, jobId]);

  const fetchInspectionData = async () => {
    if (!supabase || !jobId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('job_inspections')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
      
      // Check if any inspection is completed
      const hasCompletedInspection = data?.some(inspection => inspection.completed) || false;
      setQuoteReady(hasCompletedInspection);
      
      console.log("Fetched inspections:", data);
      console.log("Has completed inspection:", hasCompletedInspection);
    } catch (err) {
      console.error('Error fetching inspection data:', err);
      setError('Failed to load inspection data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobDetails = async () => {
    if (!supabase || !jobId) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          locations (
            name,
            address,
            city,
            state,
            zip
          ),
          units (
            unit_number
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJobDetails(data);
      
      // Pre-fill email if available
      if (data.contact_email) {
        setCustomerEmail(data.contact_email);
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
    }
  };

  const handleFinishInspection = async () => {
    if (!supabase || !jobId) return;

    try {
      setIsCompletingJob(true);
      
      // Update all inspections to mark them as completed
      const { error: updateError } = await supabase
        .from('job_inspections')
        .update({ completed: true })
        .eq('job_id', jobId);
        
      if (updateError) throw updateError;
      
      // Check if job_repairs record exists
      const { data: repairData, error: repairError } = await supabase
        .from('job_repairs')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();
        
      if (repairError && !repairError.message.includes('The result contains 0 rows')) {
        throw repairError;
      }
      
      // If no repair record exists, create one
      if (!repairData) {
        // Get the first completed inspection to determine model
        const { data: inspectionData } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', jobId)
          .eq('completed', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        const { error: insertError } = await supabase
          .from('job_repairs')
          .insert({
            job_id: jobId,
            inspection_id: inspectionData.id, // Associate with the specific inspection
            needs_crane: false,
            phase1: { description: 'Economy Option', cost: 0 },
            phase2: { description: 'Standard Option', cost: 0 },
            phase3: { description: 'Premium Option', cost: 0 },
            labor: 0,
            refrigeration_recovery: 0,
            start_up_costs: 0,
            accessories: [],
            thermostat_startup: 0,
            removal_cost: 0,
            permit_cost: 0,
            selected_phase: 'phase2',
            total_cost: 0
          });
          
        if (insertError) throw insertError;
      }
      
      // Refresh the inspection data
      await fetchInspectionData();
      
      // Set quote ready flag
      setQuoteReady(true);
      
      // Call the onInspectionComplete callback if provided
      if (onInspectionComplete) {
        onInspectionComplete();
      }
      
      // Show email modal to send quote to customer
      setShowEmailModal(true);
    } catch (err) {
      console.error('Error finishing inspection:', err);
      setError('Failed to finish inspection');
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleDeleteInspection = async (inspectionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    
    if (!supabase) return;
    
    try {
      setIsDeleting(inspectionId);
      
      // First delete any associated repair data
      const { error: repairDeleteError } = await supabase
        .from('job_repairs')
        .delete()
        .eq('inspection_id', inspectionId);
        
      if (repairDeleteError) throw repairDeleteError;
      
      // Then delete the inspection
      const { error } = await supabase
        .from('job_inspections')
        .delete()
        .eq('id', inspectionId);
        
      if (error) throw error;
      
      // Refresh the inspection list
      fetchInspectionData();
    } catch (err) {
      console.error('Error deleting inspection:', err);
      setError('Failed to delete inspection');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSendQuote = async () => {
    if (!supabase || !jobId || !customerEmail) {
      setError('Customer email is required');
      return;
    }
    
    setIsSendingEmail(true);
    setError(null);
    
    try {
      // Generate a unique token for quote confirmation
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Update job with token and email
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          contact_email: customerEmail,
          quote_token: token,
          quote_sent: true,
          quote_sent_at: new Date().toISOString()
        })
        .eq('id', jobId);
        
      if (updateError) throw updateError;
      
      // Call the Supabase Edge Function to send the email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-inspection-quote`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber: jobDetails.number,
          jobName: jobDetails.name,
          customerName: jobDetails.contact_name,
          inspectionData: inspections.filter(i => i.completed),
          location: jobDetails.locations ? {
            name: jobDetails.locations.name,
            address: jobDetails.locations.address,
            city: jobDetails.locations.city,
            state: jobDetails.locations.state,
            zip: jobDetails.locations.zip
          } : null,
          unit: jobDetails.units ? {
            unit_number: jobDetails.units.unit_number
          } : null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send inspection quote email');
      }
      
      setEmailSent(true);
      setShowResendPrompt(false);
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSent(false);
        // Refresh job details to show updated quote status
        fetchJobDetails();
        
        // Call the onInspectionComplete callback if provided
        if (onInspectionComplete) {
          onInspectionComplete();
        }
      }, 3000);
    } catch (err) {
      console.error('Error sending inspection quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to send inspection quote');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSelectInspection = (inspection: InspectionData) => {
    if (onSelectInspection) {
      onSelectInspection(inspection);
    }
  };

  const handleEditInspection = (inspection: InspectionData) => {
    onEditInspection(inspection);
    // Show resend prompt when an inspection is edited
    setShowResendPrompt(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 text-error-700 p-3 rounded-md">
        {error}
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg">
        <Clipboard className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-500 mb-4">No inspection data available</p>
        <button
          onClick={onAddInspection}
          className="btn btn-primary"
        >
          <Plus size={16} className="mr-2" />
          Add Inspection
        </button>
      </div>
    );
  }

  const hasCompletedInspections = inspections.some(inspection => inspection.completed);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium flex items-center">
          <Clipboard size={16} className="mr-2 text-blue-500" />
          Inspection Details
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onAddInspection}
            className="btn btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Add Inspection
          </button>
          {!hasCompletedInspections && (
            <button
              onClick={handleFinishInspection}
              className="btn btn-success"
              disabled={isCompletingJob}
            >
              {isCompletingJob ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <CheckSquare size={16} className="mr-2" />
              )}
              Mark Complete
            </button>
          )}
          {quoteReady && !jobDetails?.quote_sent && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="btn btn-primary"
            >
              <Mail size={16} className="mr-2" />
              Send Quote
            </button>
          )}
        </div>
      </div>

      {showResendPrompt && (
        <div className="mb-4 p-4 bg-warning-50 border-l-4 border-warning-500 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
            <div>
              <p className="text-warning-700">Inspection has been updated. Please resend the quote to the customer.</p>
              <button 
                onClick={() => setShowEmailModal(true)}
                className="mt-2 text-sm text-warning-800 font-medium underline"
              >
                Send Updated Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {hasCompletedInspections && (
        <div className="mb-4 p-4 bg-success-50 border-l-4 border-success-500 rounded-md">
          <div className="flex">
            <CheckSquare className="h-5 w-5 text-success-500 mr-2" />
            <p className="text-success-700">Inspection completed</p>
          </div>
          {quoteReady && !jobDetails?.quote_sent && (
            <div className="mt-2 text-success-700">
              <p>Ready to send quote to customer. Click "Send Quote" to proceed.</p>
            </div>
          )}
          {jobDetails?.quote_sent && !jobDetails?.quote_confirmed && (
            <div className="mt-2 text-blue-700">
              <p>Inspection quote sent to customer. Waiting for confirmation.</p>
            </div>
          )}
          {jobDetails?.quote_confirmed && (
            <div className="mt-2">
              <p className="text-success-700">
                Quote confirmed by customer on {jobDetails.quote_confirmed_at ? new Date(jobDetails.quote_confirmed_at).toLocaleString() : 'N/A'}.
              </p>
              {jobDetails.repair_approved ? (
                <p className="text-success-700 flex items-center mt-1">
                  <Check size={16} className="mr-1" />
                  Customer approved repairs
                </p>
              ) : jobDetails.repair_approved === false ? (
                <p className="text-error-700 flex items-center mt-1">
                  <X size={16} className="mr-1" />
                  Customer declined repairs
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {inspections.map((inspection) => (
          <div 
            key={inspection.id} 
            className={`bg-gray-50 p-4 rounded-lg border ${
              inspection.completed ? 'border-success-200' : 'border-gray-200'
            } ${selectedInspectionId === inspection.id ? 'ring-2 ring-primary-500' : ''} 
            cursor-pointer hover:bg-gray-100 transition-all`}
            onClick={() => handleSelectInspection(inspection)}
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium">
                Inspection from {new Date(inspection.created_at).toLocaleDateString()}
                {inspection.completed && (
                  <span className="ml-2 text-xs bg-success-100 text-success-800 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                )}
                {selectedInspectionId === inspection.id && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteInspection(inspection.id, e);
                  }}
                  className="text-error-600 hover:text-error-800"
                  disabled={isDeleting === inspection.id || inspection.completed}
                  aria-label="Delete inspection"
                >
                  {isDeleting === inspection.id ? (
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-error-600 rounded-full"></span>
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
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

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <Mail size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Send Inspection Quote
            </h3>
            
            {error && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            {emailSent ? (
              <div className="bg-success-50 text-success-700 p-4 rounded-md text-center">
                <Check size={24} className="mx-auto mb-2" />
                <p className="font-medium">Quote sent successfully!</p>
                <p className="text-sm mt-2">The customer will receive an email with the inspection details and repair options.</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Send the inspection results and repair quote to the customer. They will be able to approve or deny the repair.
                  </p>
                  
                  <div>
                    <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      id="customerEmail"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="input"
                      placeholder="customer@example.com"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowEmailModal(false)}
                    disabled={isSendingEmail}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleSendQuote}
                    disabled={isSendingEmail || !customerEmail}
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={16} className="mr-2" />
                        Send Quote
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionDisplay;