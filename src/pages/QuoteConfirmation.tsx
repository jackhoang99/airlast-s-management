import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { CheckCircle, AlertTriangle, FileText, ArrowLeft, Download, Eye, Printer } from 'lucide-react';
import QuotePDFTemplate from '../components/quotes/QuotePDFTemplate';

type JobItem = {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  type: string;
};

const QuoteConfirmation = () => {
  const { token } = useParams<{ token: string }>();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [showQuotePDF, setShowQuotePDF] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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

          // Fetch job items
          const { data: itemsData, error: itemsError } = await supabase
            .from('job_items')
            .select('*')
            .eq('job_id', jobData.id)
            .order('created_at');

          if (itemsError) {
            console.error('Error fetching items:', itemsError);
            throw itemsError;
          }
          setJobItems(itemsData || []);

          // If already confirmed, just return success
          if (jobData.quote_confirmed) {
            setSuccess(true);
            setIsLoading(false);
            return;
          }
        }

        // Call the Supabase Edge Function to confirm the quote
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-quote`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response from confirm-quote:', errorData);
          throw new Error(errorData.error || 'Failed to confirm quote');
        }
        
        const result = await response.json();
        setSuccess(true);

        // Send confirmation email to customer
        if (jobDetails && jobDetails.contact_email) {
          await sendConfirmationEmail();
        }
      } catch (err) {
        console.error('Error confirming quote:', err);
        setError(err instanceof Error ? err.message : 'Failed to confirm quote');
      } finally {
        setIsLoading(false);
      }
    };

    confirmQuote();
  }, [supabase, token]);

  const sendConfirmationEmail = async () => {
    if (!jobDetails || !jobDetails.contact_email) return;

    try {
      // Call the Supabase Edge Function to send the confirmation email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-confirmation-email`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId: jobDetails.id,
          customerEmail: jobDetails.contact_email,
          jobNumber: jobDetails.number,
          jobName: jobDetails.name,
          customerName: jobDetails.contact_name,
          totalAmount: calculateTotalCost().toFixed(2),
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error sending confirmation email:', errorData.error);
        return;
      }
      
      setEmailSent(true);
    } catch (err) {
      console.error('Error sending confirmation email:', err);
    }
  };

  // Calculate total cost
  const calculateTotalCost = () => {
    if (!jobItems) return 0;
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Processing your quote confirmation...</p>
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

  if (showQuotePDF && jobDetails) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setShowQuotePDF(false)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Confirmation
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-primary"
          >
            <Printer size={16} className="mr-2" />
            Print Quote
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <QuotePDFTemplate job={jobDetails} jobItems={jobItems} />
        </div>
      </div>
    );
  }

  if (success && jobDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-success-100 rounded-full p-3">
              <CheckCircle className="h-12 w-12 text-success-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">Quote Confirmed</h1>
          <p className="text-gray-600 text-center mb-6">
            Thank you for confirming your quote. We'll be in touch shortly to schedule your service.
            {emailSent && <span className="block mt-2 text-success-600">A confirmation email has been sent to your email address.</span>}
          </p>
          
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              Quote Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Job Information</h3>
                <p className="text-gray-600">{jobDetails.name}</p>
                <p className="text-gray-600">{jobDetails.description}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-gray-600">{jobDetails.locations?.companies?.name}</p>
                <p className="text-gray-600">{jobDetails.locations?.name}</p>
                <p className="text-gray-600">
                  {jobDetails.locations?.address}, {jobDetails.locations?.city}, {jobDetails.locations?.state} {jobDetails.locations?.zip}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Items</h3>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {jobItems?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">{item.name}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">${Number(item.total_cost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td className="px-4 py-2" colSpan={2} align="right">Total:</td>
                        <td className="px-4 py-2 text-right">${calculateTotalCost().toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowQuotePDF(true)}
              className="btn btn-secondary"
            >
              <Eye size={16} className="mr-2" />
              View Quote PDF
            </button>
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuoteConfirmation;