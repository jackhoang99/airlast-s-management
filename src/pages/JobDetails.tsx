import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Building, Phone, Mail, Tag, FileText, CheckCircle, Send, AlertTriangle, Plus, Edit, Trash2, Eye, Download, FileInvoice, DollarSign } from 'lucide-react';
import AddJobPricingModal from '../components/jobs/AddJobPricingModal';
import EditJobItemModal from '../components/jobs/EditJobItemModal';
import AppointmentModal from '../components/jobs/AppointmentModal';
import QuotePDFTemplate from '../components/quotes/QuotePDFTemplate';
import InvoicePDFTemplate from '../components/invoices/InvoicePDFTemplate';

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
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  }[];
};

type JobItem = Database['public']['Tables']['job_items']['Row'];
type JobInvoice = Database['public']['Tables']['job_invoices']['Row'];

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [jobInvoices, setJobInvoices] = useState<JobInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JobItem | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<JobInvoice | null>(null);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [quoteEmailSent, setQuoteEmailSent] = useState(false);
  const [invoiceEmailSent, setInvoiceEmailSent] = useState(false);
  const [newItemsAfterConfirmation, setNewItemsAfterConfirmation] = useState(false);
  const [showConfirmedQuote, setShowConfirmedQuote] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoiceNumber: '',
    amount: 0,
    issuedDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!supabase || !id) return;

      try {
        const { data, error: jobError } = await supabase
          .from('jobs')
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              zip,
              companies (
                name
              )
            ),
            units (
              unit_number
            ),
            job_technicians (
              id,
              technician_id,
              is_primary,
              users:technician_id (
                id,
                first_name,
                last_name,
                email,
                phone
              )
            )
          `)
          .eq('id', id)
          .single();

        if (jobError) throw jobError;
        setJob(data);

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // Fetch job invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('job_invoices')
          .select('*')
          .eq('job_id', id)
          .order('created_at', { ascending: false });

        if (invoicesError) throw invoicesError;
        setJobInvoices(invoicesData || []);

        // Check if there are new items after quote confirmation
        if (data.quote_confirmed && data.quote_confirmed_at) {
          const confirmationDate = new Date(data.quote_confirmed_at);
          
          // Check if any items were added after confirmation
          const newItems = itemsData?.some(item => {
            const itemDate = new Date(item.created_at);
            return itemDate > confirmationDate;
          });
          
          setNewItemsAfterConfirmation(newItems || false);
        }

      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to fetch job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [supabase, id]);

  const handleAddPricing = () => {
    setShowAddPricingModal(true);
  };

  const handleEditItem = (item: JobItem) => {
    setSelectedItem(item);
    setShowEditItemModal(true);
  };

  const handlePriceAdded = async () => {
    if (!supabase || !id) return;

    try {
      // Refresh job items
      const { data, error } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', id)
        .order('created_at');

      if (error) throw error;
      setJobItems(data || []);

      // Check if there are new items after quote confirmation
      if (job?.quote_confirmed && job?.quote_confirmed_at) {
        const confirmationDate = new Date(job.quote_confirmed_at);
        
        // Check if any items were added after confirmation
        const newItems = data?.some(item => {
          const itemDate = new Date(item.created_at);
          return itemDate > confirmationDate;
        });
        
        setNewItemsAfterConfirmation(newItems || false);
      }

    } catch (err) {
      console.error('Error refreshing job items:', err);
    }
  };

  const handleItemUpdated = async (wasUpdated: boolean) => {
    if (!supabase || !id) return;

    try {
      // Refresh job items
      const { data, error } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', id)
        .order('created_at');

      if (error) throw error;
      setJobItems(data || []);

      // If the item was updated and there's a confirmed quote, mark as needing update
      if (wasUpdated && job?.quote_confirmed && job?.quote_confirmed_at) {
        setNewItemsAfterConfirmation(true);
      }
    } catch (err) {
      console.error('Error refreshing job items:', err);
    }
  };

  const handleDeleteItem = async () => {
    if (!supabase || !selectedItemId) return;

    try {
      const { error } = await supabase
        .from('job_items')
        .delete()
        .eq('id', selectedItemId);

      if (error) throw error;

      // Refresh job items
      setJobItems(prev => prev.filter(item => item.id !== selectedItemId));
      setShowDeleteItemModal(false);
      setSelectedItemId(null);
      
      // If there's a confirmed quote, mark as needing update
      if (job?.quote_confirmed && job?.quote_confirmed_at) {
        setNewItemsAfterConfirmation(true);
      }
    } catch (err) {
      console.error('Error deleting job item:', err);
      setError('Failed to delete item');
    }
  };

  const handleSendQuote = async () => {
    if (!supabase || !job || !job.contact_email) {
      setError('Contact email is required to send a quote');
      return;
    }

    setIsSendingQuote(true);
    setError(null);

    try {
      // Generate a unique token for quote confirmation
      const quoteToken = crypto.randomUUID();

      // Update the job with the quote token and sent status
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          quote_token: quoteToken,
          quote_sent: true,
          quote_sent_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      // Call the Supabase Edge Function to send the email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId: job.id,
          customerEmail: job.contact_email,
          quoteToken: quoteToken,
          jobNumber: job.number,
          jobName: job.name,
          customerName: job.contact_name,
          totalAmount: calculateTotalCost().toFixed(2),
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send quote email');
      }
      
      // Update local state
      setJob(prev => prev ? { ...prev, quote_sent: true, quote_token: quoteToken } : null);
      setQuoteEmailSent(true);
      
      // Refresh the job data
      const { data: updatedJob, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          locations (
            name,
            address,
            city,
            state,
            zip,
            companies (
              name
            )
          ),
          units (
            unit_number
          ),
          job_technicians (
            id,
            technician_id,
            is_primary,
            users:technician_id (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          )
        `)
        .eq('id', job.id)
        .single();

      if (fetchError) throw fetchError;
      setJob(updatedJob);

    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleSendUpdatedQuote = async () => {
    if (!supabase || !job || !job.contact_email) {
      setError('Contact email is required to send a quote');
      return;
    }

    setIsSendingQuote(true);
    setError(null);

    try {
      // Generate a new unique token for quote confirmation
      const quoteToken = crypto.randomUUID();

      // Update the job with the new quote token and reset confirmation status
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          quote_token: quoteToken,
          quote_sent: true,
          quote_sent_at: new Date().toISOString(),
          quote_confirmed: false,
          quote_confirmed_at: null
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      // Call the Supabase Edge Function to send the email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId: job.id,
          customerEmail: job.contact_email,
          quoteToken: quoteToken,
          jobNumber: job.number,
          jobName: job.name,
          customerName: job.contact_name,
          totalAmount: calculateTotalCost().toFixed(2),
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send updated quote email');
      }
      
      // Update local state
      setJob(prev => prev ? { 
        ...prev, 
        quote_sent: true, 
        quote_token: quoteToken,
        quote_confirmed: false,
        quote_confirmed_at: null
      } : null);
      
      setQuoteEmailSent(true);
      setNewItemsAfterConfirmation(false);
      
      // Refresh the job data
      const { data: updatedJob, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          locations (
            name,
            address,
            city,
            state,
            zip,
            companies (
              name
            )
          ),
          units (
            unit_number
          ),
          job_technicians (
            id,
            technician_id,
            is_primary,
            users:technician_id (
              id,
              first_name,
              last_name,
              email,
              phone
            )
          )
        `)
        .eq('id', job.id)
        .single();

      if (fetchError) throw fetchError;
      setJob(updatedJob);

    } catch (err) {
      console.error('Error sending updated quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to send updated quote');
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!supabase || !job) return;

    try {
      // Generate invoice number
      const invoiceNumber = `${job.number}-INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Calculate total amount from job items
      const totalAmount = calculateTotalCost();
      
      // Set form data
      setInvoiceFormData({
        invoiceNumber,
        amount: totalAmount,
        issuedDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
      });
      
      // Show create invoice modal
      setShowCreateInvoiceModal(true);
    } catch (err) {
      console.error('Error preparing invoice:', err);
      setError('Failed to prepare invoice');
    }
  };

  const handleSaveInvoice = async () => {
    if (!supabase || !job) return;

    try {
      // Create invoice record
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('job_invoices')
        .insert({
          job_id: job.id,
          invoice_number: invoiceFormData.invoiceNumber,
          amount: invoiceFormData.amount,
          status: 'draft',
          issued_date: invoiceFormData.issuedDate,
          due_date: invoiceFormData.dueDate
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;
      
      // Update job invoices list
      setJobInvoices(prev => [invoiceData, ...prev]);
      
      // Close modal
      setShowCreateInvoiceModal(false);
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Failed to create invoice');
    }
  };

  const handleSendInvoice = async (invoice: JobInvoice) => {
    if (!supabase || !job || !job.contact_email) {
      setError('Contact email is required to send an invoice');
      return;
    }

    setIsSendingInvoice(true);
    setError(null);

    try {
      // Update the invoice status to issued
      const { error: updateError } = await supabase
        .from('job_invoices')
        .update({
          status: 'issued'
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

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
          invoiceId: invoice.id,
          customerEmail: job.contact_email,
          jobNumber: job.number,
          jobName: job.name,
          customerName: job.contact_name,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          issuedDate: invoice.issued_date,
          dueDate: invoice.due_date,
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invoice email');
      }
      
      // Update local state
      setJobInvoices(prev => 
        prev.map(inv => 
          inv.id === invoice.id ? { ...inv, status: 'issued' } : inv
        )
      );
      
      setInvoiceEmailSent(true);
      setSelectedInvoice(null);
      setShowInvoicePreview(false);
      
      // Refresh the invoices data
      const { data: updatedInvoices, error: fetchError } = await supabase
        .from('job_invoices')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setJobInvoices(updatedInvoices || []);

    } catch (err) {
      console.error('Error sending invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invoice');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'unscheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'preventative maintenance':
        return 'bg-purple-100 text-purple-800';
      case 'service call':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractBadgeClass = (isContract: boolean) => {
    return isContract 
      ? 'bg-green-100 text-green-800' 
      : 'bg-orange-100 text-orange-800';
  };

  const getQuoteBadgeClass = (isConfirmed: boolean) => {
    return isConfirmed 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const getInvoiceStatusBadgeClass = (status: string) => {
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

  // Check if job is contract or non-contract
  const isContractJob = (job: Job) => {
    return job.service_contract !== 'Non-Contract';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || 'Job not found'}</p>
        <Link to="/jobs" className="text-primary-600 hover:text-primary-800">
          Back to Jobs
        </Link>
      </div>
    );
  }

  if (showQuotePreview) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setShowQuotePreview(false)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Job Details
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-primary"
          >
            <FileText size={16} className="mr-2" />
            Print Quote
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <QuotePDFTemplate job={job} jobItems={jobItems} />
        </div>
      </div>
    );
  }

  if (showInvoicePreview && selectedInvoice) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              setShowInvoicePreview(false);
              setSelectedInvoice(null);
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Job Details
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
            >
              <Download size={16} className="mr-2" />
              Download PDF
            </button>
            {selectedInvoice.status === 'draft' && job.contact_email && (
              <button
                onClick={() => handleSendInvoice(selectedInvoice)}
                className="btn btn-primary"
                disabled={isSendingInvoice}
              >
                {isSendingInvoice ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send to Customer
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <InvoicePDFTemplate job={job} jobItems={jobItems} invoice={selectedInvoice} />
        </div>
      </div>
    );
  }

  if (showConfirmedQuote) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setShowConfirmedQuote(false)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Job Details
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-primary"
          >
            <FileText size={16} className="mr-2" />
            Print Quote
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <QuotePDFTemplate job={job} jobItems={jobItems} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Job #{job.number}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuotePreview(true)}
            className="btn btn-secondary"
          >
            <FileText size={16} className="mr-2" />
            Preview Quote
          </button>
          <button
            onClick={() => navigate(`/jobs/${job.id}/edit`)}
            className="btn btn-primary"
          >
            <Edit size={16} className="mr-2" />
            Edit Job
          </button>
        </div>
      </div>

      {/* Quote Status Alerts */}
      {job.quote_confirmed && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-success-100 rounded-full p-2 mr-4">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <h3 className="font-medium text-success-800">Quote Confirmed by Customer</h3>
              <p className="text-success-700">Confirmed on {job.quote_confirmed_at ? new Date(job.quote_confirmed_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmedQuote(true)}
            className="btn btn-success"
          >
            <Eye size={16} className="mr-2" />
            View Confirmed Quote
          </button>
        </div>
      )}

      {newItemsAfterConfirmation && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="bg-warning-100 rounded-full p-2 mr-4 mt-1">
              <AlertTriangle className="h-6 w-6 text-warning-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-warning-800">New items added after quote confirmation</h3>
              <p className="text-warning-700 mb-4">Items have been added to this job after the customer confirmed the quote. Consider sending an updated quote to the customer.</p>
              <button
                onClick={handleSendUpdatedQuote}
                className="btn btn-warning"
                disabled={isSendingQuote}
              >
                {isSendingQuote ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Updated Quote
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {job.quote_sent && !job.quote_confirmed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full p-2 mr-4">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800">Quote Sent to Customer</h3>
              <p className="text-blue-700">Sent on {job.quote_sent_at ? new Date(job.quote_sent_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {quoteEmailSent && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="bg-success-100 rounded-full p-2 mr-4">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <h3 className="font-medium text-success-800">Quote Email Sent Successfully</h3>
              <p className="text-success-700">The quote has been sent to {job.contact_email}</p>
            </div>
          </div>
        </div>
      )}

      {invoiceEmailSent && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="bg-success-100 rounded-full p-2 mr-4">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <h3 className="font-medium text-success-800">Invoice Email Sent Successfully</h3>
              <p className="text-success-700">The invoice has been sent to {job.contact_email}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Job Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Job Name</h3>
                <p className="text-lg font-medium">{job.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                    {job.status}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeClass(job.type)}`}>
                    {job.type}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getContractBadgeClass(isContractJob(job))}`}>
                    {isContractJob(job) ? 'Contract' : 'Non-Contract'}
                  </span>
                  {job.quote_sent && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getQuoteBadgeClass(job.quote_confirmed || false)}`}>
                      {job.quote_confirmed ? 'Quote Confirmed' : 'Quote Sent'}
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Service Line</h3>
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-gray-400" />
                  <span>{job.service_line || 'Not specified'}</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Time Period</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>Start: {job.time_period_start}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>Due: {job.time_period_due}</span>
                  </div>
                </div>
              </div>
              
              {job.schedule_start && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Schedule</h3>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>{formatDateTime(job.schedule_start)}</span>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p>{job.description || 'No description provided'}</p>
              </div>
              
              {job.problem_description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Problem Description</h3>
                  <p>{job.problem_description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Location Information</h2>
            
            {job.locations ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium">{job.locations.companies.name}</p>
                    <p>{job.locations.name}</p>
                    {job.units && <p>Unit: {job.units.unit_number}</p>}
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p>{job.locations.address}</p>
                    <p>{job.locations.city}, {job.locations.state} {job.locations.zip}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No location information available</p>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            
            {job.contact_name ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {job.contact_name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{job.contact_name}</p>
                    <p className="text-sm text-gray-500">{job.contact_type || 'Primary'} Contact</p>
                  </div>
                </div>
                
                {job.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span>{job.contact_phone}</span>
                  </div>
                )}
                
                {job.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span>{job.contact_email}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No contact information available</p>
            )}
          </div>

          {/* Technicians */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Technicians</h2>
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="btn btn-primary"
              >
                <Plus size={16} className="mr-2" />
                Assign Technicians
              </button>
            </div>
            
            {job.job_technicians && job.job_technicians.length > 0 ? (
              <div className="space-y-4">
                {job.job_technicians.map(tech => (
                  <div key={tech.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="h-10 w-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {tech.users.first_name[0]}{tech.users.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">
                            {tech.users.first_name} {tech.users.last_name}
                            {tech.is_primary && (
                              <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                Primary
                              </span>
                            )}
                          </p>
                          <div className="text-sm text-gray-500 space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                              <Phone size={14} />
                              {tech.users.phone || 'No phone'}
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail size={14} />
                              {tech.users.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No technicians assigned</p>
            )}
          </div>

          {/* Items & Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Items & Pricing</h2>
              <button
                onClick={handleAddPricing}
                className="btn btn-primary"
              >
                <Plus size={16} className="mr-2" />
                Add Item
              </button>
            </div>
            
            {jobItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">TYPE</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">ITEM</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">QTY</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">UNIT PRICE</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">TOTAL</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobItems.map((item, index) => {
                      // Check if this item was added after quote confirmation
                      const isNewItem = job.quote_confirmed_at && new Date(item.created_at) > new Date(job.quote_confirmed_at);
                      
                      return (
                        <tr 
                          key={item.id} 
                          className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${isNewItem ? 'bg-warning-50' : ''}`}
                        >
                          <td className="px-4 py-3 text-sm">
                            <span className="capitalize">{item.type}</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.code}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm">${Number(item.unit_cost).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-medium">${Number(item.total_cost).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="text-primary-600 hover:text-primary-800"
                                title="Edit Item"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  setShowDeleteItemModal(true);
                                }}
                                className="text-error-600 hover:text-error-800"
                                title="Delete Item"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-4 py-3 text-sm" colSpan={4} align="right">Total:</td>
                      <td className="px-4 py-3 text-sm">${calculateTotalCost().toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No items added yet</p>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Invoices</h2>
              <button
                onClick={handleCreateInvoice}
                className="btn btn-primary"
                disabled={jobItems.length === 0}
              >
                <Plus size={16} className="mr-2" />
                Create Invoice
              </button>
            </div>
            
            {jobInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">INVOICE #</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">AMOUNT</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">STATUS</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">ISSUED DATE</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">DUE DATE</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-500">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobInvoices.map((invoice, index) => (
                      <tr key={invoice.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 text-sm font-medium">{invoice.invoice_number}</td>
                        <td className="px-4 py-3 text-sm">${Number(invoice.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getInvoiceStatusBadgeClass(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{invoice.issued_date || '-'}</td>
                        <td className="px-4 py-3 text-sm">{invoice.due_date || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowInvoicePreview(true);
                              }}
                              className="text-primary-600 hover:text-primary-800"
                              title="View Invoice"
                            >
                              <Eye size={16} />
                            </button>
                            {invoice.status === 'draft' && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowInvoicePreview(true);
                                }}
                                className="text-primary-600 hover:text-primary-800"
                                title="Send Invoice"
                              >
                                <Send size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No invoices created yet</p>
            )}
          </div>
        </div>

        <div>
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleAddPricing}
                className="btn btn-primary w-full justify-start"
              >
                <Plus size={16} className="mr-2" />
                Add Item
              </button>
              
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="btn btn-secondary w-full justify-start"
              >
                <Calendar size={16} className="mr-2" />
                Assign Technicians
              </button>
              
              <button
                onClick={() => setShowQuotePreview(true)}
                className="btn btn-secondary w-full justify-start"
              >
                <FileText size={16} className="mr-2" />
                Preview Quote
              </button>
              
              {job.contact_email && !job.quote_sent && (
                <button
                  onClick={handleSendQuote}
                  className="btn btn-success w-full justify-start"
                  disabled={isSendingQuote || jobItems.length === 0}
                >
                  {isSendingQuote ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Quote to Customer
                    </>
                  )}
                </button>
              )}
              
              {job.quote_confirmed && newItemsAfterConfirmation && (
                <button
                  onClick={handleSendUpdatedQuote}
                  className="btn btn-warning w-full justify-start"
                  disabled={isSendingQuote}
                >
                  {isSendingQuote ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Updated Quote
                    </>
                  )}
                </button>
              )}
              
              {job.quote_confirmed && (
                <button
                  onClick={() => setShowConfirmedQuote(true)}
                  className="btn btn-success w-full justify-start"
                >
                  <Eye size={16} className="mr-2" />
                  View Confirmed Quote
                </button>
              )}

              <button
                onClick={handleCreateInvoice}
                className="btn btn-secondary w-full justify-start"
                disabled={jobItems.length === 0}
              >
                <FileInvoice size={16} className="mr-2" />
                Create Invoice
              </button>
            </div>
          </div>

          {/* Job Summary */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Job Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Type</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeClass(job.type)}`}>
                  {job.type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Contract</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getContractBadgeClass(isContractJob(job))}`}>
                  {isContractJob(job) ? job.service_contract : 'Non-Contract'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Cost</span>
                <span className="font-medium">${calculateTotalCost().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Created</span>
                <span>{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
              {job.updated_at && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Updated</span>
                  <span>{new Date(job.updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Pricing Modal */}
      <AddJobPricingModal
        isOpen={showAddPricingModal}
        onClose={() => setShowAddPricingModal(false)}
        onPriceAdded={handlePriceAdded}
        jobId={id}
      />

      {/* Edit Item Modal */}
      <EditJobItemModal
        isOpen={showEditItemModal}
        onClose={() => setShowEditItemModal(false)}
        onSave={handleItemUpdated}
        item={selectedItem}
      />

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSave={async (appointment) => {
          if (!supabase || !id) return;

          try {
            // First, delete existing technician assignments
            const { error: deleteError } = await supabase
              .from('job_technicians')
              .delete()
              .eq('job_id', id);

            if (deleteError) throw deleteError;

            // Then add new technician assignments
            if (appointment.technicianIds.length > 0) {
              const technicianEntries = appointment.technicianIds.map((techId, index) => ({
                job_id: id,
                technician_id: techId,
                is_primary: index === 0 // First technician is primary
              }));
              
              const { error: insertError } = await supabase
                .from('job_technicians')
                .insert(technicianEntries);
                
              if (insertError) throw insertError;
            }
            
            // Refresh job data
            const { data: updatedJob, error: jobError } = await supabase
              .from('jobs')
              .select(`
                *,
                locations (
                  name,
                  address,
                  city,
                  state,
                  zip,
                  companies (
                    name
                  )
                ),
                units (
                  unit_number
                ),
                job_technicians (
                  id,
                  technician_id,
                  is_primary,
                  users:technician_id (
                    id,
                    first_name,
                    last_name,
                    email,
                    phone
                  )
                )
              `)
              .eq('id', id)
              .single();

            if (jobError) throw jobError;
            setJob(updatedJob);
            
            setShowAppointmentModal(false);
          } catch (err) {
            console.error('Error updating technicians:', err);
            setError('Failed to update technicians');
          }
        }}
        selectedTechnicianIds={job.job_technicians?.map(jt => jt.technician_id) || []}
      />

      {/* Delete Item Confirmation Modal */}
      {showDeleteItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Item
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteItemModal(false);
                  setSelectedItemId(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteItem}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Create Invoice</h2>
              <button onClick={() => setShowCreateInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceFormData.invoiceNumber}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceFormData.amount}
                    onChange={(e) => setInvoiceFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="input pl-7"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issued Date
                </label>
                <input
                  type="date"
                  value={invoiceFormData.issuedDate}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, issuedDate: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceFormData.dueDate}
                  onChange={(e) => setInvoiceFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="input"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvoice}
                className="btn btn-primary"
              >
                <FileInvoice size={16} className="mr-2" />
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;