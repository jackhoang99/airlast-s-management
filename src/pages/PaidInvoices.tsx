import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, FileInput, Search, Filter, CheckCircle, AlertTriangle } from 'lucide-react';

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

const PaidInvoices = () => {
  const { supabase } = useSupabase();
  const [invoices, setInvoices] = useState<JobInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
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
          `)
          .eq('status', 'paid')
          .order('paid_date', { ascending: false });

        // Apply filters
        if (filters.dateFrom) {
          query = query.gte('paid_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('paid_date', filters.dateTo);
        }
        if (filters.minAmount) {
          query = query.gte('amount', filters.minAmount);
        }
        if (filters.maxAmount) {
          query = query.lte('amount', filters.maxAmount);
        }

        const { data, error } = await query;

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to fetch paid invoices. Please try again.');
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
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });
    setSearchTerm('');
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

  const totalPaid = filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  // Group by month for reporting
  const invoicesByMonth: Record<string, number> = {};
  filteredInvoices.forEach(invoice => {
    if (invoice.paid_date) {
      const date = new Date(invoice.paid_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      invoicesByMonth[monthYear] = (invoicesByMonth[monthYear] || 0) + Number(invoice.amount);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <FileInput className="h-6 w-6" />
            Paid Invoices
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            Export to Spreadsheet
          </button>
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
            <p className="text-sm font-medium text-gray-500">Total Paid</p>
            <p className="text-3xl font-semibold mt-1">${totalPaid.toFixed(2)}</p>
          </div>
          <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-success-600" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">{filteredInvoices.length} paid invoices</p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {Object.keys(invoicesByMonth).length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Monthly Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(invoicesByMonth)
              .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
              .map(([monthYear, amount]) => {
                const [year, month] = monthYear.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const monthName = date.toLocaleString('default', { month: 'long' });
                
                return (
                  <div key={monthYear} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{monthName} {year}</span>
                    <span className="text-success-700 font-semibold">${amount.toFixed(2)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search paid invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          
          <div className="flex gap-4">
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
            No paid invoices found. Try adjusting your filters.
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
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">PAID DATE</th>
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
                    <td className="px-4 py-3 text-sm">{invoice.issued_date || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-success-600 font-medium">
                        {invoice.paid_date || '-'}
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

export default PaidInvoices;