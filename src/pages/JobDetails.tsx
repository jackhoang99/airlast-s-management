import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Job, JobItem } from "../types/job";
import JobHeader from "../components/jobs/JobHeader";
import JobDetailsCard from "../components/jobs/JobDetailsCard";
import JobLocationContact from "../components/jobs/JobLocationContact";
import JobTechnicians from "../components/jobs/JobTechnicians";
import ServiceSection from "../components/jobs/ServiceSection";
import JobQuoteSection from "../components/jobs/JobQuoteSection";
import JobInvoiceSection from "../components/jobs/JobInvoiceSection";
import JobSidebar from "../components/jobs/JobSidebar";
import JobUnitSection from "../components/jobs/JobUnitSection";
import AppointmentModal from "../components/jobs/AppointmentModal";
import QuotePDFViewer from "../components/quotes/QuotePDFViewer";

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCompleteJobModal, setShowCompleteJobModal] = useState(false);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [showDeleteJobModal, setShowDeleteJobModal] = useState(false);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [showQuotePDF, setShowQuotePDF] = useState(false);
  const [quoteNeedsUpdate, setQuoteNeedsUpdate] = useState(false);
  const [lastQuoteUpdateTime, setLastQuoteUpdateTime] = useState<string | null>(null);
  const [activeQuoteType, setActiveQuoteType] = useState<'repair' | 'replacement'>('repair');
  const [repairData, setRepairData] = useState<any | null>(null);
  
  // Collapsible section states - all set to true (expanded) by default
  const [showServiceSection, setShowServiceSection] = useState(true);
  const [showQuoteSection, setShowQuoteSection] = useState(true);
  const [showInvoiceSection, setShowInvoiceSection] = useState(true);
  const [showLocationSection, setShowLocationSection] = useState(true);
  const [showUnitSection, setShowUnitSection] = useState(true);

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!supabase || !id) return;

      try {
        // First validate that we have a valid UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          setError("Invalid job ID format");
          setIsLoading(false);
          return;
        }

        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              zip,
              building_name,
              company_id,
              companies (
                name
              )
            ),
            units (
              unit_number,
              status,
              primary_contact_type,
              primary_contact_email,
              primary_contact_phone,
              billing_entity,
              billing_email,
              billing_city,
              billing_state,
              billing_zip,
              office,
              taxable,
              tax_group_name,
              tax_group_code
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
          .eq("id", id)
          .limit(1)
          .maybeSingle();

        if (jobError) throw jobError;

        if (!jobData) {
          setError("Job not found");
          setIsLoading(false);
          return;
        }

        setJob(jobData);

        // If the job has a quote sent, store the timestamp for comparison
        if (jobData.quote_sent && jobData.quote_sent_at) {
          setLastQuoteUpdateTime(jobData.quote_sent_at);
        }

        // Fetch job items
        const { data: itemsData, error: itemsError } = await supabase
          .from("job_items")
          .select("*")
          .eq("job_id", id)
          .order("created_at");

        if (itemsError) throw itemsError;
        setJobItems(itemsData || []);

        // Check if any items were updated after the quote was sent
        if (jobData.quote_sent && jobData.quote_sent_at) {
          const quoteTime = new Date(jobData.quote_sent_at).getTime();
          const needsUpdate = itemsData?.some((item) => {
            const itemTime = new Date(item.created_at).getTime();
            return itemTime > quoteTime;
          });

          setQuoteNeedsUpdate(needsUpdate || false);
        }

        // Fetch repair data
        const { data: repairData, error: repairError } = await supabase
          .from("job_repairs")
          .select("*")
          .eq("job_id", id)
          .limit(1)
          .maybeSingle();

        if (repairError && !repairError.message.includes("contains 0 rows")) {
          throw repairError;
        }
        
        if (repairData) {
          setRepairData(repairData);
        }
      } catch (err: any) {
        console.error("Error fetching job details:", err);
        setError(err.message || "Failed to fetch job details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobDetails();
  }, [supabase, id]);

  const handleItemsUpdated = async () => {
    if (!supabase || !id) return;

    try {
      // Refresh job items
      const { data, error } = await supabase
        .from("job_items")
        .select("*")
        .eq("job_id", id)
        .order("created_at");

      if (error) throw error;
      setJobItems(data || []);

      // Check if any items were updated after the quote was sent
      if (job?.quote_sent && lastQuoteUpdateTime) {
        const quoteTime = new Date(lastQuoteUpdateTime).getTime();
        const needsUpdate = data?.some((item) => {
          const itemTime = new Date(item.created_at).getTime();
          return itemTime > quoteTime;
        });

        setQuoteNeedsUpdate(needsUpdate || false);
      }
    } catch (err) {
      console.error("Error refreshing job items:", err);
    }
  };

  const handleScheduleAppointment = async (appointment: {
    technicianIds: string[];
  }) => {
    if (!supabase || !job) return;

    try {
      // First, remove any existing technicians
      const { error: deleteError } = await supabase
        .from("job_technicians")
        .delete()
        .eq("job_id", job.id);

      if (deleteError) throw deleteError;

      // Then add the new technicians
      const technicianEntries = appointment.technicianIds.map(
        (techId, index) => ({
          job_id: job.id,
          technician_id: techId,
          is_primary: index === 0, // First technician is primary
        })
      );

      const { error: insertError } = await supabase
        .from("job_technicians")
        .insert(technicianEntries);

      if (insertError) throw insertError;

      // Refresh job data
      const { data: updatedJob, error: jobError } = await supabase
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
            building_name,
            company_id,
            companies (
              name
            )
          ),
          units (
            unit_number,
            status,
            primary_contact_type,
            primary_contact_email,
            primary_contact_phone,
            billing_entity,
            billing_email,
            billing_city,
            billing_state,
            billing_zip,
            office,
            taxable,
            tax_group_name,
            tax_group_code
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
        `
        )
        .eq("id", job.id)
        .limit(1)
        .maybeSingle();

      if (jobError) throw jobError;
      
      if (!updatedJob) {
        throw new Error("Failed to refresh job data");
      }
      
      setJob(updatedJob);
      setShowAppointmentModal(false);
    } catch (err) {
      console.error("Error updating technicians:", err);
      setError("Failed to update technicians");
    }
  };

  const handleCompleteJob = async () => {
    if (!supabase || !job) return;

    setIsCompletingJob(true);
    setError(null);

    try {
      // Update job status to completed
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (updateError) throw updateError;

      // Update local state
      setJob((prev) => (prev ? { ...prev, status: "completed" } : null));

      setShowCompleteJobModal(false);
    } catch (err) {
      console.error("Error completing job:", err);
      setError("Failed to complete job. Please try again.");
    } finally {
      setIsCompletingJob(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!supabase || !job) return;

    setIsDeletingJob(true);
    setError(null);

    try {
      // Delete job
      const { error: deleteError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", job.id);

      if (deleteError) throw deleteError;

      navigate("/jobs");
    } catch (err) {
      console.error("Error deleting job:", err);
      setError("Failed to delete job. Please try again.");
    } finally {
      setIsDeletingJob(false);
    }
  };

  const handleQuoteSent = (updatedJob: Job) => {
    setJob(updatedJob);
    setLastQuoteUpdateTime(updatedJob.quote_sent_at || null);
    setQuoteNeedsUpdate(false);
  };

  const handlePreviewQuote = (quoteType: 'repair' | 'replacement') => {
    setActiveQuoteType(quoteType);
    setShowQuotePDF(true);
  };

  const handleInvoiceCreated = (invoiceId: string) => {
    // Refresh the page to show the new invoice
    window.location.reload();
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
        <p className="text-error-600 mb-4">{error || "Job not found"}</p>
        <Link to="/jobs" className="text-primary-600 hover:text-primary-800">
          Back to Jobs
        </Link>
      </div>
    );
  }

  if (showQuotePDF) {
    return (
      <QuotePDFViewer 
        jobId={job.id}
        quoteType={activeQuoteType}
        onBack={() => setShowQuotePDF(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <JobHeader
        job={job}
        onCompleteJob={() => setShowCompleteJobModal(true)}
        onDeleteJob={() => setShowDeleteJobModal(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Job Details Card */}
          <JobDetailsCard job={job} />

          {/* Location and Contact - Collapsible */}
          <div className="card">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setShowLocationSection(!showLocationSection)}
            >
              <h2 className="text-lg font-medium">Location & Contact</h2>
              <span className="text-gray-500">
                {showLocationSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </div>
            
            {showLocationSection && (
              <div className="mt-4">
                <JobLocationContact job={job} />

                <hr className="my-4" />

                <JobTechnicians
                  job={job}
                  onAssignTechnicians={() => setShowAppointmentModal(true)}
                />
              </div>
            )}
          </div>

          {/* Unit Section - Collapsible */}
          <div className="card">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setShowUnitSection(!showUnitSection)}
            >
              <h2 className="text-lg font-medium">Unit Information</h2>
              <span className="text-gray-500">
                {showUnitSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </div>
            
            {showUnitSection && (
              <div className="mt-4">
                <JobUnitSection job={job} />
              </div>
            )}
          </div>

          {/* Service Section - Collapsible */}
          <div className="card">
            <div 
              className="flex justify-between items-center cursor-pointer p-2 hover:bg-gray-50 rounded-md"
              onClick={() => setShowServiceSection(!showServiceSection)}
            >
              <h2 className="text-lg font-medium">Service</h2>
              <span className="text-primary-600 bg-primary-50 px-3 py-1 rounded-full text-sm flex items-center">
                {showServiceSection ? (
                  <>Hide <ChevronUp size={16} className="ml-1" /></>
                ) : (
                  <>Show <ChevronDown size={16} className="ml-1" /></>
                )}
              </span>
            </div>
            
            {showServiceSection && (
              <div className="mt-4">
                <ServiceSection
                  jobId={job.id}
                  jobItems={jobItems}
                  onItemsUpdated={handleItemsUpdated}
                  onQuoteStatusChange={() =>
                    job.quote_sent && setQuoteNeedsUpdate(true)
                  }
                />
              </div>
            )}
          </div>

          {/* Quote Section - Collapsible */}
          <div className="card">
            <div 
              className="flex justify-between items-center cursor-pointer p-2 hover:bg-gray-50 rounded-md"
              onClick={() => setShowQuoteSection(!showQuoteSection)}
            >
              <h2 className="text-lg font-medium">Quote</h2>
              <span className="text-primary-600 bg-primary-50 px-3 py-1 rounded-full text-sm flex items-center">
                {showQuoteSection ? (
                  <>Hide <ChevronUp size={16} className="ml-1" /></>
                ) : (
                  <>Show <ChevronDown size={16} className="ml-1" /></>
                )}
              </span>
            </div>
            
            {showQuoteSection && (
              <div className="mt-4">
                <JobQuoteSection
                  job={job}
                  jobItems={jobItems}
                  onQuoteSent={handleQuoteSent}
                  onPreviewQuote={handlePreviewQuote}
                  quoteNeedsUpdate={quoteNeedsUpdate}
                />
              </div>
            )}
          </div>

          {/* Invoice Section - Collapsible */}
          <div className="card">
            <div 
              className="flex justify-between items-center cursor-pointer p-2 hover:bg-gray-50 rounded-md"
              onClick={() => setShowInvoiceSection(!showInvoiceSection)}
            >
              <h2 className="text-lg font-medium">Invoice</h2>
              <span className="text-primary-600 bg-primary-50 px-3 py-1 rounded-full text-sm flex items-center">
                {showInvoiceSection ? (
                  <>Hide <ChevronUp size={16} className="ml-1" /></>
                ) : (
                  <>Show <ChevronDown size={16} className="ml-1" /></>
                )}
              </span>
            </div>
            
            {showInvoiceSection && (
              <div className="mt-4">
                <JobInvoiceSection
                  job={job}
                  jobItems={jobItems}
                  onInvoiceCreated={handleInvoiceCreated}
                />
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block">
          <JobSidebar job={job} />
        </div>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSave={handleScheduleAppointment}
        selectedTechnicianIds={
          job.job_technicians?.map((jt) => jt.technician_id) || []
        }
      />

      {/* Complete Job Confirmation Modal */}
      {showCompleteJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Complete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to mark Job #{job.number} as completed? This
              will update the job status and notify relevant parties.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCompleteJobModal(false)}
                disabled={isCompletingJob}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleCompleteJob}
                disabled={isCompletingJob}
              >
                {isCompletingJob ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Completing...
                  </>
                ) : (
                  "Complete Job"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Job Confirmation Modal */}
      {showDeleteJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete Job #{job.number}? This action
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteJobModal(false)}
                disabled={isDeletingJob}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteJob}
                disabled={isDeletingJob}
              >
                {isDeletingJob ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Deleting...
                  </>
                ) : (
                  "Delete Job"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;