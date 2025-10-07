import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import {
  Plus,
  FileInput as FileInvoice,
  Search,
  Filter,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import ArrowBack from "../components/ui/ArrowBack";
import InvoicePDFTemplate from "../components/invoices/InvoicePDFTemplate";
import MarkAsPaidModal from "../components/invoices/MarkAsPaidModal";
import HorizontalScrollTable from "../components/ui/HorizontalScrollTable";

type JobInvoice = Database["public"]["Tables"]["job_invoices"]["Row"] & {
  jobs: {
    id: string;
    number: string;
    name: string;
    locations: {
      name: string;
      companies: {
        name: string;
      };
    };
  };
};

const Invoices = () => {
  const { supabase } = useSupabase();
  const [invoices, setInvoices] = useState<JobInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "All",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  });

  // Modal and action states
  const [selectedInvoice, setSelectedInvoice] = useState<JobInvoice | null>(
    null
  );
  const [showInvoicePDF, setShowInvoicePDF] = useState(false);
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch job and job_items for selected invoice
  const fetchJobAndItems = async (invoice: JobInvoice) => {
    if (!supabase || !invoice.jobs?.id) return;
    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select(
        `*, locations (*, companies (*)), units (*), job_technicians (*, users (*))`
      )
      .eq("id", invoice.jobs.id)
      .maybeSingle();
    // Fetch job_items
    const { data: items, error: itemsError } = await supabase
      .from("job_items")
      .select("*")
      .eq("job_id", invoice.jobs.id);
    setJobData(job);
    setJobItems(items || []);
    setCustomerEmail(job?.contact_email || "");
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase) return;

      try {
        let query = supabase.from("job_invoices").select(`
            *,
            jobs (
              id,
              number,
              name,
              locations (
                name,
                companies (
                  name
                )
              )
            )
          `);

        // Apply filters
        if (filters.status !== "All") {
          query = query.eq("status", filters.status.toLowerCase());
        }
        if (filters.dateFrom) {
          query = query.gte("issued_date", filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte("issued_date", filters.dateTo);
        }
        if (filters.minAmount) {
          query = query.gte("amount", filters.minAmount);
        }
        if (filters.maxAmount) {
          query = query.lte("amount", filters.maxAmount);
        }

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError("Failed to fetch invoices. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [supabase, filters]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: "All",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
    });
    setSearchTerm("");
  };

  // Create Invoice Modal functions
  const fetchAvailableJobs = async () => {
    if (!supabase) return;

    try {
      setCreateInvoiceError(null);

      // Fetch all jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select(
          `
          id,
          number,
          name,
          status,
          type,
          contact_name,
          contact_email,
          created_at,
          location_id,
          locations (
            name,
            address,
            city,
            state,
            zip,
            company_id,
            companies (
              id,
              name
            )
          ),
          job_units (
            units (
              id,
              unit_number
            )
          )
        `
        );

      if (jobsError) throw jobsError;

      // Fetch jobs that already have invoices
      const { data: jobsWithInvoices, error: invoicesError } = await supabase
        .from("job_invoices")
        .select("job_id");

      if (invoicesError) throw invoicesError;

      const jobsWithInvoiceIds = new Set(
        (jobsWithInvoices || []).map((invoice: any) => invoice.job_id)
      );

      // Filter out jobs that already have invoices
      const jobsWithoutInvoices = (jobsData || []).filter(
        (job: any) => !jobsWithInvoiceIds.has(job.id)
      );

      // Transform the data to flatten units
      const transformedJobs = jobsWithoutInvoices.map((job: any) => ({
        ...job,
        units: (job.job_units || []).map((ju: any) => ju.units).filter(Boolean),
      }));

      setAvailableJobs(transformedJobs);

      // Fetch companies, locations, and units for filtering
      await fetchFilterOptions();
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setCreateInvoiceError(
        err instanceof Error ? err.message : "Failed to fetch jobs"
      );
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "issued":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "void":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const generateInvoicePDF = async (invoice: JobInvoice) => {
    if (!supabase || !jobData) return;

    setIsGeneratingPdf(true);
    try {
      const apiUrl = `${
        import.meta.env.VITE_SUPABASE_URL
      }/functions/v1/generate-invoice-pdf`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          jobId: jobData.id,
          invoiceId: invoice.id,
          jobData: jobData,
          jobItems: jobItems,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          issuedDate: invoice.issued_date,
          dueDate: invoice.due_date,
          invoiceType: invoice.type,
          description: invoice.description || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.pdfUrl) {
          setPdfUrl(result.pdfUrl);
        } else {
          throw new Error("No PDF URL returned");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      setPdfUrl(null);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.jobs?.number.toLowerCase().includes(searchLower) ||
      invoice.jobs?.name.toLowerCase().includes(searchLower) ||
      invoice.jobs?.locations?.name.toLowerCase().includes(searchLower) ||
      invoice.jobs?.locations?.companies?.name
        .toLowerCase()
        .includes(searchLower)
    );
  });

  const totalAmount = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount),
    0
  );
  const paidAmount = filteredInvoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const outstandingAmount = filteredInvoices
    .filter((invoice) => invoice.status === "issued")
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowBack
            fallbackRoute="/"
            className="text-gray-500 hover:text-gray-700"
          />
          <h1 className="flex items-center gap-2">
            <FileInvoice className="h-6 w-6" />
            Invoices
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/create-invoice" className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Create Invoice
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Invoices
              </p>
              <p className="text-3xl font-semibold mt-1">
                ${totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <FileInvoice className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {filteredInvoices.length} invoices total
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Paid Invoices</p>
              <p className="text-3xl font-semibold mt-1">
                ${paidAmount.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {filteredInvoices.filter((i) => i.status === "paid").length} paid
              invoices
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Outstanding Invoices
              </p>
              <p className="text-3xl font-semibold mt-1">
                ${outstandingAmount.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-warning-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {filteredInvoices.filter((i) => i.status === "issued").length}{" "}
              outstanding invoices
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
            <div>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Paid">Paid</option>
                <option value="Void">Void</option>
              </select>
            </div>

            <div>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="input"
                placeholder="From Date"
              />
            </div>

            <div>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="input"
                placeholder="To Date"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div className="flex items-center">
            <Filter size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-gray-500">
              Filters applied: {Object.values(filters).filter(Boolean).length}
            </span>
          </div>
          {(Object.values(filters).some(Boolean) || searchTerm) && (
            <button
              onClick={resetFilters}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Reset filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No invoices found. Try adjusting your filters or create a new
            invoice.
          </div>
        ) : (
          <HorizontalScrollTable>
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    INVOICE #
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    JOB NAME
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    DATE
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    DUE DATE
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    AMOUNT
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    STATUS
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    TYPE
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-2 font-semibold text-gray-500">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => (
                  <tr
                    key={invoice.id}
                    className={`border-b hover:bg-primary-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium align-middle">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 align-middle">
                      {invoice.jobs?.name || "-"}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 align-middle">
                      {invoice.issued_date || "-"}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 align-middle">
                      {invoice.due_date || "-"}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium align-middle">
                      ${Number(invoice.amount).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 align-middle">
                      {invoice.type === "replacement" && (
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                          Replacement
                        </span>
                      )}
                      {invoice.type === "repair" && (
                        <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-semibold">
                          Repair
                        </span>
                      )}
                      {invoice.type === "all" && (
                        <span className="inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-semibold">
                          All
                        </span>
                      )}
                      {invoice.type === "inspection" && (
                        <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">
                          Inspection
                        </span>
                      )}
                      {!invoice.type && (
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 align-middle">
                      <div className="flex flex-wrap gap-1 items-center">
                        <button
                          className="btn btn-secondary btn-xs w-full sm:w-auto"
                          title="View Invoice"
                          onClick={async () => {
                            setSelectedInvoice(invoice);
                            await fetchJobAndItems(invoice);
                            setShowInvoicePDF(true);
                            // Generate PDF when viewing
                            setTimeout(() => {
                              if (!pdfUrl && !isGeneratingPdf) {
                                generateInvoicePDF(invoice);
                              }
                            }, 100);
                          }}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-primary btn-xs w-full sm:w-auto"
                          title="Send Invoice"
                          onClick={async () => {
                            setSelectedInvoice(invoice);
                            await fetchJobAndItems(invoice);
                            setShowSendInvoiceModal(true);
                          }}
                        >
                          Send
                        </button>
                        <button
                          className="btn btn-success btn-xs w-full sm:w-auto"
                          title="Mark as Paid"
                          onClick={async () => {
                            setSelectedInvoice(invoice);
                            await fetchJobAndItems(invoice);
                            setShowMarkAsPaidModal(true);
                          }}
                        >
                          Mark as Paid
                        </button>
                        <button
                          className="p-1 rounded hover:bg-red-50 text-error-600 hover:text-error-800 transition-colors"
                          title="Delete Invoice"
                          aria-label="Delete Invoice"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDeleteInvoiceModal(true);
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HorizontalScrollTable>
        )}
      </div>

      {showInvoicePDF && selectedInvoice && jobData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 shadow-xl overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invoice View</h3>
              <div className="flex gap-2">
                {pdfUrl && (
                  <>
                    <button
                      onClick={() => window.open(pdfUrl, "_blank")}
                      className="btn btn-primary btn-sm"
                    >
                      <Eye size={16} className="mr-2" />
                      View PDF
                    </button>
                    <button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = pdfUrl;
                        a.download = `invoice-${selectedInvoice.invoice_number}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={16} className="mr-2" />
                      Download PDF
                    </button>
                  </>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowInvoicePDF(false);
                    setPdfUrl(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {isGeneratingPdf ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="bg-white rounded-lg shadow-lg">
                <iframe
                  src={pdfUrl}
                  className="w-full h-[800px] rounded-lg"
                  title="Invoice PDF"
                />
              </div>
            ) : (
              <>
                <InvoicePDFTemplate
                  job={jobData}
                  jobItems={jobItems}
                  invoice={selectedInvoice}
                />
                <div className="flex justify-end mt-4">
                  <button
                    className="btn btn-secondary"
                    onClick={() => window.print()}
                  >
                    Print Invoice
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSendInvoiceModal && selectedInvoice && jobData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <FileInvoice size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Send Invoice to Customer
            </h3>
            {sendError && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {sendError}
              </div>
            )}
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will send invoice #{selectedInvoice.invoice_number} to the
                customer via email with a PDF attachment.
              </p>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{jobData.contact_name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-medium">
                      {selectedInvoice.invoice_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">
                      ${Number(selectedInvoice.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Email
                  </label>
                  <div className="flex">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="input flex-1"
                      placeholder="customer@example.com"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    The customer will receive a link to view the invoice PDF
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSendInvoiceModal(false)}
                disabled={sendLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  setSendLoading(true);
                  setSendError(null);
                  try {
                    // Update invoice status to issued
                    const { data: updatedInvoice, error: updateError } =
                      await supabase
                        .from("job_invoices")
                        .update({
                          status: "issued",
                          issued_date: new Date().toISOString().split("T")[0],
                        })
                        .eq("id", selectedInvoice.id)
                        .select()
                        .single();
                    if (updateError) throw updateError;
                    // Update job contact email if changed
                    if (customerEmail !== jobData.contact_email) {
                      await supabase
                        .from("jobs")
                        .update({ contact_email: customerEmail })
                        .eq("id", jobData.id);
                    }
                    // Call Edge Function to send email
                    const apiUrl = `${
                      import.meta.env.VITE_SUPABASE_URL
                    }/functions/v1/send-invoice-email`;
                    await fetch(apiUrl, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${
                          import.meta.env.VITE_SUPABASE_ANON_KEY
                        }`,
                      },
                      body: JSON.stringify({
                        jobId: jobData.id,
                        invoiceId: selectedInvoice.id,
                        customerEmail,
                        jobNumber: jobData.number,
                        jobName: jobData.name,
                        customerName: jobData.contact_name,
                        invoiceNumber: updatedInvoice.invoice_number,
                        amount: updatedInvoice.amount,
                        issuedDate: updatedInvoice.issued_date,
                        dueDate: updatedInvoice.due_date,
                        jobItems,
                      }),
                    });
                    // Refresh invoices
                    setInvoices((prev) =>
                      prev.map((inv) =>
                        inv.id === updatedInvoice.id
                          ? { ...inv, ...updatedInvoice }
                          : inv
                      )
                    );
                    setShowSendInvoiceModal(false);
                  } catch (err: any) {
                    setSendError(err.message || "Failed to send invoice");
                  } finally {
                    setSendLoading(false);
                  }
                }}
                disabled={sendLoading || !customerEmail}
              >
                {sendLoading ? "Sending..." : "Send Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MarkAsPaidModal
        isOpen={showMarkAsPaidModal}
        onClose={() => setShowMarkAsPaidModal(false)}
        onSuccess={async () => {
          if (!supabase || !selectedInvoice) {
            setShowMarkAsPaidModal(false);
            return;
          }
          const sb = supabase;
          // Refresh invoices
          const { data, error } = await sb
            .from("job_invoices")
            .select("*")
            .eq("id", selectedInvoice.id)
            .maybeSingle();
          if (!error && data) {
            setInvoices((prev) =>
              prev.map((inv) =>
                inv.id === data.id ? { ...inv, ...data } : inv
              )
            );
          }
          setShowMarkAsPaidModal(false);
        }}
        invoice={selectedInvoice}
        jobName={jobData?.name || ""}
        customerName={jobData?.contact_name || undefined}
      />

      {showDeleteInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Delete Invoice</h3>
            <p>
              Are you sure you want to delete invoice{" "}
              <span className="font-bold">
                {selectedInvoice.invoice_number}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteInvoiceModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (!supabase || !selectedInvoice) {
                    setShowDeleteInvoiceModal(false);
                    setSelectedInvoice(null);
                    return;
                  }
                  const sb = supabase;
                  await sb
                    .from("job_invoices")
                    .delete()
                    .eq("id", selectedInvoice.id);
                  setInvoices((prev) =>
                    prev.filter((inv) => inv.id !== selectedInvoice.id)
                  );
                  setShowDeleteInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
