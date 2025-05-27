import { useState } from 'react';
import { Eye, Send, FileCheck, AlertTriangle } from 'lucide-react';
import { Job, JobItem } from '../../types/job';
import { useSupabase } from '../../lib/supabase-context';

type JobQuoteSectionProps = {
  job: Job;
  jobItems: JobItem[];
  onQuoteSent: (updatedJob: Job) => void;
  onPreviewQuote: () => void;
  quoteNeedsUpdate: boolean;
};

const JobQuoteSection = ({ 
  job, 
  jobItems, 
  onQuoteSent, 
  onPreviewQuote,
  quoteNeedsUpdate
}: JobQuoteSectionProps) => {
  const { supabase } = useSupabase();
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState(job.contact_email || '');

  // Calculate total cost
  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  const handleSendQuote = async () => {
    if (!supabase || !job || !customerEmail) {
      setQuoteError('Customer email is required to send a quote');
      return;
    }
    
    setIsSendingQuote(true);
    setQuoteError(null);
    
    try {
      // Generate a unique token for quote confirmation
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Update job with token and quote sent status
      const { data: updatedJob, error: updateError } = await supabase
        .from('jobs')
        .update({
          quote_token: token,
          quote_sent: true,
          quote_sent_at: new Date().toISOString(),
          contact_email: customerEmail // Update with potentially edited email
        })
        .eq('id', job.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Call the Supabase Edge Function to send the email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId: job.id,
          customerEmail: customerEmail,
          quoteToken: token,
          jobNumber: job.number,
          jobName: job.name,
          customerName: job.contact_name,
          totalAmount: calculateTotalCost().toFixed(2),
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send quote email');
      }
      
      // Update parent component with the updated job
      if (updatedJob) {
        onQuoteSent(updatedJob);
      }
      
      setShowSendQuoteModal(false);
      
    } catch (err) {
      console.error('Error sending quote:', err);
      setQuoteError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setIsSendingQuote(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Quote</h2>
        <div className="flex gap-2">
          <button
            onClick={onPreviewQuote}
            className="btn btn-secondary"
          >
            <Eye size={16} className="mr-2" />
            Preview Quote
          </button>
          {!job.quote_sent ? (
            <button
              onClick={() => {
                setCustomerEmail(job.contact_email || '');
                setShowSendQuoteModal(true);
              }}
              className="btn btn-primary"
              disabled={jobItems.length === 0}
            >
              <Send size={16} className="mr-2" />
              Send Quote
            </button>
          ) : (
            <button
              className={`btn ${quoteNeedsUpdate ? 'btn-warning' : 'btn-success'}`}
              onClick={() => {
                setCustomerEmail(job.contact_email || '');
                setShowSendQuoteModal(true);
              }}
            >
              <FileCheck size={16} className="mr-2" />
              {quoteNeedsUpdate ? 'Update Quote' : 'Resend Quote'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {job.quote_sent ? (
          <div className={`${quoteNeedsUpdate ? 'bg-warning-50 border-warning-500' : 'bg-success-50 border-success-500'} border-l-4 p-4 rounded-md`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <FileCheck className={`h-5 w-5 ${quoteNeedsUpdate ? 'text-warning-500' : 'text-success-500'}`} />
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${quoteNeedsUpdate ? 'text-warning-800' : 'text-success-800'}`}>
                  {quoteNeedsUpdate ? 'Quote Needs Update' : 'Quote Sent'}
                </h3>
                <div className={`mt-2 text-sm ${quoteNeedsUpdate ? 'text-warning-700' : 'text-success-700'}`}>
                  <p>
                    Quote was sent to {job.contact_email} on {job.quote_sent_at ? new Date(job.quote_sent_at).toLocaleString() : 'N/A'}.
                  </p>
                  {quoteNeedsUpdate && (
                    <p className="mt-1 font-medium">
                      Items have been modified since the quote was sent. Consider sending an updated quote.
                    </p>
                  )}
                  {job.quote_confirmed ? (
                    <p className="mt-1">
                      <span className="font-medium">Quote was confirmed</span> on {job.quote_confirmed_at ? new Date(job.quote_confirmed_at).toLocaleString() : 'N/A'}.
                    </p>
                  ) : (
                    <p className="mt-1">
                      Waiting for customer confirmation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600">
              {jobItems.length === 0 ? (
                "Add items to the job before sending a quote."
              ) : (
                "Ready to send quote to customer."
              )}
            </p>
          </div>
        )}
      </div>

      {/* Send Quote Modal */}
      {showSendQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <Send size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              {job.quote_sent && quoteNeedsUpdate ? 'Update Quote' : job.quote_sent ? 'Resend Quote' : 'Send Quote to Customer'}
            </h3>
            
            {quoteError && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {quoteError}
              </div>
            )}
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                {job.quote_sent && quoteNeedsUpdate 
                  ? `This will send an updated quote for Job #${job.number} to the customer via email.`
                  : job.quote_sent
                  ? `This will resend the quote for Job #${job.number} to the customer via email.`
                  : `This will send a quote for Job #${job.number} to the customer via email.`} 
                The quote will include all items and pricing information.
              </p>
              
              <div className="space-y-4">
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
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{job.contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">${calculateTotalCost().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSendQuoteModal(false)}
                disabled={isSendingQuote}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSendQuote}
                disabled={isSendingQuote || !customerEmail}
              >
                {isSendingQuote ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    {job.quote_sent && quoteNeedsUpdate ? 'Update Quote' : job.quote_sent ? 'Resend Quote' : 'Send Quote'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobQuoteSection;