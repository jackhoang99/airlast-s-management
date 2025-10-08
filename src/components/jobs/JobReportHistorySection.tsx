import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { FileText, Trash2, Eye } from "lucide-react";
import { Job } from "../../types/job";

type JobReportHistorySectionProps = {
  job: Job;
  onReportSent?: (updatedJob: Job) => void;
  refreshTrigger?: number;
  inspectionData?: any[];
};

const JobReportHistorySection = ({
  job,
  onReportSent,
  refreshTrigger = 0,
  inspectionData = [],
}: JobReportHistorySectionProps) => {
  const { supabase } = useSupabase();
  const [allReports, setAllReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState<string | null>(null);

  // Function to fetch reports for this job
  const fetchReports = async () => {
    if (!supabase || !job) return;

    setIsLoadingReports(true);
    try {
      // Fetch reports from reports table
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*")
        .eq("job_id", job.id)
        .eq("report_type", "inspection report")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reports:", error);
        return;
      }

      setAllReports(reports || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Function to delete a report
  const handleDeleteReport = async (reportId: string) => {
    if (!supabase) return;

    setIsDeletingReport(reportId);
    setDeleteError(null);

    try {
      // Delete from reports table
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setAllReports((prev) => prev.filter((report) => report.id !== reportId));
    } catch (err) {
      console.error("Error deleting report:", err);
      setDeleteError("Failed to delete report");
    } finally {
      setIsDeletingReport(null);
    }
  };

  // Function to view report (opens PDF directly)
  const handleViewReport = (report: any) => {
    if (report.pdf_url) {
      // Open existing PDF in new tab
      window.open(report.pdf_url, "_blank");
    } else {
      // Generate PDF on demand if no URL exists
      handleDownloadReport(report);
    }
  };

  // Function to download report PDF
  const handleDownloadReport = async (report: any) => {
    if (report.pdf_url) {
      // Open existing PDF in new tab
      window.open(report.pdf_url, "_blank");
    } else {
      // Generate PDF on demand
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/generate-inspection-report`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              jobId: job.id,
              quoteType: "inspection",
              quoteNumber: report.report_number,
              templateId: null,
              jobData: job,
              inspectionData: inspectionData, // Use current inspection data
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate report PDF");
        }

        const result = await response.json();
        if (result.pdfUrl) {
          window.open(result.pdfUrl, "_blank");
          // Refresh reports to get updated PDF URL
          fetchReports();
        }
      } catch (error) {
        console.error("Error generating report PDF:", error);
      }
    }
  };

  // Fetch reports when component mounts or job changes
  useEffect(() => {
    if (supabase && job) {
      fetchReports();
    }
  }, [supabase, job, refreshTrigger, inspectionData]);

  return (
    <div>
      {/* Reports Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                REPORT NUMBER
              </th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                REPORT TYPE
              </th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                CREATED DATE
              </th>
              <th className="px-3 py-2 sm:px-6 sm:py-3 font-semibold text-gray-500">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Historical Reports */}
            {(allReports || []).map((report, index) => (
              <tr
                key={report?.id || index}
                className={`border-b hover:bg-primary-50 transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-3 py-2 sm:px-6 sm:py-3 font-medium align-middle">
                  {report.report_number || "-"}
                </td>
                <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      report.report_type === "inspection"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {report.report_type === "inspection"
                      ? "Inspection"
                      : report.report_type.charAt(0).toUpperCase() +
                        report.report_type.slice(1)}
                  </span>
                </td>
                <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                  {report.created_at
                    ? new Date(report.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      className="btn btn-secondary btn-xs w-full sm:w-auto"
                      onClick={() => handleViewReport(report)}
                      title="View Report"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="btn btn-danger btn-xs w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleDeleteReport(report.id)}
                      disabled={isDeletingReport === report.id}
                      title="Delete Report"
                    >
                      {isDeletingReport === report.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {(!allReports || allReports.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No reports available</p>
            <p className="text-sm text-gray-400">
              Use the Inspection Section to generate inspection reports
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {deleteError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {deleteError}
        </div>
      )}
    </div>
  );
};

export default JobReportHistorySection;
