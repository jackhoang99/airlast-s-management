import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  CheckSquare,
  AlertTriangle,
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Clipboard,
  Home,
  Package,
  FileText,
  Wrench,
  Plus,
  Edit,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  Navigation,
  DollarSign,
  FileInput,
  Users,
  User,
} from "lucide-react";
import InspectionSection from "../../components/jobs/InspectionSection";
import ServiceSection from "../../components/jobs/ServiceSection";
import JobQuoteSection from "../../components/jobs/JobQuoteSection";
import JobInvoiceSection from "../../components/jobs/JobInvoiceSection";
import TechnicianNavigation from "../components/navigation/TechnicianNavigation";
import JobTimeTracking from "../../components/jobs/JobTimeTracking";
import JobComments from "../../components/jobs/JobComments";
import ClockInOut from "../components/jobs/ClockInOut";
import JobUnitSection from "../../components/jobs/JobUnitSection";
import PermitSectionMobile from "../../components/permits/PermitSectionMobile";
import MaintenanceChecklist from "../../components/jobs/MaintenanceChecklist";

const TechnicianJobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobAssets, setJobAssets] = useState<any[]>([]);
  const [jobItems, setJobItems] = useState<any[]>([]);
  const [inspectionData, setInspectionData] = useState<any[]>([]);
  const [repairData, setRepairData] = useState<any | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianName, setTechnicianName] = useState("");
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [showCompleteJobModal, setShowCompleteJobModal] = useState(false);
  const [jobStatus, setJobStatus] = useState<
    "scheduled" | "unscheduled" | "completed" | "cancelled"
  >("scheduled");
  const [currentClockStatus, setCurrentClockStatus] = useState<
    "clocked_out" | "clocked_in" | "on_break"
  >("clocked_out");
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [quoteNeedsUpdate, setQuoteNeedsUpdate] = useState(false);
  const [lastQuoteUpdateTime, setLastQuoteUpdateTime] = useState<string | null>(
    null
  );
  const [additionalContacts, setAdditionalContacts] = useState<any[]>([]);

  // Collapsible section states
  const [showServiceSection, setShowServiceSection] = useState(false);
  const [showQuoteSection, setShowQuoteSection] = useState(false);
  const [showInvoiceSection, setShowInvoiceSection] = useState(false);
  const [showInspectionSection, setShowInspectionSection] = useState(true);
  const [showMaintenanceChecklist, setShowMaintenanceChecklist] =
    useState(true);
  const [isMaintenanceChecklistComplete, setIsMaintenanceChecklistComplete] =
    useState(false);

  // Get technician ID directly from auth
  useEffect(() => {
    const fetchAuthUser = async () => {
      if (!supabase) return;

      try {
        // Get the authenticated user from Supabase session
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Error getting authenticated user:", authError);
          setError("Authentication error");
          return;
        }

        if (!user) {
          console.error("No authenticated user found");
          setError("No authenticated user");
          return;
        }

        // Use the auth user ID directly - this is the ID that should be used for clock events
        setTechnicianId(user.id);
        console.log("Using authenticated user ID for clock events:", user.id);

        // Try to get display name from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("first_name, last_name, username")
          .eq("id", user.id)
          .maybeSingle();

        if (userError && !userError.message.includes("contains 0 rows")) {
          console.error("Error fetching user details:", userError);
          // Don't throw here, just use email as fallback
        }

        if (userData) {
          console.log("Found user details:", userData);
          setTechnicianName(
            `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
          );
          if (userData.username) {
            sessionStorage.setItem("techUsername", userData.username);
          }
        } else {
          // Fallback to using email as display name
          console.log("No user details found, using email as display name");
          setTechnicianName(user.email || "Unknown User");
        }
      } catch (err) {
        console.error("Error fetching technician info:", err);
        setError("Failed to load technician information");
      }
    };

    fetchAuthUser();
  }, [supabase]);

  // Fetch job details (admin-style)
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!supabase || !id) return;

      try {
        // Validate UUID
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id
          )
        ) {
          setError("Invalid job ID format");
          setIsLoading(false);
          return;
        }

        // Fetch job details with all associated units via job_units (admin logic)
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
              company_id,
              companies (
                name
              )
            ),
            job_units:job_units!inner (
              id,
              unit_id,
              units:unit_id (
                id,
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
                office
              )
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
          .eq("id", id)
          .limit(1)
          .maybeSingle();

        if (jobError) throw jobError;
        if (!jobData) {
          setError("Job not found");
          setIsLoading(false);
          return;
        }

        // Flatten jobUnits for inspection linkage
        const jobUnits = (jobData.job_units || []).map((ju: any) => ({
          id: ju.id,
          unit_id: ju.unit_id,
          unit_number: ju.units.unit_number,
          status: ju.units.status,
          primary_contact_type: ju.units.primary_contact_type,
          primary_contact_email: ju.units.primary_contact_email,
          primary_contact_phone: ju.units.primary_contact_phone,
          billing_entity: ju.units.billing_entity,
          billing_email: ju.units.billing_email,
          billing_city: ju.units.billing_city,
          billing_state: ju.units.billing_state,
          billing_zip: ju.units.billing_zip,
          office: ju.units.office,
        }));
        const units = (jobData.job_units || []).map((ju: any) => ju.units);
        setJob({ ...jobData, units, jobUnits });
        setJobStatus(jobData.status);

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
          .from("job_replacements")
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

        // Fetch inspection data
        const { data: inspectionData, error: inspectionError } = await supabase
          .from("job_inspections")
          .select("*")
          .eq("job_id", id)
          .order("created_at", { ascending: false });
        if (inspectionError) {
          console.error("Error fetching inspection data:", inspectionError);
        } else {
          setInspectionData(inspectionData || []);
        }

        // Fetch assets related to this job
        const { data: assetsData, error: assetsError } = await supabase
          .from("assets")
          .select("*")
          .eq("model->>job_id", id);
        if (assetsError) {
          console.error("Error fetching job assets:", assetsError);
        } else {
          setJobAssets(assetsData || []);
        }

        // Fetch additional contacts
        if (supabase && id) {
          supabase
            .from("job_contacts")
            .select("*")
            .eq("job_id", id)
            .then(({ data, error }) => {
              if (!error && data) setAdditionalContacts(data);
            });
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

  // Check current clock status - Only if technicianId is available
  useEffect(() => {
    if (supabase && technicianId) {
      const fetchClockStatus = async () => {
        const { data: clockData, error: clockError } = await supabase
          .from("job_clock_events")
          .select("*")
          .eq("job_id", id)
          .eq("user_id", technicianId)
          .order("event_time", { ascending: true });

        if (clockError) {
          console.error("Error fetching clock events:", clockError);
          // Don't throw here, just log the error
        } else if (clockData && clockData.length > 0) {
          // Determine current clock status from the last event
          const lastEvent = clockData[clockData.length - 1];
          if (lastEvent.event_type === "clock_in") {
            setCurrentClockStatus("clocked_in");
          } else if (lastEvent.event_type === "break_start") {
            setCurrentClockStatus("on_break");
          } else {
            setCurrentClockStatus("clocked_out");
          }
        }
      };
      fetchClockStatus();
    }
  }, [supabase, id, technicianId]);

  const handleCompleteJob = async () => {
    if (!supabase || !id || !technicianId) return;

    setIsCompletingJob(true);

    try {
      // First check if the technician is clocked in
      if (currentClockStatus === "clocked_in") {
        // Clock out automatically
        await supabase.from("job_clock_events").insert({
          job_id: id,
          user_id: technicianId,
          event_type: "clock_out",
          event_time: new Date().toISOString(),
          notes: "Auto clock-out on job completion",
        });
      }

      // Update job status to completed
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      setJobStatus("completed");
      setShowCompleteJobModal(false);
      setCurrentClockStatus("clocked_out");
    } catch (err) {
      console.error("Error completing job:", err);
      setError("Failed to complete job. Please try again.");
    } finally {
      setIsCompletingJob(false);
    }
  };

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

  const handleQuoteSent = (updatedJob: any) => {
    setJob(updatedJob);
    setLastQuoteUpdateTime(updatedJob.quote_sent_at || null);
    setQuoteNeedsUpdate(false);
  };

  const handleInvoiceCreated = (invoiceId: string) => {
    // Refresh the page to show the new invoice
    window.location.reload();
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "unscheduled":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type?.toLowerCase()) {
      case "maintenance":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "service call":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "repair":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "installation":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "inspection":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const [timeTrackingRefreshKey, setTimeTrackingRefreshKey] = useState(0);

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
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error Loading Job
        </h3>
        <p className="text-gray-500 mb-4">
          {error || "Failed to load job details"}
        </p>
        <Link to="/tech/jobs" className="btn btn-primary">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Job Header */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <div className="flex items-center mb-4">
          <Link
            to="/tech/jobs"
            className="text-gray-500 hover:text-gray-700 mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Job #{job.number}</h1>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge ${getStatusBadgeClass(job.status)}`}>
            {job.status}
          </span>
          <span className={`badge ${getTypeBadgeClass(job.type)}`}>
            {job.type}
            {job.type === "maintenance" && job.additional_type && (
              <span className="ml-1">• {job.additional_type}</span>
            )}
          </span>
          {job.service_line && (
            <span className="badge bg-blue-100 text-blue-800">
              {job.service_line}
            </span>
          )}
          {job.is_training && (
            <span className="badge bg-purple-100 text-purple-800">
              training
            </span>
          )}
          {job.quote_confirmed && job.repair_approved && (
            <span className="badge bg-success-100 text-success-800">
              Repair Approved
            </span>
          )}
          {job.quote_confirmed && job.repair_approved === false && (
            <span className="badge bg-error-100 text-error-800">
              Repair Declined
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold">{job.name}</h2>
        {job.description && (
          <p className="text-gray-600 mt-2">{job.description}</p>
        )}
        {job.problem_description && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-800">
              Problem Description
            </h3>
            <p className="text-yellow-700">{job.problem_description}</p>
          </div>
        )}
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="text-sm text-gray-500">
            <div className="flex items-center gap-1 mb-1">
              <Calendar size={14} />
              <span>Start: {job.time_period_start}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>Due: {job.time_period_due}</span>
            </div>
            {job.schedule_start && (
              <div className="flex items-center gap-1 mt-1">
                <Clock size={14} />
                <span>Scheduled: {formatDateTime(job.schedule_start)}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full sm:flex-row sm:w-auto mt-4 sm:mt-0">
            {jobStatus !== "completed" && jobStatus !== "cancelled" && (
              <button
                onClick={() => setShowCompleteJobModal(true)}
                disabled={
                  job?.type === "maintenance" &&
                  (job?.additional_type === "PM Cleaning AC" ||
                    job?.additional_type === "ONE Cleaning AC" ||
                    job?.additional_type === "PM Cleaning HEAT" ||
                    job?.additional_type === "ONE Cleaning HEAT" ||
                    job?.additional_type === "PM Filter Change" ||
                    job?.additional_type === "ONE Filter Change") &&
                  !isMaintenanceChecklistComplete
                }
                className={`btn w-full sm:w-auto ${
                  job?.type === "maintenance" &&
                  (job?.additional_type === "PM Cleaning AC" ||
                    job?.additional_type === "ONE Cleaning AC" ||
                    job?.additional_type === "PM Cleaning HEAT" ||
                    job?.additional_type === "ONE Cleaning HEAT" ||
                    job?.additional_type === "PM Filter Change" ||
                    job?.additional_type === "ONE Filter Change") &&
                  !isMaintenanceChecklistComplete
                    ? "btn-secondary cursor-not-allowed"
                    : "btn-success"
                }`}
                title={
                  job?.type === "maintenance" &&
                  (job?.additional_type === "PM Cleaning AC" ||
                    job?.additional_type === "ONE Cleaning AC" ||
                    job?.additional_type === "PM Cleaning HEAT" ||
                    job?.additional_type === "ONE Cleaning HEAT" ||
                    job?.additional_type === "PM Filter Change" ||
                    job?.additional_type === "ONE Filter Change") &&
                  !isMaintenanceChecklistComplete
                    ? "PM Checklist must be completed first"
                    : ""
                }
              >
                <CheckSquare size={16} className="mr-2" />
                Complete Job
              </button>
            )}
            <button
              onClick={() => setShowNavigationModal(true)}
              className="btn btn-primary w-full sm:w-auto"
            >
              <Navigation size={16} className="mr-2" />
              Navigate
            </button>
          </div>
        </div>
      </div>
      <hr className="my-2 border-gray-200" />
      {/* Location and Contact */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-primary-600" />
          Location & Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h3 className="text-md font-medium mb-2">Location</h3>
            {job.locations ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Home className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium">
                      {job.locations?.companies?.name}
                    </p>
                    <p>{job.locations.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p>{job.locations.address}</p>
                    <p>
                      {job.locations.city}, {job.locations.state}{" "}
                      {job.locations.zip}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No location assigned</p>
            )}
          </div>
          <div>
            <h3 className="text-md font-medium mb-2">Contact</h3>
            {job.contact_name ? (
              <div className="space-y-2">
                <p className="font-medium">{job.contact_name}</p>
                {job.contact_type && (
                  <p className="text-sm text-gray-500 capitalize">
                    {job.contact_type} Contact
                  </p>
                )}
                {job.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    <a
                      href={`tel:${job.contact_phone}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {job.contact_phone}
                    </a>
                  </div>
                )}
                {job.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <a
                      href={`mailto:${job.contact_email}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {job.contact_email}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No contact information</p>
            )}
          </div>
        </div>
        {additionalContacts.length > 0 && (
          <div className="mt-4">
            <h3 className="text-md font-medium mb-2">Additional Contacts</h3>
            <div className="space-y-2">
              {additionalContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm break-words"
                >
                  <User size={16} className="text-gray-400" />
                  <span className="font-medium">
                    {`${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "(No name)"}
                  </span>
                  {contact.type && (
                    <span className="text-gray-500">({contact.type})</span>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-primary-600 hover:text-primary-800 flex items-center gap-1 break-all"
                    >
                      <Phone size={14} />
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary-600 hover:text-primary-800 flex items-center gap-1 break-all"
                    >
                      <Mail size={14} />
                      {contact.email}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Assigned Technicians */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-md font-medium mb-3 flex items-center">
            <Users size={16} className="mr-2 text-primary-600" />
            Assigned Technicians
          </h3>
          {job.job_technicians && job.job_technicians.length > 0 ? (
            <div className="space-y-4">
              {job.job_technicians.map((tech) => (
                <div
                  key={tech.id}
                  className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {tech.users.first_name?.[0] || "?"}
                      {tech.users.last_name?.[0] || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium flex items-center">
                      {tech.users.first_name} {tech.users.last_name}
                      {tech.is_primary && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                      {tech.technician_id === technicianId && (
                        <span className="ml-2 text-xs bg-success-100 text-success-700 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 mt-1">
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        {tech.users.phone ? (
                          <a
                            href={`tel:${tech.users.phone}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {tech.users.phone}
                          </a>
                        ) : (
                          "No phone"
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={14} />
                        {tech.users.email ? (
                          <a
                            href={`mailto:${tech.users.email}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {tech.users.email}
                          </a>
                        ) : (
                          ""
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No technicians assigned</p>
          )}
        </div>
      </div>
      <hr className="my-2 border-gray-200" />
      {/* Unit Information Section */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <JobUnitSection job={job} />
      </div>
      <hr className="my-2 border-gray-200" />
      {/* Permits Section */}
      <PermitSectionMobile
        locationId={job?.location_id || ""}
        companyId={job?.locations?.company_id || ""}
        title="Location Permits"
      />
      <hr className="my-2 border-gray-200" />
      {/* Clock In/Out Section */}
      {technicianId && (
        <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
          <ClockInOut
            jobId={id || ""}
            technicianId={technicianId}
            currentClockStatus={currentClockStatus}
            jobStatus={jobStatus}
            onStatusChange={setCurrentClockStatus}
            onTimeEvent={() => setTimeTrackingRefreshKey((k) => k + 1)}
          />
        </div>
      )}
      <hr className="my-2 border-gray-200" />
      {/* Maintenance Checklist Section */}
      {job?.type === "maintenance" &&
        (job?.additional_type === "PM Cleaning AC" ||
          job?.additional_type === "ONE Cleaning AC" ||
          job?.additional_type === "PM Cleaning HEAT" ||
          job?.additional_type === "ONE Cleaning HEAT" ||
          job?.additional_type === "PM Filter Change" ||
          job?.additional_type === "ONE Filter Change") && (
          <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setShowMaintenanceChecklist(!showMaintenanceChecklist)
                }
                className="w-full flex justify-between items-center p-3 bg-orange-50 hover:bg-orange-100 transition-colors"
              >
                <h3 className="text-md font-medium flex items-center">
                  <CheckSquare size={16} className="mr-2 text-orange-500" />
                  PM Checklist
                </h3>
                {showMaintenanceChecklist ? (
                  <ChevronUp className="h-5 w-5 text-orange-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-orange-500" />
                )}
              </button>
              {showMaintenanceChecklist && (
                <div className="p-3">
                  <div className="text-sm text-gray-500 mb-2">
                    <p>Complete maintenance tasks and record readings</p>
                  </div>
                  <MaintenanceChecklist
                    jobId={id || ""}
                    jobType={job?.type || ""}
                    additionalType={job?.additional_type || null}
                    jobUnits={job.job_units?.map((ju: any) => ({
                      id: ju.id,
                      unit_number: ju.units?.unit_number || ju.unit_id,
                    }))}
                    onChecklistUpdated={() => {
                      // Refresh checklist data if needed
                    }}
                    onCompletionChange={setIsMaintenanceChecklistComplete}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      {/* Inspection Details Section */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowInspectionSection(!showInspectionSection)}
            className="w-full flex justify-between items-center p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <h3 className="text-md font-medium flex items-center">
              <Clipboard size={16} className="mr-2 text-blue-500" />
              Inspection Records
            </h3>
            {showInspectionSection ? (
              <ChevronUp className="h-5 w-5 text-blue-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-blue-500" />
            )}
          </button>
          {showInspectionSection && (
            <div className="p-3">
              <div className="text-sm text-gray-500 mb-2">
                <p>Manage inspection details</p>
              </div>
              <InspectionSection
                jobId={id || ""}
                inspectionData={inspectionData}
                onInspectionUpdated={() => {
                  // Refresh inspection data
                  if (supabase && id) {
                    supabase
                      .from("job_inspections")
                      .select("*")
                      .eq("job_id", id)
                      .order("created_at", { ascending: false })
                      .then(({ data }) => {
                        if (data) setInspectionData(data);
                      });
                  }
                }}
                jobUnits={job.job_units?.map((ju: any) => ({
                  id: ju.id,
                  unit_id: ju.unit_id,
                  unit_number: ju.units?.unit_number || ju.unit_id,
                }))}
              />
            </div>
          )}
        </div>
      </div>
      {/* Service Section */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowServiceSection(!showServiceSection)}
            className="w-full flex justify-between items-center p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <h3 className="text-md font-medium flex items-center">
              <Wrench size={16} className="mr-2 text-blue-500" />
              Service Details
            </h3>
            {showServiceSection ? (
              <ChevronUp className="h-5 w-5 text-blue-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-blue-500" />
            )}
          </button>
          {showServiceSection && (
            <div className="p-3">
              <div className="text-sm text-gray-500 mb-2">
                <p>Tap on sections below to expand service details</p>
              </div>
              <ServiceSection
                jobId={id || ""}
                jobItems={jobItems}
                onItemsUpdated={handleItemsUpdated}
                onQuoteStatusChange={() =>
                  job?.quote_sent && setQuoteNeedsUpdate(true)
                }
              />
            </div>
          )}
        </div>
      </div>
      {/* Quote Section */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowQuoteSection(!showQuoteSection)}
            className="w-full flex justify-between items-center p-3 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <h3 className="text-md font-medium flex items-center">
              <FileText size={16} className="mr-2 text-green-500" />
              Quote Details
            </h3>
            {showQuoteSection ? (
              <ChevronUp className="h-5 w-5 text-green-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-green-500" />
            )}
          </button>
          {showQuoteSection && (
            <div className="p-3">
              <div className="text-sm text-gray-500 mb-2">
                <p>Manage and send quotes to customers</p>
              </div>
              <JobQuoteSection
                job={job}
                jobItems={jobItems}
                onQuoteSent={handleQuoteSent}
                onPreviewQuote={() => {}}
                quoteNeedsUpdate={quoteNeedsUpdate}
              />
            </div>
          )}
        </div>
      </div>
      {/* Invoice Section */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowInvoiceSection(!showInvoiceSection)}
            className="w-full flex justify-between items-center p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <h3 className="text-md font-medium flex items-center">
              <FileInput size={16} className="mr-2 text-purple-500" />
              Invoice Details
            </h3>
            {showInvoiceSection ? (
              <ChevronUp className="h-5 w-5 text-purple-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-purple-500" />
            )}
          </button>
          {showInvoiceSection && (
            <div className="p-3">
              <div className="text-sm text-gray-500 mb-2">
                <p>Create and manage invoices</p>
              </div>
              <JobInvoiceSection
                job={job}
                jobItems={jobItems}
                onInvoiceCreated={handleInvoiceCreated}
              />
            </div>
          )}
        </div>
      </div>
      <hr className="my-2 border-gray-200" />
      {/* Time Tracking */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <JobTimeTracking jobId={id || ""} key={timeTrackingRefreshKey} />
      </div>
      {/* Comments */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <JobComments jobId={id || ""} />
      </div>
      {/* Complete Job Modal */}
      {showCompleteJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <CheckSquare size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Complete Job
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to mark Job #{job.number} as completed? This
              will update the job status and notify the office.
            </p>
            {job?.type === "maintenance" &&
              (job?.additional_type === "PM Cleaning AC" ||
                job?.additional_type === "ONE Cleaning AC" ||
                job?.additional_type === "PM Cleaning HEAT" ||
                job?.additional_type === "ONE Cleaning HEAT" ||
                job?.additional_type === "PM Filter Change" ||
                job?.additional_type === "ONE Filter Change") &&
              !isMaintenanceChecklistComplete && (
                <div className="bg-warning-50 border border-warning-200 rounded-md p-3 mb-6">
                  <p className="text-warning-700 text-sm text-center">
                    ⚠️ PM Checklist is not complete. Please ensure all
                    maintenance tasks are completed before marking this job as
                    complete.
                  </p>
                </div>
              )}
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
      {/* Navigation Modal */}
      {showNavigationModal && job.locations && (
        <TechnicianNavigation
          isOpen={showNavigationModal}
          onClose={() => setShowNavigationModal(false)}
          location={{
            address: job.locations.address,
            city: job.locations.city,
            state: job.locations.state,
            zip: job.locations.zip,
            name: job.locations.name,
          }}
          job={job}
          startNavigation={true}
        />
      )}
    </div>
  );
};

export default TechnicianJobDetails;
