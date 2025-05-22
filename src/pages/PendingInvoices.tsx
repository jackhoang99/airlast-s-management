import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Plus, FileInput, Search, Filter, DollarSign, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

type JobInvoice = Database['public']['Tables']['job_invoices']['Row'] & {
  jobs: {
    id: string;
    number: string;
    name: string;
    locations: {
      name: string;
      companies: {
        name: string;
      };
    };
  };
};

const PendingInvoices = () => {
  const { supabase } = useSupabase();
  const [invoices, setInvoices] = useState<JobInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('job_invoices')
          .select(`
            *,
            jobs (
              id,
              number,
              name,
              locations (
                name,
                companies (
                  name
                )
              )
            )
          `)
          .eq('status', 'issued')
          .order('due_date');

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to fetch pending invoices. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [supabase]);

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.jobs?.number.toLowerCase().includes(searchLower) ||
      invoice.jobs?.name.toLowerCase().includes(searchLower) ||
      invoice.jobs?.locations?.name.toLowerCase().includes(searchLower) ||
      invoice.jobs?.locations?.companies?.name.toLowerCase().includes(searchLower)
    );
  });

  const totalOutstanding = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  
  // Group invoices by due date status
  const overdueInvoices = filteredInvoices.filter(invoice => 
    invoice.due_date && new Date(invoice.due_date) < new Date()
  );
  
  const dueSoonInvoices = filteredInvoices.filter(invoice => {
    if (!invoice.due_date) return false;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return dueDate >= today && dueDate <= sevenDaysFromNow;
  });

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('job_invoices')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', invoiceId);

      if (error) throw error;
      
      // Update local state
      setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      setError('Failed to mark invoice as paid. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <FileInput className="h-6 w-6" />
            Pending Invoices
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            Export to Spreadsheet
          </button>
          <Link to="/jobs" className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Create Invoice
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
            <p className="text-3xl font-semibold mt-1">${totalOutstanding.toFixed(2)}</p>
          </div>
          <div className="h-12 w-12 bg-warning-100 rounded-full flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-warning-600" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-error-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-error-700">Overdue</p>
              <p className="text-lg font-semibold text-error-700">
                ${overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0).toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-error-600 mt-1">{overdueInvoices.length} invoices</p>
          </div>
          <div className="bg-warning-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-warning-700">Due Soon</p>
              <p className="text-lg font-semibold text-warning-700">
                ${dueSoonInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0).toFixed(2)}
              </p>
            </div>
            <p className="text-xs text-warning-600 mt-1">{dueSoonInvoices.length} invoices</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search pending invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending invoices found. All invoices have been paid!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">INVOICE #</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">JOB</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">CUSTOMER</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">AMOUNT</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">ISSUED DATE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">DUE DATE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">STATUS</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => {
                  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();
                  
                  return (
                    <tr key={invoice.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-sm font-medium">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link 
                          to={`/jobs/${invoice.jobs?.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Job #{invoice.jobs?.number}: {invoice.jobs?.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.jobs?.locations?.companies?.name}
                        <div className="text-xs text-gray-500">
                          {invoice.jobs?.locations?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">${Number(invoice.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{invoice.issued_date || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={isOverdue ? 'text-error-600 font-medium' : ''}>
                          {invoice.due_date || '-'}
                        </span>
                        {isOverdue && (
                          <div className="text-xs text-error-600">
                            Overdue
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                          issued
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="text-success-600 hover:text-success-800"
                          >
                            Mark Paid
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingInvoices;