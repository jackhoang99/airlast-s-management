import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';
import { Eye, Send, FileCheck2, AlertTriangle, Check, X, Clipboard, Home, Package, Edit, List, FileText } from 'lucide-react';
import SendEmailModal from './SendEmailModal';
import QuoteEmailTemplateModal from './QuoteEmailTemplateModal';

type JobQuoteSectionProps = {
  job: Job;
  jobItems: JobItem[];
  onQuoteSent: (updatedJob: Job) => void;
  onPreviewQuote: (quoteType: 'repair' | 'replacement') => void;
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
  const [activeTab, setActiveTab] = useState<'repair' | 'replacement' | 'all'>('repair');
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [hasRepairData, setHasRepairData] = useState(false);
  const [hasReplacementData, setHasReplacementData] = useState(false);
  const [repairData, setRepairData] = useState<any | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [location, setLocation] = useState<any | null>(null);
  const [unit, setUnit] = useState<any | null>(null);
  const [allQuotes, setAllQuotes] = useState<any[]>([]);
  const [emailTemplate, setEmailTemplate] = useState({
    subject: 'Repair Quote from Airlast HVAC',
    greeting: 'Dear Customer,',
    introText: 'Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a repair quote for your review.',
    approvalText: 'Please click one of the buttons below to approve or deny the recommended repairs:',
    approveButtonText: 'Approve Repairs',
    denyButtonText: 'Deny Repairs',
    approvalNote: 'If you approve, we will schedule the repair work at your earliest convenience.',
    denialNote: 'If you deny, you will be charged $180.00 for the inspection service.',
    closingText: 'If you have any questions, please don\'t hesitate to contact us.',
    signature: 'Best regards,\nAirlast HVAC Team'
  });
  const [defaultTemplates, setDefaultTemplates] = useState<{
    repair: any | null;
    replacement: any | null;
  }>({
    repair: null,
    replacement: null
  });
  const [repairDataByInspection, setRepairDataByInspection] = useState<{[key: string]: any}>({});
  const [totalRepairCost, setTotalRepairCost] = useState(0);
  const [inspectionData, setInspectionData] = useState<any[]>([]);
  
  // New state for replacement data
  const [replacementDataByInspection, setReplacementDataByInspection] = useState<{[key: string]: any}>({});
  const [totalReplacementCost, setTotalReplacementCost] = useState(0);
  const [hasPartItems, setHasPartItems] = useState(false);

  // Check if job has repair or replacement data
  useEffect(() => {
    const checkJobData = async () => {
      if (!supabase || !job) return;

      try {
        // Fetch inspection data
        const { data: inspData, error: inspError } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', job.id)
          .eq('completed', true);
          
        if (inspError) throw inspError;
        setInspectionData(inspData || []);
        
        // Check for repair data
        const { data: repairData, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', job.id);

        if (!repairError && repairData && repairData.length > 0) {
          console.log("Found repair/replacement data:", repairData);
          
          // Store the first repair data for sending quotes
          if (repairData[0]) {
            setRepairData(repairData[0]);
            setSelectedPhase(repairData[0].selected_phase || 'phase2');
            setTotalCost(repairData[0].total_cost || 0);
          }
          
          // Organize repair data by inspection_id
          const repairDataMap: {[key: string]: any} = {};
          let totalRepairCostSum = 0;
          
          repairData.forEach(item => {
            if (item.inspection_id) {
              // For repair data
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
                totalCost: item.total_cost,
                created_at: item.created_at
              };
              
              totalRepairCostSum += Number(item.total_cost || 0);
            }
          });
          
          setRepairDataByInspection(repairDataMap);
          setTotalRepairCost(totalRepairCostSum);
          
          // Check if we have part items to determine if replacement is available
          const hasPartItems = jobItems.some(item => item.type === 'part');
          setHasPartItems(hasPartItems);
          
          // Set availability flags
          setHasRepairData(Object.keys(repairDataMap).length > 0);
          setHasReplacementData(hasPartItems);
        } else {
          console.log("No repair/replacement data found");
          if (repairError) {
            console.error("Error fetching repair data:", repairError);
          }
          
          // Check if we have part items to determine if replacement is available
          const hasPartItems = jobItems.some(item => item.type === 'part');
          setHasPartItems(hasPartItems);
          setHasReplacementData(hasPartItems);
        }
        
        // Set location and unit data for quote emails
        if (job.locations) {
          setLocation({
            name: job.locations.name,
            address: job.locations.address,
            city: job.locations.city,
            state: job.locations.state,
            zip: job.locations.zip,
            companies: job.locations.companies
          });
        }
        
        if (job.units) {
          setUnit({
            unit_number: job.units.unit_number
          });
        }

        // Fetch all quotes for this job
        const { data: quotesData, error: quotesError } = await supabase
          .from('job_quotes')
          .select('*')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false });

        if (!quotesError && quotesData) {
          setAllQuotes(quotesData);
        } else if (quotesError) {
          console.error("Error fetching quotes:", quotesError);
        }

        // Fetch default templates
        const { data: defaultEmailTemplates, error: templatesError } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('template_data->>type', 'email')
          .eq('template_data->>isDefault', 'true');

        if (!templatesError && defaultEmailTemplates) {
          const templates = {
            repair: defaultEmailTemplates.find(t => t.template_data.templateType === 'repair') || null,
            replacement: defaultEmailTemplates.find(t => t.template_data.templateType === 'replacement') || null
          };
          
          setDefaultTemplates(templates);
          
          // Set the active template based on the current tab
          if (templates[activeTab]) {
            setEmailTemplate({
              subject: templates[activeTab].template_data.subject || emailTemplate.subject,
              greeting: templates[activeTab].template_data.greeting || emailTemplate.greeting,
              introText: templates[activeTab].template_data.introText || emailTemplate.introText,
              approvalText: templates[activeTab].template_data.approvalText || emailTemplate.approvalText,
              approveButtonText: templates[activeTab].template_data.approveButtonText || emailTemplate.approveButtonText,
              denyButtonText: templates[activeTab].template_data.denyButtonText || emailTemplate.denyButtonText,
              approvalNote: templates[activeTab].template_data.approvalNote || emailTemplate.approvalNote,
              denialNote: templates[activeTab].template_data.denialNote || emailTemplate.denialNote,
              closingText: templates[activeTab].template_data.closingText || emailTemplate.closingText,
              signature: templates[activeTab].template_data.signature || emailTemplate.signature
            });
          }
        }
      } catch (err) {
        console.error('Error checking job data:', err);
      }
    };

    checkJobData();
  }, [supabase, job, activeTab, jobItems]);

  // Calculate replacement cost from part items
  useEffect(() => {
    if (jobItems && jobItems.length > 0) {
      const partItemsTotal = jobItems
        .filter(item => item.type === 'part')
        .reduce((total, item) => total + Number(item.total_cost), 0);
      
      setTotalReplacementCost(partItemsTotal);
      setHasReplacementData(partItemsTotal > 0);
    } else {
      setTotalReplacementCost(0);
    }
  }, [jobItems]);

  const handleSaveTemplate = (template: any) => {
    setEmailTemplate(template);
    setShowTemplateModal(false);
  };

  // Update email template when tab changes
  useEffect(() => {
    if (activeTab !== 'all' && defaultTemplates[activeTab]) {
      const template = defaultTemplates[activeTab];
      setEmailTemplate({
        subject: template.template_data.subject || emailTemplate.subject,
        greeting: template.template_data.greeting || emailTemplate.greeting,
        introText: template.template_data.introText || emailTemplate.introText,
        approvalText: template.template_data.approvalText || emailTemplate.approvalText,
        approveButtonText: template.template_data.approveButtonText || emailTemplate.approveButtonText,
        denyButtonText: template.template_data.denyButtonText || emailTemplate.denyButtonText,
        approvalNote: template.template_data.approvalNote || emailTemplate.approvalNote,
        denialNote: template.template_data.denialNote || emailTemplate.denialNote,
        closingText: template.template_data.closingText || emailTemplate.closingText,
        signature: template.template_data.signature || emailTemplate.signature
      });
    }
  }, [activeTab, defaultTemplates]);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-lg font-medium">Quotes</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <Edit size={16} className="mr-2" />
            Edit Template
          </button>
          <button
            onClick={() => onPreviewQuote(activeTab === 'all' ? 'repair' : activeTab)}
            className="btn btn-secondary btn-sm"
          >
            <Eye size={16} className="mr-2" />
            Preview Quote
          </button>
          {!job.quote_sent ? (
            <button
              onClick={() => {
                setShowSendQuoteModal(true);
              }}
              className="btn btn-primary btn-sm"
              disabled={(activeTab === 'repair' && !hasRepairData) || 
                       (activeTab === 'replacement' && !hasReplacementData) ||
                       activeTab === 'all'}
            >
              <Send size={16} className="mr-2" />
              Send Quote
            </button>
          ) : (
            <button 
              className={`btn btn-sm ${quoteNeedsUpdate ? 'btn-warning' : 'btn-success'}`}
              onClick={() => {
                setShowSendQuoteModal(true);
              }}
              disabled={activeTab === 'all'}
            >
              <FileCheck2 size={16} className="mr-2" />
              {quoteNeedsUpdate ? 'Update Quote' : 'Resend Quote'}
            </button>
          )}
        </div>
      </div>

      {/* Quote Type Tabs */}
      <div className="mb-6 flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('repair')}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'repair'
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center">
            <Home size={16} className="mr-2" />
            Repair Quote
          </div>
        </button>
        <button
          onClick={() => setActiveTab('replacement')}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'replacement'
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center">
            <Package size={16} className="mr-2" />
            Replacement Quote
          </div>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'all'
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center">
            <List size={16} className="mr-2" />
            All Quotes
          </div>
        </button>
      </div>

      {/* Quote Content Based on Active Tab */}
      <div className="space-y-4">
        {activeTab === 'repair' && (
          <div>
            {hasRepairData ? (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Home className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Repair Data Available
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Repair data is available for this job. You can send a repair quote to the customer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-600 text-center">
                  No repair data available. Complete a repair assessment first before sending a repair quote.
                </p>
              </div>
            )}

            {job.quote_sent && job.quote_confirmed && (
              <div className="mt-4 bg-success-50 border-l-4 border-success-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-success-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-success-800">
                      Quote Confirmed
                    </h3>
                    <div className="mt-2 text-sm text-success-700">
                      <p>
                        <span className="font-medium">Quote was confirmed</span> on {job.quote_confirmed_at ? new Date(job.quote_confirmed_at).toLocaleString() : 'N/A'}.
                      </p>
                      <p className="mt-1">
                        <span className="font-medium">
                          Customer {job.repair_approved ? (
                            <span className="text-success-700">approved repairs</span>
                          ) : (
                            <span className="text-error-700">declined repairs</span>
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'replacement' && (
          <div>
            {hasReplacementData ? (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Replacement Data Available
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        {hasPartItems ? 
                          "Replacement parts have been added to this job. You can send a replacement quote to the customer." :
                          "Replacement data is available for this job. You can send a replacement quote to the customer."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-600 text-center">
                  No replacement data available. Add replacement parts or complete a replacement assessment first before sending a replacement quote.
                </p>
              </div>
            )}

            {job.quote_sent && job.quote_confirmed && (
              <div className="mt-4 bg-success-50 border-l-4 border-success-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-success-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-success-800">
                      Quote Confirmed
                    </h3>
                    <div className="mt-2 text-sm text-success-700">
                      <p>
                        <span className="font-medium">Quote was confirmed</span> on {job.quote_confirmed_at ? new Date(job.quote_confirmed_at).toLocaleString() : 'N/A'}.
                      </p>
                      <p className="mt-1">
                        <span className="font-medium">
                          Customer {job.repair_approved ? (
                            <span className="text-success-700">approved replacement</span>
                          ) : (
                            <span className="text-error-700">declined replacement</span>
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            <h3 className="text-md font-medium mb-3">Quote History</h3>
            {allQuotes.length > 0 ? (
              <div className="space-y-4">
                {allQuotes.map((quote, index) => (
                  <div key={quote.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FileText size={16} className="text-gray-500" />
                          <span className="font-medium">Quote #{quote.quote_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            quote.confirmed ? 'bg-success-100 text-success-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {quote.confirmed ? 'Confirmed' : 'Sent'}
                          </span>
                          {quote.confirmed && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              quote.approved ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                            }`}>
                              {quote.approved ? 'Approved' : 'Declined'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {quote.quote_type.charAt(0).toUpperCase() + quote.quote_type.slice(1)} Quote
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Sent on {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                        {quote.confirmed_at && (
                          <p className="text-sm text-gray-500">
                            Confirmed on {new Date(quote.confirmed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${Number(quote.amount).toFixed(2)}</p>
                        <button
                          onClick={() => {
                            // View quote details
                          }}
                          className="text-sm text-primary-600 hover:text-primary-800 mt-2"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md text-center">
                <p className="text-gray-600">No quotes have been sent for this job yet.</p>
              </div>
            )}
          </div>
        )}

        {/* General Quote Status */}
        {job.quote_sent && !job.quote_confirmed && activeTab !== 'all' && (
          <div className={`${quoteNeedsUpdate ? 'bg-warning-50 border-warning-500' : 'bg-blue-50 border-blue-500'} border-l-4 p-4 rounded-md`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <FileCheck2 className={`h-5 w-5 ${quoteNeedsUpdate ? 'text-warning-500' : 'text-blue-500'}`} />
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${quoteNeedsUpdate ? 'text-warning-800' : 'text-blue-800'}`}>
                  {quoteNeedsUpdate ? 'Quote Needs Update' : 'Quote Sent'}
                </h3>
                <div className={`mt-2 text-sm ${quoteNeedsUpdate ? 'text-warning-700' : 'text-blue-700'}`}>
                  <p>
                    Quote was sent to {job.contact_email} on {job.quote_sent_at ? new Date(job.quote_sent_at).toLocaleString() : 'N/A'}.
                  </p>
                  {quoteNeedsUpdate && (
                    <p className="mt-1 font-medium">
                      Items have been modified since the quote was sent. Consider sending an updated quote.
                    </p>
                  )}
                  {!quoteNeedsUpdate && (
                    <p className="mt-1">
                      Waiting for customer confirmation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!job.quote_sent && activeTab !== 'all' && (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600">
              {jobItems.length === 0 ? (
                "Add service before sending a quote."
              ) : (
                "Ready to send quote to customer."
              )}
            </p>
          </div>
        )}
      </div>

      {/* Send Quote Modal */}
      <SendEmailModal
        isOpen={showSendQuoteModal}
        onClose={() => setShowSendQuoteModal(false)}
        jobId={job.id}
        jobNumber={job.number}
        jobName={job.name}
        customerName={job.contact_name || undefined}
        initialEmail={job.contact_email || ''}
        repairData={repairData}
        selectedPhase={selectedPhase || undefined}
        totalCost={activeTab === 'repair' ? totalRepairCost : totalReplacementCost}
        location={location}
        unit={unit}
        quoteType={activeTab === 'all' ? 'repair' : activeTab}
        onEmailSent={() => {
          if (job) {
            onQuoteSent({
              ...job,
              quote_sent: true,
              quote_sent_at: new Date().toISOString()
            });
          }
        }}
        emailTemplate={emailTemplate}
        repairDataByInspection={activeTab === 'repair' ? repairDataByInspection : {}}
      />

      {/* Quote Email Template Modal */}
      <QuoteEmailTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        template={emailTemplate}
        onSave={handleSaveTemplate}
        templateType={activeTab === 'all' ? 'repair' : activeTab}
      />
    </div>
  );
};

export default JobQuoteSection;