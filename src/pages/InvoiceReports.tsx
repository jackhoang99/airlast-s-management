import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, FileInput as FileInvoice, BarChart, PieChart, Download, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

type JobInvoice = Database['public']['Tables']['job_invoices']['Row'] & {
  jobs: {
    id: string;
    number: string;
    name: string;
    service_line: string;
    locations: {
      name: string;
      companies: {
        name: string;
      };
    };
  };
};

const InvoiceReports = () => {
  const { supabase } = useSupabase();
  const [invoices, setInvoices] = useState<JobInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportPeriod, setReportPeriod] = useState('year');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportMonth, setReportMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!supabase) return;

      try {
        let startDate, endDate;
        
        if (reportPeriod === 'year') {
          startDate = `${reportYear}-01-01`;
          endDate = `${reportYear}-12-31`;
        } else if (reportPeriod === 'month') {
          const year = reportYear;
          const month = reportMonth;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          startDate = `${year}-${month}-01`;
          endDate = `${year}-${month}-${lastDay}`;
        } else if (reportPeriod === 'quarter') {
          const year = reportYear;
          const quarter = parseInt(reportMonth); // Using month field for quarter
          const startMonth = (quarter - 1) * 3 + 1;
          const endMonth = quarter * 3;
          startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
          const lastDay = new Date(parseInt(year), endMonth, 0).getDate();
          endDate = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`;
        }

        const { data, error } = await supabase
          .from('job_invoices')
          .select(`
            *,
            jobs (
              id,
              number,
              name,
              service_line,
              locations (
                name,
                companies (
                  name
                )
              )
            )
          `)
          .gte('issued_date', startDate)
          .lte('issued_date', endDate)
          .order('issued_date');

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Failed to fetch invoice data for reports. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [supabase, reportPeriod, reportYear, reportMonth]);

  // Calculate report data
  const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const paidAmount = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const outstandingAmount = invoices
    .filter(invoice => invoice.status === 'issued')
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const voidAmount = invoices
    .filter(invoice => invoice.status === 'void')
    .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  // Group by month for monthly breakdown
  const invoicesByMonth: Record<string, number> = {};
  invoices.forEach(invoice => {
    if (invoice.issued_date) {
      const date = new Date(invoice.issued_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      invoicesByMonth[monthYear] = (invoicesByMonth[monthYear] || 0) + Number(invoice.amount);
    }
  });

  // Group by service line
  const invoicesByServiceLine: Record<string, number> = {};
  invoices.forEach(invoice => {
    const serviceLine = invoice.jobs?.service_line || 'Unknown';
    invoicesByServiceLine[serviceLine] = (invoicesByServiceLine[serviceLine] || 0) + Number(invoice.amount);
  });

  // Group by customer
  const invoicesByCustomer: Record<string, number> = {};
  invoices.forEach(invoice => {
    const customer = invoice.jobs?.locations?.companies?.name || 'Unknown';
    invoicesByCustomer[customer] = (invoicesByCustomer[customer] || 0) + Number(invoice.amount);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <FileInvoice className="h-6 w-6" />
            Financial Reports
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <Download size={16} className="mr-2" />
            Export Report
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

      {/* Report Period Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Report Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Type
            </label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="select"
            >
              <option value="year">Annual</option>
              <option value="quarter">Quarterly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={reportYear}
              onChange={(e) => setReportYear(e.target.value)}
              className="select"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
          
          {reportPeriod === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="select"
              >
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          )}
          
          {reportPeriod === 'quarter' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quarter
              </label>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="select"
              >
                <option value="1">Q1 (Jan-Mar)</option>
                <option value="2">Q2 (Apr-Jun)</option>
                <option value="3">Q3 (Jul-Sep)</option>
                <option value="4">Q4 (Oct-Dec)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Invoiced</p>
                  <p className="text-3xl font-semibold mt-1">${totalAmount.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <FileInvoice className="h-6 w-6 text-primary-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">{invoices.length} invoices total</p>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Paid</p>
                  <p className="text-3xl font-semibold mt-1">${paidAmount.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-success-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {invoices.filter(i => i.status === 'paid').length} paid invoices
                </p>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Outstanding</p>
                  <p className="text-3xl font-semibold mt-1">${outstandingAmount.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-warning-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-warning-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {invoices.filter(i => i.status === 'issued').length} outstanding invoices
                </p>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Void</p>
                  <p className="text-3xl font-semibold mt-1">${voidAmount.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-error-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-error-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {invoices.filter(i => i.status === 'void').length} void invoices
                </p>
              </div>
            </div>
          </div>

          {/* Charts and Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Breakdown */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BarChart className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold">Monthly Breakdown</h2>
              </div>
              
              {Object.keys(invoicesByMonth).length > 0 ? (
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
                          <span className="text-primary-700 font-semibold">${amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data available for the selected period.
                </div>
              )}
            </div>

            {/* Service Line Breakdown */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold">Service Line Breakdown</h2>
              </div>
              
              {Object.keys(invoicesByServiceLine).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(invoicesByServiceLine)
                    .sort((a, b) => Number(b[1]) - Number(a[1])) // Sort by amount descending
                    .map(([serviceLine, amount]) => {
                      const percentage = (amount / totalAmount * 100).toFixed(1);
                      
                      return (
                        <div key={serviceLine} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{serviceLine}</span>
                            <span className="text-primary-700 font-semibold">${amount.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-primary-600 h-2.5 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-right">{percentage}% of total</div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data available for the selected period.
                </div>
              )}
            </div>

            {/* Top Customers */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Top Customers</h2>
              
              {Object.keys(invoicesByCustomer).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(invoicesByCustomer)
                    .sort((a, b) => Number(b[1]) - Number(a[1])) // Sort by amount descending
                    .slice(0, 5) // Top 5 customers
                    .map(([customer, amount]) => {
                      const percentage = (amount / totalAmount * 100).toFixed(1);
                      
                      return (
                        <div key={customer} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{customer}</span>
                            <span className="text-primary-700 font-semibold">${amount.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-success-600 h-2.5 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-right">{percentage}% of total</div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data available for the selected period.
                </div>
              )}
            </div>

            {/* Status Breakdown */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Invoice Status</h2>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Paid</span>
                    <span className="text-success-700 font-semibold">${paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-success-600 h-2.5 rounded-full" 
                      style={{ width: `${totalAmount ? (paidAmount / totalAmount * 100) : 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {totalAmount ? (paidAmount / totalAmount * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Outstanding</span>
                    <span className="text-warning-700 font-semibold">${outstandingAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-warning-600 h-2.5 rounded-full" 
                      style={{ width: `${totalAmount ? (outstandingAmount / totalAmount * 100) : 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {totalAmount ? (outstandingAmount / totalAmount * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Void</span>
                    <span className="text-error-700 font-semibold">${voidAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-error-600 h-2.5 rounded-full" 
                      style={{ width: `${totalAmount ? (voidAmount / totalAmount * 100) : 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {totalAmount ? (voidAmount / totalAmount * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceReports;