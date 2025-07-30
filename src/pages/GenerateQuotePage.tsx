import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import GenerateQuote from "../components/GenerateQuote";

const GenerateQuotePage = () => {
  const navigate = useNavigate();

  // Example data for manual quote
  const manualQuoteData = {
    customerName: "John Doe",
    customerEmail: "john.doe@example.com",
    locationName: "Downtown Office Building",
    locationAddress: "123 Main Street",
    locationCity: "Austin",
    locationState: "TX",
    locationZip: "78701",
    unitNumber: "Suite 101",
  };

  const handleQuoteSent = (quoteData: any) => {
    console.log("Quote sent successfully:", quoteData);
    // You could show a success message or navigate to a confirmation page
  };

  const handlePreviewQuote = (
    quoteType: "replacement" | "repair" | "inspection"
  ) => {
    console.log(
      `Preview ${quoteType} quote - PDF will be generated and opened in new window`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline btn-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <FileText className="h-6 w-6 mr-2 text-primary-600" />
              Generate Inspection Quote
            </h1>
            <p className="text-gray-600 mt-1">
              Create and send quotes for inspection services
            </p>
          </div>
        </div>
      </div>

      {/* Manual Quote Example */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Manual Quote Example</h2>
          <p className="text-gray-600 text-sm">
            This example shows how to generate a quote without a specific job
            context. You can provide customer and location information directly.
          </p>
        </div>

        <GenerateQuote
          customerName={manualQuoteData.customerName}
          customerEmail={manualQuoteData.customerEmail}
          locationName={manualQuoteData.locationName}
          locationAddress={manualQuoteData.locationAddress}
          locationCity={manualQuoteData.locationCity}
          locationState={manualQuoteData.locationState}
          locationZip={manualQuoteData.locationZip}
          unitNumber={manualQuoteData.unitNumber}
          onQuoteSent={handleQuoteSent}
          onPreviewQuote={handlePreviewQuote}
          title="Manual Inspection Quote"
        />
      </div>

      {/* Job-Based Quote Example */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">
            Job-Based Quote Example
          </h2>
          <p className="text-gray-600 text-sm">
            This example shows how to generate a quote using an existing job's
            data. Replace the jobId with an actual job ID to see it in action.
          </p>
        </div>

        <GenerateQuote
          jobId="" // Replace with actual job ID to test
          onQuoteSent={handleQuoteSent}
          onPreviewQuote={handlePreviewQuote}
          title="Job-Based Quote"
        />
      </div>

      {/* Usage Instructions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Usage Instructions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              For Manual Quotes:
            </h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {`<GenerateQuote
  customerName="John Doe"
  customerEmail="john@example.com"
  locationName="Office Building"
  locationAddress="123 Main St"
  locationCity="Austin"
  locationState="TX"
  locationZip="78701"
  unitNumber="Suite 101"
  onQuoteSent={handleQuoteSent}
  onPreviewQuote={handlePreviewQuote}
/>`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              For Job-Based Quotes:
            </h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {`<GenerateQuote
  jobId="job-uuid-here"
  onQuoteSent={handleQuoteSent}
  onPreviewQuote={handlePreviewQuote}
/>`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Available Props:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>
                <code>jobId</code> - Optional job ID to use existing job data
              </li>
              <li>
                <code>customerName</code> - Customer name for manual quotes
              </li>
              <li>
                <code>customerEmail</code> - Customer email for manual quotes
              </li>
              <li>
                <code>locationName</code> - Location name for manual quotes
              </li>
              <li>
                <code>locationAddress</code> - Location address for manual
                quotes
              </li>
              <li>
                <code>locationCity</code> - Location city for manual quotes
              </li>
              <li>
                <code>locationState</code> - Location state for manual quotes
              </li>
              <li>
                <code>locationZip</code> - Location zip for manual quotes
              </li>
              <li>
                <code>unitNumber</code> - Unit number for manual quotes
              </li>
              <li>
                <code>onQuoteSent</code> - Callback when quote is sent
              </li>
              <li>
                <code>onPreviewQuote</code> - Callback for quote preview
              </li>
              <li>
                <code>title</code> - Custom title for the component
              </li>
              <li>
                <code>className</code> - Additional CSS classes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuotePage;
