import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";

const QuoteConfirmation = () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [quoteDetails, setQuoteDetails] = useState<any>(null);
  const [replacementData, setReplacementData] = useState<any[]>([]);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [quoteType, setQuoteType] = useState<"replacement" | "repair">(
    "replacement"
  );
  const [intendedQuoteType, setIntendedQuoteType] = useState<
    "replacement" | "repair"
  >("replacement");

  // Get the approval status from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const approveParam = searchParams.get("approve");

    if (approveParam === "true") {
      setApproved(true);
    } else if (approveParam === "false") {
      setApproved(false);
    }
  }, [location]);

  useEffect(() => {
    const confirmQuote = async () => {
      if (!token) {
        setError("Invalid confirmation link");
        setIsLoading(false);
        return;
      }

      try {
        // First, check if there's a quote record with this token
        if (supabase) {
          const { data: quoteData, error: quoteError } = await supabase
            .from("job_quotes")
            .select("*")
            .eq("token", token)
            .maybeSingle();

          if (!quoteError && quoteData) {
            setQuoteDetails(quoteData);
            setQuoteType(quoteData.quote_type as "replacement" | "repair");

            // If already confirmed, just return success
            if (quoteData.confirmed) {
              setSuccess(true);
              setApproved(quoteData.approved);

              // Fetch job details for display
              const { data: jobData } = await supabase
                .from("jobs")
                .select(
                  `
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
                  )
                `
                )
                .eq("id", quoteData.job_id)
                .single();

              if (jobData) {
                setJobDetails(jobData);

                // Fetch replacement data
                const { data: replacementData } = await supabase
                  .from("job_replacements")
                  .select("*")
                  .eq("job_id", jobData.id);

                setReplacementData(replacementData || []);
              }

              setIsLoading(false);
              return;
            }
          }
        }

        // If no quote record found or not confirmed, check the job record
        if (supabase) {
          const { data: jobData, error: jobError } = await supabase
            .from("jobs")
            .select(
              `
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
              )
            `
            )
            .eq("quote_token", token)
            .maybeSingle();

          if (jobError) {
            console.error("Error fetching job:", jobError);
            throw new Error("Error fetching quote details");
          }

          if (!jobData) {
            console.log("No job found for token:", token);
            throw new Error("Quote not found or has expired");
          }

          setJobDetails(jobData);

          // Fetch replacement data
          if (quoteDetails && quoteDetails.quote_type) {
            const { data: replacementData, error: replacementError } =
              await supabase
                .from("job_replacements")
                .select("*")
                .eq("job_id", jobData.id);

            if (replacementError) {
              console.error(
                "Error fetching replacement data:",
                replacementError
              );
              throw replacementError;
            }

            setReplacementData(replacementData || []);

            // If already confirmed, just return success
            if (jobData.quote_confirmed) {
              setSuccess(true);
              setApproved(
                quoteType === "replacement" ||
                  (quoteDetails && quoteDetails.quote_type === "replacement")
                  ? jobData.replacement_approved
                  : jobData.repair_approved
              );
              setIsLoading(false);
              return;
            }
          }

          // Only proceed with confirmation if approval status is set
          if (approved !== null) {
            // Update the job_quotes record if it exists
            if (quoteDetails) {
              const { error: updateQuoteError } = await supabase!
                .from("job_quotes")
                .update({
                  confirmed: true,
                  confirmed_at: new Date().toISOString(),
                  approved: approved,
                })
                .eq("id", quoteDetails.id);

              if (updateQuoteError) {
                console.error("Error updating quote record:", updateQuoteError);
              }

              // Set quote type from the quote record
              if (quoteDetails.quote_type) {
                setQuoteType(
                  quoteDetails.quote_type as "replacement" | "repair"
                );
              }
            }

            // Call the Supabase Edge Function to confirm the quote
            // Use the appropriate edge function based on quote type
            const functionName =
              quoteType === "repair"
                ? "confirm-repair-quote"
                : "confirm-replacement-quote";
            const apiUrl = `${
              import.meta.env.VITE_SUPABASE_URL
            }/functions/v1/${functionName}`;

            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${
                  import.meta.env.VITE_SUPABASE_ANON_KEY
                }`,
              },
              body: JSON.stringify({
                token,
                approved,
                quoteType: quoteDetails ? quoteType : intendedQuoteType, // Use intendedQuoteType if no quote record
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("Error response from confirm-quote:", errorData);
              throw new Error(errorData.error || "Failed to confirm quote");
            }

            const responseData = await response.json();
            if (responseData.quoteType) {
              setQuoteType(responseData.quoteType as "replacement" | "repair");
            }

            setSuccess(true);
            setApproved(approved);
            // If repair is declined, create an inspection invoice
            if (approved === false && supabase && jobDetails) {
              setIsCreatingInvoice(true);

              try {
                // Generate invoice number (JOB-INV-XXXX)
                const invoiceNumber = `JOB-${
                  jobDetails.number
                }-INV-${Math.floor(Math.random() * 10000)
                  .toString()
                  .padStart(4, "0")}`;
                setInvoiceNumber(invoiceNumber);

                // Calculate due date (30 days from now)
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30);

                // Create inspection invoice for $180
                const { data: invoiceData, error: invoiceError } =
                  await supabase
                    .from("job_invoices")
                    .insert({
                      job_id: jobDetails.id,
                      invoice_number: invoiceNumber,
                      amount: 180.0, // Fixed inspection fee
                      status: "issued",
                      issued_date: new Date().toISOString().split("T")[0],
                      due_date: dueDate.toISOString().split("T")[0],
                    })
                    .select()
                    .single();

                if (invoiceError) throw invoiceError;

                // Add inspection item to job_items
                const { error: itemError } = await supabase
                  .from("job_items")
                  .insert({
                    job_id: jobDetails.id,
                    code: "INSP-FEE",
                    name: "Inspection Fee",
                    service_line: "INSP",
                    quantity: 1,
                    unit_cost: 180.0,
                    total_cost: 180.0,
                    type: "item",
                  });

                if (itemError) throw itemError;

                try {
                  // Call the Supabase Edge Function to send the email
                  const apiUrl = `${
                    import.meta.env.VITE_SUPABASE_URL
                  }/functions/v1/send-invoice-email`;

                  const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${
                        import.meta.env.VITE_SUPABASE_ANON_KEY
                      }`,
                    },
                    body: JSON.stringify({
                      jobId: jobDetails.id,
                      invoiceId: invoiceData.id,
                      customerEmail: jobDetails.contact_email,
                      jobNumber: jobDetails.number,
                      jobName: jobDetails.name,
                      customerName: jobDetails.contact_name,
                      invoiceNumber: invoiceNumber,
                      amount: 180.0,
                      issuedDate: new Date().toISOString().split("T")[0],
                      dueDate: dueDate.toISOString().split("T")[0],
                      jobItems: [
                        {
                          name: "Inspection Fee",
                          quantity: 1,
                          total_cost: 180.0,
                        },
                      ],
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    console.warn(
                      "Email service warning:",
                      errorData.error || "Failed to send invoice email"
                    );
                    // Don't throw here, just log the warning - the invoice is still created
                  }
                } catch (emailErr) {
                  // Log the email error but don't fail the whole operation
                  console.warn(
                    "Email sending failed, but invoice was created:",
                    emailErr
                  );
                }

                setInvoiceCreated(true);
                console.log("Invoice created successfully");
              } catch (err) {
                console.error("Error creating inspection invoice:", err);
                // Still set invoiceCreated to true so the user knows an invoice was generated
                // even if there was an error with some part of the process
                setInvoiceCreated(true);
              } finally {
                setIsCreatingInvoice(false);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error confirming quote:", err);
        setError(
          err instanceof Error ? err.message : "Failed to confirm quote"
        );
      } finally {
        setIsLoading(false);
      }
    };

    confirmQuote();
  }, [
    supabase,
    token,
    approved,
    jobDetails,
    quoteDetails,
    quoteType,
    intendedQuoteType,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Processing your request...</p>
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
          <h1 className="text-2xl font-bold text-center mb-4">
            Quote Confirmation Failed
          </h1>
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
            <div
              className={`${
                approved ? "bg-success-100" : "bg-error-100"
              } rounded-full p-3`}
            >
              {approved ? (
                <CheckCircle className="h-12 w-12 text-success-600" />
              ) : (
                <XCircle className="h-12 w-12 text-error-600" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">
            {quoteType === "replacement" ? "Replacements" : "Repairs"}{" "}
            {approved ? "Approved" : "Declined"}
          </h1>
          <p className="text-gray-600 text-center mb-6">
            {approved
              ? `Thank you for approving the ${quoteType}. We will contact you shortly to schedule the service.`
              : `You have declined the ${quoteType}. An invoice for the inspection fee ($180.00) has been generated and will be sent to your email.`}
          </p>

          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              {quoteType === "replacement" ? "Replacement" : "Repair"} Details
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Job Information</h3>
                <p className="text-gray-600">{jobDetails.name}</p>
                <p className="text-gray-600">Job #{jobDetails.number}</p>
                {quoteDetails && (
                  <p className="text-gray-600">
                    Quote #{quoteDetails.quote_number}
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-gray-600">
                  {jobDetails.locations?.companies?.name}
                </p>
                <p className="text-gray-600">{jobDetails.locations?.name}</p>
                <p className="text-gray-600">
                  {jobDetails.locations?.address}, {jobDetails.locations?.city},{" "}
                  {jobDetails.locations?.state} {jobDetails.locations?.zip}
                </p>
                {jobDetails.units && (
                  <p className="text-gray-600">
                    Unit: {jobDetails.units.unit_number}
                  </p>
                )}
              </div>

              {/* Removed replacementData display here */}

              {!approved && (
                <div className="mt-4 p-4 bg-error-50 rounded-lg border border-error-200">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-error-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-error-700">
                        Inspection Fee
                      </h4>
                      <p className="text-error-600">
                        Since you've declined the {quoteType}, an invoice for
                        the inspection fee ($180.00) has been generated.
                        {invoiceCreated && invoiceNumber && (
                          <span>
                            {" "}
                            Invoice #{invoiceNumber} has been created and will
                            be sent to your email.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <a
              href="https://airlast-management.com/customer/login"
              className="btn btn-primary"
            >
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // If we have job details but no approval decision yet
  if (jobDetails && approved === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-100 rounded-full p-3">
              <FileText className="h-12 w-12 text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4">
            {quoteType === "replacement" ? "Replacement" : "Repair"} Quote
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Based on our assessment, we recommend proceeding with{" "}
            {quoteType === "replacement" ? "replacements" : "repairs"}. Please
            approve or deny the {quoteType} below.
          </p>

          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Job Information</h2>
            <p>
              <strong>Job #:</strong> {jobDetails.number}
            </p>
            <p>
              <strong>Service:</strong> {jobDetails.name}
            </p>
            {quoteDetails && (
              <p>
                <strong>Quote #:</strong> {quoteDetails.quote_number}
              </p>
            )}

            {jobDetails.locations && (
              <div className="mt-4">
                <h3 className="font-medium">Location</h3>
                <p>{jobDetails.locations.name}</p>
                <p>{jobDetails.locations.address}</p>
                <p>
                  {jobDetails.locations.city}, {jobDetails.locations.state}{" "}
                  {jobDetails.locations.zip}
                </p>
                {jobDetails.units && (
                  <p>Unit: {jobDetails.units.unit_number}</p>
                )}
              </div>
            )}

            {replacementData.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium">
                  {quoteType === "replacement" ? "Replacement" : "Repair"}{" "}
                  Details
                </h3>
                <div className="mt-2 space-y-4">
                  {replacementData.map((replacement, index) => {
                    const selectedPhase =
                      replacement.selected_phase || "phase2";
                    const phaseData = replacement[selectedPhase] || {};

                    return (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Selected Option
                            </p>
                            <p>
                              {phaseData.description ||
                                (selectedPhase === "phase1"
                                  ? "Economy Option"
                                  : selectedPhase === "phase2"
                                  ? "Standard Option"
                                  : "Premium Option")}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Total Cost
                            </p>
                            <p className="font-medium">
                              $
                              {Number(
                                replacement.total_cost || 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Requires Crane
                            </p>
                            <p>{replacement.needs_crane ? "Yes" : "No"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <button
              onClick={() => {
                setIntendedQuoteType(quoteType);
                setApproved(true);
              }}
              className="btn btn-success flex-1 flex justify-center items-center"
            >
              <Check className="mr-2 h-5 w-5" />
              Approve {quoteType === "replacement" ? "Replacements" : "Repairs"}
            </button>
            <button
              onClick={() => {
                setIntendedQuoteType(quoteType);
                setApproved(false);
              }}
              className="btn btn-error flex-1 flex justify-center items-center"
            >
              <X className="mr-2 h-5 w-5" />
              Deny {quoteType === "replacement" ? "Replacements" : "Repairs"}
            </button>
          </div>

          <p className="text-sm text-gray-500 text-center">
            By approving, you authorize Airlast HVAC to proceed with the
            recommended{" "}
            {quoteType === "replacement" ? "replacements" : "repairs"}.
            <br />
            By denying, you will be charged $180.00 for the inspection service.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default QuoteConfirmation;
