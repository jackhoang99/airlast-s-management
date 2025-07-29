import { Edit, CheckCircle, Trash2 } from "lucide-react";
import ArrowBack from "../ui/ArrowBack";
import { useSupabase } from "../../lib/supabase-context";
import { useState, useEffect } from "react";

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
        <button onClick={onDeleteJob} className="btn btn-error">
          <Trash2 size={16} className="mr-2" />
          Delete Job
        </button>
      </div>
    </div>
  );
};

export default JobHeader;
