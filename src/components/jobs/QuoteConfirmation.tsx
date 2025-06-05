import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { CheckCircle, XCircle, AlertTriangle, FileText, ArrowLeft, Check, X } from 'lucide-react';

const QuoteConfirmation = () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [inspectionData, setInspectionData] = useState<any[]>([]);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  // Get the approval status from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const approveParam = searchParams.get('approve');
    
    if (approveParam === 'true') {
      setApproved(true);
    } else if (approveParam === 'false') {
      setApproved(false);
    }
  }, [location]);

  useEffect(() => {
    const confirmQuote = async () => {
      if (!token) {
        setError('Invalid confirmation link');
        setIsLoading(false);
        return;
      }

      try {
        // First, fetch the job details to display
        if (supabase) {
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
            .eq('quote_token', token)
            .maybeSingle();

          if (jobError) {
            console.error('Error fetching job:', jobError);
            throw new Error('Error fetching quote details');
          }

          if (!jobData) {
            console.log('No job found for token:', token);
            throw new Error('Quote not found or has expired');
          }

          setJobDetails(jobData);

          // Fetch inspection data
          const { data: inspectionData, error: inspectionError } = await supabase
            .from('job_inspections')
            .select('*')
            .eq('job_id', jobData.id)
            .order('created_at', { ascending: false });

          if (inspectionError) {
            console.error('Error fetching inspection data:', inspectionError);
            throw inspectionError;
          }
          
          setInspectionData(inspectionData || []);

          // If already confirmed, just return success
          if (jobData.quote_confirmed) {
            setSuccess(true);
            setApproved(jobData.repair_approved);
            setIsLoading(false);
            return;
          }
        }

        // Only proceed with confirmation if approval status is set
        if (approved !== null) {
          // Call the Supabase Edge Function to confirm the quote
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-inspection-quote`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ 
              token,
              approved 
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response from confirm-quote:', errorData);
            throw new Error(errorData.error || 'Failed to confirm quote');
          }
          
          setSuccess(true);
          
          // If repair is declined, create an inspection invoice
          if (approved === false && supabase && jobDetails) {
            setIsCreatingInvoice(true);
            
            try {
              // Generate invoice number (JOB-INV-XXXX)
              const invoiceNumber = `JOB-${jobDetails.number}-INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
              setInvoiceNumber(invoiceNumber);
              
              // Calculate due date (30 days from now)
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30);
              
              // Create inspection invoice for $180
              const { data: invoiceData, error: invoiceError } = await supabase
                .from('job_invoices')
                .insert({
                  job_id: jobDetails.id,
                  invoice_number: invoiceNumber,
                  amount: 180.00, // Fixed inspection fee
                  status: 'issued',
                  issued_date: new Date().toISOString().split('T')[0],
                  due_date: dueDate.toISOString().split('T')[0]
                })
                .select()
                .single();
                
              if (invoiceError) throw invoiceError;
              
              // Add inspection item to job_items
              const { error: itemError } = await supabase
                .from('job_items')
                .insert({
                  job_id: jobDetails.id,
                  code: 'INSP-FEE',
                  name: 'Inspection Fee',
                  service_line: 'INSP',
                  quantity: 1,
                  unit_cost: 180.00,
                  total_cost: 180.00,
                  type: 'item'
                });
                
              if (itemError) throw itemError;
              
              try {
                // Call the Supabase Edge Function to send the email
                const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;
                
                const response = await fetch(apiUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                  },
                  body: JSON.stringify({
                    jobId: jobDetails.id,
                    invoiceId: invoiceData.id,
                    customerEmail: jobDetails.contact_email,
                    jobNumber: jobDetails.number,
                    jobName: jobDetails.name,
                    customerName: jobDetails.contact_name,
                    invoiceNumber: invoiceNumber,
                    amount: 180.00,
                    issuedDate: new Date().toISOString().split('T')[0],
                    dueDate: dueDate.toISOString().split('T')[0],
                    jobItems: [{
                      name: 'Inspection Fee',
                      quantity: 1,
                      total_cost: 180.00
                    }],
                    invoiceType: 'inspection'
                  })
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  console.warn('Email service warning:', errorData.error || 'Failed to send invoice email');
                  // Don't throw here, just log the warning - the invoice is still created
                }
              } catch (emailErr) {
                // Log the email error but don't fail the whole operation
                console.warn('Email sending failed, but invoice was created:', emailErr);
              }
              
              setInvoiceCreated(true);
              console.log('Invoice created successfully');
              
            } catch (err) {
              console.error('Error creating inspection invoice:', err);
              // Still set invoiceCreated to true so the user knows an invoice was generated
              // even if there was an error with some part of the process
              setInvoiceCreated(true);
            } finally {
              setIsCreatingInvoice(false);
            }
          }
        }
      } catch (err) {
        console.error('Error confirming quote:', err);
        setError(err instanceof Error ? err.message : 'Failed to confirm quote');
      } finally {
        setIsLoading(false);
      }
    };

    confirmQuote();
  }, [supabase, token, approved, jobDetails]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Processing your request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-error-100 rounded-full p-3">
              <AlertTriangle className="h-12 w-12 text-error-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">Quote Confirmation Failed</h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="flex justify-center">
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success && jobDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex justify-center mb-6">
            <div className={`${approved ? 'bg-success-100' : 'bg-error-100'} rounded-full p-3`}>
              {approved ? (
                <CheckCircle className="h-12 w-12 text-success-600" />
              ) : (
                <XCircle className="h-12 w-12 text-error-600" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">
            {approved ? 'Repairs Approved' : 'Repairs Declined'}
          </h1>
          <p className="text-gray-600 text-center mb-6">
            {approved 
              ? 'Thank you for approving the repairs. We will contact you shortly to schedule the service.'
              : 'You have declined the repairs. An invoice for the inspection fee ($180.00) has been generated and will be sent to your email.'}
          </p>
          
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              Inspection Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Job Information</h3>
                <p className="text-gray-600">{jobDetails.name}</p>
                <p className="text-gray-600">Job #{jobDetails.number}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-gray-600">{jobDetails.locations?.companies?.name}</p>
                <p className="text-gray-600">{jobDetails.locations?.name}</p>
                <p className="text-gray-600">
                  {jobDetails.locations?.address}, {jobDetails.locations?.city}, {jobDetails.locations?.state} {jobDetails.locations?.zip}
                </p>
                {jobDetails.units && <p className="text-gray-600">Unit: {jobDetails.units.unit_number}</p>}
              </div>
              
              {inspectionData.length > 0 && (
                <div>
                  <h3 className="font-medium">Inspection Results</h3>
                  <div className="mt-2 space-y-4">
                    {inspectionData.map((inspection, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Model Number</p>
                            <p>{inspection.model_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Serial Number</p>
                            <p>{inspection.serial_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Age</p>
                            <p>{inspection.age || 'N/A'} years</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Tonnage</p>
                            <p>{inspection.tonnage || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Unit Type</p>
                            <p>{inspection.unit_type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">System Type</p>
                            <p>{inspection.system_type || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!approved && (
                <div className="mt-4 p-4 bg-error-50 rounded-lg border border-error-200">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-error-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-error-700">Inspection Fee</h4>
                      <p className="text-error-600">
                        Since you've declined the repairs, an invoice for the inspection fee ($180.00) has been generated.
                        {invoiceCreated && invoiceNumber && (
                          <span> Invoice #{invoiceNumber} has been created and will be sent to your email.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-center">
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If we have job details but no approval decision yet
  if (jobDetails && approved === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-100 rounded-full p-3">
              <FileText className="h-12 w-12 text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">Inspection Quote</h1>
          <p className="text-gray-600 text-center mb-6">
            Based on our inspection, we recommend proceeding with repairs. Please approve or deny the repairs below.
          </p>
          
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Job Information</h2>
            <p><strong>Job #:</strong> {jobDetails.number}</p>
            <p><strong>Service:</strong> {jobDetails.name}</p>
            
            {jobDetails.locations && (
              <div className="mt-4">
                <h3 className="font-medium">Location</h3>
                <p>{jobDetails.locations.name}</p>
                <p>{jobDetails.locations.address}</p>
                <p>{jobDetails.locations.city}, {jobDetails.locations.state} {jobDetails.locations.zip}</p>
                {jobDetails.units && <p>Unit: {jobDetails.units.unit_number}</p>}
              </div>
            )}
            
            {inspectionData.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium">Inspection Results</h3>
                <div className="mt-2 space-y-4">
                  {inspectionData.map((inspection, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Model Number</p>
                          <p>{inspection.model_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Serial Number</p>
                          <p>{inspection.serial_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Age</p>
                          <p>{inspection.age || 'N/A'} years</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Tonnage</p>
                          <p>{inspection.tonnage || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Unit Type</p>
                          <p>{inspection.unit_type || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">System Type</p>
                          <p>{inspection.system_type || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <button 
              onClick={() => setApproved(true)}
              className="btn btn-success flex-1 flex justify-center items-center"
            >
              <Check className="mr-2 h-5 w-5" />
              Approve Repairs
            </button>
            <button 
              onClick={() => setApproved(false)}
              className="btn btn-error flex-1 flex justify-center items-center"
            >
              <X className="mr-2 h-5 w-5" />
              Deny Repairs
            </button>
          </div>
          
          <p className="text-sm text-gray-500 text-center">
            By approving, you authorize Airlast HVAC to proceed with the recommended repairs.
            <br />
            By denying, you will be charged $180.00 for the inspection service.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default QuoteConfirmation;