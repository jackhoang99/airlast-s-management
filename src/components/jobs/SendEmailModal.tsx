// src/components/jobs/SendEmailModal.tsx
import { useState } from 'react';
import { Send, Mail } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';

type SendEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobNumber: string;
  jobName: string;
  customerName?: string;
  initialEmail?: string;
  inspectionData?: any[];
  repairData?: any;
  allRepairData?: any[];
  selectedPhase?: string;
  totalCost?: number;
  location?: any;
  unit?: any;
  quoteType?: 'inspection' | 'repair' | 'replacement';
  onEmailSent?: () => void;
  repairDataByInspection?: { [key: string]: any };
  emailTemplate?: {
    subject: string;
    greeting: string;
    introText: string;
    approvalText: string;
    approveButtonText: string;
    denyButtonText: string;
    approvalNote: string;
    denialNote: string;
    closingText: string;
    signature: string;
  };
};

const SendEmailModal = ({
  isOpen,
  onClose,
  jobId,
  jobNumber,
  jobName,
  customerName,
  initialEmail = '',
  inspectionData = [],
  repairData,
  allRepairData = [],
  selectedPhase,
  totalCost = 0,
  location,
  unit,
  quoteType = 'inspection',
  onEmailSent,
  repairDataByInspection = {},
  emailTemplate
}: SendEmailModalProps) => {
  const { supabase } = useSupabase();
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(`QT-${jobNumber}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate the actual total cost from all repair data
  const calculateActualTotalCost = () => {
    if (repairDataByInspection && Object.keys(repairDataByInspection).length > 0) {
      return Object.values(repairDataByInspection).reduce(
        (sum, data: any) => sum + Number(data.totalCost || 0),
        0
      );
    }
    return totalCost;
  };

  const actualTotalCost = calculateActualTotalCost();

  const handleSendQuote = async () => {
    if (!supabase || !jobId || !customerEmail) {
      setError('Customer email is required to send a quote');
      return;
    }

    setIsSending(true);
    setError(null);

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
        .eq('id', jobId)
        .select()
        .single();

      if (updateError) throw updateError;

      // First, generate the PDF
      // 1. Get the PDF template for this quote type
      const { data: templateData, error: templateError } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', 'pdf')
        .eq('template_data->>templateType', quoteType)
        .eq('template_data->>isDefault', 'true')
        .maybeSingle();
          
      if (templateError) throw templateError;
      
      if (!templateData) {
        throw new Error(`No default PDF template found for ${quoteType} quotes. Please upload a template and set it as default.`);
      }
      
      // 2. Call the edge function to generate the PDF
      const generatePdfUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quote-pdf`;
      
      const generateResponse = await fetch(generatePdfUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId,
          quoteType,
          quoteNumber,
          templateId: templateData.id,
          jobData: updatedJob,
          inspectionData,
          repairData,
          jobItems: []
        })
      });
      
      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }
      
      const generateResult = await generateResponse.json();
      
      if (!generateResult.pdfUrl) {
        throw new Error('No PDF URL returned from the server');
      }
      
      setPdfUrl(generateResult.pdfUrl);

      // Create a record in the job_quotes table
      const { error: quoteError } = await supabase
        .from('job_quotes')
        .insert({
          job_id: jobId,
          quote_number: quoteNumber,
          quote_type: quoteType,
          amount: actualTotalCost,
          token: token,
          confirmed: false,
          approved: false,
          email: customerEmail
        });

      if (quoteError) {
        console.error("Error creating quote record:", quoteError);
        // Continue anyway as this is not critical
      }

      // Call the appropriate Supabase Edge Function based on quote type
      let apiUrl;
      let requestBody;

      if (quoteType === 'inspection') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-inspection-quote`;
        
        requestBody = {
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber,
          jobName,
          customerName,
          inspectionData: inspectionData || [],
          location,
          unit,
          quoteNumber,
          emailTemplate,
          pdfUrl: generateResult.pdfUrl
        };
      } else if (quoteType === 'repair') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-repair-quote`;
        
        // Get all repair data for all inspections
        const { data: allRepairData, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', jobId);
          
        if (repairError) throw repairError;
        
        // Format repair data for the API
        const formattedRepairData = repairData ? {
          ...repairData,
          phase1: {
            ...repairData.phase1,
            cost: Number(repairData.phase1.cost) || 0,
          },
          phase2: {
            ...repairData.phase2,
            cost: Number(repairData.phase2.cost) || 0,
          },
          phase3: {
            ...repairData.phase3,
            cost: Number(repairData.phase3.cost) || 0,
          },
          labor: Number(repairData.labor) || 0,
          refrigerationRecovery: Number(repairData.refrigeration_recovery) || 0,
          startUpCosts: Number(repairData.start_up_costs) || 0,
          accessories: repairData.accessories.map((item: any) => ({
            name: item.name,
            cost: Number(item.cost) || 0,
          })),
          thermostatStartup: Number(repairData.thermostat_startup) || 0,
          removalCost: Number(repairData.removal_cost) || 0,
          additionalItems: repairData.additional_items.map((item: any) => ({
            name: item.name,
            cost: Number(item.cost) || 0,
          })),
          permitCost: Number(repairData.permit_cost) || 0,
        } : null;
        
        requestBody = {
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber,
          jobName,
          customerName,
          inspectionData: inspectionData || [],
          repairData: formattedRepairData,
          allRepairData: allRepairData || [],
          selectedPhase,
          totalCost: actualTotalCost,
          location,
          unit,
          quoteNumber,
          emailTemplate,
          pdfUrl: generateResult.pdfUrl
        };
      } else if (quoteType === 'replacement') {
        // For replacement, use the same endpoint as repair but specify it's a replacement
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-repair-quote`;
        
        // Get all repair data for all inspections
        const { data: allRepairData, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', jobId);
          
        if (repairError) throw repairError;
        
        // Format repair data for the API
        const formattedRepairData = repairData ? {
          ...repairData,
          phase1: {
            ...repairData.phase1,
            cost: Number(repairData.phase1.cost) || 0,
          },
          phase2: {
            ...repairData.phase2,
            cost: Number(repairData.phase2.cost) || 0,
          },
          phase3: {
            ...repairData.phase3,
            cost: Number(repairData.phase3.cost) || 0,
          },
          labor: Number(repairData.labor) || 0,
          refrigerationRecovery: Number(repairData.refrigeration_recovery) || 0,
          startUpCosts: Number(repairData.start_up_costs) || 0,
          accessories: repairData.accessories.map((item: any) => ({
            name: item.name,
            cost: Number(item.cost) || 0,
          })),
          thermostatStartup: Number(repairData.thermostat_startup) || 0,
          removalCost: Number(repairData.removal_cost) || 0,
          additionalItems: repairData.additional_items.map((item: any) => ({
            name: item.name,
            cost: Number(item.cost) || 0,
          })),
          permitCost: Number(repairData.permit_cost) || 0,
        } : null;
        
        requestBody = {
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber,
          jobName,
          customerName,
          inspectionData: inspectionData || [],
          repairData: formattedRepairData,
          allRepairData: allRepairData || [],
          selectedPhase,
          totalCost: actualTotalCost,
          location,
          unit,
          quoteNumber,
          quoteType: 'replacement', // Explicitly set quote type to replacement
          emailTemplate,
          pdfUrl: generateResult.pdfUrl
        };
      } else {
        // Regular quote
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`;
        
        requestBody = {
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber,
          jobName,
          customerName,
          totalAmount: actualTotalCost.toFixed(2) || "0.00",
          jobItems: [],
          quoteNumber,
          emailTemplate,
          pdfUrl: generateResult.pdfUrl
        };
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send quote email');
      }
      
      setSuccess(true);
      
      // Notify parent component
      if (onEmailSent) {
        onEmailSent();
      }
      
      // Close modal after a delay
      setTimeout(() => {
        onClose();
        // Refresh the page to show updated status
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-center text-primary-600 mb-4">
          <Send size={40} />
        </div>
        <h3 className="text-lg font-semibold text-center mb-4">
          {quoteType === 'repair' ? 'Send Repair Quote' : 
           quoteType === 'replacement' ? 'Send Replacement Quote' : 
           'Send Inspection Quote'}
        </h3>
        
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="bg-success-50 text-success-700 p-4 rounded-md text-center">
            <p className="font-medium">Quote sent successfully!</p>
            <p className="text-sm mt-2">The customer will receive an email with the quote details.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will send a {quoteType} quote for Job #{jobNumber} to the customer via email.
                The quote will include all relevant information based on the selected quote type.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="quoteNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Quote Number
                  </label>
                  <input
                    type="text"
                    id="quoteNumber"
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                
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
                    <span className="text-gray-600">Quote Type:</span>
                    <span className="font-medium capitalize">{quoteType} Quote</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{customerName || 'Not specified'}</span>
                  </div>
                  {quoteType === 'repair' && (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Inspections:</span>
                        <span className="font-medium">
                          {inspectionData?.length || 0} inspection(s)
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Repair Options:</span>
                        <span className="font-medium">
                          {repairDataByInspection ? Object.keys(repairDataByInspection).length : 0} option(s)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">${actualTotalCost.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {quoteType === 'replacement' && (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Inspections:</span>
                        <span className="font-medium">
                          {inspectionData?.length || 0} inspection(s)
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Replacement Options:</span>
                        <span className="font-medium">
                          {repairDataByInspection ? Object.keys(repairDataByInspection).length : 0} option(s)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">${actualTotalCost.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {quoteType === 'inspection' && inspectionData && inspectionData.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Inspection:</span>
                      <span className="font-medium">Available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSending}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSendQuote}
                disabled={isSending || !customerEmail}
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Quote
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SendEmailModal;
