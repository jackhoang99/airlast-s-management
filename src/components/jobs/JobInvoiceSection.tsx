import { useState, useEffect } from 'react';
import { X, FileInput, Plus, AlertTriangle, DollarSign, Send, Printer, Eye, Mail, Check } from 'lucide-react';
import { Job, JobItem } from '../../types/job';
import { useSupabase } from '../../lib/supabase-context';
import InvoicePDFTemplate from '../invoices/InvoicePDFTemplate';

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

  // Calculate total cost
  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // Load invoices for this job
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase || !job) return;
      
      try {
        const { data, error } = await supabase
          .from('job_invoices')
          .select('*')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
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
      
      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('job_invoices')
        .insert({
          job_id: job.id,
          invoice_number: invoiceNumber,
          amount: calculateTotalCost(),
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
      
      // Call the Supabase Edge Function to send the email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;
      
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
          amount: selectedInvoice.amount,
          issuedDate: updatedInvoice.issued_date,
          dueDate: updatedInvoice.due_date,
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invoice email');
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

  const handleMarkAsPaid = async () => {
    if (!supabase || !selectedInvoice) {
      setInvoiceError('Cannot mark invoice as paid at this time');
      return;
    }
    
    setIsMarkingAsPaid(true);
    setInvoiceError(null);
    
    try {
      // Update invoice status to paid
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('job_invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', selectedInvoice.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Update invoices list
      setInvoices(prev => prev.map(inv => 
        inv.id === updatedInvoice.id ? updatedInvoice : inv
      ));
      setSelectedInvoice(updatedInvoice);
      
      setShowMarkAsPaidModal(false);
      
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      setInvoiceError(err instanceof Error ? err.message : 'Failed to mark invoice as paid');
    } finally {
      setIsMarkingAsPaid(false);
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
          <InvoicePDFTemplate job={job} jobItems={jobItems} invoice={selectedInvoice} />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Invoices</h2>
        <div className="flex gap-2">
          {selectedInvoice && (
            <button
              onClick={() => setShowInvoicePDF(true)}
              className="btn btn-secondary"
            >
              <Eye size={16} className="mr-2" />
              View Invoice
            </button>
          )}
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="btn btn-primary"
            disabled={jobItems.length === 0}
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
              className="btn btn-primary"
            >
              <Send size={16} className="mr-2" />
              Send Invoice
            </button>
          )}
          {selectedInvoice && selectedInvoice.status === 'issued' && (
            <button
              onClick={() => setShowMarkAsPaidModal(true)}
              className="btn btn-success"
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
              <table className="w-full">
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
                      <td className="px-4 py-3">{invoice.issued_date || 'Not issued'}</td>
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
            
            {selectedInvoice && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-md font-medium mb-3">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-4">
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
              <FileInput size={40} />
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
                This will create a new invoice for Job #{job.number} with the current items and pricing.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{job.contact_name || 'Not specified'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{job.contact_email || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">${calculateTotalCost().toFixed(2)}</span>
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
                disabled={isCreatingInvoice || jobItems.length === 0}
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
      {showMarkAsPaidModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <DollarSign size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Mark Invoice as Paid
            </h3>
            
            {invoiceError && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {invoiceError}
              </div>
            )}
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will mark invoice #{selectedInvoice.invoice_number} as paid with today's date.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Issue Date:</span>
                  <span className="font-medium">{selectedInvoice.issued_date}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">{selectedInvoice.due_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">${Number(selectedInvoice.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowMarkAsPaidModal(false)}
                disabled={isMarkingAsPaid}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={handleMarkAsPaid}
                disabled={isMarkingAsPaid}
              >
                {isMarkingAsPaid ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={16} className="mr-2" />
                    Mark as Paid
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobInvoiceSection;