import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Plus, FileInput as FileInvoice, Search, Filter, DollarSign, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

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

const Invoices = () => {
  const { supabase } = useSupabase();
  const [invoices, setInvoices] = useState<JobInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase) return;

      try {
        let query = supabase
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
          `);

        // Apply filters
        if (filters.status !== 'All') {
          query = query.eq('status', filters.status.toLowerCase());
        }
        if (filters.dateFrom) {
          query = query.gte('issued_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('issued_date', filters.dateTo);
        }
        if (filters.minAmount) {
          query = query.gte('amount', filters.minAmount);
        }
        if (filters.maxAmount) {
          query = query.lte('amount', filters.maxAmount);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to fetch invoices. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [supabase, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'All',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });
    setSearchTerm('');
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

  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const paidAmount = filteredInvoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const outstandingAmount = filteredInvoices
    .filter(invoice => invoice.status === 'issued')
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <FileInvoice className="h-6 w-6" />
            Invoices
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Invoices</p>
              <p className="text-3xl font-semibold mt-1">${totalAmount.toFixed(2)}</p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <FileInvoice className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">{filteredInvoices.length} invoices total</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Paid Invoices</p>
              <p className="text-3xl font-semibold mt-1">${paidAmount.toFixed(2)}</p>
            </div>
            <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {filteredInvoices.filter(i => i.status === 'paid').length} paid invoices
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Outstanding Invoices</p>
              <p className="text-3xl font-semibold mt-1">${outstandingAmount.toFixed(2)}</p>
            </div>
            <div className="h-12 w-12 bg-warning-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {filteredInvoices.filter(i => i.status === 'issued').length} outstanding invoices
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          
          <div className="flex gap-4">
            <div>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Paid">Paid</option>
                <option value="Void">Void</option>
              </select>
            </div>
            
            <div>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="input"
                placeholder="From Date"
              />
            </div>
            
            <div>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="input"
                placeholder="To Date"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Filter size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-gray-500">
              Filters applied: {Object.values(filters).filter(Boolean).length}
            </span>
          </div>
          {(Object.values(filters).some(Boolean) || searchTerm) && (
            <button 
              onClick={resetFilters}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Reset filters
            </button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No invoices found. Try adjusting your filters or create a new invoice.
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
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">STATUS</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">ISSUED DATE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">DUE DATE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, index) => (
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
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{invoice.issued_date || '-'}</td>
                    <td className="px-4 py-3 text-sm">{invoice.due_date || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          View
                        </Link>
                        {invoice.status === 'draft' && (
                          <Link
                            to={`/invoices/${invoice.id}/edit`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            Edit
                          </Link>
                        )}
                        {invoice.status === 'issued' && (
                          <button
                            className="text-success-600 hover:text-success-800"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;