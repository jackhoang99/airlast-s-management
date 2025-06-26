import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { ArrowLeft, FileText, MapPin, Building2, Calendar, Clock, CheckCircle, AlertTriangle, User, Phone, Mail, Clipboard, FileInput } from 'lucide-react';
import Map from '../components/ui/Map';

const CustomerJobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const companyId = sessionStorage.getItem('customerPortalCompanyId');
    if (!companyId) {
      navigate('/customer/login');
      return;
    }
    setCompanyId(companyId);
    
    const fetchJobDetails = async () => {
      if (!supabase || !id) return;

      try {
        setIsLoading(true);
        
        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
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
        
        if (!jobData) {
          throw new Error('Job not found');
        }
        
        // Verify this job belongs to the logged-in company
        if (jobData.locations?.company_id !== companyId) {
          throw new Error('You do not have access to this job');
        }
        
        setJob(jobData);
        
        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', id);
          
        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);
        
        // Fetch invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('job_invoices')
          .select('*')
          .eq('job_id', id)
          .order('created_at', { ascending: false });
          
        if (invoicesError) throw invoicesError;
        setInvoices(invoicesData || []);
        
      } catch (err) {
        console.error('Error fetching job details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [supabase, id, navigate]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Job</h3>
        <p className="text-gray-500 mb-4">{error || 'Job not found'}</p>
        <Link to="/customer/jobs" className="btn btn-primary">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/customer/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Job #{job.number}</h1>
        </div>
        <span className={`badge ${getStatusBadgeClass(job.status)}`}>
          {job.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">{job.name}</h2>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {job.type && (
                <span className="badge bg-blue-100 text-blue-800">
                  {job.type}
                </span>
              )}
              {job.service_line && (
                <span className="badge bg-purple-100 text-purple-800">
                  {job.service_line}
                </span>
              )}
            </div>
            
            {job.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                <p className="text-gray-700">{job.description}</p>
              </div>
            )}
            
            {job.problem_description && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">Problem Description</h3>
                <p className="text-yellow-700">{job.problem_description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Schedule</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Calendar size={16} className="text-gray-400 mr-2" />
                    <span>Start: {formatDate(job.time_period_start)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar size={16} className="text-gray-400 mr-2" />
                    <span>Due: {formatDate(job.time_period_due)}</span>
                  </div>
                  {job.schedule_start && (
                    <div className="flex items-center">
                      <Clock size={16} className="text-gray-400 mr-2" />
                      <span>Scheduled: {formatDateTime(job.schedule_start)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Location</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <MapPin size={16} className="text-gray-400 mr-2" />
                    <Link 
                      to={`/customer/locations/${job.location_id}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {job.locations?.name}
                    </Link>
                  </div>
                  {job.units && (
                    <div className="flex items-center">
                      <Building2 size={16} className="text-gray-400 mr-2" />
                      <Link 
                        to={`/customer/units/${job.unit_id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        Unit {job.units.unit_number}
                      </Link>
                    </div>
                  )}
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-400 mr-2 mt-1" />
                    <div>
                      <p>{job.locations?.address}</p>
                      <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <Map
                address={job.locations?.address}
                city={job.locations?.city}
                state={job.locations?.state}
                zip={job.locations?.zip}
                className="h-[300px] w-full rounded-lg"
              />
            </div>
            
            {/* Assigned Technicians */}
            {job.job_technicians && job.job_technicians.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Assigned Technicians</h3>
                <div className="space-y-3">
                  {job.job_technicians.map((tech: any) => (
                    <div key={tech.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-medium">
                          {tech.users.first_name} {tech.users.last_name}
                          {tech.is_primary && (
                            <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {tech.users.phone && (
                            <div className="flex items-center">
                              <Phone size={14} className="mr-1" />
                              {tech.users.phone}
                            </div>
                          )}
                          {tech.users.email && (
                            <div className="flex items-center">
                              <Mail size={14} className="mr-1" />
                              {tech.users.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Service Items */}
            {jobItems.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Service Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">ITEM</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">QTY</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">UNIT PRICE</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {jobItems.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.code}</div>
                          </td>
                          <td className="px-4 py-2 text-sm">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm">${Number(item.unit_cost).toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm font-medium">${Number(item.total_cost).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-2 text-sm" colSpan={3} align="right">Total</td>
                        <td className="px-4 py-2 text-sm">
                          ${jobItems.reduce((sum, item) => sum + Number(item.total_cost), 0).toFixed(2)}
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
          {/* Job Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Job Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                <span className={`badge ${getStatusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Type</span>
                <span className="font-medium">{job.type}</span>
              </div>
              
              {job.service_line && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Service Line</span>
                  <span className="font-medium">{job.service_line}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Created</span>
                <span className="font-medium">{formatDate(job.created_at)}</span>
              </div>
              
              {job.customer_po && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customer PO</span>
                  <span className="font-medium">{job.customer_po}</span>
                </div>
              )}
              
              {job.service_contract && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Service Contract</span>
                  <span className="font-medium">{job.service_contract}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Invoices */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Invoices</h2>
            
            {invoices.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-md">
                <FileInput className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No invoices found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map(invoice => (
                  <Link
                    key={invoice.id}
                    to={`/customer/invoices/${invoice.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Invoice #{invoice.invoice_number}</div>
                        <div className="text-xs text-gray-500">
                          Issued: {invoice.issued_date ? formatDate(invoice.issued_date) : 'Not issued'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Due: {invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${Number(invoice.amount).toFixed(2)}</div>
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getInvoiceStatusBadgeClass(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerJobDetails;