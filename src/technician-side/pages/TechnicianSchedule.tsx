import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import TechnicianScheduleMobile from "../components/schedule/TechnicianScheduleMobile";
import TechnicianJobDetailSheet from "../components/jobs/TechnicianJobDetailSheet";

const TechnicianSchedule = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showJobSheet, setShowJobSheet] = useState(false);

  // Fetch all technicians
  useEffect(() => {
    const fetchTechs = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, first_name, last_name")
          .eq("role", "technician")
          .eq("status", "active")
          .order("first_name");
        if (error) throw error;
        setTechnicians(data || []);
      } catch (err) {
        setError("Failed to load technicians");
      }
    };
    fetchTechs();
  }, [supabase]);

  // Fetch all jobs for the selected day
  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        const start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
        const { data, error } = await supabase
          .from("jobs")
          .select(
            `*,
              job_technicians:job_technicians!inner (
                technician_id, is_primary, users:technician_id (first_name, last_name)
              ),
              locations (name, zip),
              job_units:job_units!inner (
                unit_id,
                units:unit_id (id, unit_number)
              )
            `
          )
          .or(
            `and(schedule_start.gte.${start.toISOString()},schedule_start.lte.${end.toISOString()}),schedule_start.is.null`
          )
          .order("schedule_start");
        if (error) throw error;
        // Flatten units
        const jobsWithUnits = (data || []).map((job: any) => ({
          ...job,
          units: (job.job_units || []).map((ju: any) => ju.units),
        }));
        setJobs(jobsWithUnits);
      } catch (err) {
        setError("Failed to load jobs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, [supabase, currentDate]);

  // Handler for drag-and-drop reschedule
  const handleJobScheduleUpdate = async (
    jobId: string,
    technicianId: string,
    newTime: string
  ) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      // Update job schedule
      await supabase
        .from("jobs")
        .update({ schedule_start: newTime })
        .eq("id", jobId);
      // Update technician assignment if needed
      const job = jobs.find((j) => j.id === jobId);
      if (
        job &&
        !job.job_technicians.some(
          (jt: any) => jt.technician_id === technicianId
        )
      ) {
        // Remove old tech, add new
        await supabase.from("job_technicians").delete().eq("job_id", jobId);
        await supabase.from("job_technicians").insert({
          job_id: jobId,
          technician_id: technicianId,
          is_primary: true,
        });
      }
      // Refresh jobs
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, schedule_start: newTime } : j
        )
      );
    } catch (err) {
      setError("Failed to update job schedule");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for drag-and-drop reassign
  const handleJobReassign = async (
    jobId: string,
    fromTechId: string,
    toTechId: string
  ) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      await supabase
        .from("job_technicians")
        .delete()
        .eq("job_id", jobId)
        .eq("technician_id", fromTechId);
      await supabase
        .from("job_technicians")
        .insert({ job_id: jobId, technician_id: toTechId, is_primary: true });
      // Refresh jobs
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                job_technicians: [
                  {
                    technician_id: toTechId,
                    is_primary: true,
                    users: { first_name: "", last_name: "" },
                  },
                ],
              }
            : j
        )
      );
    } catch (err) {
      setError("Failed to reassign job");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for job click (show details)
  const handleJobClick = (job: any) => {
    setSelectedJob(job);
    setShowJobSheet(true);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <p className="text-sm text-error-700">{error}</p>
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <TechnicianScheduleMobile
          technicians={technicians}
          jobs={jobs}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onJobScheduleUpdate={handleJobScheduleUpdate}
          onJobReassign={handleJobReassign}
          onJobClick={handleJobClick}
        />
      )}
      {/* Job Detail Sheet */}
      {showJobSheet && selectedJob && (
        <TechnicianJobDetailSheet
          job={selectedJob}
          isNavigating={false}
          estimatedTime={null}
          estimatedDistance={null}
          arrivalTime={null}
          directionsSteps={[]}
          currentStepIndex={0}
          showDirections={false}
          setShowDirections={() => {}}
          prevStep={() => {}}
          nextStep={() => {}}
          onClose={() => setShowJobSheet(false)}
          onRecalculate={() => {}}
          onReschedule={() => {}}
          onReassign={() => {}}
        />
      )}
    </div>
  );
};

export default TechnicianSchedule;
