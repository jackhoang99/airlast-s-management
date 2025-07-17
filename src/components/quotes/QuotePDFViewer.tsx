import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import { ArrowLeft, Printer, Download, AlertTriangle } from "lucide-react";

interface QuotePDFViewerProps {
  jobId: string;
  quoteType: "replacement" | "repair";
  onBack: () => void;
  backLabel?: string;
}

const QuotePDFViewer: React.FC<QuotePDFViewerProps> = ({
  jobId,
  quoteType,
  onBack,
  backLabel = "Back to Job Details",
}) => {
  const { supabase } = useSupabase();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generatePDF = async () => {
      if (!supabase || !jobId) {
        setError("Supabase client not initialized");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch job details with locations and all units via job_units
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
            job_units:job_units!inner (
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
        // Flatten units from job_units
        const units = (jobData.job_units || []).map((ju: any) => ju.units);

        // Fetch inspection data
        const { data: inspectionData, error: inspectionError } = await supabase
          .from("job_inspections")
          .select("*")
          .eq("job_id", jobId)
          .eq("completed", true);
        if (inspectionError) throw inspectionError;

        // Fetch replacement data
        const { data: replacementData, error: replacementError } =
          await supabase
            .from("job_replacements")
            .select("*")
            .eq("job_id", jobId);
        if (
          replacementError &&
          !replacementError.message.includes("contains 0 rows")
        )
          throw replacementError;

        // Fetch job items
        const { data: jobItems, error: itemsError } = await supabase
          .from("job_items")
          .select("*")
          .eq("job_id", jobId);
        if (itemsError) throw itemsError;

        // Organize replacement data by inspection_id
        const replacementDataById: { [key: string]: any } = {};
        if (replacementData && replacementData.length > 0) {
          replacementData.forEach((item) => {
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
          .eq("template_data->>isDefault", "true") // JSONB returns string
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

        const quoteNumber = `QT-${jobData.number}-${Math.floor(
          Math.random() * 10000
        )
          .toString()
          .padStart(4, "0")}`;

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
            jobId,
            quoteType,
            quoteNumber,
            templateId: templateToUse.id,
            jobData,
            inspectionData,
            replacementData:
              replacementData && replacementData.length > 0
                ? replacementData[0]
                : null,
            jobItems,
            replacementDataById: replacementDataById,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || errorData.error || "Failed to generate PDF"
          );
        }

        const result = await response.json();
        if (result.pdfUrl) {
          setPdfUrl(result.pdfUrl);
        } else {
          throw new Error("No PDF URL returned from the server");
        }
      } catch (err) {
        console.error("Error generating PDF:", err);
        setError(err instanceof Error ? err.message : "Failed to generate PDF");
      } finally {
        setIsLoading(false);
      }
    };

    generatePDF();
  }, [supabase, jobId, quoteType]);

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `quote-${jobId}-${quoteType}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} className="mr-1" />
          {backLabel}
        </button>

        <div className="flex gap-2">
          {pdfUrl && (
            <>
              <button onClick={handlePrint} className="btn btn-secondary">
                <Printer size={16} className="mr-2" />
                Print Quote
              </button>
              <button onClick={handleDownload} className="btn btn-primary">
                <Download size={16} className="mr-2" />
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
              <p className="text-sm text-error-700 mt-2">
                Please make sure you have uploaded a valid PDF template and set
                it as the default template for {quoteType} quotes.
              </p>
              <Link
                to="/template-debug"
                className="text-sm text-primary-600 hover:text-primary-800 mt-2 inline-block"
              >
                Go to Template Diagnostics
              </Link>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Generating PDF...</p>
          <p className="text-gray-500 text-sm mt-2">
            This may take a moment while we process your template.
          </p>
        </div>
      ) : pdfUrl ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <iframe
            src={pdfUrl}
            className="w-full h-[800px] border-0"
            title="Quote PDF"
          />
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No PDF could be generated. Please try again.
        </div>
      )}
    </div>
  );
};

export default QuotePDFViewer;
