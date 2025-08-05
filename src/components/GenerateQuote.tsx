import { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";
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
  Building,
  User,
  Mail,
  CheckSquare,
  Square,
  Plus,
} from "lucide-react";
import SendEmailModal from "./jobs/SendEmailModal";

interface GenerateQuoteProps {
  // Optional job context - if provided, will use job data
  jobId?: string;
  // Job items for repair quotes
  jobItems?: any[];
  // Manual quote data
  customerName?: string;
  customerEmail?: string;
  locationName?: string;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  locationZip?: string;
  unitNumber?: string;
  // Callbacks
  onQuoteSent?: (quoteData: any) => void;
  onPreviewQuote?: (
    quoteType: "replacement" | "repair" | "inspection" | "pm"
  ) => void;
  // UI customization
  title?: string;
  className?: string;
  // Default quote type
  defaultQuoteType?: "replacement" | "repair" | "inspection" | "pm";
  // Available quote types to show
  availableQuoteTypes?: ("replacement" | "repair" | "inspection" | "pm")[];
}

type InspectionData = {
  id: string;
  job_id: string;
  model_number: string | null;
  serial_number: string | null;
  age: number | null;
  tonnage: string | null;
  unit_type: "Gas" | "Electric" | null;
  system_type: "RTU" | "Split System" | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  completed: boolean;
  job_unit_id?: string;
};

type ReplacementData = {
  id: string;
  job_id: string;
  needs_crane: boolean;
  phase1: any;
  phase2: any;
  phase3: any;
  labor: number;
  refrigeration_recovery: number;
  start_up_costs: number;
  accessories: any[];
  thermostat_startup: number;
  removal_cost: number;
  warranty: string | null;
  additional_items: any[];
  permit_cost: number;
  created_at: string;
  updated_at: string;
  selected_phase: string | null;
  total_cost: number | null;
  inspection_id: string | null;
  requires_permit?: boolean;
  requires_big_ladder?: boolean;
};

