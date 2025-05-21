import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { CheckCircle, AlertTriangle, FileText, ArrowLeft } from 'lucide-react';

const QuoteConfirmation = () => {
  const { token } = useParams<{ token: string }>();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);

  useEffect(() => {
    const confirmQuote = async () => {
      if (!supabase || !token) {
        setError('Invalid confirmation link');
        setIsLoading(false);
        return;
      }

      try {
        // Find the job with this token
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
            job_items (*)
          `)
          .eq('quote_token', token)
          .single();

        if (jobError) {
          throw new Error('Invalid or expired confirmation link');
        }

        if (!jobData) {
          throw new Error('Quote not found');
        }

        // If already confirmed, just show success
        if (jobData.quote_confirmed) {
          setJobDetails(jobData);
          setSuccess(true);
          setIsLoading(false);
          return;
        }

        // Update the job to mark quote as confirmed
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            quote_confirmed: true,
            quote_confirmed_at: new Date().toISOString()
          })
          .eq('id', jobData.id);

        if (updateError) throw updateError;

        setJobDetails(jobData);
        setSuccess(true);
      } catch (err) {
        console.error('Error confirming quote:', err);
        setError(err instanceof Error ? err.message : 'Failed to confirm quote');
      } finally {
        setIsLoading(false);
      }
    };

    confirmQuote();
  }, [supabase, token]);

  // Calculate total cost
  const calculateTotalCost = () => {
    if (!jobDetails?.job_items) return 0;
    return jobDetails.job_items.reduce((total: number, item: any) => total + Number(item.total_cost), 0);
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
          </p>
          
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
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
                      {jobDetails.job_items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">{item.name}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">${Number(item.total_cost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td className="px-4 py-2" colSpan={2}>Total</td>
                        <td className="px-4 py-2 text-right">${calculateTotalCost().toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
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

  return null;
};

export default QuoteConfirmation;