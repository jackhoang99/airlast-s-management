import React from "react";
import { Database } from "../../types/supabase";

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
type ReplacementData = Database["public"]["Tables"]["job_replacements"]["Row"];

interface InvoicePDFTemplateProps {
  job: Job;
  jobItems: JobItem[];
  invoice: JobInvoice;
  replacementData?: ReplacementData;
  consolidatedJobDetails?: Array<{
    jobId: string;
    jobNumber: string;
    jobName: string;
    amount: number;
  }>;
}

const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({
  job,
  jobItems,
  invoice,
  replacementData,
  consolidatedJobDetails = [],
}) => {
  // Determine invoice type based on amount and items
  const isInspectionInvoice =
    invoice.amount === 180.0 &&
    jobItems.some((item) => item.code === "INSP-FEE");

  // Check if this is a repair invoice (only parts)
  const isRepairInvoice =
    jobItems.filter((item) => item.type === "part").length > 0 &&
    jobItems.every((item) => item.type === "part");

  // Check if this is a replacement invoice
  const isReplacementInvoice =
    invoice.amount > 0 &&
    replacementData &&
    jobItems.filter(
      (item) =>
        (item.type === "labor" || item.type === "item") &&
        item.code !== "INSP-FEE"
    ).length === 0;

  // Filter items based on invoice type
  let filteredItems = jobItems;
  let itemLabel = "Repair Parts";

  // Fix: For repair invoice, include all jobItems except INSP-FEE
  if (isInspectionInvoice) {
    // For inspection invoice, only include the inspection fee
    filteredItems = jobItems.filter((item) => item.code === "INSP-FEE");
    itemLabel = "Inspection Fee";
  } else if (
    invoice.amount > 0 &&
    (!replacementData ||
      jobItems.some((item) => item.type === "labor" || item.type === "item"))
  ) {
    // For repair invoice, include all non-INSP-FEE items
    filteredItems = jobItems.filter((item) => item.code !== "INSP-FEE");
    itemLabel = "Repair Services & Parts";
  } else if (isReplacementInvoice) {
    // For replacement invoice, we'll show replacement details instead of items
    filteredItems = [];
    itemLabel = "Replacement Total";
  } else {
    // For standard invoice, include all items
    filteredItems = jobItems;

    // Check if this is a repair-only invoice (only parts)
    const hasOnlyParts = filteredItems.every((item) => item.type === "part");
    const hasOnlyLaborAndItems = filteredItems.every(
      (item) =>
        item.type === "labor" ||
        (item.type === "item" && item.code !== "INSP-FEE")
    );

    if (hasOnlyParts) {
      itemLabel = "Repair Parts";
    } else if (hasOnlyLaborAndItems) {
      itemLabel = "Replacement Services";
    } else {
      itemLabel = "Services & Parts";
    }
  }

  // Format date in MM/DD/YYYY format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Generate replacement details content if this is a replacement invoice
  const renderReplacementDetails = () => {
    if (!isReplacementInvoice || !replacementData) return null;

    const selectedPhase = replacementData.selected_phase || "phase2";
    const phaseData = replacementData[
      selectedPhase as keyof ReplacementData
    ] as any;

    return (
      <div className="text-sm mt-2">
        <p className="font-medium">Replacement Details:</p>
        <ul className="list-disc pl-5 mt-1">
          {phaseData && phaseData.description && (
            <li>
              {phaseData.description} - ${Number(phaseData.cost).toFixed(2)}
            </li>
          )}
          {Number(replacementData.labor) > 0 && (
            <li>Labor - ${Number(replacementData.labor).toFixed(2)}</li>
          )}
          {Number(replacementData.refrigeration_recovery) > 0 && (
            <li>
              Refrigeration Recovery - $
              {Number(replacementData.refrigeration_recovery).toFixed(2)}
            </li>
          )}
          {Number(replacementData.start_up_costs) > 0 && (
            <li>
              Start Up Costs - $
              {Number(replacementData.start_up_costs).toFixed(2)}
            </li>
          )}
          {Number(replacementData.thermostat_startup) > 0 && (
            <li>
              Thermostat Startup - $
              {Number(replacementData.thermostat_startup).toFixed(2)}
            </li>
          )}
          {Number(replacementData.removal_cost) > 0 && (
            <li>
              Removal of Old Equipment - $
              {Number(replacementData.removal_cost).toFixed(2)}
            </li>
          )}
          {Number(replacementData.permit_cost) > 0 && (
            <li>
              Permit Cost - ${Number(replacementData.permit_cost).toFixed(2)}
            </li>
          )}

          {/* Accessories */}
          {replacementData.accessories &&
            Array.isArray(replacementData.accessories) &&
            replacementData.accessories.length > 0 &&
            replacementData.accessories.some(
              (acc: any) => acc.name && acc.cost > 0
            ) && (
              <li>
                Accessories:
                <ul className="list-circle pl-5">
                  {replacementData.accessories.map((acc: any, idx: number) =>
                    acc.name && acc.cost > 0 ? (
                      <li key={idx}>
                        {acc.name} - ${Number(acc.cost).toFixed(2)}
                      </li>
                    ) : null
                  )}
                </ul>
              </li>
            )}

          {/* Additional Items */}
          {replacementData.additional_items &&
            Array.isArray(replacementData.additional_items) &&
            replacementData.additional_items.length > 0 &&
            replacementData.additional_items.some(
              (item: any) => item.name && item.cost > 0
            ) && (
              <li>
                Additional Items:
                <ul className="list-circle pl-5">
                  {replacementData.additional_items.map(
                    (item: any, idx: number) =>
                      item.name && item.cost > 0 ? (
                        <li key={idx}>
                          {item.name} - ${Number(item.cost).toFixed(2)}
                        </li>
                      ) : null
                  )}
                </ul>
              </li>
            )}

          {replacementData.warranty && (
            <li>Warranty: {replacementData.warranty}</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white">
      {/* Header */}
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

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-gray-500 font-medium mb-2">Bill to</h3>
          <p className="font-bold">{job.locations?.companies.name}</p>
          <p>{job.locations?.address}</p>
          <p>
            {job.locations?.city}, {job.locations?.state} {job.locations?.zip}
          </p>
          {job.contact_name && <p>Attn: {job.contact_name}</p>}
        </div>
        <div>
          <h3 className="text-gray-500 font-medium mb-2">Invoice details</h3>
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

      {/* Service Location */}
      <div className="mb-8">
        <h3 className="text-gray-500 font-medium mb-2">Service Location</h3>
        <p>{job.locations?.name}</p>
        <p>{job.locations?.address}</p>
        <p>
          {job.locations?.city}, {job.locations?.state} {job.locations?.zip}
        </p>
        {job.units && <p>Unit: {job.units.unit_number}</p>}
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="py-2 px-4 border-b">#</th>
            <th className="py-2 px-4 border-b">Date</th>
            <th className="py-2 px-4 border-b">Type</th>
            <th className="py-2 px-4 border-b">Description</th>
            <th className="py-2 px-4 border-b text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            console.log(
              "InvoicePDFTemplate - invoice number:",
              invoice.invoice_number
            );
            console.log(
              "InvoicePDFTemplate - consolidatedJobDetails:",
              consolidatedJobDetails
            );
            console.log(
              "InvoicePDFTemplate - is consolidated:",
              invoice.invoice_number?.startsWith("COMPANY-")
            );
            console.log(
              "InvoicePDFTemplate - has details:",
              consolidatedJobDetails.length > 0
            );

            return invoice.invoice_number?.startsWith("COMPANY-") &&
              consolidatedJobDetails.length > 0 ? (
              // Show multiple jobs for consolidated invoice
              consolidatedJobDetails.map((jobDetail, index) => (
                <tr key={jobDetail.jobId}>
                  <td className="py-4 px-4 border-b">{index + 1}.</td>
                  <td className="py-4 px-4 border-b">
                    {formatDate(invoice.issued_date)}
                  </td>
                  <td className="py-4 px-4 border-b">
                    {jobDetail.jobType
                      ? jobDetail.jobType.charAt(0).toUpperCase() +
                        jobDetail.jobType.slice(1)
                      : "Standard"}
                  </td>
                  <td className="py-4 px-4 border-b">
                    <div>
                      <div className="font-medium">
                        Job #{jobDetail.jobNumber} - {jobDetail.jobName}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 border-b text-right font-medium">
                    ${jobDetail.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              // Show single job for regular invoice
              <tr>
                <td className="py-4 px-4 border-b">1.</td>
                <td className="py-4 px-4 border-b">
                  {formatDate(invoice.issued_date)}
                </td>
                <td className="py-4 px-4 border-b">
                  {invoice.type
                    ? invoice.type.charAt(0).toUpperCase() +
                      invoice.type.slice(1)
                    : "Standard"}
                </td>
                <td className="py-4 px-4 border-b">
                  <div>
                    {job.name}
                    {job.units && <span> - Unit {job.units.unit_number}</span>}

                    {invoice.type === "replacement" ? (
                      renderReplacementDetails()
                    ) : invoice.type === "inspection" ? (
                      <div className="text-sm text-gray-500 mt-2">
                        <p>Inspection Fee</p>
                        <ul className="list-disc pl-5 mt-1">
                          {filteredItems.map((item, index) => (
                            <li key={index}>
                              {item.name} ({item.quantity} x $
                              {Number(item.unit_cost).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : invoice.type === "repair" ? (
                      <div className="text-sm text-gray-500 mt-2">
                        <p>Repair Services & Parts:</p>
                        <ul className="list-disc pl-5 mt-1">
                          {filteredItems.map((item, index) => (
                            <li key={index}>
                              {item.name} ({item.quantity} x $
                              {Number(item.unit_cost).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : invoice.type === "all" ? (
                      <div className="text-sm text-gray-500 mt-2">
                        <p>All Services & Parts:</p>
                        <ul className="list-disc pl-5 mt-1">
                          {filteredItems.map((item, index) => (
                            <li key={index}>
                              {item.name} ({item.quantity} x $
                              {Number(item.unit_cost).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="py-4 px-4 border-b text-right font-medium">
                  ${Number(invoice.amount).toFixed(2)}
                </td>
              </tr>
            );
          })()}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-bold">
            <td className="py-4 px-4" colSpan={4} align="right">
              Total
            </td>
            <td className="py-4 px-4 text-right">
              ${Number(invoice.amount).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Payment Information */}
      {/* Ways to pay */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2">Ways to pay</h3>
        <div>
          <p>Send checks to:</p>
          <p>332 Chinquapin Drive SW</p>
          <p>Marietta, Ga 30064</p>
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-6">
        <h3 className="font-medium mb-2">Notes</h3>
        <p className="text-gray-600">
          Thank you for your business! Please include the invoice number on your
          payment.
        </p>
        <p className="text-gray-600">
          For questions regarding this invoice, please contact our office at
          (404) 632-9074.
        </p>
      </div>
    </div>
  );
};

export default InvoicePDFTemplate;
