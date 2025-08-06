import { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";
import { Link } from "react-router-dom";
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
  Settings,
} from "lucide-react";
import ArrowBack from "../components/ui/ArrowBack";
import QuotePDFViewer from "../components/quotes/QuotePDFViewer";
import SendEmailModal from "../components/jobs/SendEmailModal";

type Quote = {
  id: string;
  quote_number: string;
  quote_type: "replacement" | "repair" | "inspection" | "pm";
  amount: number;
  status: string;
  confirmed: boolean;
  approved: boolean;
  confirmed_at: string | null;
  email_sent_at: string | null;
  created_at: string;
  job_id: string;
  quote_data: any;
  pdf_url?: string;
  pdf_generated_at?: string;
  jobs: {
    number: string;
    name: string;
    contact_name: string;
    contact_email: string;
    locations: {
      name: string;
      companies: {
        name: string;
      };
    };
    job_units: {
      unit_id: string;
      units: {
        id: string;
        unit_number: string;
      };
    }[];
  };
};

export default function AllQuotes() {
  const { supabase } = useSupabase();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [activeQuoteFilter, setActiveQuoteFilter] = useState<
    "all" | "replacement" | "repair" | "inspection" | "pm"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "created" | "sent" | "approved" | "declined"
  >("all");
  const [sentQuoteTypes, setSentQuoteTypes] = useState<{
    replacement: boolean;
    repair: boolean;
    inspection: boolean;
    pm: boolean;
  }>({
    replacement: false,
    repair: false,
    inspection: false,
    pm: false,
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState<string | null>(null);
  const [showQuotePDF, setShowQuotePDF] = useState(false);
  const [activeQuoteType, setActiveQuoteType] = useState<
    "replacement" | "repair" | "inspection" | "pm"
  >("replacement");
  const [activeQuoteData, setActiveQuoteData] = useState<any>(null);
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [selectedQuoteForSending, setSelectedQuoteForSending] = useState<
    any | null
  >(null);

  // Calculate quote counts and amounts by type (total counts, not filtered)
  const getQuoteCounts = () => {
    const all = quotes.length;
    const replacement = quotes.filter(
      (q) => q.quote_type === "replacement"
    ).length;
    const repair = quotes.filter((q) => q.quote_type === "repair").length;
    const inspection = quotes.filter(
      (q) => q.quote_type === "inspection"
    ).length;
    const pm = quotes.filter((q) => q.quote_type === "pm").length;

    // Calculate total amounts
    const replacementAmount = quotes
      .filter((q) => q.quote_type === "replacement")
      .reduce((sum, q) => sum + (q.amount || 0), 0);
    const repairAmount = quotes
      .filter((q) => q.quote_type === "repair")
      .reduce((sum, q) => sum + (q.amount || 0), 0);
    const inspectionAmount = quotes
      .filter((q) => q.quote_type === "inspection")
      .reduce((sum, q) => sum + (q.amount || 0), 0);
    const pmAmount = quotes
      .filter((q) => q.quote_type === "pm")
      .reduce((sum, q) => sum + (q.amount || 0), 0);
    const totalAmount =
      replacementAmount + repairAmount + inspectionAmount + pmAmount;

    return {
      all,
      replacement,
      repair,
      inspection,
      pm,
      replacementAmount,
      repairAmount,
      inspectionAmount,
      pmAmount,
      totalAmount,
    };
  };

  // Filter quotes based on active filter and status
  const getFilteredQuotes = () => {
    let filtered = quotes;

    // Filter by quote type
    if (activeQuoteFilter !== "all") {
      filtered = filtered.filter((q) => q.quote_type === activeQuoteFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((q) => {
        if (statusFilter === "created") {
          return !q.email_sent_at;
        } else if (statusFilter === "sent") {
          return q.email_sent_at && !q.confirmed;
        } else if (statusFilter === "approved") {
          return q.confirmed && q.approved;
        } else if (statusFilter === "declined") {
          return q.confirmed && !q.approved;
        }
        return true;
      });
    }

    return filtered;
  };

  // Check if we have available data for the current filter
  const hasAvailableDataForFilter = () => {
    switch (activeQuoteFilter) {
      case "replacement":
        return sentQuoteTypes.replacement;
      case "repair":
        return sentQuoteTypes.repair;
      case "inspection":
        return sentQuoteTypes.inspection;
      default:
        return true;
    }
  };

  // Fetch quotes with pagination
  const fetchQuotes = async (reset = false) => {
    if (!supabase) return;

    if (reset) {
      setPage(0);
      setQuotes([]);
      setHasMore(true);
    }

    setLoading(true);
    try {
      const currentPage = reset ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch job_quotes with pagination
      const { data: jobQuotesData, error: jobQuotesError } = await supabase
        .from("job_quotes")
        .select(
          `
          id,
          job_id,
          quote_number,
          quote_type,
          amount,
          status,
          confirmed,
          approved,
          confirmed_at,
          email_sent_at,
          created_at,
          pdf_url,
          pdf_generated_at,
          quote_data,
          jobs:job_id (
            number,
            name,
            contact_name,
            contact_email,
            locations (
              name,
              companies (
                name
              )
            )
          )
        `
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (jobQuotesError) throw jobQuotesError;

      // Fetch pm_quotes with pagination
      const { data: pmQuotesData, error: pmQuotesError } = await supabase
        .from("pm_quotes")
        .select(
          `
          id,
          job_id,
          total_cost,
          created_at,
          pdf_url,
          pdf_generated_at,
          jobs:job_id (
            number,
            name,
            contact_name,
            contact_email,
            locations (
              name,
              companies (
                name
              )
            )
          )
        `
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (pmQuotesError) throw pmQuotesError;

      // Transform PM quotes to match the Quote type structure
      const transformedPMQuotes = (pmQuotesData || []).map((pmQuote: any) => ({
        id: pmQuote.id,
        quote_number: `PM-${pmQuote.jobs.number}-${pmQuote.id.slice(-8)}`,
        quote_type: "pm" as const,
        amount: pmQuote.total_cost || 0,
        status: "Created",
        confirmed: false,
        approved: false,
        confirmed_at: null,
        email_sent_at: null,
        created_at: pmQuote.created_at,
        job_id: pmQuote.job_id,
        quote_data: pmQuote,
        pdf_url: pmQuote.pdf_url,
        pdf_generated_at: pmQuote.pdf_generated_at,
        jobs: pmQuote.jobs,
      }));

      // Transform job quotes to match Quote type structure
      const transformedJobQuotes = (jobQuotesData || []).map((quote: any) => ({
        ...quote,
        jobs: {
          ...quote.jobs,
          job_units: [], // Add empty job_units array since we removed the join
        },
      }));

      // Combine both types of quotes
      const newQuotes = [...transformedJobQuotes, ...transformedPMQuotes];

      if (reset) {
        setQuotes(newQuotes);
      } else {
        setQuotes((prev) => [...prev, ...newQuotes]);
      }

      // Check if we have more data
      setHasMore(newQuotes.length === PAGE_SIZE);
      setPage(currentPage + 1);

      // Determine which quote types have been sent
      const allQuotesForTypes = reset ? newQuotes : [...quotes, ...newQuotes];
      const quoteTypes = new Set(allQuotesForTypes.map((q) => q.quote_type));
      setSentQuoteTypes({
        replacement: quoteTypes.has("replacement"),
        repair: quoteTypes.has("repair"),
        inspection: quoteTypes.has("inspection"),
        pm: quoteTypes.has("pm"),
      });
    } catch (err) {
      console.error("Error fetching quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle quote deletion
  const handleDeleteQuote = async (quoteId: string) => {
    if (!supabase) return;

    if (!window.confirm("Are you sure you want to delete this quote?")) {
      return;
    }

    setIsDeletingQuote(quoteId);
    setDeleteError(null);

    try {
      const { error } = await supabase
        .from("job_quotes")
        .delete()
        .eq("id", quoteId);

      if (error) throw error;

      // Refresh quotes
      await fetchQuotes();
    } catch (err) {
      console.error("Error deleting quote:", err);
      setDeleteError("Failed to delete quote");
    } finally {
      setIsDeletingQuote(null);
    }
  };

  // Handle preview quote
  const handlePreviewQuote = (
    quoteType: "replacement" | "repair" | "inspection" | "pm",
    quoteData?: any
  ) => {
    setActiveQuoteType(quoteType);
    if (quoteData) {
      setActiveQuoteData(quoteData);
    }
    setShowQuotePDF(true);
  };

  // Handle quote sent
  const handleQuoteSent = () => {
    setShowSendQuoteModal(false);
    setSelectedQuoteForSending(null);
    // Refresh quotes
    fetchQuotes(true);
  };

  useEffect(() => {
    fetchQuotes(true);
  }, [supabase]);

  if (showQuotePDF) {
    return (
      <QuotePDFViewer
        jobId={activeQuoteData?.job_id || ""}
        quoteType={activeQuoteType}
        quoteData={activeQuoteData}
        existingQuoteId={activeQuoteData?.id}
        onBack={() => {
          setShowQuotePDF(false);
          setActiveQuoteData(null);
        }}
        backLabel="Back to All Quotes"
      />
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-4">
        <ArrowBack
          fallbackRoute="/"
          className="text-gray-500 hover:text-gray-700"
        />
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary-600" />
          <h1 className="text-2xl font-bold">All Quotes</h1>
        </div>
      </div>

      <div className="card">
        {/* Available Quote Types Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
          {/* All Quotes Card */}
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
              {getQuoteCounts().all} quote(s) - $
              {getQuoteCounts().totalAmount.toLocaleString()}
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
              {getQuoteCounts().replacement} replacement(s) - $
              {getQuoteCounts().replacementAmount.toLocaleString()}
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
              {getQuoteCounts().repair} repair(s) - $
              {getQuoteCounts().repairAmount.toLocaleString()}
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
                <FileCheck2 size={20} className="text-purple-600 mr-2" />
                <span className="font-medium text-purple-900">Inspection</span>
              </div>
              {sentQuoteTypes.inspection && (
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
              )}
            </div>
            <p className="text-sm text-purple-700 mt-1">
              {getQuoteCounts().inspection} inspection(s)
            </p>
          </div>

          <div
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              activeQuoteFilter === "pm"
                ? "bg-orange-100 border-orange-300"
                : "bg-orange-50 border-orange-200 hover:bg-orange-100"
            }`}
            onClick={() => setActiveQuoteFilter("pm")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings size={20} className="text-orange-600 mr-2" />
                <span className="font-medium text-orange-900">PM</span>
              </div>
              {sentQuoteTypes.pm && (
                <span className="w-2 h-2 bg-success-500 rounded-full"></span>
              )}
            </div>
            <p className="text-sm text-orange-700 mt-1">
              {getQuoteCounts().pm} PM quote(s)
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              Filter by Status
            </h4>
            <div className="flex items-center gap-4">
              {(activeQuoteFilter !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setActiveQuoteFilter("all");
                    setStatusFilter("all");
                  }}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Clear All Filters
                </button>
              )}
              <div className="text-sm text-gray-500">
                Showing {getFilteredQuotes().length} of {quotes.length} quotes
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter("created")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === "created"
                  ? "bg-yellow-600 text-white"
                  : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              }`}
            >
              Created
            </button>
            <button
              onClick={() => setStatusFilter("sent")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === "sent"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === "approved"
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter("declined")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === "declined"
                  ? "bg-red-600 text-white"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              Declined
            </button>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quote #
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confirmed
                </th>
                <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-2 sm:px-6 sm:py-3 text-center"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
                  </td>
                </tr>
              ) : (
                getFilteredQuotes().map((quote, index) => (
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
                      <Link
                        to={`/jobs/${quote.job_id}`}
                        className="block hover:bg-gray-50 rounded p-1 -m-1 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-primary-600 hover:text-primary-800 transition-colors">
                            {quote.jobs?.number || quote.job_id} -{" "}
                            {quote.jobs?.name || "(No Name)"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {quote.jobs?.locations?.companies?.name || ""} -{" "}
                            {quote.jobs?.locations?.name || ""}
                            {quote.jobs?.job_units?.[0]?.units?.unit_number && (
                              <span className="ml-1 text-gray-400">
                                (Unit{" "}
                                {quote.jobs.job_units[0].units.unit_number})
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-3 align-middle">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          quote.quote_type === "replacement"
                            ? "bg-blue-100 text-blue-800"
                            : quote.quote_type === "repair"
                            ? "bg-green-100 text-green-800"
                            : quote.quote_type === "pm"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {quote.quote_type === "pm"
                          ? "PM"
                          : quote.quote_type.charAt(0).toUpperCase() +
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
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          quote.confirmed
                            ? quote.approved
                              ? "bg-success-100 text-success-800"
                              : "bg-error-100 text-error-800"
                            : quote.email_sent_at
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {quote.confirmed
                          ? quote.approved
                            ? "Approved"
                            : "Declined"
                          : quote.email_sent_at
                          ? "Sent"
                          : "Created"}
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
                          onClick={() => {
                            // If we have a stored PDF URL, open it directly
                            if (quote.pdf_url) {
                              window.open(quote.pdf_url, "_blank");
                            } else {
                              // Fallback to the old preview method if no stored URL
                              handlePreviewQuote(
                                quote.quote_type as
                                  | "replacement"
                                  | "repair"
                                  | "inspection"
                                  | "pm",
                                quote
                              );
                            }
                          }}
                          title="Preview Quote"
                        >
                          <Eye size={16} />
                        </button>
                        {!quote.email_sent_at ? (
                          <button
                            className="btn btn-primary btn-xs w-full sm:w-auto"
                            onClick={() => {
                              setSelectedQuoteForSending(quote);
                              setShowSendQuoteModal(true);
                            }}
                            title="Send Quote"
                          >
                            <Send size={16} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-xs w-full sm:w-auto"
                            onClick={() => {
                              setSelectedQuoteForSending(quote);
                              setShowSendQuoteModal(true);
                            }}
                            title="Resend Quote"
                          >
                            <Send size={16} />
                          </button>
                        )}
                        <button
                          className="btn btn-error btn-xs w-full sm:w-auto"
                          onClick={() => handleDeleteQuote(quote.id)}
                          disabled={isDeletingQuote === quote.id}
                          title="Delete Quote"
                        >
                          {isDeletingQuote === quote.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* No Data Message */}
        {getFilteredQuotes().length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">
              {activeQuoteFilter === "all"
                ? "No quotes available"
                : `No ${activeQuoteFilter} quotes available`}
            </p>
            <p className="text-sm text-gray-400">
              {activeQuoteFilter === "all"
                ? "Quotes will appear here once they are generated from jobs"
                : `No ${activeQuoteFilter} quotes have been generated yet`}
            </p>
          </div>
        )}

        {/* Delete Error Message */}
        {deleteError && (
          <div className="bg-error-50 text-error-700 p-2 rounded mb-2">
            {deleteError}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && getFilteredQuotes().length > 0 && (
          <div className="flex justify-center mt-6">
            <button
              className="btn btn-primary"
              onClick={() => fetchQuotes(false)}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Loading...
                </div>
              ) : (
                "Load More Quotes"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Send Quote Modal */}
      {showSendQuoteModal && selectedQuoteForSending && (
        <SendEmailModal
          isOpen={showSendQuoteModal}
          onClose={() => {
            setShowSendQuoteModal(false);
            setSelectedQuoteForSending(null);
          }}
          jobId={selectedQuoteForSending.job_id}
          jobNumber={selectedQuoteForSending.jobs?.number || ""}
          jobName={selectedQuoteForSending.jobs?.name || ""}
          customerName={selectedQuoteForSending.jobs?.contact_name || undefined}
          initialEmail={selectedQuoteForSending.jobs?.contact_email || ""}
          replacementData={
            selectedQuoteForSending.quote_data?.replacementData || null
          }
          selectedPhase={
            selectedQuoteForSending.quote_data?.selectedPhase || undefined
          }
          totalCost={selectedQuoteForSending.amount}
          location={selectedQuoteForSending.quote_data?.location || null}
          unit={selectedQuoteForSending.quote_data?.unit || null}
          quoteType={selectedQuoteForSending.quote_type}
          pmQuotes={
            selectedQuoteForSending.quote_type === "pm"
              ? selectedQuoteForSending.quote_data?.pmQuotes || []
              : []
          }
          onEmailSent={handleQuoteSent}
          existingQuote={selectedQuoteForSending}
        />
      )}
    </div>
  );
}
