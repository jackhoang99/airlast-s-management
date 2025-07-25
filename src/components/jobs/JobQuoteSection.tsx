import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  Eye,
  Send,
  FileCheck2,
  AlertTriangle,
  Package,
  Home,
  Check,
  X,
  Clipboard,
  Edit,
  List,
  Calculator,
  FileText,
} from "lucide-react";
import SendEmailModal from "./SendEmailModal";

type JobQuoteSectionProps = {
  job: Job;
  jobItems: JobItem[];
  onQuoteSent: (updatedJob: Job) => void;
  onPreviewQuote: (quoteType: "replacement" | "repair") => void;
  quoteNeedsUpdate: boolean;
  refreshTrigger?: number;
};

const JobQuoteSection = ({
  job,
  jobItems,
  onQuoteSent,
  onPreviewQuote,
  quoteNeedsUpdate,
  refreshTrigger = 0,
}: JobQuoteSectionProps) => {
  const { supabase } = useSupabase();
  const [activeTab, setActiveTab] = useState<"replacement" | "repair" | "all">(
    "replacement"
  );
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [hasReplacementData, setHasReplacementData] = useState(false);
  const [hasRepairData, setHasRepairData] = useState(false);
  const [replacementData, setReplacementData] = useState<any | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [location, setLocation] = useState<any | null>(null);
  const [unit, setUnit] = useState<any | null>(null);
  const [allQuotes, setAllQuotes] = useState<any[]>([]);
  const [emailTemplate, setEmailTemplate] = useState({
    subject: "Replacement Quote from Airlast HVAC",
    greeting: "Dear Customer,",
    introText:
      "Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a replacement quote for your review.",
    approvalText:
      "Please click one of the buttons below to approve or deny the recommended replacements:",
    approveButtonText: "Approve Replacements",
    denyButtonText: "Deny Replacements",
    approvalNote:
      "If you approve, we will schedule the replacement work at your earliest convenience.",
    denialNote:
      "If you deny, you will be charged $180.00 for the inspection service.",
    closingText:
      "If you have any questions, please don't hesitate to contact us.",
    signature: "Best regards,\nAirlast HVAC Team",
  });
  const [defaultTemplates, setDefaultTemplates] = useState<{
    replacement: any | null;
    repair: any | null;
  }>({
    replacement: null,
    repair: null,
  });
  const [replacementDataById, setReplacementDataById] = useState<{
    [key: string]: any;
  }>({});
  const [totalReplacementCost, setTotalReplacementCost] = useState<number>(0);
  const [inspectionData, setInspectionData] = useState<any[]>([]);

  // Calculate total replacement cost from all replacement data
  const calculateTotalReplacementCost = () => {
    if (Object.keys(replacementDataById).length === 0) return 0;

    return Object.values(replacementDataById).reduce((sum, data: any) => {
      return sum + Number(data.totalCost || 0);
    }, 0);
  };

  // New state for repair data
  const [repairDataById, setRepairDataById] = useState<{ [key: string]: any }>(
    {}
  );
  const [totalRepairCost, setTotalRepairCost] = useState(0);
  const [hasPartItems, setHasPartItems] = useState(false);

  // Track sent quotes by type
  const [sentQuoteTypes, setSentQuoteTypes] = useState<{
    replacement: boolean;
    repair: boolean;
  }>({
    replacement: false,
    repair: false,
  });

  // Check if job has replacement or repair data
  useEffect(() => {
    const checkJobData = async () => {
      if (!supabase || !job) return;

      try {
        // Fetch inspection data
        const { data: inspData, error: inspError } = await supabase
          .from("job_inspections")
          .select("*")
          .eq("job_id", job.id)
          .eq("completed", true);

        if (inspError) throw inspError;
        setInspectionData(inspData || []);

        // Check for replacement data
        const { data: replacementData, error: replacementError } =
          await supabase
            .from("job_replacements")
            .select("*")
            .eq("job_id", job.id);

        if (
          !replacementError &&
          replacementData &&
          replacementData.length > 0
        ) {
          console.log("Found replacement/repair data:", replacementData);

          // Store the first replacement data for sending quotes
          if (replacementData[0]) {
            setReplacementData(replacementData[0]);
            setSelectedPhase(replacementData[0].selected_phase || "phase2");
            setTotalCost(replacementData[0].total_cost || 0);
          }

          // Organize replacement data by id
          const replacementDataMap: { [key: string]: any } = {};

          // Calculate the total cost from all replacements
          const totalReplacementCostSum = replacementData.reduce(
            (sum, item) => {
              // Use the totalCost field which includes the 40% gross margin
              return sum + Number(item.total_cost || item.totalCost || 0);
            },
            0
          );

          replacementData.forEach((item) => {
            // For replacement data
            replacementDataMap[item.id] = {
              needsCrane: item.needs_crane,
              requiresPermit: item.requires_permit,
              requiresBigLadder: item.requires_big_ladder,
              phase2: item.phase2,
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
              created_at: item.created_at,
            };
          });

          setReplacementDataById(replacementDataMap);
          setTotalReplacementCost(totalReplacementCostSum);

          // Check if we have part items to determine if repair is available
          const hasPartItems = jobItems.some((item) => item.type === "part");
          setHasPartItems(hasPartItems);

          // Set availability flags
          setHasReplacementData(replacementData.length > 0);
          setHasRepairData(hasPartItems);
        } else {
          console.log("No replacement/repair data found");
          if (replacementError) {
            console.error("Error fetching replacement data:", replacementError);
          }

          // Check if we have part items to determine if repair is available
          const hasPartItems = jobItems.some((item) => item.type === "part");
          setHasPartItems(hasPartItems);
          setHasRepairData(hasPartItems);
        }

        // Set location and unit data for quote emails
        if (job.locations) {
          setLocation({
            name: job.locations.name,
            address: job.locations.address,
            city: job.locations.city,
            state: job.locations.state,
            zip: job.locations.zip,
            companies: job.locations.companies,
          });
        }

        if (job.units) {
          setUnit({
            unit_number: job.units.unit_number,
          });
        }

        // Fetch all quotes for this job
        const { data: quotesData, error: quotesError } = await supabase
          .from("job_quotes")
          .select("*")
          .eq("job_id", job.id)
          .order("created_at", { ascending: false });

        if (!quotesError && quotesData) {
          setAllQuotes(quotesData);

          // Check if we have sent quotes by type
          const sentReplacement = quotesData.some(
            (q) => q.quote_type === "replacement"
          );
          const sentRepair = quotesData.some((q) => q.quote_type === "repair");

          setSentQuoteTypes({
            replacement: sentReplacement,
            repair: sentRepair,
          });
        } else if (quotesError) {
          console.error("Error fetching quotes:", quotesError);
        }

        // Fetch default templates
        const { data: defaultEmailTemplates, error: templatesError } =
          await supabase
            .from("quote_templates")
            .select("*")
            .eq("template_data->>type", "email")
            .eq("template_data->>isDefault", "true");

        if (!templatesError && defaultEmailTemplates) {
          const templates = {
            replacement:
              defaultEmailTemplates.find(
                (t) => t.template_data.templateType === "replacement"
              ) || null,
            repair:
              defaultEmailTemplates.find(
                (t) => t.template_data.templateType === "repair"
              ) || null,
          };

          setDefaultTemplates(templates);

          // Set the active template based on the current tab
          if (templates[activeTab]) {
            setEmailTemplate({
              subject:
                templates[activeTab].template_data.subject ||
                emailTemplate.subject,
              greeting:
                templates[activeTab].template_data.greeting ||
                emailTemplate.greeting,
              introText:
                templates[activeTab].template_data.introText ||
                emailTemplate.introText,
              approvalText:
                templates[activeTab].template_data.approvalText ||
                emailTemplate.approvalText,
              approveButtonText:
                templates[activeTab].template_data.approveButtonText ||
                emailTemplate.approveButtonText,
              denyButtonText:
                templates[activeTab].template_data.denyButtonText ||
                emailTemplate.denyButtonText,
              approvalNote:
                templates[activeTab].template_data.approvalNote ||
                emailTemplate.approvalNote,
              denialNote:
                templates[activeTab].template_data.denialNote ||
                emailTemplate.denialNote,
              closingText:
                templates[activeTab].template_data.closingText ||
                emailTemplate.closingText,
              signature:
                templates[activeTab].template_data.signature ||
                emailTemplate.signature,
            });
          }
        }
      } catch (err) {
        console.error("Error checking job data:", err);
      }
    };

    checkJobData();
  }, [supabase, job, activeTab, jobItems, refreshTrigger]);

  // Calculate repair cost from part items
  useEffect(() => {
    if (jobItems && jobItems.length > 0) {
      const partItemsTotal = jobItems
        .filter((item) => item.type === "part")
        .reduce((total, item) => total + Number(item.total_cost), 0);

      setTotalRepairCost(partItemsTotal);
      setHasRepairData(partItemsTotal > 0);
    } else {
      setTotalRepairCost(0);
    }
  }, [jobItems]);

  // Update email template when tab changes
  useEffect(() => {
    if (activeTab !== "all" && defaultTemplates[activeTab]) {
      const template = defaultTemplates[activeTab];
      setEmailTemplate({
        subject: template.template_data.subject || emailTemplate.subject,
        greeting: template.template_data.greeting || emailTemplate.greeting,
        introText: template.template_data.introText || emailTemplate.introText,
        approvalText:
          template.template_data.approvalText || emailTemplate.approvalText,
        approveButtonText:
          template.template_data.approveButtonText ||
          emailTemplate.approveButtonText,
        denyButtonText:
          template.template_data.denyButtonText || emailTemplate.denyButtonText,
        approvalNote:
          template.template_data.approvalNote || emailTemplate.approvalNote,
        denialNote:
          template.template_data.denialNote || emailTemplate.denialNote,
        closingText:
          template.template_data.closingText || emailTemplate.closingText,
        signature: template.template_data.signature || emailTemplate.signature,
      });
    }
  }, [activeTab, defaultTemplates]);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() =>
              onPreviewQuote(activeTab === "all" ? "replacement" : activeTab)
            }
            className="btn btn-secondary btn-sm w-full sm:w-auto"
          >
            <Eye size={16} className="mr-2" />
            Preview Quote
          </button>
          {!job.quote_sent ||
          (activeTab === "replacement" && !sentQuoteTypes.replacement) ||
          (activeTab === "repair" && !sentQuoteTypes.repair) ? (
            <button
              onClick={() => {
                setShowSendQuoteModal(true);
              }}
              className="btn btn-primary btn-sm w-full sm:w-auto"
              disabled={
                (activeTab === "replacement" && !hasReplacementData) ||
                (activeTab === "repair" && !hasRepairData) ||
                activeTab === "all"
              }
            >
              <Send size={16} className="mr-2" />
              Send Quote
            </button>
          ) : (
            <button
              className={`btn btn-sm w-full sm:w-auto ${
                quoteNeedsUpdate ? "btn-warning" : "btn-success"
              }`}
              onClick={() => {
                setShowSendQuoteModal(true);
              }}
              disabled={activeTab === "all"}
            >
              <FileCheck2 size={16} className="mr-2" />
              {quoteNeedsUpdate ? "Update Quote" : "Resend Quote"}
            </button>
          )}
        </div>
      </div>

      {/* Quote Type Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row border-b border-gray-200 gap-2 sm:gap-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab("replacement")}
          className={`w-full sm:w-auto px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "replacement"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center">
            <Home size={16} className="mr-2" />
            Replacement Quote
            {sentQuoteTypes.replacement && (
              <span className="ml-2 w-2 h-2 bg-success-500 rounded-full"></span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("repair")}
          className={`w-full sm:w-auto px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "repair"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center">
            <Package size={16} className="mr-2" />
            Repair Quote
            {sentQuoteTypes.repair && (
              <span className="ml-2 w-2 h-2 bg-success-500 rounded-full"></span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`w-full sm:w-auto px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "all"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
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
        {activeTab === "replacement" && (
          <div>
            {hasReplacementData ? (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Home className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Replacement Data Available
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Replacement data is available for this job. You can send
                        a replacement quote to the customer.
                      </p>
                      <p className="mt-2 flex items-center font-medium">
                        <Calculator className="h-4 w-4 mr-1" />
                        <span>
                          Total Replacement Cost: $
                          {calculateTotalReplacementCost().toLocaleString()}
                        </span>
                        <span className="text-xs ml-2">
                          (Includes 40% gross margin)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-600 text-center">
                  No replacement data available. Complete a replacement
                  assessment first before sending a replacement quote.
                </p>
              </div>
            )}

            {allQuotes.some(
              (q) => q.quote_type === "replacement" && q.confirmed
            ) &&
              activeTab === "replacement" && (
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
                          <span className="font-medium">
                            Quote was confirmed
                          </span>{" "}
                          on{" "}
                          {(() => {
                            const replacementQuote = allQuotes.find(
                              (q) =>
                                q.quote_type === "replacement" && q.confirmed
                            );
                            return replacementQuote &&
                              replacementQuote.confirmed_at
                              ? new Date(
                                  replacementQuote.confirmed_at
                                ).toLocaleString()
                              : "N/A";
                          })()}
                          .
                        </p>
                        <p className="mt-1">
                          <span className="font-medium">
                            Customer{" "}
                            {(() => {
                              const replacementQuote = allQuotes.find(
                                (q) =>
                                  q.quote_type === "replacement" && q.confirmed
                              );
                              return replacementQuote &&
                                replacementQuote.approved ? (
                                <span className="text-success-700">
                                  approved replacements
                                </span>
                              ) : (
                                <span className="text-error-700">
                                  declined replacements
                                </span>
                              );
                            })()}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === "repair" && (
          <div>
            {hasRepairData ? (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Repair Data Available
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        {hasPartItems
                          ? "Repair parts have been added to this job. You can send a repair quote to the customer."
                          : "Repair data is available for this job. You can send a repair quote to the customer."}
                      </p>
                      <p className="mt-2 flex items-center">
                        <Calculator className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          Total Repair Cost: ${totalRepairCost.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-600 text-center">
                  No repair data available. Complete a repair assessment first
                  before sending a repair quote.
                </p>
              </div>
            )}

            {/* Only show repair approval status if a repair quote was confirmed */}
            {allQuotes.some((q) => q.quote_type === "repair" && q.confirmed) &&
              activeTab === "repair" && (
                <div className="mt-4 bg-success-50 border-l-4 border-success-500 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-success-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-success-800">
                        Repair Quote Confirmed
                      </h3>
                      <div className="mt-2 text-sm text-success-700">
                        <p>
                          <span className="font-medium">
                            Repair quote was confirmed
                          </span>{" "}
                          on{" "}
                          {(() => {
                            const repairQuote = allQuotes.find(
                              (q) => q.quote_type === "repair" && q.confirmed
                            );
                            return repairQuote && repairQuote.confirmed_at
                              ? new Date(
                                  repairQuote.confirmed_at
                                ).toLocaleString()
                              : "N/A";
                          })()}
                          .
                        </p>
                        <p className="mt-1">
                          <span className="font-medium">
                            Customer{" "}
                            {(() => {
                              const repairQuote = allQuotes.find(
                                (q) => q.quote_type === "repair" && q.confirmed
                              );
                              return repairQuote && repairQuote.approved ? (
                                <span className="text-success-700">
                                  approved repairs
                                </span>
                              ) : (
                                <span className="text-error-700">
                                  declined repairs
                                </span>
                              );
                            })()}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === "all" && (
          <div>
            <h3 className="text-md font-medium mb-3">Quote History</h3>
            {allQuotes.length > 0 ? (
              <div className="space-y-4">
                {allQuotes.map((quote, index) => (
                  <div
                    key={quote.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FileText size={16} className="text-gray-500" />
                          <span className="font-medium">
                            Quote #{quote.quote_number}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              quote.confirmed
                                ? "bg-success-100 text-success-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {quote.confirmed ? "Confirmed" : "Sent"}
                          </span>
                          {quote.confirmed && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                quote.approved
                                  ? "bg-success-100 text-success-800"
                                  : "bg-error-100 text-error-800"
                              }`}
                            >
                              {quote.approved ? "Approved" : "Declined"}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800`}
                          >
                            {quote.quote_type.charAt(0).toUpperCase() +
                              quote.quote_type.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {quote.quote_type.charAt(0).toUpperCase() +
                            quote.quote_type.slice(1)}{" "}
                          Quote
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Sent on{" "}
                          {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                        {quote.confirmed_at && (
                          <p className="text-sm text-gray-500">
                            Confirmed on{" "}
                            {new Date(quote.confirmed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${Number(quote.amount).toFixed(2)}
                        </p>
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
                <p className="text-gray-600">
                  No quotes have been sent for this job yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* General Quote Status */}
        {sentQuoteTypes[activeTab] &&
          !job.quote_confirmed &&
          activeTab !== "all" && (
            <div
              className={`${
                quoteNeedsUpdate
                  ? "bg-warning-50 border-warning-500"
                  : "bg-blue-50 border-blue-500"
              } border-l-4 p-4 rounded-md`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <FileCheck2
                    className={`h-5 w-5 ${
                      quoteNeedsUpdate ? "text-warning-500" : "text-blue-500"
                    }`}
                  />
                </div>
                <div className="ml-3">
                  <h3
                    className={`text-sm font-medium ${
                      quoteNeedsUpdate ? "text-warning-800" : "text-blue-800"
                    }`}
                  >
                    {quoteNeedsUpdate ? "Quote Needs Update" : "Quote Sent"}
                  </h3>
                  <div
                    className={`mt-2 text-sm ${
                      quoteNeedsUpdate ? "text-warning-700" : "text-blue-700"
                    }`}
                  >
                    <p>Quote was sent to {job.contact_email}.</p>
                    {quoteNeedsUpdate && (
                      <p className="mt-1 font-medium">
                        Items have been modified since the quote was sent.
                        Consider sending an updated quote.
                      </p>
                    )}
                    {!quoteNeedsUpdate && (
                      <p className="mt-1">Waiting for customer confirmation.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {!sentQuoteTypes[activeTab] && activeTab !== "all" && (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600">
              {jobItems.length === 0
                ? "Add service before sending a quote."
                : "Ready to send quote to customer."}
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
        initialEmail={job.contact_email || ""}
        replacementData={replacementData}
        selectedPhase={selectedPhase || undefined}
        totalCost={
          activeTab === "replacement" ? totalReplacementCost : totalRepairCost
        }
        location={location}
        unit={unit}
        quoteType={activeTab === "all" ? "replacement" : activeTab}
        onEmailSent={(updatedJob) => {
          if (job) {
            // Update sent quote types
            setSentQuoteTypes((prev) => ({
              ...prev,
              [activeTab]: true,
            }));

            onQuoteSent({
              ...job,
              quote_sent: true,
              quote_sent_at: new Date().toISOString(),
            });
          }
        }}
        emailTemplate={emailTemplate}
        replacementDataById={
          activeTab === "replacement" ? replacementDataById : {}
        }
        inspectionData={inspectionData}
      />
    </div>
  );
};

export default JobQuoteSection;
