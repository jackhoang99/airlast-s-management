import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';
import { X, FileInput as FileInvoice, Plus, AlertTriangle, DollarSign, Send, Printer, Eye, Mail, Check } from 'lucide-react';
import InvoicePDFTemplate from '../invoices/InvoicePDFTemplate';
import MarkAsPaidModal from '../invoices/MarkAsPaidModal';

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

type JobInvoiceSectionProps = {
  job: Job;
  jobItems: JobItem[];
  onInvoiceCreated: (invoiceId: string) => void;
};

const JobInvoiceSection = ({ job, jobItems, onInvoiceCreated }: JobInvoiceSectionProps) => {
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
  const [customerEmail, setCustomerEmail] = useState('');
  const [invoiceType, setInvoiceType] = useState<'standard' | 'inspection' | 'repair' | 'replacement'>('standard');
  const [repairData, setRepairData] = useState<any>(null);
  const [repairDataByInspection, setRepairDataByInspection] = useState<{[key: string]: any}>({});

  // Calculate total cost
  const calculateTotalCost = () => {
    // For standard invoice, include all items
    if (invoiceType === 'standard') {
      // Include all items except inspection fee if it exists separately
      const inspectionItem = jobItems.find(item => item.code === 'INSP-FEE');
      const inspectionFee = inspectionItem ? Number(inspectionItem.total_cost) : 0;
      
      // Calculate total of all other items
      const otherItemsTotal = jobItems
        .filter(item => item.code !== 'INSP-FEE')
        .reduce((total, item) => total + Number(item.total_cost), 0);
      
      // If there are no items but we have repair data, use that total
      if (otherItemsTotal === 0 && Object.values(repairDataByInspection).length > 0) {
        // Sum up all repair costs from all inspections
        const repairTotal = Object.values(repairDataByInspection).reduce(
          (sum, data: any) => sum + (data.totalCost || 0), 
          0
        );
        return repairTotal;
      }
      
      return otherItemsTotal;
    }
    
    // For replacement invoice, include only part items
    if (invoiceType === 'replacement') {
      const partItemsTotal = jobItems
        .filter(item => item.type === 'part')
        .reduce((total, item) => total + Number(item.total_cost), 0);
        
      // If there are no part items but we have replacement data, use that total
      if (partItemsTotal === 0 && Object.values(repairDataByInspection).length > 0) {
        // Sum up all replacement costs from all inspections
        const replacementTotal = Object.values(repairDataByInspection).reduce(
          (sum, data: any) => sum + (data.totalCost || 0), 
          0
        );
        return replacementTotal;
      }
        
      // If there are no part items, return 0
      return partItemsTotal;
    }
    
    // For repair invoice, include only labor and other items (not parts or inspection)
    if (invoiceType === 'repair') {
      // Only include labor and other items (not parts or inspection)
      const invoiceAmount = jobItems
        .filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE')
        .reduce((total, item) => total + Number(item.total_cost), 0);
        
      // If we have repair data and no labor/service items, use the repair total
      if (invoiceAmount === 0 && Object.values(repairDataByInspection).length > 0) {
        // Sum up all repair costs from all inspections
        const repairTotal = Object.values(repairDataByInspection).reduce(
          (sum, data: any) => sum + (data.totalCost || 0), 
          0
        );
        return repairTotal;
      }
      
      return invoiceAmount;
    }
    
    // For inspection invoice, only include the inspection fee
    if (invoiceType === 'inspection') {
      const inspectionItem = jobItems.find(item => item.code === 'INSP-FEE');
      return inspectionItem ? Number(inspectionItem.total_cost) : 180.00;
    }
    
    // Default fallback
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // Load invoices for this job
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase || !job) return;
      
      try {
        // First, fetch the job details to display
        if (supabase) {
          const { data: jobData, error: jobError } = await supabase
            .from('jobs')
            .select(`
              *,
              locations (
                name,
                companies (
                  name
                )
              ),
              units (
                unit_number
              )
            `)
            .eq('id', job.id)
            .maybeSingle();

          if (jobError) {
            console.error('Error fetching job:', jobError);
            throw new Error('Error fetching quote details');
          }

          if (jobData) {
            setCustomerEmail(jobData.contact_email || '');
          }
        }

        const { data, error: invoicesError } = await supabase
          .from('job_invoices')
          .select('*')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false });
          
        if (invoicesError) throw invoicesError;
        setInvoices(data || []);
        
        // Set the most recent invoice as selected
        if (data && data.length > 0) {
          setSelectedInvoice(data[0]);
        }
      } catch (err) {
        console.error('Error fetching invoices:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvoices();
  }, [supabase, job]);

  // Fetch repair data for all inspections
  useEffect(() => {
    const fetchRepairData = async () => {
      if (!supabase || !job) return;
      
      try {
        const { data: repairData, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', job.id);

        if (repairError) {
          console.error('Error fetching repair data:', repairError);
          throw repairError;
        }
        
        if (repairData && repairData.length > 0) {
          // Organize by inspection_id
          const repairDataMap: {[key: string]: any} = {};
          repairData.forEach(item => {
            if (item.inspection_id) {
              repairDataMap[item.inspection_id] = {
                ...item,
                totalCost: item.total_cost
              };
            } else {
              // For backward compatibility with old data that doesn't have inspection_id
              setRepairData(item);
            }
          });
          
          setRepairDataByInspection(repairDataMap);
        }
      } catch (err) {
        console.error('Error fetching repair data:', err);
      }
    };
    
    fetchRepairData();
  }, [supabase, job]);

  // Set initial customer email from job
  useEffect(() => {
    if (job && job.contact_email) {
      setCustomerEmail(job.contact_email);
    }
  }, [job]);

  const handleCreateInvoice = async () => {
    if (!supabase || !job) {
      setInvoiceError('Cannot create invoice at this time');
      return;
    }
    
    setIsCreatingInvoice(true);
    setInvoiceError(null);
    
    try {
      // Generate invoice number (JOB-INV-XXXX)
      const invoiceNumber = `JOB-${job.number}-INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      let invoiceAmount = 0;
      
      // Determine invoice amount based on type
      if (invoiceType === 'inspection') {
        invoiceAmount = 180.00; // Fixed inspection fee
        
        // Add inspection item to job_items if it doesn't exist
        const { data: existingItems, error: checkError } = await supabase
          .from('job_items')
          .select('id')
          .eq('job_id', job.id)
          .eq('code', 'INSP-FEE')
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (!existingItems) {
          const { error: itemError } = await supabase
            .from('job_items')
            .insert({
              job_id: job.id,
              code: 'INSP-FEE',
              name: 'Inspection Fee',
              service_line: 'INSP',
              quantity: 1,
              unit_cost: 180.00,
              total_cost: 180.00,
              type: 'item'
            });
            
          if (itemError) throw itemError;
        }
      } else {
        // Calculate the invoice amount based on the selected type
        invoiceAmount = calculateTotalCost();
      }
      
      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('job_invoices')
        .insert({
          job_id: job.id,
          invoice_number: invoiceNumber,
          amount: invoiceAmount,
          status: 'draft',
          issued_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0]
        })
        .select()
        .single();
        
      if (invoiceError) throw invoiceError;
      
      // Update invoices list
      setInvoices(prev => [invoiceData, ...prev]);
      setSelectedInvoice(invoiceData);
      
      // Notify parent component
      if (invoiceData) {
        onInvoiceCreated(invoiceData.id);
      }
      
      setShowCreateInvoiceModal(false);
      
    } catch (err) {
      console.error('Error creating invoice:', err);
      setInvoiceError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!supabase || !job || !selectedInvoice || !customerEmail) {
      setInvoiceError('Customer email is required to send an invoice');
      return;
    }
    
    setIsSendingInvoice(true);
    setInvoiceError(null);
    
    try {
      // Update invoice status to issued
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('job_invoices')
        .update({
          status: 'issued',
          issued_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', selectedInvoice.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Update job contact email if it changed
      if (customerEmail !== job.contact_email) {
        const { error: jobUpdateError } = await supabase
          .from('jobs')
          .update({ contact_email: customerEmail })
          .eq('id', job.id);
          
        if (jobUpdateError) throw jobUpdateError;
      }
      
      try {
        // Call the Supabase Edge Function to send the email
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;
        
        // Filter job items based on invoice type
        let itemsToSend = [];
        const isRepairInvoice = invoiceType === 'repair' || 
          (selectedInvoice.amount > 0 && Object.keys(repairDataByInspection).length > 0 && 
           jobItems.filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE').length === 0);
        
        if (invoiceType === 'inspection' || selectedInvoice.amount === 180.00) {
          // For inspection invoice, only include the inspection fee
          itemsToSend = jobItems.filter(item => item.code === 'INSP-FEE');
          if (itemsToSend.length === 0) {
            // If no inspection fee item exists, create a dummy one for the email
            itemsToSend = [{
              name: 'Inspection Fee',
              code: 'INSP-FEE',
              quantity: 1,
              total_cost: 180.00
            }];
          }
        } else if (invoiceType === 'replacement') {
          // For replacement invoice, only include part items
          itemsToSend = jobItems.filter(item => item.type === 'part');
          
          // If there are no part items but we have repair data, create dummy items
          if (itemsToSend.length === 0 && Object.keys(repairDataByInspection).length > 0) {
            // Create a dummy item for each inspection's repair data
            Object.entries(repairDataByInspection).forEach(([inspectionId, data]) => {
              const selectedPhase = data.selected_phase || 'phase2';
              const phaseData = data[selectedPhase] as any;
              
              itemsToSend.push({
                name: `Replacement Parts: ${phaseData?.description || 'Standard Option'}`,
                code: 'REPLACEMENT',
                quantity: 1,
                total_cost: data.total_cost
              });
            });
          }
        } else if (isRepairInvoice) {
          // For repair invoice, only include labor and other items (not parts or inspection)
          itemsToSend = jobItems.filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE');
          
          // If there are no labor/service items but we have repair data, create dummy items
          if (itemsToSend.length === 0 && Object.keys(repairDataByInspection).length > 0) {
            // Create a dummy item for each inspection's repair data
            Object.entries(repairDataByInspection).forEach(([inspectionId, data]) => {
              const selectedPhase = data.selected_phase || 'phase2';
              const phaseData = data[selectedPhase] as any;
              
              itemsToSend.push({
                name: `Repair Services: ${phaseData?.description || 'Standard Option'}`,
                code: 'REPAIR',
                quantity: 1,
                total_cost: data.total_cost
              });
            });
          }
        } else {
          // For standard invoice, include all items
          itemsToSend = jobItems;
        }
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            jobId: job.id,
            invoiceId: selectedInvoice.id,
            customerEmail: customerEmail, // Use the potentially edited email
            jobNumber: job.number,
            jobName: job.name,
            customerName: job.contact_name,
            invoiceNumber: selectedInvoice.invoice_number,
            amount: updatedInvoice.amount,
            issuedDate: updatedInvoice.issued_date,
            dueDate: updatedInvoice.due_date,
            jobItems: itemsToSend,
            invoiceType: invoiceType,
            repairData: isRepairInvoice ? Object.values(repairDataByInspection)[0] : null
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.warn('Email service warning:', errorData.error || 'Failed to send invoice email');
          // Don't throw here, just log the warning - the invoice is still created and updated
        }
      } catch (emailErr) {
        // Log the email error but don't fail the whole operation
        console.warn('Email sending failed, but invoice was created:', emailErr);
      }
      
      // Update invoices list
      setInvoices(prev => prev.map(inv => 
        inv.id === updatedInvoice.id ? updatedInvoice : inv
      ));
      setSelectedInvoice(updatedInvoice);
      
      setShowSendInvoiceModal(false);
      
    } catch (err) {
      console.error('Error sending invoice:', err);
      setInvoiceError(err instanceof Error ? err.message : 'Failed to send invoice');
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
        .from('job_invoices')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setInvoices(data || []);
      
      // Update selected invoice if it exists in the new list
      if (selectedInvoice) {
        const updatedInvoice = data?.find(inv => inv.id === selectedInvoice.id);
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
      console.error('Error refreshing invoices:', err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'issued':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'void':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (showInvoicePDF && selectedInvoice) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setShowInvoicePDF(false)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <AlertTriangle size={16} className="mr-1" />
            Back to Job Details
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
            >
              <Printer size={16} className="mr-2" />
              Print Invoice
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <InvoicePDFTemplate 
            job={job} 
            jobItems={jobItems} 
            invoice={selectedInvoice} 
            repairData={repairData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-lg font-medium">Invoices</h2>
        <div className="flex flex-wrap gap-2">
          {selectedInvoice && (
            <button
              onClick={() => setShowInvoicePDF(true)}
              className="btn btn-secondary btn-sm"
            >
              <Eye size={16} className="mr-2" />
              View Invoice
            </button>
          )}
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} className="mr-2" />
            {selectedInvoice ? 'Create New Invoice' : 'Create Invoice'}
          </button>
          {selectedInvoice && selectedInvoice.status === 'draft' && (
            <button
              onClick={() => {
                setCustomerEmail(job.contact_email || '');
                setShowSendInvoiceModal(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <Send size={16} className="mr-2" />
              Send Invoice
            </button>
          )}
          {selectedInvoice && selectedInvoice.status === 'issued' && (
            <button
              onClick={handleMarkAsPaid}
              className="btn btn-success btn-sm"
            >
              <DollarSign size={16} className="mr-2" />
              Mark as Paid
            </button>
          )}
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
                  <table className="min-w-full">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">INVOICE #</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">DATE</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">DUE DATE</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">AMOUNT</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(invoice => (
                        <tr 
                          key={invoice.id} 
                          className={`border-b cursor-pointer hover:bg-gray-50 ${selectedInvoice?.id === invoice.id ? 'bg-primary-50' : ''}`}
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                          <td className="px-4 py-3">{invoice.issued_date || '-'}</td>
                          <td className="px-4 py-3">{invoice.due_date || '-'}</td>
                          <td className="px-4 py-3 font-medium">${Number(invoice.amount).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {selectedInvoice && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-md font-medium mb-3">Invoice Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice Number</p>
                    <p className="font-medium">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium capitalize">{selectedInvoice.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Issue Date</p>
                    <p className="font-medium">{selectedInvoice.issued_date || 'Not issued'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">{selectedInvoice.due_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">${Number(selectedInvoice.amount).toFixed(2)}</p>
                  </div>
                  {selectedInvoice.paid_date && (
                    <div>
                      <p className="text-sm text-gray-500">Paid Date</p>
                      <p className="font-medium">{selectedInvoice.paid_date}</p>
                    </div>
                  )}
                  {selectedInvoice.payment_method && (
                    <div>
                      <p className="text-sm text-gray-500">Payment Method</p>
                      <p className="font-medium capitalize">{selectedInvoice.payment_method.replace('_', ' ')}</p>
                    </div>
                  )}
                  {selectedInvoice.payment_reference && (
                    <div>
                      <p className="text-sm text-gray-500">Reference Number</p>
                      <p className="font-medium">{selectedInvoice.payment_reference}</p>
                    </div>
                  )}
                </div>
                {selectedInvoice.payment_notes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Payment Notes</p>
                    <p className="mt-1 text-sm">{selectedInvoice.payment_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-600 text-center">
              {jobItems.length === 0 && Object.keys(repairDataByInspection).length === 0
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
            
            {invoiceError && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {invoiceError}
              </div>
            )}
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Select the type of invoice you want to create:
              </p>
              
              <div className="space-y-3">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'standard' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('standard')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Standard Invoice</h4>
                      <p className="text-sm text-gray-500">Create an invoice with all replacement parts and repair costs</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'standard' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> ${calculateTotalCost().toFixed(2)}
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'replacement' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('replacement')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Replacement Invoice</h4>
                      <p className="text-sm text-gray-500">Create an invoice for replacement parts only</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'replacement' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> ${(() => {
                      // Only include part items for replacement invoice
                      const partItemsTotal = jobItems
                        .filter(item => item.type === 'part')
                        .reduce((total, item) => total + Number(item.total_cost), 0);
                        
                      // If there are no part items but we have replacement data, use that total
                      if (partItemsTotal === 0 && Object.keys(repairDataByInspection).length > 0) {
                        // Sum up all replacement costs from all inspections
                        const replacementTotal = Object.values(repairDataByInspection).reduce(
                          (sum, data: any) => sum + (data.totalCost || 0), 
                          0
                        );
                        return replacementTotal.toFixed(2);
                      }
                        
                      return partItemsTotal.toFixed(2);
                    })()}
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'repair' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('repair')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Repair Invoice</h4>
                      <p className="text-sm text-gray-500">Create an invoice for labor and service costs only</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'repair' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> ${(() => {
                      // Only include labor and other items (not parts or inspection)
                      const laborItemsTotal = jobItems
                        .filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE')
                        .reduce((total, item) => total + Number(item.total_cost), 0);
                        
                      // If we have repair data and no labor/service items, use the repair total
                      if (laborItemsTotal === 0 && Object.keys(repairDataByInspection).length > 0) {
                        // Sum up all repair costs from all inspections
                        const repairTotal = Object.values(repairDataByInspection).reduce(
                          (sum, data: any) => sum + (data.totalCost || 0), 
                          0
                        );
                        return repairTotal.toFixed(2);
                      }
                      
                      return laborItemsTotal.toFixed(2);
                    })()}
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${invoiceType === 'inspection' ? 'border-primary-500 bg-primary-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setInvoiceType('inspection')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Inspection Invoice</h4>
                      <p className="text-sm text-gray-500">Fixed fee for inspection service</p>
                    </div>
                    <div className="text-primary-600">
                      {invoiceType === 'inspection' && <Check size={20} />}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Total Amount:</span> $180.00
                  </div>
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{job.contact_name || 'Not specified'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{job.contact_email || 'Not specified'}</span>
                </div>
              </div>
            </div>
            
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
                onClick={handleCreateInvoice}
                disabled={isCreatingInvoice || 
                  (invoiceType === 'standard' && jobItems.length === 0 && Object.keys(repairDataByInspection).length === 0) ||
                  (invoiceType === 'replacement' && jobItems.filter(item => item.type === 'part').length === 0 && Object.keys(repairDataByInspection).length === 0) ||
                  (invoiceType === 'repair' && jobItems.filter(item => (item.type === 'labor' || item.type === 'item') && item.code !== 'INSP-FEE').length === 0 && Object.keys(repairDataByInspection).length === 0)}
              >
                {isCreatingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <DollarSign size={16} className="mr-2" />
                    Create Invoice
                  </>
                )}
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
                This will send invoice #{selectedInvoice.invoice_number} to the customer via email with a PDF attachment.
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{job.contact_name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-medium">{selectedInvoice.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">${Number(selectedInvoice.amount).toFixed(2)}</span>
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
    </div>
  );
};

export default JobInvoiceSection;