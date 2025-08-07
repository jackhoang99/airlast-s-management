import { useState, useEffect, useRef } from "react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import JobQueue from "../components/dispatch/JobQueue";
import TechnicianSchedule from "../components/dispatch/TechnicianSchedule";
import DispatchFilters from "../components/dispatch/DispatchFilters";
import JobTypeLegend from "../components/dispatch/JobTypeLegend";
import DispatchMap from "../components/dispatch/DispatchMap";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import QuickAssetViewModal from "../components/locations/QuickAssetViewModal";
import JobDetailsModal from "../components/jobs/JobDetailsModal";
import { Link } from "react-router-dom";

type User = Database["public"]["Tables"]["users"]["Row"];

type Job = Database["public"]["Tables"]["jobs"]["Row"] & {
  additional_type?: string;
  locations?: {
    id?: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
    companies?: {
      id?: string;
      name: string;
    };
  };
  units?: {
    id?: string;
    unit_number: string;
    status?: string;
  }[];
  job_technicians?: {
    technician_id: string;
    is_primary: boolean;
    scheduled_at?: string | null; // Single timestamp field
    users: {
      first_name: string;
      last_name: string;
    };
  }[];
};

const DispatchSchedule = () => {
  const { supabase } = useSupabase();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<{
    type: "column" | "technician";
    id: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragModeActive, setDragModeActive] = useState(false);
  const [selectedJobToDrag, setSelectedJobToDrag] = useState<string | null>(
    null
  );

  // Filter states
  const [sortBy, setSortBy] = useState<"job_type" | "zip_code" | "date">(
    "job_type"
  );
  const [filterJobType, setFilterJobType] = useState<string>("all");
  const [filterZipCode, setFilterZipCode] = useState<string>("");

  const [directionsSteps, setDirectionsSteps] = useState<
    google.maps.DirectionsStep[]
  >([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<string | null>(null);
  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Job modal state
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<Job | null>(
    null
  );
  const [isDraggingEnabled, setIsDraggingEnabled] = useState<string | null>(
    null
  );

  // Parse jobId from URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get("jobId");
    if (jobId) {
      setSelectedJobId(jobId);
    }
  }, []);

  // Function to check if a job is past dates
  const isJobPastDue = (job: Job): boolean => {
    const now = new Date();

    // Check if any technician has a scheduled time that's in the past
    if (job.job_technicians && job.job_technicians.length > 0) {
      for (const tech of job.job_technicians) {
        if (tech.scheduled_at) {
          const scheduledDateTime = new Date(tech.scheduled_at);
          if (scheduledDateTime < now) {
            return true;
          }
        }
      }
    }

    // Check if job has a due date and it's past due
    if (job.time_period_due) {
      const dueDate = new Date(job.time_period_due);
      if (dueDate < now) {
        return true;
      }
    }

    return false;
  };

  // Function to get past dates jobs count
  const getPastDueJobsCount = (): number => {
    return jobs.filter(
      (job) =>
        job.status !== "completed" &&
        job.status !== "cancelled" &&
        isJobPastDue(job)
    ).length;
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;

      try {
        // Fetch technicians
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", "technician")
          .eq("status", "active")
          .order("first_name");

        if (error) throw error;
        setTechnicians(data || []);

        // Fetch jobs
        await fetchJobs();
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, filterJobType, filterZipCode, sortBy]);

  // Fetch jobs from Supabase, but do not filter/sort here
  const fetchJobs = async () => {
    if (!supabase) return;
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select(
          `
          *,
          locations (
            id,
            name,
            address,
            city,
            state,
            zip,
            company_id,
            companies (
              id,
              name
            )
          ),
          job_units:job_units!inner (
            unit_id,
            units:unit_id (
              id,
              unit_number
            )
          ),
          job_technicians (
            technician_id,
            is_primary,
            scheduled_at,
            users:technician_id (
              first_name,
              last_name
            )
          )
        `
        )
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      // Process jobs to add geocoded locations and flatten units
      const jobsWithCoordinates = await Promise.all(
        (jobsData || []).map(async (job) => {
          let locations = job.locations;
          if (locations) {
            const { lat, lng } = await geocodeAddress(
              `${locations.address}, ${locations.city}, ${locations.state} ${locations.zip}`
            );
            locations = {
              ...locations,
              lat,
              lng,
            };
          }
          // Flatten units from job_units
          const units = (job.job_units || []).map((ju: any) => ju.units);
          return {
            ...job,
            locations,
            units,
          };
        })
      );
      setJobs(jobsWithCoordinates);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  // Derived filtered/sorted jobs
  const filteredJobs = jobs.filter((job) => {
    // Job type filter
    if (filterJobType !== "all" && job.type !== filterJobType) return false;
    // Zip code filter
    if (filterZipCode && !job.locations?.zip?.includes(filterZipCode))
      return false;
    // Free-text search (job name, number, location, address, city, state, zip, technician)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const techNames = (job.job_technicians || [])
        .map(
          (jt) => `${jt.users?.first_name || ""} ${jt.users?.last_name || ""}`
        )
        .join(" ")
        .toLowerCase();
      if (
        !(
          job.name?.toLowerCase().includes(search) ||
          job.number?.toLowerCase().includes(search) ||
          job.locations?.name?.toLowerCase().includes(search) ||
          job.locations?.address?.toLowerCase().includes(search) ||
          job.locations?.city?.toLowerCase().includes(search) ||
          job.locations?.state?.toLowerCase().includes(search) ||
          job.locations?.zip?.toLowerCase().includes(search) ||
          techNames.includes(search)
        )
      ) {
        return false;
      }
    }
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "job_type":
        return (a.type || "").localeCompare(b.type || "");
      case "zip_code":
        return (a.locations?.zip || "").localeCompare(b.locations?.zip || "");
      case "date":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      default:
        return 0;
    }
  });

  // Compute jobsByDate for the calendar
  const jobsByDate: Record<string, number> = {};
  sortedJobs.forEach((job) => {
    // Get the earliest technician schedule date
    if (job.job_technicians && job.job_technicians.length > 0) {
      const scheduledDates = job.job_technicians
        .filter((tech) => tech.scheduled_at)
        .map((tech) => new Date(tech.scheduled_at!))
        .sort((a, b) => a.getTime() - b.getTime());

      if (scheduledDates.length > 0) {
        const key = scheduledDates[0].toISOString().slice(0, 10);
        jobsByDate[key] = (jobsByDate[key] || 0) + 1;
      }
    }
  });

  const geocodeAddress = async (
    address: string
  ): Promise<{ lat: number; lng: number }> => {
    // Mock geocoding function for demo
    const atlantaLat = 33.7489954;
    const atlantaLng = -84.3902397;
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;

    return {
      lat: atlantaLat + latOffset,
      lng: atlantaLng + lngOffset,
    };
  };

  const getJobTypeColor = (type: string): string => {
    switch (type?.toLowerCase()) {
      case "maintenance":
        return "#8b5cf6"; // purple
      case "service call":
        return "#06b6d4"; // cyan
      case "repair":
        return "#f59e0b"; // amber
      case "installation":
        return "#10b981"; // emerald
      case "inspection":
        return "#3b82f6"; // blue
      default:
        return "#6b7280"; // gray
    }
  };

  const getJobTypeColorClass = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      maintenance: "bg-purple-100 text-purple-800 border-purple-200",
      "service call": "bg-teal-100 text-teal-800 border-teal-200",
      inspection: "bg-blue-100 text-blue-800 border-blue-200",
      repair: "bg-orange-100 text-orange-800 border-orange-200",
      installation: "bg-green-100 text-green-800 border-green-200",
    };

    return (
      colorMap[type.toLowerCase()] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  // Handler for when a drag starts (from JobQueue or TechnicianSchedule)
  const handleJobDragStart = (job: any, from: { type: string; id: string }) => {
    setDragModeActive(true);
    setSelectedJobToDrag(job.id);
    setDraggedJob(job);
    setDraggedFrom(from);
    setIsDragging(true);
  };

  const handleJobDrop = async (
    e: React.DragEvent,
    to: { type: "column" | "technician"; id: string }
  ) => {
    e.preventDefault();

    if (!draggedJob || !draggedFrom || !supabase) {
      setIsDragging(false);
      return;
    }

    try {
      if (to.type === "technician") {
        console.log(`Assigning job ${draggedJob.id} to technician ${to.id}`);

        // Check if job already has technicians assigned
        const currentTechnicians = draggedJob.job_technicians || [];
        const fromTechId = draggedFrom.id;

        if (currentTechnicians.length > 0 && fromTechId !== to.id) {
          // Show confirmation modal for assignment type
          setPendingAssignment({
            job: draggedJob,
            fromTechId: fromTechId,
            toTechId: to.id,
          });
          setShowAssignmentModal(true);
        } else {
          // No existing technicians or same technician, just switch
          await handleJobAssignment(draggedJob, fromTechId, to.id, "switch");
        }
      } else if (to.type === "column") {
      } else if (to.type === "column") {
        // Handle dropping job back to unassigned columns
        if (to.id === "unassigned") {
          console.log(`Unassigning job ${draggedJob.id}`);

          // Remove all technician assignments
          const { error: deleteError } = await supabase
            .from("job_technicians")
            .delete()
            .eq("job_id", draggedJob.id);

          if (deleteError) {
            console.error("Error unassigning job:", deleteError);
            throw deleteError;
          }

          // Update job status to unscheduled
          const { error: updateError } = await supabase
            .from("jobs")
            .update({ status: "unscheduled" })
            .eq("id", draggedJob.id);

          if (updateError) {
            console.error("Error updating job status:", updateError);
            throw updateError;
          }

          console.log("Job unassignment successful");

          // Refresh the jobs data to reflect changes
          await fetchJobs();
          setDragModeActive(false); // Exit drag mode after drop
        }
      }
    } catch (err) {
      console.error("Error updating job assignment:", err);
      // Show error to user
      alert("Failed to update job assignment. Please try again.");
    } finally {
      setDraggedJob(null);
      setDraggedFrom(null);
      setIsDragging(false);
    }
  };

  // Handler to activate drag mode from JobQueue
  const handleActivateDragMode = () => {
    setDragModeActive(true);
    setSelectedJobToDrag(null);
  };

  // Handler for selecting a job to drag
  const handleSelectJobToDrag = (jobId: string) => {
    setSelectedJobToDrag(jobId);
  };

  // Handler to deactivate drag mode after drag ends
  const handleJobDragEnd = () => {
    setIsDraggingEnabled(null);
    setDragModeActive(false);
    setSelectedJobToDrag(null);
    setDraggedJob(null);
    setDraggedFrom(null);
    setIsDragging(false);
  };

  const handleJobScheduleUpdate = async (
    jobId: string,
    technicianId: string,
    newScheduleTime: string
  ) => {
    if (!supabase) return;

    try {
      console.log(
        `Updating job ${jobId} schedule: technician ${technicianId}, time ${newScheduleTime}`
      );

      // Get the current job to check if the technician is already assigned
      const currentJob = jobs.find((j) => j.id === jobId);
      const existingAssignment = currentJob?.job_technicians?.find(
        (tech) => tech.technician_id === technicianId
      );

      if (existingAssignment) {
        // Update existing technician assignment with new schedule
        console.log("Updating existing technician assignment");

        const { error: updateError } = await supabase
          .from("job_technicians")
          .update({
            scheduled_at: newScheduleTime,
          })
          .eq("job_id", jobId)
          .eq("technician_id", technicianId);

        if (updateError) {
          console.error("Error updating technician schedule:", updateError);
          throw updateError;
        }
      } else {
        // Add new technician assignment with schedule
        console.log("Adding new technician assignment");

        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: jobId,
            technician_id: technicianId,
            is_primary:
              !currentJob?.job_technicians ||
              currentJob.job_technicians.length === 0,
            scheduled_at: newScheduleTime,
          });

        if (insertError) {
          console.error("Error assigning technician:", insertError);
          throw insertError;
        }
      }

      // Update job status to scheduled
      const { error: jobUpdateError } = await supabase
        .from("jobs")
        .update({
          status: "scheduled",
        })
        .eq("id", jobId);

      if (jobUpdateError) {
        console.error("Error updating job status:", jobUpdateError);
        throw jobUpdateError;
      }

      console.log("Job schedule update successful");

      // Refresh the jobs data to reflect changes
      await fetchJobs();
    } catch (err) {
      console.error("Error updating job schedule:", err);
      alert("Failed to update job schedule. Please try again.");
    }
  };

  // Handle job reassignment between technicians
  const handleJobAssignment = async (
    job: Job,
    fromTechId: string,
    toTechId: string,
    action: "switch" | "share"
  ) => {
    if (!supabase) return;

    try {
      if (action === "switch") {
        // Remove existing technician assignments and assign to new technician
        const { error: deleteError } = await supabase
          .from("job_technicians")
          .delete()
          .eq("job_id", job.id);

        if (deleteError) {
          console.error("Error removing existing assignments:", deleteError);
          throw deleteError;
        }

        // Add new technician assignment
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: job.id,
            technician_id: toTechId,
            is_primary: true,
          });

        if (insertError) {
          console.error("Error assigning technician:", insertError);
          throw insertError;
        }
      } else if (action === "share") {
        // Add new technician to existing assignments
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: job.id,
            technician_id: toTechId,
            is_primary: false, // Keep existing primary technician
          });

        if (insertError) {
          console.error("Error adding technician:", insertError);
          throw insertError;
        }
      }

      // Update job status if needed
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ status: "scheduled" })
        .eq("id", job.id);

      if (updateError) {
        console.error("Error updating job status:", updateError);
        throw updateError;
      }

      console.log(`Job assignment successful: ${action}`);

      // Refresh the jobs data to reflect changes
      await fetchJobs();
      setDragModeActive(false); // Exit drag mode after assignment
    } catch (err) {
      console.error("Error updating job assignment:", err);
      alert("Failed to update job assignment. Please try again.");
    }
  };

  const handleJobReassign = async (
    jobId: string,
    fromTechId: string,
    toTechId: string,
    action: "switch" | "share"
  ) => {
    if (!supabase) return;

    try {
      console.log(
        `${
          action === "switch" ? "Switching" : "Sharing"
        } job ${jobId} from ${fromTechId} to ${toTechId}`
      );

      if (action === "switch") {
        // Remove existing technician assignments for this job
        const { error: deleteError } = await supabase
          .from("job_technicians")
          .delete()
          .eq("job_id", jobId);

        if (deleteError) {
          console.error("Error removing existing assignments:", deleteError);
          throw deleteError;
        }

        // Add new technician assignment
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: jobId,
            technician_id: toTechId,
            is_primary: true,
          });

        if (insertError) {
          console.error("Error assigning new technician:", insertError);
          throw insertError;
        }
      } else if (action === "share") {
        // Add the new technician while keeping the existing one
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: jobId,
            technician_id: toTechId,
            is_primary: false, // New technician is not primary
          });

        if (insertError) {
          console.error("Error sharing job with technician:", insertError);
          throw insertError;
        }
      }

      // Check if job has any technicians assigned and update status accordingly
      const { data: technicianCount, error: countError } = await supabase
        .from("job_technicians")
        .select("technician_id", { count: "exact", head: true })
        .eq("job_id", jobId);

      if (countError) {
        console.error("Error checking technician count:", countError);
        throw countError;
      }

      const hasTechnicians = (technicianCount || 0) > 0;
      const newStatus = hasTechnicians ? "scheduled" : "unscheduled";

      const { error: updateError } = await supabase
        .from("jobs")
        .update({ status: newStatus })
        .eq("id", jobId);

      if (updateError) {
        console.error("Error updating job status:", updateError);
        throw updateError;
      }

      console.log("Job reassignment successful");

      // Refresh the jobs data to reflect changes
      await fetchJobs();
    } catch (err) {
      console.error("Error reassigning job:", err);
      alert("Failed to reassign job. Please try again.");
    }
  };

  const handleAssignTechnicians = async (appointment: {
    technicianIds: string[];
  }) => {
    if (!supabase || !selectedJobForModal) return;

    try {
      console.log(
        `Assigning technicians to job ${selectedJobForModal.id}:`,
        appointment.technicianIds
      );

      // First, remove any existing technicians
      const { error: deleteError } = await supabase
        .from("job_technicians")
        .delete()
        .eq("job_id", selectedJobForModal.id);

      if (deleteError) throw deleteError;

      // Then add the new technicians
      const technicianEntries = appointment.technicianIds.map(
        (techId, index) => ({
          job_id: selectedJobForModal.id,
          technician_id: techId,
          is_primary: index === 0, // First technician is primary
        })
      );

      if (appointment.technicianIds.length > 0) {
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert(technicianEntries);

        if (insertError) throw insertError;
      }

      // Update job status based on whether technicians are assigned
      const newStatus =
        appointment.technicianIds.length > 0 ? "scheduled" : "unscheduled";
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ status: newStatus })
        .eq("id", selectedJobForModal.id);

      if (updateError) {
        console.error("Error updating job status:", updateError);
        throw updateError;
      }

      console.log("Technician assignment successful");

      // Refresh the jobs data to reflect changes
      await fetchJobs();

      // Update the selected job in the modal with the new technician data
      // We need to fetch the updated job data specifically for the modal
      const { data: updatedJobData, error: jobError } = await supabase
        .from("jobs")
        .select(
          `
          *,
          locations (
            id,
            name,
            address,
            city,
            state,
            zip,
            company_id,
            companies (
              id,
              name
            )
          ),
          job_units:job_units!inner (
            unit_id,
            units:unit_id (
              id,
              unit_number
            )
          ),
          job_technicians (
            technician_id,
            is_primary,
            users:technician_id (
              first_name,
              last_name
            )
          )
        `
        )
        .eq("id", selectedJobForModal.id)
        .single();

      if (!jobError && updatedJobData) {
        // Process the job data to match the expected format
        let locations = updatedJobData.locations;
        if (locations) {
          const { lat, lng } = await geocodeAddress(
            `${locations.address}, ${locations.city}, ${locations.state} ${locations.zip}`
          );
          locations = {
            ...locations,
            lat,
            lng,
          };
        }
        // Flatten units from job_units
        const units = (updatedJobData.job_units || []).map(
          (ju: any) => ju.units
        );
        const processedJob = {
          ...updatedJobData,
          locations,
          units,
        };
        setSelectedJobForModal(processedJob);
      }
    } catch (err) {
      console.error("Error assigning technicians:", err);
      alert("Failed to assign technicians. Please try again.");
    }
  };

  // Function to pan map to job location
  const panToJobLocation = (job: Job) => {
    if (!mapInstance || !job.locations) return;

    const address = `${job.locations.address || ""}${
      job.locations.city ? ", " + job.locations.city : ""
    }${job.locations.state ? ", " + job.locations.state : ""} ${
      job.locations.zip || ""
    }`.trim();

    if (!address) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        mapInstance.setCenter(results[0].geometry.location);
        mapInstance.setZoom(16);
      }
    });
  };

  // Function to handle single click on job card (pan to map)
  const handleJobCardClick = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJobId(jobId);
      panToJobLocation(job);
    }
  };

  // Function to handle double click on job card (show details)
  const handleJobCardDoubleClick = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      // If the job has technician schedules, move the calendar to the earliest date
      if (job.job_technicians && job.job_technicians.length > 0) {
        const scheduledDates = job.job_technicians
          .filter((tech) => tech.scheduled_at)
          .map((tech) => {
            // Use scheduled_at timestamp directly
            const scheduledDate = new Date(tech.scheduled_at!);
            return scheduledDate;
          })
          .sort((a, b) => a.getTime() - b.getTime());

        if (scheduledDates.length > 0) {
          const jobDate = scheduledDates[0];
          // Only change the date if it's different from the current calendar date
          if (
            jobDate.getFullYear() !== currentDate.getFullYear() ||
            jobDate.getMonth() !== currentDate.getMonth() ||
            jobDate.getDate() !== currentDate.getDate()
          ) {
            setCurrentDate(jobDate);
          }
        }
      }
      setSelectedJobId(jobId);
      setSelectedJobForModal(job);
      setShowJobModal(true);
    }
  };

  const handleJobClick = (jobId: string) => {
    // This is now the same as handleJobCardDoubleClick for backward compatibility
    handleJobCardDoubleClick(jobId);
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleDragToggle = (jobId: string) => {
    setIsDraggingEnabled(isDraggingEnabled === jobId ? null : jobId);
  };

  const scheduleRef = useRef<HTMLDivElement>(null);
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);

  // Scroll to and highlight a job in the schedule
  const handleViewOnSchedule = (jobId: string) => {
    setShowJobModal(false);
    setTimeout(() => {
      const el = document.querySelector(`[data-job-id='${jobId}']`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedJobId(jobId);
        setTimeout(() => setHighlightedJobId(null), 2000);
      }
    }, 200); // Wait for modal to close
  };

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetModalUnit, setAssetModalUnit] = useState<{
    id: string;
    unit_number: string;
  } | null>(null);
  const [assetModalLocation, setAssetModalLocation] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [assetModalUnits, setAssetModalUnits] = useState<any[] | null>(null);

  // Confirmation modal state for job assignment
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    job: Job;
    fromTechId: string;
    toTechId: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Drag Mode Banner */}
      {dragModeActive && (
        <div className="bg-blue-100 text-blue-800 text-center py-2 font-semibold">
          {selectedJobToDrag
            ? "Drag the job to a technician to reassign."
            : "Drag a job to reassign or reschedule."}
        </div>
      )}
      {/* Header with Filters */}
      <DispatchFilters
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterJobType={filterJobType}
        onJobTypeFilterChange={setFilterJobType}
        filterZipCode={filterZipCode}
        onZipCodeFilterChange={setFilterZipCode}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        dragModeActive={dragModeActive}
        onActivateDragMode={handleActivateDragMode}
        onCancelDragMode={handleJobDragEnd}
        jobsByDate={jobsByDate}
      />

      {/* Main Content - New Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Job Queue Columns */}
        <div className="w-80 flex-shrink-0">
          <JobQueue
            jobs={sortedJobs}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onJobDragStart={handleJobDragStart}
            onJobDragEnd={handleJobDragEnd}
            onJobClick={handleJobClick}
            onJobCardClick={handleJobCardClick}
            onJobCardDoubleClick={handleJobCardDoubleClick}
            selectedJobId={selectedJobId}
            getJobTypeColorClass={getJobTypeColorClass}
            onJobReassign={handleJobReassign}
            onActivateDragMode={handleActivateDragMode}
            dragModeActive={dragModeActive}
            selectedJobToDrag={selectedJobToDrag}
            onSelectJobToDrag={handleSelectJobToDrag}
            onAssignTechnicians={handleAssignTechnicians}
            onViewAssets={(location, units) => {
              setAssetModalUnit(null); // null means all units
              setAssetModalLocation(location);
              setAssetModalUnits(units);
              setShowAssetModal(true);
            }}
            isJobPastDue={isJobPastDue}
          />
        </div>

        {/* Right Side - Map on Top, Technician Schedule on Bottom */}
        <div className="flex-1 flex flex-col">
          {/* Top Half - Map */}
          <div className="flex-1 min-h-0 relative">
            <DispatchMap
              selectedCall={(() => {
                if (selectedJobId) {
                  const job = jobs.find((job) => job.id === selectedJobId);
                  if (job && job.locations) {
                    return {
                      address: job.locations.address || "Atlanta",
                      zip: job.locations.zip || "",
                      city: job.locations.city || "",
                      state: job.locations.state || "",
                      company:
                        job.locations.company_name || job.company_name || "",
                      unit:
                        job.units && job.units.length > 0
                          ? job.units[0].unit_number
                          : "",
                      locationId: job.locations.id || job.location_id || "",
                    };
                  }
                }
                return {
                  address: "Atlanta",
                  zip: "",
                  city: "Atlanta",
                  state: "GA",
                  company: "",
                  unit: "",
                  locationId: "",
                };
              })()}
              className="h-full w-full"
              onMapReady={setMapInstance}
              onMarkerJobClick={(locationId) => {
                console.log("Marker clicked, locationId:", locationId, jobs);
                const job = jobs.find(
                  (j) =>
                    j.locations &&
                    (j.locations.id === locationId ||
                      j.location_id === locationId)
                );
                if (job) {
                  setSelectedJobId(job.id);
                  setSelectedJobForModal(job);
                  setShowJobModal(true);
                } else {
                  console.warn("No job found for locationId:", locationId);
                }
              }}
            />
          </div>
          {/* Bottom Half - Technician Schedule */}
          <div className="h-80 border-t border-gray-200" ref={scheduleRef}>
            <TechnicianSchedule
              technicians={technicians}
              jobs={sortedJobs}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onJobDragStart={handleJobDragStart}
              onJobDrop={handleJobDrop}
              onJobDragEnd={handleJobDragEnd}
              onJobScheduleUpdate={handleJobScheduleUpdate}
              onJobClick={handleJobClick}
              onJobCardClick={handleJobCardClick}
              onJobCardDoubleClick={handleJobCardDoubleClick}
              selectedJobId={selectedJobId}
              getJobTypeColorClass={getJobTypeColorClass}
              onJobReassign={handleJobReassign}
              isDraggingEnabled={
                dragModeActive && selectedJobToDrag ? selectedJobToDrag : null
              }
              onDragToggle={setIsDraggingEnabled}
              dragModeActive={dragModeActive}
              selectedJobToDrag={selectedJobToDrag}
              highlightedJobId={highlightedJobId}
              isJobPastDue={isJobPastDue}
            />
          </div>
        </div>
      </div>

      {/* Job Type Legend */}
      <JobTypeLegend />

      {/* Job Details Modal */}
      <JobDetailsModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
        job={
          selectedJobForModal || {
            id: "",
            number: "",
            name: "",
            status: "",
            type: "",
            locations: { name: "" },
            units: [],
          }
        }
        onViewAssets={(location, units) => {
          setAssetModalUnit(null); // null means all units
          setAssetModalLocation(location);
          setAssetModalUnits(units);
          setShowAssetModal(true);
        }}
        showViewAssetsButton={true}
        onAssignTechnicians={handleAssignTechnicians}
      />
      {/* QuickAssetViewModal for job details */}
      <QuickAssetViewModal
        open={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        location={assetModalLocation}
        unit={assetModalUnit}
        units={assetModalUnits}
      />

      {/* Job Assignment Confirmation Modal */}
      {showAssignmentModal && pendingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-center mb-4">
              Technician Assignment
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Do you want to switch the assigned technician or add this
              technician?
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="btn btn-primary flex items-center justify-center"
                onClick={async () => {
                  await handleJobAssignment(
                    pendingAssignment.job,
                    pendingAssignment.fromTechId,
                    pendingAssignment.toTechId,
                    "switch"
                  );
                  setShowAssignmentModal(false);
                  setPendingAssignment(null);
                }}
              >
                Switch
              </button>
              <p className="text-xs text-gray-500 text-center -mt-2">
                Remove the current technician's schedule and assign the job to
                the new technician.
              </p>
              <button
                className="btn btn-secondary flex items-center justify-center"
                onClick={async () => {
                  await handleJobAssignment(
                    pendingAssignment.job,
                    pendingAssignment.fromTechId,
                    pendingAssignment.toTechId,
                    "share"
                  );
                  setShowAssignmentModal(false);
                  setPendingAssignment(null);
                }}
              >
                Add
              </button>
              <p className="text-xs text-gray-500 text-center -mt-2">
                Keep the current technician assigned and add the new technician
                to the job.
              </p>
              <button
                className="btn btn-outline flex items-center justify-center"
                onClick={() => {
                  setShowAssignmentModal(false);
                  setPendingAssignment(null);
                  setDragModeActive(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchSchedule;
