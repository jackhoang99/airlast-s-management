import React, { useState, useEffect } from "react";
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
  Trash2,
  Download,
} from "lucide-react";
import InvoicePDFTemplate from "../invoices/InvoicePDFTemplate";
import MarkAsPaidModal from "../invoices/MarkAsPaidModal";

type Job = Database["public"]["Tables"]["jobs"]["Row"] & {
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    companies: {
      name: string;
    };
  };
  units?: {
    unit_number: string;
  };
  job_technicians?: {
    id: string;
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  }[];
};

type JobItem = Database["public"]["Tables"]["job_items"]["Row"];
type JobInvoice = Database["public"]["Tables"]["job_invoices"]["Row"];

type JobInvoiceSectionProps = {
  job: Job;
  jobItems: JobItem[];
  onInvoiceCreated: (invoiceId: string) => void;
  refreshTrigger?: number;
};

const JobInvoiceSection = ({
  job,
  jobItems,
  onInvoiceCreated,
  refreshTrigger = 0,
}: JobInvoiceSectionProps) => {
  const { supabase } = useSupabase();
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [showInvoicePDF, setShowInvoicePDF] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customerEmail, setCustomerEmail] = useState("");
  const [replacementTotal, setReplacementTotal] = useState(0);
  const [repairTotal, setRepairTotal] = useState(0);
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<
    "all" | "replacement" | "repair" | "inspection" | null
  >(null);
  const [consolidatedJobDetails, setConsolidatedJobDetails] = useState<
    Array<{
      jobId: string;
      jobNumber: string;
      jobName: string;
      amount: number;
    }>
  >([]);
  // Removed all preview-related state

  // Load invoices for this job
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase || !job) return;

      try {
        // Set customer email from existing job data
        if (job.contact_email) {
          setCustomerEmail(job.contact_email);
        }

        // Fetch invoices for this job
        const { data: invoices, error: invoicesError } = await supabase
          .from("job_invoices")
          .select("*")
          .eq("job_id", job.id)
          .order("created_at", { ascending: false });

        if (invoicesError) throw invoicesError;
        setInvoices(invoices || []);

        // Set the most recent invoice as selected
        if (invoices && invoices.length > 0) {
          setSelectedInvoice(invoices[0]);
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [supabase, job]);

  // Fetch totals only when needed (when creating invoice modal is opened)
  const fetchTotals = async () => {
    if (!supabase || !job) return;

    try {
      // Fetch both replacement and repair totals in parallel
      const [replacementsResult, itemsResult] = await Promise.all([
        supabase
          .from("job_replacements")
          .select("total_cost")
          .eq("job_id", job.id),
        supabase.from("job_items").select("total_cost").eq("job_id", job.id),
      ]);

      // Calculate replacement total
      if (replacementsResult.error) {
        console.error(
          "Error fetching job_replacements:",
          replacementsResult.error
        );
        setReplacementTotal(0);
      } else {
        const total = (replacementsResult.data || []).reduce(
          (sum, row) => sum + Number(row.total_cost || 0),
          0
        );
        setReplacementTotal(total);
      }

      // Calculate repair total
      if (itemsResult.error) {
        console.error("Error fetching job_items:", itemsResult.error);
        setRepairTotal(0);
      } else {
        const total = (itemsResult.data || []).reduce(
          (sum, row) => sum + Number(row.total_cost || 0),
          0
        );
        setRepairTotal(total);
      }
    } catch (err) {
      console.error("Error fetching totals:", err);
      setReplacementTotal(0);
      setRepairTotal(0);
    }
  };

  // Only fetch totals when the create invoice modal is opened
  useEffect(() => {
    if (showCreateInvoiceModal) {
      fetchTotals();
    }
  }, [showCreateInvoiceModal, supabase, job]);

  // Removed getPreviewAmount and handlePreviewClick

  const handleCreateInvoice = async (
    type?: "replacement" | "repair" | "all" | "inspection",
    amountOverride?: number,
    dueDateOverride?: string
  ) => {
    if (!supabase || !job) {
      setInvoiceError("Cannot create invoice at this time");
      return;
    }

    setIsCreatingInvoice(true);
    setInvoiceError(null);

    try {
      // Generate invoice number (JOB-INV-XXXX)
      const invoiceNumber = `JOB-${job.number}-INV-${Math.floor(
        Math.random() * 10000
      )
        .toString()
        .padStart(4, "0")}`;

      const dueDateToUse = dueDateOverride || dueDate;

      let invoiceAmount = 0;
      if (typeof amountOverride === "number") {
        invoiceAmount = amountOverride;
      } else {
        invoiceAmount = 0;
      }

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("job_invoices")
        .insert({
          job_id: job.id,
          invoice_number: invoiceNumber,
          amount: invoiceAmount,
          status: "draft",
          issued_date: new Date().toISOString().split("T")[0],
          due_date: dueDateToUse,
          type: type || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate PDF immediately after creating invoice
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
            jobId: job.id,
            invoiceId: invoiceData.id,
            jobData: job,
            jobItems: jobItems,
            invoiceNumber: invoiceData.invoice_number,
            amount: invoiceData.amount,
            issuedDate: invoiceData.issued_date,
            dueDate: invoiceData.due_date,
            invoiceType: invoiceData.type,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.pdfUrl) {
            // Update the invoice with the PDF URL
            const { error: updateError } = await supabase
              .from("job_invoices")
              .update({ pdf_url: result.pdfUrl })
              .eq("id", invoiceData.id);

            if (updateError) {
              console.error(
                "Error updating invoice with PDF URL:",
                updateError
              );
            } else {
              // Update the local invoice data with the PDF URL
              const updatedInvoice = { ...invoiceData, pdf_url: result.pdfUrl };
              setInvoices((prev) => [updatedInvoice, ...prev.slice(1)]);
              setSelectedInvoice(updatedInvoice);
            }
          }
        }
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
        // Don't fail the invoice creation if PDF generation fails
      }

      // Refresh the invoices list to show the new invoice
      const { data: updatedInvoices, error: refreshError } = await supabase
        .from("job_invoices")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false });

      if (!refreshError && updatedInvoices) {
        setInvoices(updatedInvoices);
        setSelectedInvoice(updatedInvoices[0]);
      }

      // Notify parent component
      if (invoiceData) {
        onInvoiceCreated(invoiceData.id);
      }

      setShowCreateInvoiceModal(false);
      // Removed setShowInvoicePreviewModal(false);
    } catch (err) {
      console.error("Error creating invoice:", err);
      setInvoiceError(
        err instanceof Error ? err.message : "Failed to create invoice"
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!supabase || !job || !selectedInvoice || !customerEmail) {
      setInvoiceError("Customer email is required to send an invoice");
      return;
    }

    setIsSendingInvoice(true);
    setInvoiceError(null);

    try {
      // Update invoice status to issued
      const { data: updatedInvoice, error: updateError } = await supabase
        .from("job_invoices")
        .update({
          status: "issued",
          issued_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", selectedInvoice.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update job contact email if it changed
      if (customerEmail !== job.contact_email) {
        const { error: jobUpdateError } = await supabase
          .from("jobs")
          .update({ contact_email: customerEmail })
          .eq("id", job.id);

        if (jobUpdateError) throw jobUpdateError;
      }

      try {
        // Call the Supabase Edge Function to send the email
        const apiUrl = `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/send-invoice-email`;

        // Filter job items based on invoice type
        let itemsToSend: any[] = [];
        // The logic for determining itemsToSend is no longer needed as we are not calculating total cost here
        // const isRepairInvoice =
        //   invoiceType === "repair" ||
        //   (selectedInvoice.amount > 0 &&
        //     Object.keys(repairDataByInspection).length > 0 &&
        //     jobItems.filter(
        //       (item) =>
        //         (item.type === "labor" || item.type === "item") &&
        //         item.code !== "INSP-FEE"
        //     ).length === 0);

        // if (invoiceType === "inspection" || selectedInvoice.amount === 180.0) {
        //   // For inspection invoice, only include the inspection fee
        //   itemsToSend = jobItems.filter((item) => item.code === "INSP-FEE");
        //   if (itemsToSend.length === 0) {
        //     // If no inspection fee item exists, create a dummy one for the email
        //     itemsToSend = [
        //       {
        //         name: "Inspection Fee",
        //         code: "INSP-FEE",
        //         quantity: 1,
        //         total_cost: 180.0,
        //       },
        //     ];
        //   }
        // } else if (invoiceType === "replacement") {
        //   // For replacement invoice, only include part items
        //   itemsToSend = jobItems.filter((item) => item.type === "part");

        //   // If there are no part items but we have repair data, create dummy items
        //   if (
        //     itemsToSend.length === 0 &&
        //     Object.keys(repairDataByInspection).length > 0
        //   ) {
        //     // Create a dummy item for each inspection's repair data
        //     Object.entries(repairDataByInspection).forEach(
        //       ([inspectionId, data]) => {
        //         const selectedPhase = data.selected_phase || "phase2";
        //         const phaseData = data[selectedPhase] as any;

        //         itemsToSend.push({
        //           name: `Replacement Parts: ${
        //             phaseData?.description || "Standard Option"
        //           }`,
        //           code: "REPLACEMENT",
        //           quantity: 1,
        //           total_cost: data.total_cost,
        //         });
        //       }
        //     );
        //   }
        // } else if (isRepairInvoice) {
        //   // For repair invoice, only include labor and other items (not parts or inspection)
        //   itemsToSend = jobItems.filter(
        //     (item) =>
        //       (item.type === "labor" || item.type === "item") &&
        //       item.code !== "INSP-FEE"
        //   );

        //   // If there are no labor/service items but we have repair data, create dummy items
        //   if (
        //     itemsToSend.length === 0 &&
        //     Object.keys(repairDataByInspection).length > 0
        //   ) {
        //     // Create a dummy item for each inspection's repair data
        //     Object.entries(repairDataByInspection).forEach(
        //       ([inspectionId, data]) => {
        //         const selectedPhase = data.selected_phase || "phase2";
        //         const phaseData = data[selectedPhase] as any;

        //         itemsToSend.push({
        //           name: `Repair Services: ${
        //             phaseData?.description || "Standard Option"
        //           }`,
        //           code: "REPAIR",
        //           quantity: 1,
        //           total_cost: data.total_cost,
        //         });
        //       }
        //     );
        //   }
        // } else {
        //   // For standard invoice, include all items
        //   itemsToSend = jobItems;
        // }

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            jobId: job.id,
            invoiceId: selectedInvoice.id,
            customerEmail: customerEmail, // Use the potentially edited email
            jobNumber: job.number,
            jobName: job.name,
            customerName: job.contact_name,
            invoiceNumber: updatedInvoice.invoice_number,
            amount: updatedInvoice.amount,
            issuedDate: updatedInvoice.issued_date,
            dueDate: updatedInvoice.due_date,
            jobItems: itemsToSend,
            // invoiceType: invoiceType, // This state is no longer needed
            // repairData: isRepairInvoice // This state is no longer needed
            //   ? Object.values(repairDataByInspection)[0]
            //   : null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn(
            "Email service warning:",
            errorData.error || "Failed to send invoice email"
          );
          // Don't throw here, just log the warning - the invoice is still created and updated
        }
      } catch (emailErr) {
        // Log the email error but don't fail the whole operation
        console.warn(
          "Email sending failed, but invoice was created:",
          emailErr
        );
      }

      // Update invoices list
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
      );
      setSelectedInvoice(updatedInvoice);

      setShowSendInvoiceModal(false);
    } catch (err) {
      console.error("Error sending invoice:", err);
      setInvoiceError(
        err instanceof Error ? err.message : "Failed to send invoice"
      );
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleMarkAsPaid = () => {
    setShowMarkAsPaidModal(true);
  };

  const handleInvoiceMarkedAsPaid = async () => {
    // Refresh invoices list
    if (!supabase || !job) return;

    try {
      const { data, error } = await supabase
        .from("job_invoices")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);

      // Update selected invoice if it exists in the new list
      if (selectedInvoice) {
        const updatedInvoice = data?.find(
          (inv) => inv.id === selectedInvoice.id
        );
        if (updatedInvoice) {
          setSelectedInvoice(updatedInvoice);
        } else if (data && data.length > 0) {
          // If the selected invoice is no longer in the list, select the first one
          setSelectedInvoice(data[0]);
        } else {
          setSelectedInvoice(null);
        }
      }
    } catch (err) {
      console.error("Error refreshing invoices:", err);
    }
  };

  // Removed Invoice Preview Modal

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

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generateInvoicePDF = async (invoice: JobInvoice) => {
    if (!supabase) return;

    // If PDF URL already exists, use it
    if (invoice.pdf_url) {
      setPdfUrl(invoice.pdf_url);
      return;
    }

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
          jobId: job.id,
          invoiceId: invoice.id,
          jobData: job,
          jobItems: jobItems,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          issuedDate: invoice.issued_date,
          dueDate: invoice.due_date,
          invoiceType: invoice.type,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.pdfUrl) {
          setPdfUrl(result.pdfUrl);

          // Update the invoice with the PDF URL for future use
          const { error: updateError } = await supabase
            .from("job_invoices")
            .update({ pdf_url: result.pdfUrl })
            .eq("id", invoice.id);

          if (updateError) {
            console.error("Error updating invoice with PDF URL:", updateError);
          }
        } else {
          throw new Error("No PDF URL returned");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      // Fallback to HTML view
      setPdfUrl(null);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate PDF when invoice is selected for viewing
  useEffect(() => {
    if (showInvoicePDF && selectedInvoice && !pdfUrl && !isGeneratingPdf) {
      generateInvoicePDF(selectedInvoice);
    }
  }, [showInvoicePDF, selectedInvoice, pdfUrl, isGeneratingPdf]);

  // Early return for PDF view
  if (showInvoicePDF && selectedInvoice) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              setShowInvoicePDF(false);
              setPdfUrl(null);
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <AlertTriangle size={16} className="mr-1" />
            Back to Job Details
          </button>
          <div className="flex gap-2">
            {pdfUrl && (
              <>
                <button
                  onClick={() => window.open(pdfUrl, "_blank")}
                  className="btn btn-primary"
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
                  className="btn btn-secondary"
                >
                  <Download size={16} className="mr-2" />
                  Download PDF
                </button>
              </>
            )}
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
            >
              <Printer size={16} className="mr-2" />
              Print Invoice
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <InvoicePDFTemplate
              job={job}
              jobItems={jobItems}
              invoice={selectedInvoice}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:justify-end items-start sm:items-center mb-6 gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} className="mr-2" />
            {selectedInvoice ? "Create New Invoice" : "Create Invoice"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : invoices.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          INVOICE #
                        </th>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          JOB NAME
                        </th>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          DATE
                        </th>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          DUE DATE
                        </th>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          AMOUNT
                        </th>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          STATUS
                        </th>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          TYPE
                        </th>
                        <th className="px-4 py-2 font-semibold text-gray-500">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className={`border-b hover:bg-primary-50 transition-colors ${
                            selectedInvoice?.id === invoice.id
                              ? "bg-primary-50"
                              : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-3 font-medium align-middle">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {invoice.job_name || job?.name || "-"}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {invoice.issued_date || "-"}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {invoice.due_date || "-"}
                          </td>
                          <td className="px-4 py-3 font-medium align-middle">
                            ${Number(invoice.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                                invoice.status
                              )}`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle">
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
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-wrap gap-2 items-center">
                              <button
                                className="btn btn-secondary btn-xs w-full sm:w-auto"
                                title="View Invoice"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowInvoicePDF(true);

                                  // Check if this is a consolidated invoice and load job details
                                  if (
                                    invoice.invoice_number?.startsWith(
                                      "COMPANY-"
                                    )
                                  ) {
                                    const storedDetails = localStorage.getItem(
                                      `consolidated_invoice_${invoice.id}`
                                    );
                                    console.log(
                                      "Loading consolidated invoice details for:",
                                      invoice.id
                                    );
                                    console.log(
                                      "Stored details:",
                                      storedDetails
                                    );
                                    if (storedDetails) {
                                      try {
                                        const jobDetails =
                                          JSON.parse(storedDetails);
                                        console.log(
                                          "Parsed job details:",
                                          jobDetails
                                        );
                                        setConsolidatedJobDetails(jobDetails);
                                      } catch (err) {
                                        console.error(
                                          "Error parsing consolidated job details:",
                                          err
                                        );
                                        setConsolidatedJobDetails([]);
                                      }
                                    } else {
                                      console.log(
                                        "No stored details found for invoice:",
                                        invoice.id
                                      );
                                      setConsolidatedJobDetails([]);
                                    }
                                  } else {
                                    setConsolidatedJobDetails([]);
                                  }
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                className="btn btn-primary btn-xs w-full sm:w-auto"
                                title="Send Invoice"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowSendInvoiceModal(true);
                                }}
                              >
                                <Send size={16} />
                              </button>
                              <button
                                className="btn btn-success btn-xs w-full sm:w-auto"
                                title="Mark as Paid"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowMarkAsPaidModal(true);
                                }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="btn btn-error btn-xs w-full sm:w-auto"
                                title="Delete Invoice"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowDeleteInvoiceModal(true);
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Remove the old invoice details summary and instead show a modal with InvoicePDFTemplate when showInvoicePDF && selectedInvoice */}
            {showInvoicePDF && selectedInvoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                <div className="bg-white rounded-lg max-w-3xl w-full p-6 shadow-xl overflow-auto max-h-[90vh]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Invoice View</h3>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowInvoicePDF(false)}
                    >
                      Close
                    </button>
                  </div>
                  <InvoicePDFTemplate
                    job={job}
                    jobItems={jobItems}
                    invoice={selectedInvoice}
                    consolidatedJobDetails={consolidatedJobDetails}
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      className="btn btn-secondary"
                      onClick={() => window.print()}
                    >
                      <Printer size={16} className="mr-2" />
                      Print Invoice
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600 text-center">
              {jobItems.length === 0
                ? "Add items to the job before creating an invoice."
                : "No invoices created yet. Click 'Create Invoice' to generate an invoice."}
            </p>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <FileInvoice size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Create New Invoice
            </h3>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Select the type of invoice you want to create:
              </p>
              <div className="space-y-3">
                <div
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedInvoiceType === "all"
                      ? "border-primary-500 bg-primary-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedInvoiceType("all")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Standard Invoice</h4>
                      <p className="text-sm text-gray-500">
                        Create an invoice with all replacement parts and repair
                        costs
                      </p>
                    </div>
                    {selectedInvoiceType === "all" && (
                      <Check size={20} className="text-primary-600" />
                    )}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> $
                    {(replacementTotal + repairTotal).toFixed(2)}
                  </div>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedInvoiceType === "replacement"
                      ? "border-primary-500 bg-primary-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedInvoiceType("replacement")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Replacement Invoice</h4>
                      <p className="text-sm text-gray-500">
                        Create an invoice for replacement parts only
                      </p>
                    </div>
                    {selectedInvoiceType === "replacement" && (
                      <Check size={20} className="text-primary-600" />
                    )}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> $
                    {replacementTotal.toFixed(2)}
                  </div>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedInvoiceType === "repair"
                      ? "border-primary-500 bg-primary-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedInvoiceType("repair")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Repair Invoice</h4>
                      <p className="text-sm text-gray-500">
                        Create an invoice for labor and service costs only
                      </p>
                    </div>
                    {selectedInvoiceType === "repair" && (
                      <Check size={20} className="text-primary-600" />
                    )}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> $
                    {repairTotal.toFixed(2)}
                  </div>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedInvoiceType === "inspection"
                      ? "border-primary-500 bg-primary-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedInvoiceType("inspection")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Inspection Invoice</h4>
                      <p className="text-sm text-gray-500">
                        Fixed fee for inspection service
                      </p>
                    </div>
                    {selectedInvoiceType === "inspection" && (
                      <Check size={20} className="text-primary-600" />
                    )}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> $180.00
                  </div>
                </div>
              </div>
              <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {job.contact_name || "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">
                    {job.contact_email || "Not specified"}
                  </span>
                </div>
              </div>
              {/* Remove the invoiceType state and Invoice Type button group */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            {selectedInvoiceType && (
              <div className="flex gap-2 mt-4">
                {/* Preview button removed */}
              </div>
            )}
            {/* Invoice preview UI removed */}
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateInvoiceModal(false)}
                disabled={isCreatingInvoice}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() =>
                  selectedInvoiceType &&
                  handleCreateInvoice(
                    selectedInvoiceType,
                    selectedInvoiceType === "all"
                      ? replacementTotal + repairTotal
                      : selectedInvoiceType === "replacement"
                      ? replacementTotal
                      : selectedInvoiceType === "repair"
                      ? repairTotal
                      : 180,
                    dueDate
                  )
                }
                disabled={isCreatingInvoice || !selectedInvoiceType}
              >
                <DollarSign size={16} className="mr-2" />
                {isCreatingInvoice ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invoice Modal */}
      {showSendInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <Send size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Send Invoice to Customer
            </h3>

            {invoiceError && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {invoiceError}
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
                    <span className="font-medium">{job.contact_name}</span>
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
                    <Mail className="inline-block h-3 w-3 mr-1" />
                    The customer will receive a link to view the invoice PDF
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSendInvoiceModal(false)}
                disabled={isSendingInvoice}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendInvoice}
                disabled={isSendingInvoice || !customerEmail}
              >
                {isSendingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      <MarkAsPaidModal
        isOpen={showMarkAsPaidModal}
        onClose={() => setShowMarkAsPaidModal(false)}
        onSuccess={handleInvoiceMarkedAsPaid}
        invoice={selectedInvoice}
        jobName={job.name}
        customerName={job.contact_name || undefined}
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
                  if (!supabase || !selectedInvoice) return;
                  await supabase
                    .from("job_invoices")
                    .delete()
                    .eq("id", selectedInvoice.id);
                  setInvoices(
                    invoices.filter((inv) => inv.id !== selectedInvoice.id)
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

export default JobInvoiceSection;
