import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';
import { X, FileInput as FileInvoice, Plus, AlertTriangle, DollarSign, Send, Printer, Eye, Mail, Check } from 'lucide-react';

type SendEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobNumber: string;
  jobName: string;
  customerName?: string;
  initialEmail: string;
  repairData?: any;
  allRepairData?: any[];
  selectedPhase?: string;
  totalCost?: number;
  location?: any;
  unit?: any;
  quoteType?: 'repair' | 'replacement';
  onEmailSent?: () => void;
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
  repairDataByInspection?: {[key: string]: any};
  replacementItems?: any[];
};

const SendEmailModal = ({
  isOpen,
  onClose,
  jobId,
  jobNumber,
  jobName,
  customerName,
  initialEmail = '',
  repairData,
  allRepairData = [],
  selectedPhase,
  totalCost = 0,
  location,
  unit,
  quoteType = 'repair',
  onEmailSent,
  emailTemplate,
  repairDataByInspection = {},
  replacementItems = []
}: SendEmailModalProps) => {
  const { supabase } = useSupabase();
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(`QT-${jobNumber}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [inspectionData, setInspectionData] = useState<any[]>([]);

  // Fetch job items and inspection data when modal opens
  useEffect(() => {
    if (isOpen && supabase && jobId) {
      const fetchData = async () => {
        try {
          // Fetch job items
          const { data: itemsData, error: itemsError } = await supabase
            .from('job_items')
            .select('*')
            .eq('job_id', jobId);
            
          if (itemsError) throw itemsError;
          setJobItems(itemsData || []);
          
          // Fetch inspection data
          const { data: inspData, error: inspError } = await supabase
            .from('job_inspections')
            .select('*')
            .eq('job_id', jobId)
            .eq('completed', true);
            
          if (inspError) throw inspError;
          setInspectionData(inspData || []);
        } catch (err) {
          console.error('Error fetching data:', err);
        }
      };
      
      fetchData();
    }
  }, [isOpen, supabase, jobId]);

  // Calculate the actual total cost from all repair data
  const calculateActualTotalCost = () => {
    // For repair quotes, use the total from repair data by inspection
    if (quoteType === 'repair' && repairDataByInspection && Object.keys(repairDataByInspection).length > 0) {
      return Object.values(repairDataByInspection).reduce(
        (sum, data: any) => sum + Number(data.totalCost || 0),
        0
      );
    }
    
    // For replacement quotes, use the total cost of part items
    if (quoteType === 'replacement') {
      const partItemsTotal = jobItems
        .filter(item => item.type === 'part')
        .reduce((total, item) => total + Number(item.total_cost), 0);
      
      return partItemsTotal || totalCost || 0;
    }
    
    return totalCost || 0;
  };

  const actualTotalCost = calculateActualTotalCost();
  const repairOptionsCount = quoteType === 'repair' ? Object.keys(repairDataByInspection || {}).length : 0;
  const replacementOptionsCount = quoteType === 'replacement' ? jobItems.filter(item => item.type === 'part').length : 0;

  // Helper function to sanitize repair data
  const sanitizeRepairData = (data: any) => {
    if (!data) return null;
    
    return {
      phase1: data.phase1 ? {
        description: data.phase1.description || '',
        cost: Number(data.phase1.cost) || 0
      } : null,
      phase2: data.phase2 ? {
        description: data.phase2.description || '',
        cost: Number(data.phase2.cost) || 0
      } : null,
      phase3: data.phase3 ? {
        description: data.phase3.description || '',
        cost: Number(data.phase3.cost) || 0
      } : null,
      labor: Number(data.labor) || 0,
      refrigeration_recovery: Number(data.refrigeration_recovery) || 0,
      start_up_costs: Number(data.start_up_costs) || 0,
      accessories: Array.isArray(data.accessories) ? data.accessories.map((item: any) => ({
        name: item.name || '',
        cost: Number(item.cost) || 0
      })) : [],
      thermostat_startup: Number(data.thermostat_startup) || 0,
      removal_cost: Number(data.removal_cost) || 0,
      warranty: data.warranty || '',
      additional_items: Array.isArray(data.additional_items) ? data.additional_items.map((item: any) => ({
        name: item.name || '',
        cost: Number(item.cost) || 0
      })) : [],
      permit_cost: Number(data.permit_cost) || 0,
      needs_crane: Boolean(data.needsCrane),
      selected_phase: data.selectedPhase || 'phase2',
      total_cost: Number(data.totalCost) || 0,
      created_at: data.created_at || new Date().toISOString()
    };
  };

  // Helper function to sanitize location data
  const sanitizeLocationData = (data: any) => {
    if (!data) return null;
    
    return {
      name: data.name || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || ''
    };
  };

  // Helper function to sanitize unit data
  const sanitizeUnitData = (data: any) => {
    if (!data) return null;
    
    return {
      unit_number: data.unit_number || ''
    };
  };

  // Helper function to sanitize repair data by inspection
  const sanitizeRepairDataByInspection = (data: { [key: string]: any }) => {
    if (!data || typeof data !== 'object') return {};
    
    const result: { [key: string]: any } = {};
    
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeRepairData(value);
    }
    
    return result;
  };

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
          contact_email: customerEmail
        })
        .eq('id', jobId)
        .select()
        .single();

      if (updateError) throw updateError;

      // First, generate the PDF
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
      
      // Generate PDF
      const generatePdfUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quote-pdf`;
      
      // Prepare minimal job data to avoid circular references
      const minimalJobData = {
        id: updatedJob.id,
        number: updatedJob.number,
        name: updatedJob.name,
        contact_email: updatedJob.contact_email,
        locations: location ? {
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zip: location.zip,
          companies: {
            name: location.companies?.name || ''
          }
        } : null,
        units: unit ? {
          unit_number: unit.unit_number
        } : null
      };
      
      // Fetch inspection data if not already provided
      let inspData = inspectionData;
      if (inspData.length === 0) {
        const { data: fetchedInspData } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', jobId)
          .eq('completed', true);
          
        if (fetchedInspData) {
          inspData = fetchedInspData;
        }
      }
      
      // Sanitize data for the PDF generation
      const sanitizedRepairData = sanitizeRepairData(repairData);
      
      // Important: Pass repairDataByInspection to the PDF generator
      const response = await fetch(generatePdfUrl, {
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
          jobData: minimalJobData,
          inspectionData: inspData,
          repairData: sanitizedRepairData,
          jobItems: jobItems.filter(item => quoteType === 'replacement' ? item.type === 'part' : true),
          repairDataByInspection: sanitizeRepairDataByInspection(repairDataByInspection)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }
      
      const generateResult = await response.json();
      
      if (!generateResult.pdfUrl) {
        throw new Error('No PDF URL returned from the server');
      }
      
      setPdfUrl(generateResult.pdfUrl);

      // Create quote record
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
      }

      // Prepare and send email based on quote type
      let apiUrl;
      let requestBody;

      if (quoteType === 'repair' || quoteType === 'replacement') {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-repair-quote`;
        
        // Get all repair data
        const { data: fetchedRepairData, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', jobId);
          
        if (repairError) throw repairError;
        
        const sanitizedAllRepairData = fetchedRepairData ? fetchedRepairData.map(sanitizeRepairData) : [];
        
        // For replacement quotes, get all part items
        const replacementItems = quoteType === 'replacement' 
          ? jobItems.filter(item => item.type === 'part')
          : [];
        
        requestBody = {
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber,
          jobName,
          customerName,
          repairData: sanitizedRepairData,
          allRepairData: sanitizedAllRepairData,
          selectedPhase,
          totalCost: actualTotalCost,
          location: sanitizeLocationData(location),
          unit: sanitizeUnitData(unit),
          quoteNumber,
          quoteType,
          emailTemplate,
          pdfUrl: generateResult.pdfUrl,
          repairDataByInspection: quoteType === 'repair' ? 
            sanitizeRepairDataByInspection(repairDataByInspection) : {},
          replacementItems: quoteType === 'replacement' ? replacementItems : [],
          inspectionData: inspData
        };
      } else {
        apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`;
        
        requestBody = {
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber,
          jobName,
          customerName,
          totalAmount: actualTotalCost.toFixed(2),
          jobItems: [],
          quoteNumber,
          emailTemplate,
          pdfUrl: generateResult.pdfUrl,
          inspectionData: inspData
        };
      }
      
      const emailResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send quote email');
      }
      
      setSuccess(true);
      
      if (onEmailSent) {
        onEmailSent();
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-center text-primary-600 mb-4">
          <Send size={40} />
        </div>
        <h3 className="text-lg font-semibold text-center mb-4">
          {quoteType === 'repair' ? 'Send Repair Quote' : 'Send Replacement Quote'}
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
                        <span className="text-gray-600">Repair Options:</span>
                        <span className="font-medium">
                          {repairOptionsCount} option(s)
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
                        <span className="text-gray-600">Replacement Items:</span>
                        <span className="font-medium">
                          {replacementOptionsCount} item(s)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">${actualTotalCost.toLocaleString()}</span>
                      </div>
                    </>
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