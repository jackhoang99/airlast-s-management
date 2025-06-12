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
type RepairData = Database['public']['Tables']['job_repairs']['Row'];

interface InvoicePDFTemplateProps {
  job: Job;
  jobItems: JobItem[];
  invoice: JobInvoice;
  repairData?: RepairData;
}

const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({ job, jobItems, invoice, repairData }) => {
  // Determine invoice type based on amount and items
  const isInspectionInvoice = invoice.amount === 180.00 && jobItems.some(item => item.code === 'INSP-FEE');
  
  // Check if this is a replacement invoice (only parts)
  const isReplacementInvoice = jobItems.filter(item => item.type === 'part').length > 0 && 
                              jobItems.every(item => item.type === 'part');
  
  // Check if this is a repair invoice
  const isRepairInvoice = invoice.amount > 0 && repairData && 
    jobItems.filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE').length === 0;
  
  // Filter items based on invoice type
  let filteredItems = jobItems;
  let itemLabel = 'Replacement Parts';
  
  if (isInspectionInvoice) {
    // For inspection invoice, only include the inspection fee
    filteredItems = jobItems.filter(item => item.code === 'INSP-FEE');
    itemLabel = 'Inspection Fee';
  } else if (isReplacementInvoice) {
    // For replacement invoice, only include parts
    filteredItems = jobItems.filter(item => item.type === 'part');
    itemLabel = 'Replacement Parts';
  } else if (isRepairInvoice) {
    // For repair invoice, we'll show repair details instead of items
    filteredItems = [];
    itemLabel = 'Repair Services';
  } else {
    // For standard invoice, include all items
    filteredItems = jobItems;
    
    // Check if this is a replacement-only invoice (only parts)
    const hasOnlyParts = filteredItems.every(item => item.type === 'part');
    const hasOnlyLaborAndItems = filteredItems.every(item => item.type === 'labor' || (item.type === 'item' && item.code !== 'INSP-FEE'));
    
    if (hasOnlyParts) {
      itemLabel = 'Replacement Parts';
    } else if (hasOnlyLaborAndItems) {
      itemLabel = 'Repair Services';
    } else {
      itemLabel = 'Services & Parts';
    }
  }

  // Format date in MM/DD/YYYY format
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Generate repair details content if this is a repair invoice
  const renderRepairDetails = () => {
    if (!isRepairInvoice || !repairData) return null;
    
    const selectedPhase = repairData.selected_phase || 'phase2';
    const phaseData = repairData[selectedPhase as keyof RepairData] as any;
    
    return (
      <div className="text-sm mt-2">
        <p className="font-medium">Repair Details:</p>
        <ul className="list-disc pl-5 mt-1">
          {phaseData && phaseData.description && (
            <li>{phaseData.description} - ${Number(phaseData.cost).toFixed(2)}</li>
          )}
          {Number(repairData.labor) > 0 && (
            <li>Labor - ${Number(repairData.labor).toFixed(2)}</li>
          )}
          {Number(repairData.refrigeration_recovery) > 0 && (
            <li>Refrigeration Recovery - ${Number(repairData.refrigeration_recovery).toFixed(2)}</li>
          )}
          {Number(repairData.start_up_costs) > 0 && (
            <li>Start Up Costs - ${Number(repairData.start_up_costs).toFixed(2)}</li>
          )}
          {Number(repairData.thermostat_startup) > 0 && (
            <li>Thermostat Startup - ${Number(repairData.thermostat_startup).toFixed(2)}</li>
          )}
          {Number(repairData.removal_cost) > 0 && (
            <li>Removal of Old Equipment - ${Number(repairData.removal_cost).toFixed(2)}</li>
          )}
          {Number(repairData.permit_cost) > 0 && (
            <li>Permit Cost - ${Number(repairData.permit_cost).toFixed(2)}</li>
          )}
          
          {/* Accessories */}
          {repairData.accessories && Array.isArray(repairData.accessories) && 
           repairData.accessories.length > 0 && repairData.accessories.some((acc: any) => acc.name && acc.cost > 0) && (
            <li>
              Accessories:
              <ul className="list-circle pl-5">
                {repairData.accessories.map((acc: any, idx: number) => 
                  acc.name && acc.cost > 0 ? (
                    <li key={idx}>{acc.name} - ${Number(acc.cost).toFixed(2)}</li>
                  ) : null
                )}
              </ul>
            </li>
          )}
          
          {/* Additional Items */}
          {repairData.additional_items && Array.isArray(repairData.additional_items) && 
           repairData.additional_items.length > 0 && repairData.additional_items.some((item: any) => item.name && item.cost > 0) && (
            <li>
              Additional Items:
              <ul className="list-circle pl-5">
                {repairData.additional_items.map((item: any, idx: number) => 
                  item.name && item.cost > 0 ? (
                    <li key={idx}>{item.name} - ${Number(item.cost).toFixed(2)}</li>
                  ) : null
                )}
              </ul>
            </li>
          )}
          
          {repairData.warranty && (
            <li>Warranty: {repairData.warranty}</li>
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
              
              {isRepairInvoice ? (
                renderRepairDetails()
              ) : isReplacementInvoice ? (
                <div className="text-sm text-gray-500 mt-2">
                  <p>Replacement Parts:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {filteredItems.map((item, index) => (
                      <li key={index}>
                        {item.name} ({item.quantity} x ${Number(item.unit_cost).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2">
                  <p>{itemLabel}:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {filteredItems.map((item, index) => (
                      <li key={index}>
                        {item.name} ({item.quantity} x ${Number(item.unit_cost).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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