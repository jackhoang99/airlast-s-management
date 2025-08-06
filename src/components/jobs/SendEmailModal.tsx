import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import {
  X,
  FileInput as FileInvoice,
  Plus,
  AlertTriangle,
  DollarSign,
  Send,
  Printer,
  Eye,
  Mail,
  Check,
} from "lucide-react";

type SendEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobNumber: string;
  jobName: string;
  customerName?: string;
  initialEmail: string;
  replacementData?: any;
  allReplacementData?: any[];
  selectedPhase?: string;
  totalCost?: number;
  location?: any;
  unit?: any;
  quoteType?: "replacement" | "repair" | "inspection" | "pm";
  onEmailSent?: (updatedJob: any) => void;

  replacementDataById?: { [key: string]: any };
  repairItems?: any[];
  inspectionData?: any[];
  selectedReplacementOptions?: string[];
  selectedInspectionOptions?: string[];
  selectedRepairOptions?: string[];
  pmQuotes?: any[]; // PM quotes data for PM quote type
  existingQuote?: any; // Add prop for existing quote when resending
};

const SendEmailModal = ({
  isOpen,
  onClose,
  jobId,
  jobNumber,
  jobName,
  customerName,
  initialEmail = "",
  replacementData,
  allReplacementData = [],
  selectedPhase,
  totalCost = 0,
  location,
  unit,
  quoteType = "replacement",
  onEmailSent,
  replacementDataById = {},
  repairItems = [],
  inspectionData = [],
  selectedReplacementOptions = [],
  selectedInspectionOptions = [],
  selectedRepairOptions = [],
  pmQuotes = [],
  existingQuote,
}: SendEmailModalProps) => {
  const { supabase } = useSupabase();
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(
    existingQuote?.quote_number ||
      `QT-${jobNumber}-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [localInspectionData, setLocalInspectionData] = useState<any[]>(
    inspectionData || []
  );

  // Fetch job items and inspection data when modal opens
  useEffect(() => {
    if (isOpen && supabase && jobId) {
      const fetchData = async () => {
        try {
          // Check if supabase client is properly initialized
          if (!supabase) {
            console.error("Supabase client not available");
            return;
          }

          // Fetch job items
          const { data: itemsData, error: itemsError } = await supabase
            .from("job_items")
            .select("*")
            .eq("job_id", jobId);

          if (itemsError) {
            console.error("Error fetching job items:", itemsError);
            throw itemsError;
          }
          setJobItems(itemsData || []);

          // Fetch inspection data if not provided
          if (!inspectionData || inspectionData.length === 0) {
            const { data: inspData, error: inspError } = await supabase
              .from("job_inspections")
              .select("*")
              .eq("job_id", jobId)
              .eq("completed", true);

            if (inspError) {
              console.error("Error fetching inspection data:", inspError);
              throw inspError;
            }
            setLocalInspectionData(inspData || []);
          }
        } catch (err) {
          console.error("Error fetching data:", err);
          setError(
            "Failed to load job data. Please check your connection and try again."
          );
        }
      };

      fetchData();
    }
  }, [isOpen, supabase, jobId, inspectionData]);

  // Calculate the actual total cost from all replacement data
  const calculateActualTotalCost = () => {
    // If we have an existing quote, use its amount
    if (existingQuote) {
      return Number(existingQuote.amount) || 0;
    }

    // For inspection quotes, always use $180 regardless of number of inspections
    if (quoteType === "inspection") {
      return 180;
    }

    // For replacement quotes, use the total from replacement data by inspection
    if (
      quoteType === "replacement" &&
      replacementDataById &&
      Object.keys(replacementDataById).length > 0
    ) {
      return Object.values(replacementDataById).reduce(
        (sum, data: any) => sum + Number(data.totalCost || 0),
        0
      );
    }

    // For repair quotes, use the total cost of part items
    if (quoteType === "repair") {
      const partItemsTotal = jobItems
        .filter((item) => item.type === "part")
        .reduce((total, item) => total + Number(item.total_cost), 0);

      return partItemsTotal || totalCost || 0;
    }

    return totalCost || 0;
  };

  // Filter replacement data based on selected options for existing quotes
  const getFilteredReplacementData = () => {
    if (!replacementDataById || Object.keys(replacementDataById).length === 0) {
      return {};
    }

    // If we have selected replacement options for this specific quote, filter to only those
    if (selectedReplacementOptions && selectedReplacementOptions.length > 0) {
      const filtered: { [key: string]: any } = {};
      selectedReplacementOptions.forEach((optionId) => {
        if (replacementDataById[optionId]) {
          filtered[optionId] = replacementDataById[optionId];
        }
      });
      return filtered;
    }

    // Otherwise, return all available options (for new quotes)
    return replacementDataById;
  };

  const filteredReplacementData = getFilteredReplacementData();
  const actualTotalCost = calculateActualTotalCost();

  // Calculate replacement options count based on selected options or quote amount
  const calculateReplacementOptionsCount = () => {
    if (quoteType !== "replacement") {
      return 0;
    }

    // If we have selected replacement options for this specific quote, use those
    if (selectedReplacementOptions && selectedReplacementOptions.length > 0) {
      return selectedReplacementOptions.length;
    }

    // If we have replacementDataById, use all available options (for new quotes)
    if (replacementDataById && Object.keys(replacementDataById).length > 0) {
      return Object.keys(replacementDataById).length;
    }

    return 0;
  };

  const replacementOptionsCount = calculateReplacementOptionsCount();
  const repairOptionsCount =
    quoteType === "repair"
      ? jobItems.filter((item) => item.type === "part").length
      : 0;

  // Helper function to sanitize replacement data
  const sanitizeReplacementData = (data: any) => {
    if (!data) return null;

    return {
      phase1: data.phase1
        ? {
            description: data.phase1.description || "",
            cost: Number(data.phase1.cost) || 0,
          }
        : null,
      phase2: data.phase2
        ? {
            description: data.phase2.description || "",
            cost: Number(data.phase2.cost) || 0,
          }
        : null,
      phase3: data.phase3
        ? {
            description: data.phase3.description || "",
            cost: Number(data.phase3.cost) || 0,
          }
        : null,
      labor: Number(data.labor) || 0,
      refrigeration_recovery: Number(data.refrigeration_recovery) || 0,
      start_up_costs: Number(data.start_up_costs) || 0,
      accessories: Array.isArray(data.accessories)
        ? data.accessories.map((item: any) => ({
            name: item.name || "",
            cost: Number(item.cost) || 0,
          }))
        : [],
      thermostat_startup: Number(data.thermostat_startup) || 0,
      removal_cost: Number(data.removal_cost) || 0,
      warranty: data.warranty || "",
      additional_items: Array.isArray(data.additional_items)
        ? data.additional_items.map((item: any) => ({
            name: item.name || "",
            cost: Number(item.cost) || 0,
          }))
        : [],
      permit_cost: Number(data.permit_cost) || 0,
      needs_crane: Boolean(data.needsCrane),
      requires_permit: Boolean(data.requiresPermit),
      requires_big_ladder: Boolean(data.requiresBigLadder),
      selected_phase: data.selectedPhase || "phase2",
      total_cost: Number(data.totalCost) || 0,
      created_at: data.created_at || new Date().toISOString(),
    };
  };

  // Helper function to sanitize location data
  const sanitizeLocationData = (data: any) => {
    if (!data) return null;

    return {
      name: data.name || "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      zip: data.zip || "",
    };
  };

  // Helper function to sanitize unit data
  const sanitizeUnitData = (data: any) => {
    if (!data) return null;

    return {
      unit_number: data.unit_number || "",
    };
  };

  // Helper function to sanitize replacement data by inspection
  const sanitizeReplacementDataById = (data: { [key: string]: any }) => {
    if (!data || typeof data !== "object") return {};

    const result: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeReplacementData(value);
    }

    return result;
  };

  const handleSendQuote = async () => {
    if (!supabase || !jobId || !customerEmail) {
      setError("Customer email is required to send a quote");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Generate a unique token for quote confirmation
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Update job with token and quote sent status
      const { data: updatedJob, error: updateError } = await supabase
        .from("jobs")
        .update({
          quote_token: token,
          quote_sent: true,
          quote_sent_at: new Date().toISOString(),
          contact_email: customerEmail,
        })
        .eq("id", jobId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Fetch the full job record (with locations, units, companies)
      const { data: fullJobData, error: jobFetchError } = await supabase
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
          units (
            unit_number
          )
        `
        )
        .eq("id", jobId)
        .single();
      if (jobFetchError) throw jobFetchError;

      // Fetch all inspection data
      const { data: allInspectionData, error: allInspectionError } =
        await supabase
          .from("job_inspections")
          .select("*")
          .eq("job_id", jobId)
          .eq("completed", true);
      if (allInspectionError) throw allInspectionError;

      // Fetch all replacement data
      const { data: allReplacementData, error: allReplacementError } =
        await supabase.from("job_replacements").select("*").eq("job_id", jobId);
      if (
        allReplacementError &&
        !allReplacementError.message.includes("contains 0 rows")
      )
        throw allReplacementError;

      // Fetch all job items
      const { data: allJobItems, error: allItemsError } = await supabase
        .from("job_items")
        .select("*")
        .eq("job_id", jobId);
      if (allItemsError) throw allItemsError;

      // Organize replacement data by id
      const replacementDataById: { [key: string]: any } = {};
      if (allReplacementData && allReplacementData.length > 0) {
        allReplacementData.forEach((item) => {
          replacementDataById[item.id] = {
            needsCrane: item.needs_crane || false,
            phase1: item.phase1 || {},
            phase2: item.phase2 || {},
            phase3: item.phase3 || {},
            labor: item.labor || 0,
            refrigerationRecovery: item.refrigeration_recovery || 0,
            startUpCosts: item.start_up_costs || 0,
            accessories: item.accessories || [],
            thermostatStartup: item.thermostat_startup || 0,
            removalCost: item.removal_cost || 0,
            warranty: item.warranty || "",
            additionalItems: item.additional_items || [],
            permitCost: item.permit_cost || 0,
            selectedPhase: item.selected_phase || "phase2",
            totalCost: item.total_cost || 0,
            created_at: item.created_at || "",
          };
        });
      }

      // Try to fetch default template
      const { data: templateData, error: templateError } = await supabase
        .from("quote_templates")
        .select("*")
        .eq("template_data->>type", "pdf")
        .eq("template_data->>templateType", quoteType)
        .eq("template_data->>isDefault", "true")
        .limit(1);
      if (templateError) throw templateError;
      let templateToUse =
        templateData && templateData.length > 0 ? templateData[0] : null;
      // Fallback to any template
      if (!templateToUse) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("quote_templates")
          .select("*")
          .eq("template_data->>type", "pdf")
          .eq("template_data->>templateType", quoteType)
          .limit(1);
        if (fallbackError) throw fallbackError;
        if (fallback && fallback.length > 0) {
          templateToUse = fallback[0];
          // Promote fallback template as default
          const updatedTemplateData = {
            ...fallback[0].template_data,
            isDefault: true,
          };
          await supabase
            .from("quote_templates")
            .update({ template_data: updatedTemplateData })
            .eq("id", fallback[0].id);
        }
      }
      if (!templateToUse) {
        throw new Error(
          `No PDF template found for ${quoteType} quotes. Please upload a template and set it as default.`
        );
      }
      // Check if we have a stored PDF URL for existing quotes
      let pdfUrlToUse = null;

      if (existingQuote && existingQuote.pdf_url) {
        // Use the stored PDF URL if available
        pdfUrlToUse = existingQuote.pdf_url;
        setPdfUrl(pdfUrlToUse);
      } else {
        // Generate new PDF if no stored URL exists
        const generatePdfUrl = `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/generate-quote-pdf`;
        const response = await fetch(generatePdfUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            jobId,
            quoteType,
            quoteNumber,
            templateId: templateToUse.id,
            jobData: fullJobData,
            inspectionData: allInspectionData,
            replacementData:
              allReplacementData && allReplacementData.length > 0
                ? allReplacementData[0]
                : null,
            jobItems: allJobItems,
            replacementDataById: filteredReplacementData,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate PDF");
        }
        const generateResult = await response.json();
        if (!generateResult.pdfUrl) {
          throw new Error("No PDF URL returned from the server");
        }
        pdfUrlToUse = generateResult.pdfUrl;
        setPdfUrl(pdfUrlToUse);
      }

      let quoteData;
      let quoteError;

      if (existingQuote && existingQuote.email_sent_at) {
        // Update existing quote that has already been sent (resend)
        const { data: updatedQuote, error: updateError } = await supabase
          .from("job_quotes")
          .update({
            token: token,
            email: customerEmail,
            pdf_url: pdfUrlToUse,
            pdf_generated_at: new Date().toISOString(),
            quote_data: {
              // Update quote data with current information
              quoteType,
              quoteNumber,
              totalCost: existingQuote.amount, // Use existing quote's amount
              selectedReplacementOptions:
                quoteType === "replacement"
                  ? Object.keys(replacementDataById)
                  : null,
              selectedInspectionOptions:
                quoteType === "inspection"
                  ? inspectionData.map((insp: any) => insp.id)
                  : null,
              selectedRepairOptions:
                quoteType === "repair" ? selectedRepairOptions : null,
              replacementDataById:
                quoteType === "replacement"
                  ? sanitizeReplacementDataById(replacementDataById)
                  : {},
              inspectionData: quoteType === "inspection" ? inspectionData : [],
              repairItems:
                quoteType === "repair"
                  ? allJobItems.filter((item) => item.type === "part")
                  : [],
              pmQuotes: quoteType === "pm" ? pmQuotes : [],
              jobItems: allJobItems,
              location: sanitizeLocationData(location),
              unit: sanitizeUnitData(unit),
              selectedPhase,
              generatedAt: new Date().toISOString(),
            },
          })
          .eq("id", existingQuote.id)
          .select()
          .single();

        quoteData = updatedQuote;
        quoteError = updateError;
      } else if (existingQuote && !existingQuote.email_sent_at) {
        // Update existing quote that hasn't been sent yet (first time sending)
        const { data: updatedQuote, error: updateError } = await supabase
          .from("job_quotes")
          .update({
            token: token,
            email: customerEmail,
            pdf_url: pdfUrlToUse,
            pdf_generated_at: new Date().toISOString(),
            quote_data: {
              // Update quote data with current information
              quoteType,
              quoteNumber,
              totalCost: existingQuote.amount, // Use existing quote's amount
              selectedReplacementOptions:
                quoteType === "replacement"
                  ? Object.keys(replacementDataById)
                  : null,
              selectedInspectionOptions:
                quoteType === "inspection"
                  ? inspectionData.map((insp: any) => insp.id)
                  : null,
              selectedRepairOptions:
                quoteType === "repair" ? selectedRepairOptions : null,
              replacementDataById:
                quoteType === "replacement"
                  ? sanitizeReplacementDataById(replacementDataById)
                  : {},
              inspectionData: quoteType === "inspection" ? inspectionData : [],
              repairItems:
                quoteType === "repair"
                  ? allJobItems.filter((item) => item.type === "part")
                  : [],
              pmQuotes: quoteType === "pm" ? pmQuotes : [],
              jobItems: allJobItems,
              location: sanitizeLocationData(location),
              unit: sanitizeUnitData(unit),
              selectedPhase,
              generatedAt: new Date().toISOString(),
            },
          })
          .eq("id", existingQuote.id)
          .select()
          .single();

        quoteData = updatedQuote;
        quoteError = updateError;
      } else {
        // Create new quote record
        const { data: newQuote, error: insertError } = await supabase
          .from("job_quotes")
          .insert({
            job_id: jobId,
            quote_number: quoteNumber,
            quote_type: quoteType,
            amount: actualTotalCost,
            token: token,
            confirmed: false,
            approved: false,
            email: customerEmail,
            pdf_url: pdfUrlToUse,
            pdf_generated_at: new Date().toISOString(),
            selected_replacement_options:
              quoteType === "replacement"
                ? Object.keys(replacementDataById)
                : null,
            selected_repair_options:
              quoteType === "repair" ? selectedRepairOptions : null,
            selected_inspection_options:
              quoteType === "inspection"
                ? inspectionData.map((insp: any) => insp.id)
                : null,
            quote_data: {
              // Store complete quote data for preview functionality
              quoteType,
              quoteNumber,
              totalCost: actualTotalCost,
              selectedReplacementOptions:
                quoteType === "replacement"
                  ? Object.keys(replacementDataById)
                  : null,
              selectedInspectionOptions:
                quoteType === "inspection"
                  ? inspectionData.map((insp: any) => insp.id)
                  : null,
              selectedRepairOptions:
                quoteType === "repair" ? selectedRepairOptions : null,
              replacementDataById:
                quoteType === "replacement"
                  ? sanitizeReplacementDataById(replacementDataById)
                  : {},
              inspectionData: quoteType === "inspection" ? inspectionData : [],
              repairItems:
                quoteType === "repair"
                  ? allJobItems.filter((item) => item.type === "part")
                  : [],
              pmQuotes: quoteType === "pm" ? pmQuotes : [],
              jobItems: allJobItems,
              location: sanitizeLocationData(location),
              unit: sanitizeUnitData(unit),
              selectedPhase,
              generatedAt: new Date().toISOString(),
            },
          })
          .select()
          .single();

        quoteData = newQuote;
        quoteError = insertError;
      }

      if (quoteError) {
        console.error("Error saving quote record:", quoteError);
      }

      // Prepare and send email based on quote type
      let apiUrl;
      let requestBody;

      apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote`;

      // Get all replacement data
      const { data: fetchedReplacementData, error: replacementError } =
        await supabase.from("job_replacements").select("*").eq("job_id", jobId);

      if (replacementError) throw replacementError;

      const sanitizedAllReplacementData = fetchedReplacementData
        ? fetchedReplacementData.map(sanitizeReplacementData)
        : [];

      // For repair quotes, get all part items
      const repairItems =
        quoteType === "repair"
          ? allJobItems.filter((item) => item.type === "part")
          : [];

      // Filter inspection data based on selected inspections
      const filteredInspectionData =
        selectedInspectionOptions && selectedInspectionOptions.length > 0
          ? allInspectionData.filter((insp: any) =>
              selectedInspectionOptions.includes(insp.id)
            )
          : allInspectionData;

      console.log("=== SEND EMAIL MODAL DEBUG ===");
      console.log(
        "selectedInspectionOptions received:",
        selectedInspectionOptions
      );
      console.log(
        "selectedInspectionOptions.length:",
        selectedInspectionOptions?.length
      );
      console.log(
        "filteredInspectionData.length:",
        filteredInspectionData.length
      );
      console.log("allInspectionData.length:", allInspectionData.length);

      requestBody = {
        jobId,
        customerEmail,
        quoteToken: token,
        jobNumber,
        jobName,
        customerName,
        replacementData:
          allReplacementData && allReplacementData.length > 0
            ? allReplacementData[0]
            : null,
        allReplacementData: sanitizedAllReplacementData,
        selectedPhase,
        totalCost: actualTotalCost,
        location: sanitizeLocationData(location),
        unit: sanitizeUnitData(unit),
        quoteNumber,
        quoteType,
        pdfUrl: pdfUrlToUse,
        replacementDataById:
          quoteType === "replacement" ? filteredReplacementData : {},
        repairItems: quoteType === "repair" ? repairItems : [],
        inspectionData: filteredInspectionData,
        pmQuotes: quoteType === "pm" ? pmQuotes : [],
        selectedInspectionOptions: selectedInspectionOptions,
        quoteData: quoteData?.quote_data || null,
      };

      console.log("=== REQUEST BODY DEBUG ===");
      console.log(
        "requestBody.selectedInspectionOptions:",
        requestBody.selectedInspectionOptions
      );
      console.log(
        "requestBody.selectedInspectionOptions.length:",
        requestBody.selectedInspectionOptions?.length
      );

      const emailResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || "Failed to send quote email");
      }

      // Update quote record to mark email as sent
      if (quoteData) {
        const { error: updateError } = await supabase
          .from("job_quotes")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", quoteData.id);

        if (updateError) {
          console.error("Error updating quote email_sent_at:", updateError);
        }
      }

      setSuccess(true);

      if (onEmailSent) {
        onEmailSent(updatedJob);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error sending quote:", err);
      setError(err instanceof Error ? err.message : "Failed to send quote");
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
          {existingQuote && existingQuote.email_sent_at
            ? quoteType === "replacement"
              ? "Resend Replacement Quote"
              : quoteType === "repair"
              ? "Resend Repair Quote"
              : "Resend Inspection Quote"
            : quoteType === "replacement"
            ? "Send Replacement Quote"
            : quoteType === "repair"
            ? "Send Repair Quote"
            : "Send Inspection Quote"}
        </h3>

        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-success-50 text-success-700 p-4 rounded-md text-center">
            <p className="font-medium">
              {existingQuote && existingQuote.email_sent_at
                ? "Quote resent successfully!"
                : "Quote sent successfully!"}
            </p>
            <p className="text-sm mt-2">
              The customer will receive an email with the quote details.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will{" "}
                {existingQuote && existingQuote.email_sent_at
                  ? "resend"
                  : "send"}{" "}
                a {quoteType} quote for Job #{jobNumber} to the customer via
                email. The quote will include all relevant information based on
                the selected quote type.
              </p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="quoteNumber"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Quote Number
                  </label>
                  <input
                    type="text"
                    id="quoteNumber"
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className={`input ${
                      existingQuote
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : ""
                    }`}
                    required
                    readOnly={!!existingQuote}
                    disabled={!!existingQuote}
                  />
                </div>

                <div>
                  <label
                    htmlFor="customerEmail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
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
                    <span className="font-medium capitalize">
                      {quoteType} Quote
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">
                      {customerName || "Not specified"}
                    </span>
                  </div>
                  {quoteType === "replacement" && (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">
                          Replacement Options:
                        </span>
                        <span className="font-medium">
                          {replacementOptionsCount} option(s)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">
                          ${actualTotalCost.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {quoteType === "repair" && (
                    <>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Repair Items:</span>
                        <span className="font-medium">
                          {repairOptionsCount} item(s)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">
                          ${actualTotalCost.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {quoteType === "inspection" && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">
                        ${actualTotalCost.toLocaleString()}
                      </span>
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
                    {existingQuote && existingQuote.email_sent_at
                      ? "Resend Quote"
                      : "Send Quote"}
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
