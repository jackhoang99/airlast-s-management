import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import { getScheduledDate, getScheduledTime } from "../../utils/dateUtils";
import {
  ArrowLeft,
  FileInput,
  MapPin,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Printer,
  Download,
  Eye,
} from "lucide-react";

const CustomerInvoiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const companyId = sessionStorage.getItem("customerPortalCompanyId");
    if (!companyId) {
      navigate("/customer/login");
      return;
    }
    setCompanyId(companyId);

    const fetchInvoiceDetails = async () => {
      if (!supabase || !id) return;

      try {
        setIsLoading(true);

        // Fetch invoice details
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("job_invoices")
          .select("*")
          .eq("id", id)
          .single();

        if (invoiceError) throw invoiceError;

        if (!invoiceData) {
          throw new Error("Invoice not found");
        }

        setInvoice(invoiceData);

        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(
            `
            *,
            locations (
              id,
              name,
              address,
              city,
              state,
              zip,
              company_id
            ),
            units (
              id,
              unit_number
            ),
            job_technicians (
              technician_id,
              is_primary,
              scheduled_at,
              users:technician_id (
                first_name,
                last_name
              )
            )
          `
          )
          .eq("id", invoiceData.job_id)
          .single();

        if (jobError) throw jobError;

        // Verify this job belongs to the logged-in company
        if (jobData.locations?.company_id !== companyId) {
          throw new Error("You do not have access to this invoice");
        }

        setJob(jobData);

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from("job_items")
          .select("*")
          .eq("job_id", invoiceData.job_id);

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // Generate a mock PDF URL for demo purposes
        // In a real app, you would fetch this from your backend
        setPdfUrl(
          `https://example.com/invoices/${invoiceData.invoice_number}.pdf`
        );
      } catch (err) {
        console.error("Error fetching invoice details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load invoice details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [supabase, id, navigate]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !invoice || !job) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Invoice
        </h3>
        <p className="text-gray-500 mb-4">{error || "Invoice not found"}</p>
        <Link to="/customer/invoices" className="btn btn-primary">
          Back to Invoices
        </Link>
      </div>
    );
  }

  if (showPdf) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowPdf(false)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Invoice Details
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
            >
              <Printer size={16} className="mr-2" />
              Print Invoice
            </button>
            <a
              href={pdfUrl || "#"}
              download={`Invoice-${invoice.invoice_number}.pdf`}
              className="btn btn-primary"
              onClick={(e) => {
                if (!pdfUrl) {
                  e.preventDefault();
                  alert("PDF download is not available in the demo");
                }
              }}
            >
              <Download size={16} className="mr-2" />
              Download PDF
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8 border-b pb-6">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">INVOICE</h1>
              <h2 className="text-xl font-bold">Airlast HVAC</h2>
              <p>1650 Marietta Boulevard Northwest</p>
              <p>Atlanta, GA 30318</p>
              <p>(404) 632-9074</p>
              <p>www.airlast.com</p>
            </div>
            <div className="text-right">
              <img
                src="/airlast-logo.svg"
                alt="Airlast Logo"
                className="h-16 mb-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-gray-500 font-medium mb-2">Bill to</h3>
              <p className="font-bold">
                {job.locations?.companies?.name || company?.name}
              </p>
              <p>{job.locations?.address}</p>
              <p>
                {job.locations?.city}, {job.locations?.state}{" "}
                {job.locations?.zip}
              </p>
              {job.contact_name && <p>Attn: {job.contact_name}</p>}
            </div>
            <div>
              <h3 className="text-gray-500 font-medium mb-2">
                Invoice details
              </h3>
              <div className="grid grid-cols-2 gap-1">
                <p className="text-gray-600">Invoice no:</p>
                <p className="font-medium">{invoice.invoice_number}</p>

                <p className="text-gray-600">Terms:</p>
                <p className="font-medium">Net 30</p>

                <p className="text-gray-600">Invoice date:</p>
                <p className="font-medium">{formatDate(invoice.issued_date)}</p>

                <p className="text-gray-600">Due date:</p>
                <p className="font-medium">{formatDate(invoice.due_date)}</p>

                <p className="text-gray-600">Job #:</p>
                <p className="font-medium">{job.number}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-gray-500 font-medium mb-2">Service Location</h3>
            <p>{job.locations?.name}</p>
            <p>{job.locations?.address}</p>
            <p>
              {job.locations?.city}, {job.locations?.state} {job.locations?.zip}
            </p>
            {job.units && <p>Unit: {job.units.unit_number}</p>}
          </div>

          <table className="w-full mb-8">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="py-2 px-4 border-b">#</th>
                <th className="py-2 px-4 border-b">Date</th>
                <th className="py-2 px-4 border-b">Description</th>
                <th className="py-2 px-4 border-b text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 px-4 border-b">1.</td>
                <td className="py-4 px-4 border-b">
                  {formatDate(invoice.issued_date)}
                </td>
                <td className="py-4 px-4 border-b">
                  {job.name}
                  {job.units && <span> - Unit {job.units.unit_number}</span>}

                  {jobItems.length > 0 && (
                    <div className="text-sm text-gray-500 mt-2">
                      <p>Service Items:</p>
                      <ul className="list-disc pl-5 mt-1">
                        {jobItems.map((item, index) => (
                          <li key={index}>
                            {item.name} ({item.quantity} x $
                            {Number(item.unit_cost).toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 border-b text-right font-medium">
                  ${Number(invoice.amount).toFixed(2)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="py-4 px-4" colSpan={3} align="right">
                  Total
                </td>
                <td className="py-4 px-4 text-right">
                  ${Number(invoice.amount).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2">Ways to pay</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium mb-1">Bank Transfer</h4>
                <p>Airlast HVAC</p>
                <p>Account #: 123456789</p>
                <p>Routing #: 987654321</p>
                <p>Bank: First National Bank</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Check</h4>
                <p>Make checks payable to:</p>
                <p>Airlast HVAC</p>
                <p>1650 Marietta Boulevard Northwest</p>
                <p>Atlanta, GA 30318</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-medium mb-2">Notes</h3>
            <p className="text-gray-600">
              Thank you for your business! Please include the invoice number on
              your payment.
            </p>
            <p className="text-gray-600">
              For questions regarding this invoice, please contact our office at
              (404) 632-9074.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/customer/invoices"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">
            Invoice #{invoice.invoice_number}
          </h1>
        </div>
        <span className={`badge ${getStatusBadgeClass(invoice.status)}`}>
          {invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Invoice Details</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPdf(true)}
                  className="btn btn-primary"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Invoice Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-medium">
                      {invoice.invoice_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`badge ${getStatusBadgeClass(invoice.status)}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issue Date:</span>
                    <span>{formatDate(invoice.issued_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span>{formatDate(invoice.due_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">
                      ${Number(invoice.amount).toFixed(2)}
                    </span>
                  </div>
                  {invoice.paid_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid Date:</span>
                      <span className="text-success-600">
                        {formatDate(invoice.paid_date)}
                      </span>
                    </div>
                  )}
                  {invoice.payment_method && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span>{invoice.payment_method.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Job Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job Number:</span>
                    <Link
                      to={`/customer/jobs/${job.id}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {job.number}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span>{job.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`badge ${
                        job.status === "completed"
                          ? "bg-success-100 text-success-800"
                          : job.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : job.status === "unscheduled"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Date:</span>
                    <span>
                      {job.job_technicians && job.job_technicians.length > 0
                        ? job.job_technicians
                            .filter((tech) => tech.scheduled_at)
                            .map((tech, index) => (
                              <div
                                key={tech.technician_id}
                                className={index > 0 ? "mt-1" : ""}
                              >
                                <div className="font-medium">
                                  {tech.users?.first_name}{" "}
                                  {tech.users?.last_name}
                                  {tech.is_primary && (
                                    <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {getScheduledDate(tech.scheduled_at)} at{" "}
                                  {getScheduledTime(tech.scheduled_at)}
                                </div>
                              </div>
                            ))
                        : "Not scheduled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Service Location
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <MapPin size={16} className="text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium">{job.locations?.name}</p>
                    <p>{job.locations?.address}</p>
                    <p>
                      {job.locations?.city}, {job.locations?.state}{" "}
                      {job.locations?.zip}
                    </p>
                    {job.units && <p>Unit: {job.units.unit_number}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Items */}
            {jobItems.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Service Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">
                          ITEM
                        </th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">
                          QTY
                        </th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">
                          UNIT PRICE
                        </th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {jobItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.code}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm">
                            ${Number(item.unit_cost).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            ${Number(item.total_cost).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td
                          className="px-4 py-2 text-sm"
                          colSpan={3}
                          align="right"
                        >
                          Total
                        </td>
                        <td className="px-4 py-2 text-sm">
                          $
                          {jobItems
                            .reduce(
                              (sum, item) => sum + Number(item.total_cost),
                              0
                            )
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Payment Information */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Payment Information</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount Due:</span>
                <span className="text-xl font-bold text-error-600">
                  {invoice.status === "paid"
                    ? "$0.00"
                    : `$${Number(invoice.amount).toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`badge ${getStatusBadgeClass(invoice.status)}`}
                >
                  {invoice.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Due Date:</span>
                <span
                  className={
                    invoice.status === "issued" &&
                    new Date(invoice.due_date) < new Date()
                      ? "text-error-600 font-medium"
                      : ""
                  }
                >
                  {formatDate(invoice.due_date)}
                </span>
              </div>

              {invoice.status === "paid" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Paid Date:</span>
                    <span className="text-success-600">
                      {formatDate(invoice.paid_date)}
                    </span>
                  </div>

                  {invoice.payment_method && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Payment Method:</span>
                      <span>{invoice.payment_method.replace("_", " ")}</span>
                    </div>
                  )}

                  {invoice.payment_reference && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Reference:</span>
                      <span>{invoice.payment_reference}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {invoice.status === "issued" && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">
                  Payment Options
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  Please contact our office to make a payment:
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Phone:</strong> (404) 632-9074
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Email:</strong> billing@airlast.com
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>

            <div className="space-y-3">
              <button
                onClick={() => setShowPdf(true)}
                className="btn btn-primary w-full justify-start"
              >
                <Eye size={16} />
              </button>

              <button
                onClick={() => window.print()}
                className="btn btn-secondary w-full justify-start"
              >
                <Printer size={16} className="mr-2" />
                Print Invoice
              </button>

              <a
                href={pdfUrl || "#"}
                download={`Invoice-${invoice.invoice_number}.pdf`}
                className="btn btn-secondary w-full justify-start"
                onClick={(e) => {
                  if (!pdfUrl) {
                    e.preventDefault();
                    alert("PDF download is not available in the demo");
                  }
                }}
              >
                <Download size={16} className="mr-2" />
                Download PDF
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInvoiceDetails;
