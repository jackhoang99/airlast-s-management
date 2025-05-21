import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Building, Building2, User, Phone, Mail, Tag, FileText, Plus, Trash2, CheckCircle, AlertTriangle, Edit, Package, PenTool as Tool, ShoppingCart, DollarSign, Send, Download, FileCheck, Eye } from 'lucide-react';
import AppointmentModal from '../components/jobs/AppointmentModal';
import AddJobPricingModal from '../components/jobs/AddJobPricingModal';
import QuotePDFTemplate from '../components/quotes/QuotePDFTemplate';

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

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [confirmedJobItems, setConfirmedJobItems] = useState<JobItem[]>([]);
  const [newJobItems, setNewJobItems] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [showViewQuoteModal, setShowViewQuoteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [quoteConfirmed, setQuoteConfirmed] = useState(false);
  const [quoteConfirmedAt, setQuoteConfirmedAt] = useState<string | null>(null);
  const [hasNewItems, setHasNewItems] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

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
        
        // Set customer email from job data if available
        if (data?.contact_email) {
          setCustomerEmail(data.contact_email);
        }
        
        // Check if quote is confirmed
        if (data?.quote_confirmed) {
          setQuoteConfirmed(true);
          setQuoteConfirmedAt(data.quote_confirmed_at);
        }

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', id)
          .order('created_at');

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // If quote is confirmed, check if there are new items added after confirmation
        if (data?.quote_confirmed && data.quote_confirmed_at && itemsData) {
          const confirmedDate = new Date(data.quote_confirmed_at);
          
          // Separate items into confirmed and new
          const confirmed = itemsData.filter(item => new Date(item.created_at) <= confirmedDate);
          const newItems = itemsData.filter(item => new Date(item.created_at) > confirmedDate);
          
          setConfirmedJobItems(confirmed);
          setNewJobItems(newItems);
          setHasNewItems(newItems.length > 0);
        }

      } catch (err) {
        console.error('Error fetching job details:', err);
        setError('Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [supabase, id]);

  const handleScheduleAppointment = async (appointment: {
    technicianIds: string[];
  }) => {
    if (!supabase || !job) return;

    try {
      // First, remove existing technicians
      const { error: deleteError } = await supabase
        .from('job_technicians')
        .delete()
        .eq('job_id', job.id);

      if (deleteError) throw deleteError;

      // Then add new technicians
      const technicianEntries = appointment.technicianIds.map((techId, index) => ({
        job_id: job.id,
        technician_id: techId,
        is_primary: index === 0 // First technician is primary
      }));

      const { error: insertError } = await supabase
        .from('job_technicians')
        .insert(technicianEntries);

      if (insertError) throw insertError;

      // Refresh job data
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
      setShowAppointmentModal(false);
    } catch (err) {
      console.error('Error updating technicians:', err);
      setError('Failed to update technicians');
    }
  };

  const handleDeleteJob = async () => {
    if (!supabase || !job) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);

      if (error) throw error;
      navigate('/jobs');
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!supabase || !job) return;

    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) throw error;
      
      // Refresh job data
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
      setShowCompleteModal(false);
    } catch (err) {
      console.error('Error completing job:', err);
      setError('Failed to complete job');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSendQuote = async () => {
    if (!supabase || !job || !customerEmail) return;

    setIsSendingQuote(true);
    try {
      // Generate a unique token for the confirmation link
      const confirmationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Update job with quote information
      const { error } = await supabase
        .from('jobs')
        .update({ 
          quote_sent: true,
          quote_sent_at: new Date().toISOString(),
          quote_token: confirmationToken,
          contact_email: customerEmail
        })
        .eq('id', job.id);

      if (error) throw error;
      
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
          customerEmail: customerEmail,
          quoteToken: confirmationToken,
          jobNumber: job.number,
          jobName: job.name,
          customerName: job.contact_name,
          totalAmount: calculateTotalCost().toFixed(2),
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      
      // Show success message
      alert(`Quote has been sent to ${customerEmail}. The customer will receive an email with a confirmation link.`);
      
      setShowSendQuoteModal(false);
    } catch (err) {
      console.error('Error sending quote:', err);
      setError('Failed to send quote: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleSendUpdatedQuote = async () => {
    if (!supabase || !job || !customerEmail) return;

    setIsSendingQuote(true);
    try {
      // Generate a unique token for the confirmation link
      const confirmationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Update job with quote information
      const { error } = await supabase
        .from('jobs')
        .update({ 
          quote_sent: true,
          quote_sent_at: new Date().toISOString(),
          quote_token: confirmationToken,
          quote_confirmed: false, // Reset confirmation status for the new quote
          quote_confirmed_at: null,
          contact_email: customerEmail
        })
        .eq('id', job.id);

      if (error) throw error;
      
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
          customerEmail: customerEmail,
          quoteToken: confirmationToken,
          jobNumber: job.number,
          jobName: job.name,
          customerName: job.contact_name,
          totalAmount: calculateTotalCost().toFixed(2),
          jobItems: jobItems
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
      
      // Show success message
      alert(`Updated quote has been sent to ${customerEmail}. The customer will receive an email with a confirmation link.`);
      
      // Reset the new items flag
      setHasNewItems(false);
      
      // Refresh the page to update the UI
      window.location.reload();
    } catch (err) {
      console.error('Error sending updated quote:', err);
      setError('Failed to send updated quote: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleConfirmQuote = async () => {
    if (!supabase || !job) return;

    try {
      // Update job with confirmation information
      const { error } = await supabase
        .from('jobs')
        .update({ 
          quote_confirmed: true,
          quote_confirmed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) throw error;
      
      // Update local state
      setQuoteConfirmed(true);
      setQuoteConfirmedAt(new Date().toISOString());
      
      // Show success message
      alert('Quote has been confirmed successfully!');
    } catch (err) {
      console.error('Error confirming quote:', err);
      setError('Failed to confirm quote');
    }
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
      
      // If quote is confirmed, check if there are new items added after confirmation
      if (job?.quote_confirmed && job.quote_confirmed_at) {
        const confirmedDate = new Date(job.quote_confirmed_at);
        
        // Separate items into confirmed and new
        const confirmed = data?.filter(item => new Date(item.created_at) <= confirmedDate) || [];
        const newItems = data?.filter(item => new Date(item.created_at) > confirmedDate) || [];
        
        setConfirmedJobItems(confirmed);
        setNewJobItems(newItems);
        setHasNewItems(newItems.length > 0);
      }
    } catch (err) {
      console.error('Error refreshing job items:', err);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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

  const getItemTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'part':
        return 'bg-blue-100 text-blue-800';
      case 'labor':
        return 'bg-green-100 text-green-800';
      case 'item':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'part':
        return <Package size={14} className="mr-1" />;
      case 'labor':
        return <Tool size={14} className="mr-1" />;
      case 'item':
        return <ShoppingCart size={14} className="mr-1" />;
      default:
        return null;
    }
  };

  // Calculate total cost of all job items
  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // Calculate total cost of confirmed job items
  const calculateConfirmedTotalCost = () => {
    return confirmedJobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // Generate PDF for the quote
  const generatePDF = () => {
    if (!job) return;
    
    // Open a new window for the PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to generate the PDF');
      return;
    }
    
    // Write the PDF content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quote #${job.number} - ${job.name}</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #ddd;
            }
            .section {
              margin-bottom: 30px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 5px 0;
            }
            h2 {
              font-size: 20px;
              margin: 0 0 15px 0;
            }
            h3 {
              font-size: 16px;
              margin: 0 0 10px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .text-right {
              text-align: right;
            }
            .signature-area {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
            }
            .signature-line {
              width: 200px;
              border-bottom: 1px solid #000;
              margin-bottom: 5px;
            }
            .signature {
              font-family: "Brush Script MT", "Brush Script Std", "Lucida Calligraphy", "Lucida Handwriting", "Apple Chancery", "URW Chancery L", cursive;
              font-size: 28px;
              position: relative;
              top: -15px;
              text-align: center;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>
                <h1>Airlast HVAC</h1>
                <p>1650 Marietta Boulevard Northwest<br>
                Atlanta, GA 30318<br>
                (404) 632-9074</p>
              </div>
              <div style="text-align: right;">
                <h2>Quote</h2>
                <p>Job #: ${job.number}<br>
                Date: ${new Date().toLocaleDateString()}<br>
                Valid Until: ${new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</p>
              </div>
            </div>

            <div class="section">
              <h3>Customer Information</h3>
              <div style="display: flex; justify-content: space-between;">
                <div style="width: 48%;">
                  <p><strong>Bill To:</strong><br>
                  ${job.locations?.companies.name}<br>
                  ${job.locations?.address}<br>
                  ${job.locations?.city}, ${job.locations?.state} ${job.locations?.zip}</p>
                </div>
                <div style="width: 48%;">
                  <p><strong>Contact:</strong><br>
                  ${job.contact_name || 'N/A'}<br>
                  ${job.contact_phone || 'N/A'}<br>
                  ${job.contact_email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Service Location</h3>
              <p>
                ${job.locations?.name}<br>
                ${job.locations?.address}<br>
                ${job.locations?.city}, ${job.locations?.state} ${job.locations?.zip}
                ${job.units ? `<br>Unit: ${job.units.unit_number}` : ''}
              </p>
            </div>

            <div class="section">
              <h3>Service Details</h3>
              <p><strong>Service Type:</strong> ${job.type}</p>
              <p><strong>Service Line:</strong> ${job.service_line || 'N/A'}</p>
              <p><strong>Description:</strong> ${job.description || 'N/A'}</p>
              ${job.problem_description ? `<p><strong>Problem Description:</strong> ${job.problem_description}</p>` : ''}
              ${job.schedule_start ? `<p><strong>Scheduled:</strong> ${formatDateTime(job.schedule_start)}</p>` : ''}
            </div>

            <div class="section">
              <h3>Technicians</h3>
              ${job.job_technicians && job.job_technicians.length > 0 
                ? `<ul>${job.job_technicians.map(tech => 
                    `<li>${tech.users.first_name} ${tech.users.last_name}${tech.is_primary ? ' (Primary)' : ''}</li>`
                  ).join('')}</ul>` 
                : '<p>No technicians assigned</p>'}
            </div>

            <div class="section">
              <h3>Items & Pricing</h3>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(quoteConfirmed && !hasNewItems ? confirmedJobItems : jobItems).map((item) => `
                    <tr>
                      <td style="text-transform: capitalize;">${item.type}</td>
                      <td>${item.name}</td>
                      <td>${item.quantity}</td>
                      <td class="text-right">$${Number(item.unit_cost).toFixed(2)}</td>
                      <td class="text-right">$${Number(item.total_cost).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" class="text-right"><strong>Total:</strong></td>
                    <td class="text-right"><strong>$${(quoteConfirmed && !hasNewItems ? calculateConfirmedTotalCost() : calculateTotalCost()).toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div class="section">
              <h3>Terms & Conditions</h3>
              <ol>
                <li>This quote is valid for 30 days from the date of issue.</li>
                <li>Payment is due upon completion of work unless otherwise specified.</li>
                <li>Any additional work not specified in this quote will require a separate quote.</li>
                <li>Airlast HVAC provides a 90-day warranty on all parts and labor.</li>
                <li>Customer is responsible for providing access to the work area.</li>
              </ol>
            </div>

            <div class="signature-area">
              <div>
                <p><strong>Customer Acceptance:</strong></p>
                <div class="signature-line"></div>
                <p>Signature</p>
                <div class="signature-line"></div>
                <p>Date</p>
              </div>
              <div>
                <p><strong>Airlast HVAC:</strong></p>
                <div class="signature-line">
                  <div class="signature">Airlast</div>
                </div>
                <p>Representative</p>
                <div class="signature-line">
                  <div class="signature" style="font-size: 16px;">${new Date().toLocaleDateString()}</div>
                </div>
                <p>Date</p>
              </div>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
              <button onclick="window.print();" style="padding: 10px 20px; background-color: #0672be; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Print Quote
              </button>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // Finish loading the document
    printWindow.document.close();
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
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="btn btn-success"
            >
              <CheckCircle size={16} className="mr-2" />
              Complete Job
            </button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-error"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                    {job.status}
                  </span>
                  <span className="text-sm font-medium text-gray-500">{job.type}</span>
                  {job.is_training && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      Training
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold">{job.name}</h2>
                {job.description && (
                  <p className="text-gray-600 mt-2">{job.description}</p>
                )}
                {job.problem_description && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700">Problem Description:</h3>
                    <p className="text-gray-600">{job.problem_description}</p>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm">
                  <span className="font-medium">Created:</span> {new Date(job.created_at).toLocaleDateString()}
                </div>
                {job.updated_at && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Updated:</span> {new Date(job.updated_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Schedule</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <span className="font-medium">Start Date:</span> {job.time_period_start}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <span className="font-medium">Due Date:</span> {job.time_period_due}
                    </div>
                  </div>
                  {job.schedule_start && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <div>
                        <span className="font-medium">Scheduled:</span> {formatDateTime(job.schedule_start)}
                        {job.schedule_duration && ` (${job.schedule_duration})`}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Details</h3>
                <div className="space-y-2">
                  {job.service_line && (
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" />
                      <div>
                        <span className="font-medium">Service Line:</span> {job.service_line}
                      </div>
                    </div>
                  )}
                  {job.service_contract && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <div>
                        <span className="font-medium">Service Contract:</span> {job.service_contract}
                      </div>
                    </div>
                  )}
                  {job.customer_po && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <div>
                        <span className="font-medium">Customer PO:</span> {job.customer_po}
                      </div>
                    </div>
                  )}
                  {job.office && (
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-gray-400" />
                      <div>
                        <span className="font-medium">Office:</span> {job.office}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location Information */}
          {job.locations && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Location</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <div className="font-medium">{job.locations.companies.name}</div>
                    <div>{job.locations.name}</div>
                    {job.units && (
                      <div className="text-gray-600">Unit: {job.units.unit_number}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <div>{job.locations.address}</div>
                    <div>{job.locations.city}, {job.locations.state} {job.locations.zip}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          {job.contact_name && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Contact</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <div className="font-medium">{job.contact_name}</div>
                    {job.contact_type && (
                      <div className="text-gray-600 capitalize">{job.contact_type} Contact</div>
                    )}
                  </div>
                </div>
                {job.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>{job.contact_phone}</div>
                  </div>
                )}
                {job.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>{job.contact_email}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technicians */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Technicians</h2>
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
                  <div key={tech.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {tech.users.first_name?.[0] || '?'}{tech.users.last_name?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="font-medium">{tech.users.first_name} {tech.users.last_name}</div>
                        {tech.is_primary && (
                          <span className="ml-2 bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 space-y-1 mt-1">
                        {tech.users.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} />
                            {tech.users.phone}
                          </div>
                        )}
                        {tech.users.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={14} />
                            {tech.users.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No technicians assigned</p>
                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="mt-2 text-primary-600 hover:text-primary-800"
                >
                  Assign technicians
                </button>
              </div>
            )}
          </div>

          {/* Job Items/Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Items & Pricing</h2>
              <button
                onClick={() => setShowAddPricingModal(true)}
                className="btn btn-primary"
              >
                <Plus size={16} className="mr-2" />
                Add Item
              </button>
            </div>
            
            {jobItems.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Code</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Quantity</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Unit Cost</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobItems.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getItemTypeBadgeClass(item.type)}`}>
                              {getItemTypeIcon(item.type)}
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{item.code}</td>
                          <td className="px-4 py-3 text-sm">{item.name}</td>
                          <td className="px-4 py-3 text-sm">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm">${Number(item.unit_cost).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-medium">${Number(item.total_cost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-sm font-medium text-right">Total:</td>
                        <td className="px-4 py-3 text-sm font-bold">${calculateTotalCost().toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No items added</p>
                <button
                  onClick={() => setShowAddPricingModal(true)}
                  className="mt-2 text-primary-600 hover:text-primary-800"
                >
                  Add items
                </button>
              </div>
            )}
          </div>

          {/* Quote Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Quote</h2>
              <div className="flex gap-2">
                <button
                  onClick={generatePDF}
                  className="btn btn-secondary"
                  disabled={jobItems.length === 0}
                >
                  <Download size={16} className="mr-2" />
                  Download PDF
                </button>
                <button
                  onClick={() => setShowSendQuoteModal(true)}
                  className="btn btn-primary"
                  disabled={jobItems.length === 0}
                >
                  <Send size={16} className="mr-2" />
                  Send to Customer
                </button>
              </div>
            </div>
            
            {/* Quote Confirmed Banner */}
            {quoteConfirmed && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-4 flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-success-100 rounded-full p-2">
                    <FileCheck className="h-6 w-6 text-success-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-success-800">Quote Confirmed by Customer</h3>
                    <p className="text-success-600 text-sm">
                      Confirmed on {quoteConfirmedAt ? new Date(quoteConfirmedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewQuoteModal(true)}
                  className="btn btn-success"
                >
                  <Eye size={16} className="mr-2" />
                  View Confirmed Quote
                </button>
              </div>
            )}
            
            {/* New Items Added Banner */}
            {quoteConfirmed && hasNewItems && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-warning-100 rounded-full p-2">
                    <AlertTriangle className="h-6 w-6 text-warning-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-warning-800">New items added after quote confirmation</h3>
                    <p className="text-warning-600">
                      Items have been added to this job after the customer confirmed the quote. Consider sending an updated quote to the customer.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSendUpdatedQuote}
                  className="btn btn-warning mt-2"
                >
                  <Send size={16} className="mr-2" />
                  Send Updated Quote
                </button>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Quote Summary</h3>
                <p className="text-gray-600">
                  This quote includes all items, labor, and parts required for the job.
                </p>
              </div>
              
              {jobItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Total Quote Amount:</span>
                      <span className="text-lg">${calculateTotalCost().toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      This quote is valid for 30 days from the date of issue.
                    </p>
                  </div>
                  
                  {!quoteConfirmed && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleConfirmQuote}
                        className="btn btn-success"
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Confirm Quote (Demo)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No items added to this quote yet.</p>
                  <button
                    onClick={() => setShowAddPricingModal(true)}
                    className="mt-2 text-primary-600 hover:text-primary-800"
                  >
                    Add items to create a quote
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowAppointmentModal(true)}
                className="btn btn-primary w-full justify-start"
              >
                <Calendar size={16} className="mr-2" />
                Assign Technicians
              </button>
              <button
                onClick={() => setShowAddPricingModal(true)}
                className="btn btn-primary w-full justify-start"
              >
                <DollarSign size={16} className="mr-2" />
                Add Items
              </button>
              <Link
                to={`/jobs/${job.id}/edit`}
                className="btn btn-secondary w-full justify-start"
              >
                <Edit size={16} className="mr-2" />
                Edit Job
              </Link>
              <button
                onClick={() => setShowSendQuoteModal(true)}
                className="btn btn-secondary w-full justify-start"
                disabled={jobItems.length === 0}
              >
                <Send size={16} className="mr-2" />
                Send Quote
              </button>
              {quoteConfirmed && (
                <button
                  onClick={() => setShowViewQuoteModal(true)}
                  className="btn btn-success w-full justify-start"
                >
                  <Eye size={16} className="mr-2" />
                  View Confirmed Quote
                </button>
              )}
              {job.status !== 'completed' && job.status !== 'cancelled' && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="btn btn-success w-full justify-start"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Complete Job
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error w-full justify-start"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Job
              </button>
            </div>
          </div>

          {/* Job Summary */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Job Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span>{job.type}</span>
              </div>
              {job.service_line && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Line:</span>
                  <span>{job.service_line}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date:</span>
                <span>{job.time_period_start}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span>{job.time_period_due}</span>
              </div>
              {job.schedule_start && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Scheduled:</span>
                  <span>{formatDateTime(job.schedule_start)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span>{jobItems.length}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total Cost:</span>
                <span>${calculateTotalCost().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF template */}
      <div id="pdf-template" ref={pdfRef} className="hidden print:block">
        <QuotePDFTemplate job={job} jobItems={jobItems} />
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSave={handleScheduleAppointment}
        selectedTechnicianIds={job.job_technicians?.map(jt => jt.technician_id) || []}
      />

      {/* Add Pricing Modal */}
      <AddJobPricingModal
        isOpen={showAddPricingModal}
        onClose={() => setShowAddPricingModal(false)}
        onPriceAdded={handlePriceAdded}
        jobId={job.id}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete Job #{job.number}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteJob}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Complete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to mark Job #{job.number} as completed?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCompleteModal(false)}
                disabled={isCompleting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={handleCompleteJob}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Completing...
                  </>
                ) : (
                  'Complete Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Quote Modal */}
      {showSendQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <Send size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Send Quote to Customer
            </h3>
            <div className="mb-6">
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                id="customerEmail"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="input w-full"
                placeholder="customer@example.com"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                The customer will receive an email with a link to view and confirm this quote.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSendQuoteModal(false)}
                disabled={isSendingQuote}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSendQuote}
                disabled={isSendingQuote || !customerEmail}
              >
                {isSendingQuote ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Sending...
                  </>
                ) : (
                  'Send Quote'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Confirmed Quote Modal */}
      {showViewQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Confirmed Quote</h3>
              <button 
                onClick={() => setShowViewQuoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 border rounded-lg">
              <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div>
                  <h1 className="text-2xl font-bold">Airlast HVAC</h1>
                  <p>1650 Marietta Boulevard Northwest</p>
                  <p>Atlanta, GA 30318</p>
                  <p>(404) 632-9074</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">Quote</h2>
                  <p>Job #: {job.number}</p>
                  <p>Date: {quoteConfirmedAt ? new Date(quoteConfirmedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold">Bill To:</p>
                    <p>{job.locations?.companies.name}</p>
                    <p>{job.locations?.address}</p>
                    <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
                  </div>
                  <div>
                    <p className="font-bold">Contact:</p>
                    <p>{job.contact_name || 'N/A'}</p>
                    <p>{job.contact_phone || 'N/A'}</p>
                    <p>{job.contact_email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Service Location</h3>
                <p>{job.locations?.name}</p>
                <p>{job.locations?.address}</p>
                <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
                {job.units && <p>Unit: {job.units.unit_number}</p>}
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Service Details</h3>
                <p><strong>Service Type:</strong> {job.type}</p>
                <p><strong>Service Line:</strong> {job.service_line || 'N/A'}</p>
                <p><strong>Description:</strong> {job.description || 'N/A'}</p>
                {job.problem_description && (
                  <p><strong>Problem Description:</strong> {job.problem_description}</p>
                )}
                {job.schedule_start && (
                  <p><strong>Scheduled:</strong> {formatDateTime(job.schedule_start)}</p>
                )}
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold mb-2">Items & Pricing</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Type</th>
                      <th className="border p-2 text-left">Item</th>
                      <th className="border p-2 text-right">Quantity</th>
                      <th className="border p-2 text-right">Unit Price</th>
                      <th className="border p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedJobItems.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border p-2 capitalize">{item.type}</td>
                        <td className="border p-2">{item.name}</td>
                        <td className="border p-2 text-right">{item.quantity}</td>
                        <td className="border p-2 text-right">${Number(item.unit_cost).toFixed(2)}</td>
                        <td className="border p-2 text-right">${Number(item.total_cost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td className="border p-2" colSpan={4} align="right">Total:</td>
                      <td className="border p-2 text-right">${calculateConfirmedTotalCost().toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowViewQuoteModal(false);
                    generatePDF();
                  }}
                  className="btn btn-primary"
                >
                  <Download size={16} className="mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;