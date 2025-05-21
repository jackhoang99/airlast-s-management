import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { CheckCircle, AlertTriangle, FileText, ArrowLeft, Download } from 'lucide-react';
import QuotePDFTemplate from '../components/quotes/QuotePDFTemplate';

const QuoteConfirmation = () => {
  const { token } = useParams<{ token: string }>();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [jobItems, setJobItems] = useState<any[]>([]);

  useEffect(() => {
    const confirmQuote = async () => {
      if (!supabase || !token) {
        setError('Invalid confirmation link');
        setIsLoading(false);
        return;
      }

      try {
        // Find the job with this token
        const { data: jobData, error: jobError } = await supabase
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
          .eq('quote_token', token)
          .single();

        if (jobError) {
          throw new Error('Invalid or expired confirmation link');
        }

        if (!jobData) {
          throw new Error('Quote not found');
        }

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', jobData.id)
          .order('created_at');

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // If already confirmed, just show success
        if (jobData.quote_confirmed) {
          setJobDetails(jobData);
          setSuccess(true);
          setIsLoading(false);
          return;
        }

        // Update the job to mark quote as confirmed
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            quote_confirmed: true,
            quote_confirmed_at: new Date().toISOString()
          })
          .eq('id', jobData.id);

        if (updateError) throw updateError;

        setJobDetails(jobData);
        setSuccess(true);
      } catch (err) {
        console.error('Error confirming quote:', err);
        setError(err instanceof Error ? err.message : 'Failed to confirm quote');
      } finally {
        setIsLoading(false);
      }
    };

    confirmQuote();
  }, [supabase, token]);

  // Calculate total cost
  const calculateTotalCost = () => {
    if (!jobItems) return 0;
    return jobItems.reduce((total: number, item: any) => total + Number(item.total_cost), 0);
  };

  const generatePDF = () => {
    if (!jobDetails) return;
    
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
          <title>Quote #${jobDetails.number} - ${jobDetails.name}</title>
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
                <p>Job #: ${jobDetails.number}<br>
                Date: ${new Date().toLocaleDateString()}<br>
                Valid Until: ${new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</p>
              </div>
            </div>

            <div class="section">
              <h3>Customer Information</h3>
              <div style="display: flex; justify-content: space-between;">
                <div style="width: 48%;">
                  <p><strong>Bill To:</strong><br>
                  ${jobDetails.locations?.companies.name}<br>
                  ${jobDetails.locations?.address}<br>
                  ${jobDetails.locations?.city}, ${jobDetails.locations?.state} ${jobDetails.locations?.zip}</p>
                </div>
                <div style="width: 48%;">
                  <p><strong>Contact:</strong><br>
                  ${jobDetails.contact_name || 'N/A'}<br>
                  ${jobDetails.contact_phone || 'N/A'}<br>
                  ${jobDetails.contact_email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Service Location</h3>
              <p>
                ${jobDetails.locations?.name}<br>
                ${jobDetails.locations?.address}<br>
                ${jobDetails.locations?.city}, ${jobDetails.locations?.state} ${jobDetails.locations?.zip}
                ${jobDetails.units ? `<br>Unit: ${jobDetails.units.unit_number}` : ''}
              </p>
            </div>

            <div class="section">
              <h3>Service Details</h3>
              <p><strong>Service Type:</strong> ${jobDetails.type}</p>
              <p><strong>Service Line:</strong> ${jobDetails.service_line || 'N/A'}</p>
              <p><strong>Description:</strong> ${jobDetails.description || 'N/A'}</p>
              ${jobDetails.problem_description ? `<p><strong>Problem Description:</strong> ${jobDetails.problem_description}</p>` : ''}
              ${jobDetails.schedule_date ? `<p><strong>Scheduled Date:</strong> ${jobDetails.schedule_date}</p>` : ''}
              ${jobDetails.schedule_time ? `<p><strong>Scheduled Time:</strong> ${jobDetails.schedule_time}</p>` : ''}
            </div>

            <div class="section">
              <h3>Technicians</h3>
              ${jobDetails.job_technicians && jobDetails.job_technicians.length > 0 
                ? `<ul>${jobDetails.job_technicians.map(tech => 
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
                  ${jobItems?.map((item) => `
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
                    <td class="text-right"><strong>$${calculateTotalCost().toFixed(2)}</strong></td>
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
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Processing your quote confirmation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-error-100 rounded-full p-3">
              <AlertTriangle className="h-12 w-12 text-error-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">Quote Confirmation Failed</h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="flex justify-center">
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success && jobDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-success-100 rounded-full p-3">
              <CheckCircle className="h-12 w-12 text-success-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">Quote Confirmed</h1>
          <p className="text-gray-600 text-center mb-6">
            Thank you for confirming your quote. We'll be in touch shortly to schedule your service.
          </p>
          
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              Quote Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Job Information</h3>
                <p className="text-gray-600">{jobDetails.name}</p>
                <p className="text-gray-600">{jobDetails.description}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-gray-600">{jobDetails.locations?.companies?.name}</p>
                <p className="text-gray-600">{jobDetails.locations?.name}</p>
                <p className="text-gray-600">
                  {jobDetails.locations?.address}, {jobDetails.locations?.city}, {jobDetails.locations?.state} {jobDetails.locations?.zip}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Items</h3>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {jobItems?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">{item.name}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">${Number(item.total_cost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td className="px-4 py-2" colSpan={2}>Total</td>
                        <td className="px-4 py-2 text-right">${calculateTotalCost().toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={generatePDF}
              className="btn btn-secondary"
            >
              <Download size={16} className="mr-2" />
              Download Quote
            </button>
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuoteConfirmation;