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
  Plus,
  Trash2,
} from "lucide-react";
import SendEmailModal from "./SendEmailModal";
import GenerateQuote from "../GenerateQuote";

type JobQuoteSectionProps = {
  job: Job;
  jobItems: JobItem[];
  onQuoteSent: (updatedJob: Job) => void;
  onPreviewQuote: (
    quoteType: "replacement" | "repair" | "inspection",
    quoteData?: any
  ) => void;
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
  const [selectedQuoteType, setSelectedQuoteType] = useState<
    "replacement" | "repair"
  >("replacement");
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [showGenerateQuoteModal, setShowGenerateQuoteModal] = useState(false);
  const [showIndividualQuoteModal, setShowIndividualQuoteModal] =
    useState(false);
  const [selectedQuoteForSending, setSelectedQuoteForSending] = useState<
    any | null
  >(null);
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState<string | null>(null);

  // Calculate total replacement cost from all replacement data
  const calculateTotalReplacementCost = () => {
    if (Object.keys(replacementDataById).length === 0) return 0;

    return Object.values(replacementDataById).reduce((sum, data: any) => {
      return sum + Number(data.totalCost || 0);
    }, 0);
  };

  // Calculate quote counts by type
  const getQuoteCounts = () => {
    const counts = {
      all: allQuotes.length,
      replacement: Object.keys(replacementDataById).length, // Count available replacement options
      repair: hasRepairData ? 1 : 0, // Count if repair data is available
      inspection: inspectionData.length, // Count available inspections
    };
    return counts;
  };

  // Filter quotes based on active filter
  const getFilteredQuotes = () => {
    if (activeQuoteFilter === "all") {
      return allQuotes;
    }
    return allQuotes.filter((q) => q.quote_type === activeQuoteFilter);
  };

  // Check if there's available data for the selected filter
  const hasAvailableDataForFilter = () => {
    switch (activeQuoteFilter) {
      case "replacement":
        return Object.keys(replacementDataById).length > 0;
      case "repair":
        return hasRepairData;
      case "inspection":
        return inspectionData.length > 0;
      default:
        return true;
    }
  };

  // Function to fetch quotes for this job
  const fetchQuotes = async () => {
    if (!supabase || !job) return;

    try {
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
    } catch (err) {
      console.error("Error fetching quotes:", err);
    }
  };

  // Function to delete a quote
  const handleDeleteQuote = async (quoteId: string) => {
    if (!supabase || !job) return;

    if (!window.confirm("Are you sure you want to delete this quote?")) {
      return;
    }

    setIsDeletingQuote(quoteId);
    setDeleteError(null);

    try {
      const { error: deleteError } = await supabase
        .from("job_quotes")
        .delete()
        .eq("id", quoteId);

      if (deleteError) throw deleteError;

      // Refresh quotes after deletion
      await fetchQuotes();
    } catch (err) {
      console.error("Error deleting quote:", err);
      setDeleteError("Failed to delete quote. Please try again.");
    } finally {
      setIsDeletingQuote(null);
    }
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

  // Add state for quote filtering
  const [activeQuoteFilter, setActiveQuoteFilter] = useState<
    "all" | "replacement" | "repair" | "inspection"
  >("all");

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
        await fetchQuotes();

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

          // Set the active template based on the selected quote type
          if (templates[selectedQuoteType]) {
            setEmailTemplate({
              subject:
                templates[selectedQuoteType].template_data.subject ||
                emailTemplate.subject,
              greeting:
                templates[selectedQuoteType].template_data.greeting ||
                emailTemplate.greeting,
              introText:
                templates[selectedQuoteType].template_data.introText ||
                emailTemplate.introText,
              approvalText:
                templates[selectedQuoteType].template_data.approvalText ||
                emailTemplate.approvalText,
              approveButtonText:
                templates[selectedQuoteType].template_data.approveButtonText ||
                emailTemplate.approveButtonText,
              denyButtonText:
                templates[selectedQuoteType].template_data.denyButtonText ||
                emailTemplate.denyButtonText,
              approvalNote:
                templates[selectedQuoteType].template_data.approvalNote ||
                emailTemplate.approvalNote,
              denialNote:
                templates[selectedQuoteType].template_data.denialNote ||
                emailTemplate.denialNote,
              closingText:
                templates[selectedQuoteType].template_data.closingText ||
                emailTemplate.closingText,
              signature:
                templates[selectedQuoteType].template_data.signature ||
                emailTemplate.signature,
            });
          }
        }
      } catch (err) {
        console.error("Error checking job data:", err);
      }
    };

    checkJobData();
  }, [supabase, job, selectedQuoteType, jobItems, refreshTrigger]);

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

  // Update email template when selected quote type changes
  useEffect(() => {
    if (defaultTemplates[selectedQuoteType]) {
      const template = defaultTemplates[selectedQuoteType];
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
  }, [selectedQuoteType, defaultTemplates]);

  return (
    <div className="card">
      {/* All Quotes Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h3 className="text-lg font-medium text-gray-900">All Quotes</h3>
        </div>

        {/* Available Quote Types Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              activeQuoteFilter === "all"
                ? "bg-gray-100 border-gray-300"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
            onClick={() => setActiveQuoteFilter("all")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText size={20} className="text-gray-600 mr-2" />
                <span className="font-medium text-gray-900">All quotes</span>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-1">
              {getQuoteCounts().all} quote(s)
            </p>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              activeQuoteFilter === "replacement"
                ? "bg-blue-100 border-blue-300"
                : "bg-blue-50 border-blue-200 hover:bg-blue-100"
            }`}
            onClick={() => setActiveQuoteFilter("replacement")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Home size={20} className="text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">Replacement</span>
              </div>
              {sentQuoteTypes.replacement && (
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
              )}
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {hasReplacementData
                ? `${
                    getQuoteCounts().replacement
                  } replacement(s) - $${calculateTotalReplacementCost().toLocaleString()}`
                : "No data available"}
            </p>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              activeQuoteFilter === "repair"
                ? "bg-green-100 border-green-300"
                : "bg-green-50 border-green-200 hover:bg-green-100"
            }`}
            onClick={() => setActiveQuoteFilter("repair")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package size={20} className="text-green-600 mr-2" />
                <span className="font-medium text-green-900">Repair</span>
              </div>
              {sentQuoteTypes.repair && (
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
              )}
            </div>
            <p className="text-sm text-green-700 mt-1">
              {hasRepairData
                ? `${
                    getQuoteCounts().repair
                  } repair(s) - $${totalRepairCost.toLocaleString()}`
                : "No data available"}
            </p>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              activeQuoteFilter === "inspection"
                ? "bg-purple-100 border-purple-300"
                : "bg-purple-50 border-purple-200 hover:bg-purple-100"
            }`}
            onClick={() => setActiveQuoteFilter("inspection")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText size={20} className="text-purple-600 mr-2" />
                <span className="font-medium text-purple-900">Inspection</span>
              </div>
              {inspectionData && inspectionData.length > 0 && (
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
              )}
            </div>
            <p className="text-sm text-purple-700 mt-1">
              {inspectionData && inspectionData.length > 0
                ? `${getQuoteCounts().inspection} inspection(s)`
                : "No data available"}
            </p>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                  QUOTE #
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                  TYPE
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                  DATE
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                  AMOUNT
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                  STATUS
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                  CONFIRMED
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Historical Quotes */}
              {getFilteredQuotes().map((quote, index) => (
                <tr
                  key={quote.id}
                  className={`border-b hover:bg-primary-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-3 py-2 sm:px-6 sm:py-3 font-medium align-middle">
                    {quote.quote_number}
                  </td>
                  <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        quote.quote_type === "replacement"
                          ? "bg-blue-100 text-blue-800"
                          : quote.quote_type === "repair"
                          ? "bg-green-100 text-green-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {quote.quote_type.charAt(0).toUpperCase() +
                        quote.quote_type.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 sm:px-6 sm:py-3 font-medium align-middle">
                    ${Number(quote.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        quote.confirmed
                          ? quote.approved
                            ? "bg-success-100 text-success-800"
                            : "bg-error-100 text-error-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {quote.confirmed
                        ? quote.approved
                          ? "Approved"
                          : "Declined"
                        : "Sent"}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                    {quote.confirmed_at
                      ? new Date(quote.confirmed_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        className="btn btn-secondary btn-xs w-full sm:w-auto"
                        onClick={() =>
                          onPreviewQuote(
                            quote.quote_type as
                              | "replacement"
                              | "repair"
                              | "inspection",
                            quote
                          )
                        }
                      >
                        <Eye size={16} className="mr-2" />
                        Preview
                      </button>
                      <button
                        className="btn btn-primary btn-xs w-full sm:w-auto"
                        onClick={() => {
                          setSelectedQuoteForSending(quote);
                          setShowIndividualQuoteModal(true);
                        }}
                      >
                        <Send size={16} className="mr-2" />
                        Send
                      </button>
                      <button
                        className="btn btn-error btn-xs w-full sm:w-auto"
                        onClick={() => handleDeleteQuote(quote.id)}
                        disabled={isDeletingQuote === quote.id}
                        title="Delete Quote"
                      >
                        {isDeletingQuote === quote.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Trash2 size={16} className="mr-2" />
                        )}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* No Data Message */}
        {getFilteredQuotes().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">
              {activeQuoteFilter === "all"
                ? "No quotes available"
                : `No ${activeQuoteFilter} quotes available`}
            </p>
            <p className="text-sm text-gray-400">
              {activeQuoteFilter === "all"
                ? "Use the Generate Quote component to create a new quote"
                : hasAvailableDataForFilter()
                ? `${
                    activeQuoteFilter.charAt(0).toUpperCase() +
                    activeQuoteFilter.slice(1)
                  } data is available but no quotes have been sent yet`
                : `No ${activeQuoteFilter} data available`}
            </p>
          </div>
        )}

        {/* Delete Error Message */}
        {deleteError && (
          <div className="bg-error-50 text-error-700 p-2 rounded mb-2">
            {deleteError}
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
          selectedQuoteType === "replacement"
            ? totalReplacementCost
            : totalRepairCost
        }
        location={location}
        unit={unit}
        quoteType={selectedQuoteType}
        onEmailSent={(updatedJob) => {
          if (job) {
            // Update sent quote types
            setSentQuoteTypes((prev) => ({
              ...prev,
              [selectedQuoteType]: true,
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
          selectedQuoteType === "replacement" ? replacementDataById : {}
        }
        inspectionData={inspectionData}
      />

      {/* Individual Quote Send Modal */}
      {selectedQuoteForSending && (
        <SendEmailModal
          isOpen={showIndividualQuoteModal}
          onClose={() => {
            setShowIndividualQuoteModal(false);
            setSelectedQuoteForSending(null);
          }}
          jobId={job.id}
          jobNumber={job.number}
          jobName={job.name}
          customerName={job.contact_name || undefined}
          initialEmail={job.contact_email || ""}
          replacementData={replacementData}
          selectedPhase={selectedPhase || undefined}
          totalCost={Number(selectedQuoteForSending.amount)}
          location={location}
          unit={unit}
          quoteType={selectedQuoteForSending.quote_type}
          onEmailSent={(updatedJob) => {
            if (job) {
              // Refresh quotes to update status
              fetchQuotes();

              onQuoteSent({
                ...job,
                quote_sent: true,
                quote_sent_at: new Date().toISOString(),
              });
            }
          }}
          emailTemplate={emailTemplate}
          replacementDataById={
            selectedQuoteForSending.quote_type === "replacement"
              ? replacementDataById
              : {}
          }
          inspectionData={inspectionData}
          selectedReplacementOptions={
            selectedQuoteForSending.selected_replacement_options || []
          }
          selectedInspectionOptions={
            selectedQuoteForSending.selected_inspection_options || []
          }
        />
      )}

      {/* Generate Quote Modal */}
      {showGenerateQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Generate Quote
              </h2>
              <button
                onClick={() => setShowGenerateQuoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <GenerateQuote
                jobId={job.id}
                onQuoteSent={() => {
                  setShowGenerateQuoteModal(false);
                  // Refresh quotes
                  fetchQuotes();
                }}
                onPreviewQuote={(quoteType) => {
                  onPreviewQuote(quoteType);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobQuoteSection;
