import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { FileInput, Search, Filter, AlertTriangle, DollarSign, Calendar, CheckCircle } from 'lucide-react';

const CustomerInvoices = () => {
  const { supabase } = useSupabase();
  const { company, searchTerm: globalSearchTerm } = useOutletContext<{ company: any, searchTerm: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    invoiceNumber: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
  });

  useEffect(() => {
    // Set local search term from global search if provided
    if (globalSearchTerm) {
      setSearchTerm(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase || !company) return;

      try {
        setIsLoading(true);
        
        // First get all locations for this company
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('id')
          .eq('company_id', company.id);
          
        if (locationError) throw locationError;
        
        const locationIds = locationData?.map(loc => loc.id) || [];
        
        if (locationIds.length === 0) {
          setInvoices([]);
          setIsLoading(false);
          return;
        }
        
        // Get all jobs for these locations
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id')
          .in('location_id', locationIds);
          
        if (jobsError) throw jobsError;
        
        const jobIds = jobsData?.map(job => job.id) || [];
        
        if (jobIds.length === 0) {
          setInvoices([]);
          setIsLoading(false);
          return;
        }
        
        // Then fetch all invoices for these jobs
        let query = supabase
          .from('job_invoices')
          .select(`
            *,
            jobs (
              id,
              number,
              name,
              locations (
                id,
                name
              ),
              units (
                id,
                unit_number
              )
            )
          `)
          .in('job_id', jobIds);
          
        // Apply filters
        if (filters.invoiceNumber) {
          query = query.ilike('invoice_number', `%${filters.invoiceNumber}%`);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
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
        
        const { data, error: invoicesError } = await query.order('created_at', { ascending: false });
        
        if (invoicesError) throw invoicesError;
        setInvoices(data || []);
        
        // Calculate stats
        const totalAmount = data?.reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;
        const paidAmount = data?.filter(invoice => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;
        const outstandingAmount = data?.filter(invoice => invoice.status === 'issued')
          .reduce((sum, invoice) => sum + Number(invoice.amount), 0) || 0;
          
        setStats({
          totalAmount,
          paidAmount,
          outstandingAmount
        });
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to load invoices');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvoices();
  }, [supabase, company, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      invoiceNumber: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });
    setSearchTerm('');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
      (invoice.jobs?.units?.unit_number && invoice.jobs.units.unit_number.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Invoices</p>
              <p className="text-3xl font-semibold mt-1">${stats.totalAmount.toFixed(2)}</p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <FileInput className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">{filteredInvoices.length} invoices total</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Paid</p>
              <p className="text-3xl font-semibold mt-1">${stats.paidAmount.toFixed(2)}</p>
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
              <p className="text-sm font-medium text-gray-500">Outstanding</p>
              <p className="text-3xl font-semibold mt-1">${stats.outstandingAmount.toFixed(2)}</p>
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

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                id="invoiceNumber"
                name="invoiceNumber"
                value={filters.invoiceNumber}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount
              </label>
              <input
                type="number"
                id="minAmount"
                name="minAmount"
                value={filters.minAmount}
                onChange={handleFilterChange}
                className="input"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount
              </label>
              <input
                type="number"
                id="maxAmount"
                name="maxAmount"
                value={filters.maxAmount}
                onChange={handleFilterChange}
                className="input"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end mb-4">
            <button
              onClick={resetFilters}
              className="text-primary-600 hover:text-primary-800"
            >
              Reset Filters
            </button>
          </div>
        )}

        {error && (
          <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-error-500" />
              <div className="ml-3">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No invoices found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">INVOICE #</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">JOB</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">LOCATION</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">AMOUNT</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">ISSUED DATE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">DUE DATE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link 
                        to={`/customer/invoices/${invoice.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link 
                        to={`/customer/jobs/${invoice.jobs?.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {invoice.jobs?.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {invoice.jobs?.locations?.name}
                      {invoice.jobs?.units && (
                        <span className="text-xs text-gray-500 block">
                          Unit {invoice.jobs.units.unit_number}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">${Number(invoice.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(invoice.issued_date)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(invoice.due_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
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

export default CustomerInvoices;