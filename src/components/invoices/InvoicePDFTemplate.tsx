import React from 'react';
import { Database } from '../../types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'] & {
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

type JobItem = Database['public']['Tables']['job_items']['Row'];
type JobInvoice = Database['public']['Tables']['job_invoices']['Row'];

interface InvoicePDFTemplateProps {
  job: Job;
  jobItems: JobItem[];
  invoice: JobInvoice;
}

const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({ job, jobItems, invoice }) => {
  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // Format date in MM/DD/YYYY format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
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
          <img src="/airlast-logo.svg" alt="Airlast Logo" className="h-16 mb-2" />
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-gray-500 font-medium mb-2">Bill to</h3>
          <p className="font-bold">{job.locations?.companies.name}</p>
          <p>{job.locations?.address}</p>
          <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
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
        <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
        {job.units && <p>Unit: {job.units.unit_number}</p>}
      </div>

      {/* Items Table */}
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
            <td className="py-4 px-4 border-b">{formatDate(invoice.issued_date)}</td>
            <td className="py-4 px-4 border-b">
              {job.name}
              {job.units && <span> - Unit {job.units.unit_number}</span>}
              <div className="text-sm text-gray-500 mt-2">
                <p>Items:</p>
                <ul className="list-disc pl-5 mt-1">
                  {jobItems.map((item, index) => (
                    <li key={index}>
                      {item.name} ({item.quantity} x ${Number(item.unit_cost).toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            </td>
            <td className="py-4 px-4 border-b text-right font-medium">${Number(invoice.amount).toFixed(2)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-bold">
            <td className="py-4 px-4" colSpan={3} align="right">Total</td>
            <td className="py-4 px-4 text-right">${Number(invoice.amount).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Payment Information */}
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

      {/* Notes */}
      <div className="border-t pt-6">
        <h3 className="font-medium mb-2">Notes</h3>
        <p className="text-gray-600">Thank you for your business! Please include the invoice number on your payment.</p>
        <p className="text-gray-600">For questions regarding this invoice, please contact our office at (404) 632-9074.</p>
      </div>
    </div>
  );
};

export default InvoicePDFTemplate;