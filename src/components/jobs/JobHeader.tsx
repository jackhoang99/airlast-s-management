import { Edit, CheckCircle, Trash2, Calendar } from "lucide-react";
import ArrowBack from "../ui/ArrowBack";
import { useSupabase } from "../../lib/supabase-context";
import { useState, useEffect } from "react";
import GoogleCalendarModal from "./GoogleCalendarModal";

type JobHeaderProps = {
  job: any;
  onCompleteJob: () => void;
  onDeleteJob: () => void;
  onEditJob: () => void;
  isMaintenanceChecklistComplete: boolean;
};

const JobHeader = ({
  job,
  onCompleteJob,
  onDeleteJob,
  onEditJob,
  isMaintenanceChecklistComplete,
}: JobHeaderProps) => {
  const { supabase } = useSupabase();
  const [isTechnician, setIsTechnician] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);

  // Check if current user is a technician
  useEffect(() => {
    const checkUserRole = async () => {
      if (!supabase) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from("users")
            .select("role")
            .eq("email", user.email)
            .maybeSingle();

          if (!error && userData) {
            setIsTechnician(userData.role === "technician");
          }
        }
      } catch (err) {
        console.error("Error checking user role:", err);
      } finally {
        setIsLoadingRole(false);
      }
    };

    checkUserRole();
  }, [supabase]);

  // Determine if checklist is required based on user role and job type
  const isChecklistRequired = () => {
    if (isLoadingRole) return false; // Don't block while loading
    if (!isTechnician) return false; // Only technicians need to complete checklist

    return (
      job.type === "maintenance" &&
      (job.additional_type === "PM Cleaning AC" ||
        job.additional_type === "ONE Cleaning AC" ||
        job.additional_type === "PM Cleaning HEAT" ||
        job.additional_type === "ONE Cleaning HEAT" ||
        job.additional_type === "PM Filter Change" ||
        job.additional_type === "ONE Filter Change")
    );
  };

  const checklistRequired = isChecklistRequired();

  // Prepare job data for Google Calendar
  const getJobDataForCalendar = () => {
    const address = job.locations?.address
      ? `${job.locations.address}, ${job.locations.city}, ${job.locations.state} ${job.locations.zip}`
      : job.service_address || "Address not available";

    const unitInfo =
      job.units && job.units.length > 0
        ? job.units.map((unit: any) => unit.unit_number).join(", ")
        : "N/A";

    return {
      address,
      jobType: job.type,
      description: job.description || "",
      problemDescription: job.problem_description || "",
      startDate:
        job.time_period_start || new Date().toISOString().split("T")[0],
      dueDate: job.time_period_due || new Date().toISOString().split("T")[0],
      contactName: job.contact_name || "",
      contactPhone: job.contact_phone || "",
      contactEmail: job.contact_email || "",
      unitInfo,
      companyName: job.locations?.companies?.name || "",
      locationName: job.locations?.name || "",
    };
  };

  // Get assigned technicians for calendar
  const getSelectedTechnicians = () => {
    if (!job.job_technicians || job.job_technicians.length === 0) return [];

    return job.job_technicians.map((jt: any) => ({
      id: jt.technician_id,
      name: `${jt.users?.first_name || ""} ${jt.users?.last_name || ""}`.trim(),
      email: jt.users?.email || "",
      scheduledTime: jt.scheduled_at
        ? new Date(jt.scheduled_at).toTimeString().slice(0, 5)
        : undefined,
    }));
  };

  const handleGoogleCalendarConfirm = () => {
    setShowGoogleCalendarModal(false);
    // Optionally refresh job data or show success message
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <ArrowBack
          fallbackRoute="/jobs"
          className="text-gray-500 hover:text-gray-700"
        />
        <h1>Job #{job.number}</h1>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setShowGoogleCalendarModal(true)}
          className="btn btn-secondary"
          title="Send to Google Calendar"
        >
          <Calendar size={16} className="mr-2" />
          Google Calendar
        </button>
        <button onClick={onEditJob} className="btn btn-secondary">
          <Edit size={16} className="mr-2" />
          Edit Job
        </button>
        {job.status !== "completed" && job.status !== "cancelled" && (
          <button
            onClick={onCompleteJob}
            disabled={checklistRequired && !isMaintenanceChecklistComplete}
            className={`btn ${
              checklistRequired && !isMaintenanceChecklistComplete
                ? "btn-secondary cursor-not-allowed"
                : "btn-success"
            }`}
            title={
              checklistRequired && !isMaintenanceChecklistComplete
                ? "PM Checklist must be completed first (Technician requirement)"
                : ""
            }
          >
            <CheckCircle size={16} className="mr-2" />
            Complete Job
          </button>
        )}
        <button
          onClick={onDeleteJob}
          className="btn btn-error"
          title="Delete Job"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Google Calendar Modal */}
      <GoogleCalendarModal
        isOpen={showGoogleCalendarModal}
        onClose={() => setShowGoogleCalendarModal(false)}
        onConfirm={handleGoogleCalendarConfirm}
        jobData={getJobDataForCalendar()}
        selectedTechnicians={getSelectedTechnicians()}
      />
    </div>
  );
};

export default JobHeader;