const GenerateQuote = ({
  jobId,
  jobItems = [],
  customerName,
  customerEmail,
  locationName,
  locationAddress,
  locationCity,
  locationState,
  locationZip,
  unitNumber,
  onQuoteSent,
  onPreviewQuote,
  title = "Generate Quote",
  className = "",
  defaultQuoteType = "replacement",
  availableQuoteTypes = ["replacement", "repair", "inspection", "pm"],
}: GenerateQuoteProps) => {
  const { supabase } = useSupabase();
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Available data
  const [availableInspections, setAvailableInspections] = useState<
    InspectionData[]
  >([]);
  const [availableReplacements, setAvailableReplacements] = useState<
    ReplacementData[]
  >([]);
  const [availablePMQuotes, setAvailablePMQuotes] = useState<any[]>([]);
  const [job, setJob] = useState<any | null>(null);
  const [location, setLocation] = useState<any | null>(null);
  const [unit, setUnit] = useState<any | null>(null);
  const [existingQuotes, setExistingQuotes] = useState<any[]>([]);

  // Selected data for quote generation
  const [selectedInspections, setSelectedInspections] = useState<string[]>([]);
  const [selectedReplacements, setSelectedReplacements] = useState<string[]>(
    []
  );
  const [selectedRepairItems, setSelectedRepairItems] = useState<string[]>([]);
  const [selectedPMQuotes, setSelectedPMQuotes] = useState<string[]>([]);
  const [selectedQuoteType, setSelectedQuoteType] = useState<
    "replacement" | "repair" | "inspection" | "pm"
  >(defaultQuoteType);

  // Generated quote data
  const [generatedQuoteData, setGeneratedQuoteData] = useState<any>(null);
  const [totalCost, setTotalCost] = useState<number>(0);

  // Email template state
  const [emailTemplate, setEmailTemplate] = useState({
    subject: "Quote from Airlast HVAC",
    greeting: "Dear Customer,",
    introText:
      "Thank you for choosing Airlast HVAC services. Please find attached your quote for review.",
    approvalText:
      "Please click one of the buttons below to approve or deny the recommended work:",
    approveButtonText: "Approve Quote",
    denyButtonText: "Deny Quote",
    approvalNote:
      "If you approve this quote, we will proceed with the work as outlined.",
    denialNote:
      "If you deny this quote, please let us know your concerns so we can address them.",
    closingText: "Thank you for your business.",
    signature: "Best regards,\nThe AirLast Team",
  });

  // Load available data
  useEffect(() => {
    const loadAvailableData = async () => {
      if (!supabase || !jobId) return;

      setIsLoading(true);
      try {
        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(
            `
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
            job_units:job_units (
              unit_id,
              units:unit_id (
                id,
                unit_number
              )
            )
          `
          )
          .eq("id", jobId)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);
        setLocation(jobData.locations);
        // Flatten units from job_units
        const units = (jobData.job_units || []).map((ju: any) => ju.units);
        setUnit(units?.[0] || null);

        // Fetch available inspections
        const { data: inspData, error: inspError } = await supabase
          .from("job_inspections")
          .select("*")
          .eq("job_id", jobId)
          .eq("completed", true);

        if (inspError) throw inspError;
        setAvailableInspections(inspData || []);

        // Fetch available replacements
        const { data: replacementData, error: replacementError } =
          await supabase
            .from("job_replacements")
            .select("*")
            .eq("job_id", jobId);

        if (replacementError) throw replacementError;
        setAvailableReplacements(replacementData || []);

        // Fetch existing quotes to check what's already been used
        const { data: quotesData, error: quotesError } = await supabase
          .from("job_quotes")
          .select("*")
          .eq("job_id", jobId);

        if (quotesError) throw quotesError;
        setExistingQuotes(quotesData || []);

        // Fetch available PM quotes
        const { data: pmQuotesData, error: pmQuotesError } = await supabase
          .from("pm_quotes")
          .select("*")
          .eq("job_id", jobId);

        if (pmQuotesError) throw pmQuotesError;
        setAvailablePMQuotes(pmQuotesData || []);
      } catch (err: any) {
        console.error("Error loading available data:", err);
        setQuoteError(err.message || "Failed to load available data");
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableData();
  }, [supabase, jobId]);

  // Handle inspection selection
  const handleInspectionToggle = (inspectionId: string) => {
    setSelectedInspections((prev) =>
      prev.includes(inspectionId)
        ? prev.filter((id) => id !== inspectionId)
        : [...prev, inspectionId]
    );
  };

  // Handle replacement selection
  const handleReplacementToggle = (replacementId: string) => {
    setSelectedReplacements((prev) =>
      prev.includes(replacementId)
        ? prev.filter((id) => id !== replacementId)
        : [...prev, replacementId]
    );
  };

  const handleRepairItemToggle = (itemId: string) => {
    setSelectedRepairItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handlePMQuoteToggle = (pmQuoteId: string) => {
    setSelectedPMQuotes((prev) =>
      prev.includes(pmQuoteId)
        ? prev.filter((id) => id !== pmQuoteId)
        : [...prev, pmQuoteId]
    );
  };

  // Check if inspection has been used in previous quotes
  const isInspectionUsedInQuotes = (inspectionId: string) => {
    return existingQuotes.some(
      (quote) =>
        quote.quote_type === "inspection" ||
        quote.quote_type === "replacement" ||
        quote.quote_type === "repair"
    );
  };

  // Check if replacement has been used in previous quotes
  const isReplacementUsedInQuotes = (replacementId: string) => {
    return existingQuotes.some((quote) => quote.quote_type === "replacement");
  };

  // Check if repair item has been used in previous repair quotes
  const isRepairItemUsedInQuotes = (itemId: string) => {
    return existingQuotes.some((quote) => quote.quote_type === "repair");
  };

  // Get the most recent quote that used this item
  const getMostRecentQuoteForItem = (
    itemType: "inspection" | "replacement",
    itemId: string
  ) => {
    const relevantQuotes = existingQuotes.filter((quote) => {
      if (itemType === "inspection") {
        return (
          quote.quote_type === "inspection" ||
          quote.quote_type === "replacement" ||
          quote.quote_type === "repair"
        );
      } else {
        return quote.quote_type === "replacement";
      }
    });

    if (relevantQuotes.length === 0) return null;

    // Sort by created_at descending and return the most recent
    return relevantQuotes.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  // Generate quote based on selected data
  const handleGenerateQuote = async () => {
    // Validate selections based on quote type
    if (selectedQuoteType === "inspection") {
      if (selectedInspections.length === 0) {
        setQuoteError(
          "Please select at least one inspection for inspection quotes"
        );
        return;
      }
      if (selectedReplacements.length > 0) {
        setQuoteError(
          "Inspection quotes should not include replacement options"
        );
        return;
      }
    } else if (selectedQuoteType === "replacement") {
      if (selectedReplacements.length === 0) {
        setQuoteError(
          "Please select at least one replacement option for replacement quotes"
        );
        return;
      }
    } else if (selectedQuoteType === "repair") {
      if (selectedRepairItems.length === 0) {
        setQuoteError(
          "Please select at least one repair option for repair quotes"
        );
        return;
      }
    } else if (selectedQuoteType === "pm") {
      if (selectedPMQuotes.length === 0) {
        setQuoteError(
          "Please select at least one PM quote for PM quote generation"
        );
        return;
      }
    }

    // Calculate total cost
    let calculatedTotalCost = 0;

    if (selectedQuoteType === "inspection") {
      // For inspection quotes, always use $180 regardless of number of inspections
      calculatedTotalCost = 180;
    } else if (selectedQuoteType === "replacement") {
      // For replacement quotes, only use replacement costs
      selectedReplacements.forEach((replacementId) => {
        const replacement = availableReplacements.find(
          (r) => r.id === replacementId
        );
        if (replacement && replacement.total_cost) {
          calculatedTotalCost += Number(replacement.total_cost);
        }
      });
    } else if (selectedQuoteType === "repair") {
      // For repair quotes, use selected repair items costs
      selectedRepairItems.forEach((itemId) => {
        const repairItem = jobItems.find((item) => item.id === itemId);
        if (repairItem) {
          calculatedTotalCost += Number(
            repairItem.total_cost || repairItem.cost || 0
          );
        }
      });
    } else if (selectedQuoteType === "pm") {
      // For PM quotes, use selected PM quotes costs
      selectedPMQuotes.forEach((pmQuoteId) => {
        const pmQuote = availablePMQuotes.find((pq) => pq.id === pmQuoteId);
        if (pmQuote && pmQuote.total_cost) {
          calculatedTotalCost += Number(pmQuote.total_cost);
        }
      });
    }

    setTotalCost(calculatedTotalCost);

    // Create quote data
    const quoteData = {
      jobId,
      selectedInspections: selectedInspections
        .map((id) => availableInspections.find((insp) => insp.id === id))
        .filter(Boolean),
      selectedReplacements: selectedReplacements
        .map((id) => availableReplacements.find((rep) => rep.id === id))
        .filter(Boolean),
      selectedPMQuotes: selectedPMQuotes
        .map((id) => availablePMQuotes.find((pq) => pq.id === id))
        .filter(Boolean),
      totalCost: calculatedTotalCost,
      quoteType: selectedQuoteType,
      generatedAt: new Date().toISOString(),
    };

    setGeneratedQuoteData(quoteData);
    setQuoteError(null);

    // Automatically generate PDF after creating quote data
    await handlePreviewQuote(quoteData);
  };

  // Handle preview quote
  const handlePreviewQuote = async (quoteData?: any) => {
    const dataToUse = quoteData || generatedQuoteData;
    if (!dataToUse) {
      setQuoteError("Please generate a quote first");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // Generate quote number
      const quoteNumber = `QUOTE-${Date.now()}`;

      // Fetch template
      const { data: templates } = await supabase!
        .from("quote_templates")
        .select("*")
        .eq("template_data->>templateType", selectedQuoteType)
        .limit(1);

      const template = templates?.[0] || {
        id: null, // No template ID for fallback
        template_data: {
          subject: "Quote from AirLast HVAC",
          greeting: "Dear Customer,",
          introText: "Thank you for choosing our services.",
          approvalText: "Please review the quote below:",
          approveButtonText: "Approve",
          denyButtonText: "Deny",
          approvalNote: "If you approve, we will proceed.",
          denialNote: "If you deny, please let us know.",
          closingText: "Thank you for your business.",
          signature: "AirLast HVAC Team",
        },
      };

      // Prepare job data for PDF
      console.log("Debug unit data:", {
        unit,
        unitNumber,
        hasUnit: !!unit,
        hasUnitNumber: !!unitNumber,
        unitUnitNumber: unit?.unit_number,
      });

      const jobDataForPDF = {
        job: job || {
          number: "MANUAL",
          name: "Manual Quote",
          contact_name: customerName,
          contact_email: customerEmail,
        },
        location: location || {
          name: locationName,
          address: locationAddress,
          city: locationCity,
          state: locationState,
          zip: locationZip,
        },
        unit: unit
          ? {
              unit_number: unit.unit_number,
            }
          : unitNumber
          ? {
              unit_number: unitNumber,
            }
          : null,
        inspection_summary_comment: job?.inspection_summary_comment || null,
      };

      console.log("Final jobDataForPDF:", jobDataForPDF);

      // Prepare inspection data
      const inspectionData = dataToUse.selectedInspections.map((insp: any) => ({
        id: insp.id,
        model_number: insp.model_number,
        serial_number: insp.serial_number,
        age: insp.age,
        tonnage: insp.tonnage,
        unit_type: insp.unit_type,
        system_type: insp.system_type,
        comment: insp.comment || null,
      }));

      // Prepare replacement data
      const replacementData = dataToUse.selectedReplacements.map(
        (rep: any) => ({
          id: rep.id,
          selected_phase: rep.selected_phase,
          total_cost: rep.total_cost,
          labor: rep.labor,
          refrigeration_recovery: rep.refrigeration_recovery,
          start_up_costs: rep.start_up_costs,
          accessories: rep.accessories,
          thermostat_startup: rep.thermostat_startup,
          removal_cost: rep.removal_cost,
          warranty: rep.warranty,
          additional_items: rep.additional_items,
          permit_cost: rep.permit_cost,
          needs_crane: rep.needs_crane,
          requires_permit: rep.requires_permit,
          requires_big_ladder: rep.requires_big_ladder,
          phase1: rep.phase1,
          phase2: rep.phase2,
          phase3: rep.phase3,
        })
      );

      // Create replacementDataById structure for detailed cost breakdown
      const replacementDataById: { [key: string]: any } = {};
      dataToUse.selectedReplacements.forEach((rep: any) => {
        replacementDataById[rep.id] = {
          needsCrane: rep.needs_crane || false,
          requiresPermit: rep.requires_permit || false,
          requiresBigLadder: rep.requires_big_ladder || false,
          phase1: rep.phase1 || {},
          phase2: rep.phase2 || {},
          phase3: rep.phase3 || {},
          labor: rep.labor || 0,
          refrigerationRecovery: rep.refrigeration_recovery || 0,
          startUpCosts: rep.start_up_costs || 0,
          accessories: rep.accessories || [],
          thermostatStartup: rep.thermostat_startup || 0,
          removalCost: rep.removal_cost || 0,
          warranty: rep.warranty || "",
          additionalItems: rep.additional_items || [],
          permitCost: rep.permit_cost || 0,
          selectedPhase: rep.selected_phase || "phase2",
          totalCost: rep.total_cost || 0,
          created_at: rep.created_at || new Date().toISOString(),
        };
      });

      // Debug logging for repair quotes
      if (selectedQuoteType === "repair") {
        console.log("Repair quote debug:", {
          allJobItems: jobItems,
          selectedRepairItems,
          filteredJobItems: jobItems.filter((item) =>
            selectedRepairItems.includes(item.id)
          ),
          jobItemsWithType: jobItems.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
          })),
        });
      }

      // Call generate-quote-pdf function
      const apiUrl = `${
        import.meta.env.VITE_SUPABASE_URL
      }/functions/v1/generate-quote-pdf`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          jobId: jobId || "manual",
          quoteType: selectedQuoteType,
          quoteNumber,
          templateId: template.id || undefined,
          jobData: jobDataForPDF,
          inspectionData,
          replacementData:
            selectedQuoteType === "replacement" ? replacementData : null,
          jobItems:
            selectedQuoteType === "repair"
              ? jobItems.filter((item) => selectedRepairItems.includes(item.id))
              : [],
          replacementDataById:
            selectedQuoteType === "replacement" ? replacementDataById : {},
          pmQuotes:
            selectedQuoteType === "pm" ? dataToUse.selectedPMQuotes : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const result = await response.json();

      if (result.pdfUrl) {
        // Save quote to database
        if (supabase && jobId) {
          try {
            const { error: quoteError } = await supabase!
              .from("job_quotes")
              .insert({
                job_id: jobId,
                quote_number: quoteNumber,
                quote_type: selectedQuoteType,
                amount: dataToUse.totalCost,
                token:
                  Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15),
                confirmed: false,
                approved: false,
                email: customerEmail || job?.contact_email || "",
                selected_replacement_options:
                  selectedQuoteType === "replacement"
                    ? selectedReplacements
                    : null,
                selected_repair_options:
                  selectedQuoteType === "repair" ? selectedRepairItems : null,
                selected_inspection_options:
                  selectedQuoteType === "inspection"
                    ? selectedInspections
                    : null,
                selected_pm_options:
                  selectedQuoteType === "pm" ? selectedPMQuotes : null,
                pdf_url: result.pdfUrl, // Store the PDF URL
                pdf_generated_at: new Date().toISOString(), // Store generation timestamp
                quote_data: {
                  // Store complete quote data for preview functionality
                  quoteType: selectedQuoteType,
                  quoteNumber,
                  totalCost: dataToUse.totalCost,
                  selectedReplacementOptions:
                    selectedQuoteType === "replacement"
                      ? selectedReplacements
                      : null,
                  selectedInspectionOptions:
                    selectedQuoteType === "inspection"
                      ? selectedInspections
                      : null,
                  selectedRepairOptions:
                    selectedQuoteType === "repair" ? selectedRepairItems : null,
                  replacementDataById:
                    selectedQuoteType === "replacement"
                      ? Object.fromEntries(
                          selectedReplacements.map((id) => [
                            id,
                            availableReplacements.find((r) => r.id === id),
                          ])
                        )
                      : {},
                  inspectionData:
                    selectedQuoteType === "inspection"
                      ? availableInspections.filter((insp) =>
                          selectedInspections.includes(insp.id)
                        )
                      : [],
                  repairItems:
                    selectedQuoteType === "repair"
                      ? jobItems.filter((item) =>
                          selectedRepairItems.includes(item.id)
                        )
                      : [],
                  pmQuotes:
                    selectedQuoteType === "pm"
                      ? dataToUse.selectedPMQuotes
                      : [],
                  jobItems,
                  location: location || {
                    name: locationName,
                    address: locationAddress,
                    city: locationCity,
                    state: locationState,
                    zip: locationZip,
                  },
                  unit:
                    unit || (unitNumber ? { unit_number: unitNumber } : null),
                  generatedAt: new Date().toISOString(),
                },
                created_at: new Date().toISOString(),
              });

            if (quoteError) {
              console.error("Error saving quote to database:", quoteError);
              // Don't throw error here - PDF was generated successfully
            } else {
              console.log("Quote saved to database successfully");
              // Call onQuoteSent callback to refresh the quote section
              if (onQuoteSent) {
                onQuoteSent(dataToUse);
              }
            }
          } catch (dbError) {
            console.error("Error saving quote to database:", dbError);
            // Don't throw error here - PDF was generated successfully
          }
        }

        window.open(result.pdfUrl, "_blank");
      } else {
        throw new Error("No PDF URL received");
      }
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      setQuoteError(error.message || "Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Handle quote sent
  const handleQuoteSent = (updatedJob: any) => {
    if (onQuoteSent) {
      onQuoteSent(generatedQuoteData);
    }
    setShowSendQuoteModal(false);
  };

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (quoteError) {
    return (
      <div className={`card ${className}`}>
        <div className="bg-error-50 border border-error-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-error-500 mr-2" />
            <p className="text-error-700">{quoteError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {generatedQuoteData && (
        <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={handlePreviewQuote}
              className="btn btn-secondary btn-sm w-full sm:w-auto"
              disabled={isGeneratingPDF}
              title="Preview Quote"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                </>
              ) : (
                <>
                  <Eye size={16} />
                </>
              )}
            </button>
            <button
              onClick={() => setShowSendQuoteModal(true)}
              className="btn btn-primary btn-sm w-full sm:w-auto"
            >
              <Send size={16} className="mr-2" />
              Send Quote
            </button>
          </div>
        </div>
      )}

      {/* Quote Type Selection */}
      {availableQuoteTypes.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quote Type
          </label>
          <div className="flex gap-4">
            {availableQuoteTypes.includes("replacement") && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="quoteType"
                  value="replacement"
                  checked={selectedQuoteType === "replacement"}
                  onChange={(e) =>
                    setSelectedQuoteType(
                      e.target.value as "replacement" | "repair" | "inspection"
                    )
                  }
                  className="mr-2"
                />
                <Home className="h-4 w-4 mr-1 text-blue-600" />
                Replacement Quote
              </label>
            )}
            {availableQuoteTypes.includes("repair") && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="quoteType"
                  value="repair"
                  checked={selectedQuoteType === "repair"}
                  onChange={(e) =>
                    setSelectedQuoteType(
                      e.target.value as "replacement" | "repair" | "inspection"
                    )
                  }
                  className="mr-2"
                />
                <Package className="h-4 w-4 mr-1 text-green-600" />
                Repair Quote
              </label>
            )}
            {availableQuoteTypes.includes("inspection") && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="quoteType"
                  value="inspection"
                  checked={selectedQuoteType === "inspection"}
                  onChange={(e) =>
                    setSelectedQuoteType(
                      e.target.value as
                        | "replacement"
                        | "repair"
                        | "inspection"
                        | "pm"
                    )
                  }
                  className="mr-2"
                />
                <Clipboard className="h-4 w-4 mr-1 text-purple-600" />
                Inspection Quote
              </label>
            )}
            {availableQuoteTypes.includes("pm") && (
              <label className="flex items-center">
                <input
                  type="radio"
                  name="quoteType"
                  value="pm"
                  checked={selectedQuoteType === "pm"}
                  onChange={(e) =>
                    setSelectedQuoteType(
                      e.target.value as
                        | "replacement"
                        | "repair"
                        | "inspection"
                        | "pm"
                    )
                  }
                  className="mr-2"
                />
                <CheckSquare className="h-4 w-4 mr-1 text-blue-600" />
                PM Quote
              </label>
            )}
          </div>
        </div>
      )}

      {/* Available Inspections */}
      {(selectedQuoteType === "inspection" ||
        selectedQuoteType === "replacement" ||
        selectedQuoteType === "repair") &&
        availableInspections.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <Clipboard className="h-4 w-4 mr-2 text-purple-600" />
              Select Inspection Results to Include
              {selectedQuoteType === "inspection" && (
                <span className="ml-2 text-xs text-purple-600 font-normal">
                  (Required for inspection quotes)
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {availableInspections.map((inspection) => (
                <label
                  key={inspection.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedInspections.includes(inspection.id)}
                    onChange={() => handleInspectionToggle(inspection.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {inspection.model_number || "Unknown Model"}
                      </span>
                      <div className="flex items-center gap-2">
                        {isInspectionUsedInQuotes(inspection.id) && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            Used in previous quote
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {inspection.age
                            ? `${inspection.age} years old`
                            : "Age unknown"}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {inspection.tonnage && `${inspection.tonnage} ton`} •{" "}
                      {inspection.unit_type} • {inspection.system_type}
                    </div>
                    {inspection.serial_number && (
                      <div className="text-xs text-gray-500">
                        S/N: {inspection.serial_number}
                      </div>
                    )}
                    {inspection.comment && (
                      <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                        <strong>Comment:</strong> {inspection.comment}
                      </div>
                    )}
                    {isInspectionUsedInQuotes(inspection.id) && (
                      <div className="text-xs text-orange-600 mt-1">
                        <strong>Note:</strong> This inspection was included in a
                        previous{" "}
                        {
                          getMostRecentQuoteForItem("inspection", inspection.id)
                            ?.quote_type
                        }{" "}
                        quote
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

      {/* Available Replacement Options */}
      {selectedQuoteType === "replacement" &&
        availableReplacements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <Home className="h-4 w-4 mr-2 text-blue-600" />
              Select Replacement Options to Include
              <span className="ml-2 text-xs text-blue-600 font-normal">
                (Required for replacement quotes)
              </span>
            </h3>
            <div className="space-y-2">
              {availableReplacements.map((replacement) => (
                <label
                  key={replacement.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedReplacements.includes(replacement.id)}
                    onChange={() => handleReplacementToggle(replacement.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {replacement.selected_phase === "phase1" &&
                          "Economy Option"}
                        {replacement.selected_phase === "phase2" &&
                          "Standard Option"}
                        {replacement.selected_phase === "phase3" &&
                          "Premium Option"}
                      </span>
                      <div className="flex items-center gap-2">
                        {isReplacementUsedInQuotes(replacement.id) && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            Used in previous quote
                          </span>
                        )}
                        <span className="font-medium text-blue-600">
                          $
                          {Number(replacement.total_cost || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Labor: ${Number(replacement.labor || 0).toLocaleString()}{" "}
                      • Crane: {replacement.needs_crane ? "Yes" : "No"} •
                      Permit: {replacement.requires_permit ? "Yes" : "No"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {replacement.refrigeration_recovery > 0 && (
                        <span className="mr-2">
                          Refrigeration Recovery: $
                          {Number(
                            replacement.refrigeration_recovery
                          ).toLocaleString()}
                        </span>
                      )}
                      {replacement.start_up_costs > 0 && (
                        <span className="mr-2">
                          Start Up: $
                          {Number(replacement.start_up_costs).toLocaleString()}
                        </span>
                      )}
                      {replacement.thermostat_startup > 0 && (
                        <span className="mr-2">
                          Thermostat: $
                          {Number(
                            replacement.thermostat_startup
                          ).toLocaleString()}
                        </span>
                      )}
                      {replacement.removal_cost > 0 && (
                        <span className="mr-2">
                          Removal: $
                          {Number(replacement.removal_cost).toLocaleString()}
                        </span>
                      )}
                      {replacement.permit_cost > 0 && (
                        <span className="mr-2">
                          Permit: $
                          {Number(replacement.permit_cost).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {replacement.accessories &&
                      replacement.accessories.length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          <strong>Accessories:</strong>{" "}
                          {replacement.accessories
                            .map((acc: any) => `${acc.name} ($${acc.cost})`)
                            .join(", ")}
                        </div>
                      )}
                    {replacement.additional_items &&
                      replacement.additional_items.length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          <strong>Additional Items:</strong>{" "}
                          {replacement.additional_items
                            .map((item: any) => `${item.name} ($${item.cost})`)
                            .join(", ")}
                        </div>
                      )}
                    {replacement.warranty && (
                      <div className="text-xs text-gray-500">
                        Warranty: {replacement.warranty}
                      </div>
                    )}
                    {isReplacementUsedInQuotes(replacement.id) && (
                      <div className="text-xs text-orange-600 mt-1">
                        <strong>Note:</strong> This replacement option was
                        included in a previous{" "}
                        {
                          getMostRecentQuoteForItem(
                            "replacement",
                            replacement.id
                          )?.quote_type
                        }{" "}
                        quote
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

      {/* Available Repair Options */}
      {selectedQuoteType === "repair" && jobItems && jobItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <Package className="h-4 w-4 mr-2 text-green-600" />
            Select Repair Options to Include
            <span className="ml-2 text-xs text-green-600 font-normal">
              (Required for repair quotes)
            </span>
          </h3>
          <div className="space-y-2">
            {jobItems
              .filter((item) => item.type === "part")
              .map((item, index) => (
                <label
                  key={index}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRepairItems.includes(item.id)}
                    onChange={() => handleRepairItemToggle(item.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {item.name || "Unnamed Part"}
                      </span>
                      <div className="flex items-center gap-2">
                        {isRepairItemUsedInQuotes(item.id) && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            Used in previous quote
                          </span>
                        )}
                        <span className="font-medium text-green-600">
                          $
                          {Number(
                            item.total_cost || item.cost || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Quantity: {item.quantity || 1} • Type: {item.type}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
          </div>
        </div>
      )}

      {/* Available PM Quotes */}
      {selectedQuoteType === "pm" &&
        availablePMQuotes &&
        availablePMQuotes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <CheckSquare className="h-4 w-4 mr-2 text-blue-600" />
              Select PM Quotes to Include
              <span className="ml-2 text-xs text-blue-600 font-normal">
                (Required for PM quotes)
              </span>
            </h3>
            <div className="space-y-2">
              {availablePMQuotes.map((pmQuote, index) => (
                <label
                  key={pmQuote.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPMQuotes.includes(pmQuote.id)}
                    onChange={() => handlePMQuoteToggle(pmQuote.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">PM Quote {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600">
                          ${Number(pmQuote.total_cost || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Units: {pmQuote.unit_count || 0} •
                      {pmQuote.include_comprehensive_service && (
                        <span className="ml-2">
                          Comprehensive:{" "}
                          {pmQuote.comprehensive_visits_count || 0} visits
                        </span>
                      )}
                      {pmQuote.include_filter_change_service && (
                        <span className="ml-2">
                          Filter: {pmQuote.filter_visits_count || 0} visits
                        </span>
                      )}
                    </div>
                    {pmQuote.scope_of_work && (
                      <div className="text-xs text-gray-500 mt-1">
                        {pmQuote.scope_of_work.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

      {/* No Data Available */}
      {((selectedQuoteType === "inspection" &&
        availableInspections.length === 0) ||
        (selectedQuoteType === "replacement" &&
          availableReplacements.length === 0) ||
        (selectedQuoteType === "repair" &&
          jobItems.filter((item) => item.type === "part").length === 0) ||
        (selectedQuoteType === "pm" && availablePMQuotes.length === 0)) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 mb-2">
            No data available for {selectedQuoteType} quote generation
          </p>
          <p className="text-sm text-gray-400">
            {selectedQuoteType === "inspection"
              ? "Complete inspections first"
              : selectedQuoteType === "replacement"
              ? "Add replacement options first"
              : selectedQuoteType === "repair"
              ? "Add repair parts first"
              : "Use the Quote Section PM tab to create PM quotes"}
          </p>
        </div>
      )}

      {/* Generate Quote Button */}
      {((selectedQuoteType === "inspection" &&
        availableInspections.length > 0) ||
        (selectedQuoteType === "replacement" &&
          availableReplacements.length > 0) ||
        (selectedQuoteType === "repair" &&
          jobItems.filter((item) => item.type === "part").length > 0) ||
        (selectedQuoteType === "pm" && availablePMQuotes.length > 0)) && (
        <div className="border-t pt-6">
          <button
            onClick={handleGenerateQuote}
            className="btn btn-primary w-full sm:w-auto"
            disabled={
              (selectedQuoteType === "inspection" &&
                selectedInspections.length === 0) ||
              (selectedQuoteType === "replacement" &&
                selectedReplacements.length === 0) ||
              (selectedQuoteType === "repair" &&
                selectedRepairItems.length === 0) ||
              (selectedQuoteType === "pm" && selectedPMQuotes.length === 0) ||
              isGeneratingPDF
            }
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Generate{" "}
                {selectedQuoteType === "pm"
                  ? "PM"
                  : selectedQuoteType.charAt(0).toUpperCase() +
                    selectedQuoteType.slice(1)}{" "}
                Quote
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated Quote Summary */}
      {generatedQuoteData && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-md font-medium text-blue-900 mb-2">
            Generated Quote Summary
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div>
              <strong>Quote Type:</strong>{" "}
              {selectedQuoteType.charAt(0).toUpperCase() +
                selectedQuoteType.slice(1)}
            </div>
            <div>
              <strong>Selected Inspections:</strong>{" "}
              {selectedInspections.length}
            </div>
            <div>
              <strong>Selected Replacements:</strong>{" "}
              {selectedReplacements.length}
            </div>
            <div>
              <strong>Selected Repair Items:</strong>{" "}
              {selectedRepairItems.length}
            </div>
            <div>
              <strong>Selected PM Quotes:</strong> {selectedPMQuotes.length}
            </div>
            <div>
              <strong>Total Cost:</strong> ${totalCost.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Send Quote Modal */}
      {showSendQuoteModal && generatedQuoteData && (
        <SendEmailModal
          isOpen={showSendQuoteModal}
          onClose={() => setShowSendQuoteModal(false)}
          jobId={jobId || ""}
          jobNumber={job?.number || "MANUAL"}
          jobName={job?.name || "Manual Quote"}
          customerName={customerName || job?.contact_name}
          initialEmail={customerEmail || job?.contact_email || ""}
          replacementData={generatedQuoteData.selectedReplacements}
          selectedPhase={
            generatedQuoteData.selectedReplacements[0]?.selected_phase ||
            undefined
          }
          totalCost={totalCost}
          location={location}
          unit={unit}
          quoteType={selectedQuoteType === "pm" ? undefined : selectedQuoteType}
          onEmailSent={handleQuoteSent}
          emailTemplate={emailTemplate}
          replacementDataById={{}}
          inspectionData={generatedQuoteData.selectedInspections}
          selectedRepairOptions={
            selectedQuoteType === "repair" ? selectedRepairItems : []
          }
        />
      )}
    </div>
  );
};

export default GenerateQuote;
