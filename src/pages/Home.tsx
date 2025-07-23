import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  Calendar,
  Clock,
  ClipboardList,
  AlertTriangle,
  FileCheck2,
  Bell,
  FileInput as FileInvoice,
  CalendarClock,
  Send,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  Plus,
  ArrowRight,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  Settings,
  HelpCircle,
} from "lucide-react";
import TechnicianSchedule from "../components/dispatch/TechnicianSchedule";
import JobDetailsModal from "../components/jobs/JobDetailsModal";
import JobTypeLegend from "../components/dispatch/JobTypeLegend";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DashboardStats {
  totalJobs: number;
  scheduledJobs: number;
  completedJobs: number;
  overdueJobs: number;
  unscheduledJobs: number;
  unsentInvoices: number;
  totalInvoiceValue: number;
  jobsToSchedule: number;
  estimatedRevenue: number;
  submittedQuotes: number;
  totalQuoteValue: number;
  totalCompanies: number;
  totalLocations: number;
  totalUnits: number;
  todayJobs: number;
  thisWeekJobs: number;
  thisMonthJobs: number;
  // Quote statistics
  confirmedQuotes: number;
  deniedQuotes: number;
  pendingQuotes: number;
  // Invoice statistics
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

interface RecentJob {
  id: string;
  number: string;
  name: string;
  status: string;
  type: string;
  additional_type?: string;
  schedule_start: string;
  locations: {
    name: string;
    companies: {
      name: string;
    };
  };
  job_units?: {
    unit_id: string;
    units: {
      id: string;
      unit_number: string;
    };
  }[];
}

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  status: string;
}

interface ScheduledJob {
  id: string;
  number: string;
  name: string;
  status: string;
  type: string;
  additional_type?: string;
  schedule_start: string;
  locations: {
    name: string;
    companies: {
      name: string;
    };
  };
  job_technicians?: {
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
    };
  }[];
  job_units?: {
    unit_id: string;
    units: {
      id: string;
      unit_number: string;
    };
  }[];
}

interface DetailedQuote {
  confirmed: boolean;
  approved: boolean;
  quote_type: string;
  jobs: {
    number: string;
    name: string;
    locations: {
      name: string;
      companies: {
        name: string;
      };
    };
    job_units: {
      units: {
        unit_number: string;
      };
    }[];
  };
}

const Home = () => {
  const { supabase } = useSupabase();
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    scheduledJobs: 0,
    completedJobs: 0,
    overdueJobs: 0,
    unscheduledJobs: 0,
    unsentInvoices: 0,
    totalInvoiceValue: 0,
    jobsToSchedule: 0,
    estimatedRevenue: 0,
    submittedQuotes: 0,
    totalQuoteValue: 0,
    totalCompanies: 0,
    totalLocations: 0,
    totalUnits: 0,
    todayJobs: 0,
    thisWeekJobs: 0,
    thisMonthJobs: 0,
    // Quote statistics
    confirmedQuotes: 0,
    deniedQuotes: 0,
    pendingQuotes: 0,
    // Invoice statistics
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [detailedQuotes, setDetailedQuotes] = useState<DetailedQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDraggingEnabled, setIsDraggingEnabled] = useState<string | null>(
    null
  );
  const [dragModeActive, setDragModeActive] = useState(false);
  const [selectedJobToDrag, setSelectedJobToDrag] = useState<string | null>(
    null
  );
  const [draggedJob, setDraggedJob] = useState<any>(null);
  const [draggedFrom, setDraggedFrom] = useState<{
    type: "column" | "technician";
    id: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<any>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [jobsByDate, setJobsByDate] = useState<Record<string, number>>({});

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showCalendar && !target.closest(".calendar-container")) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  const fetchDashboardData = async () => {
    if (!supabase) return;

    setIsLoading(true);

    try {
      // Get current date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      console.log("Fetching dashboard data with date range:", {
        monthStart: monthStart.toISOString(),
        now: now.toISOString(),
      });

      // Fetch job statistics without filters to get all data
      const { data: jobStats, error: jobError } = await supabase.rpc(
        "get_dashboard_stats",
        {
          office_filter: "",
          technician_filter: "",
          period_start: monthStart.toISOString(),
          period_end: now.toISOString(),
        }
      );

      console.log("RPC call result:", { jobStats, jobError });

      if (jobError) {
        console.error("Error fetching job stats:", jobError);
        // Fallback to manual queries
        await fetchStatsManually();
      } else if (jobStats) {
        console.log("Setting stats from RPC:", jobStats);
        setStats(jobStats);
      } else {
        console.log("No job stats returned from RPC, falling back to manual");
        await fetchStatsManually();
      }

      // Fetch recent jobs
      const { data: recentJobsData, error: recentJobsError } = await supabase
        .from("jobs")
        .select(
          `
          id,
          number,
          name,
          status,
          type,
          additional_type,
          schedule_start,
          locations (
            name,
            companies (
              name
            )
          ),
          job_units (
            unit_id,
            units:unit_id (
              id,
              unit_number
            )
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (!recentJobsError && recentJobsData) {
        setRecentJobs(recentJobsData);
      }

      // Fetch technicians (matching dispatch page - from users table)
      const { data: techniciansData, error: techniciansError } = await supabase
        .from("users")
        .select("id, first_name, last_name, username, status")
        .eq("role", "technician")
        .eq("status", "active")
        .order("first_name", { ascending: true });

      if (!techniciansError && techniciansData) {
        setTechnicians(techniciansData);
      }

      // Quote statistics are now included in the RPC call above

      // Fetch detailed quote information for display
      const { data: quotesData, error: quotesError } = await supabase
        .from("job_quotes")
        .select(
          `
          confirmed,
          approved,
          quote_type,
          jobs:job_id (
            number,
            name,
            locations (
              name,
              companies (
                name
              )
            ),
            job_units:job_units (
              units:unit_id (
                unit_number
              )
            )
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (!quotesError && quotesData) {
        // Store detailed quotes for display
        setDetailedQuotes(quotesData);
      }

      // Fetch scheduled jobs for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: scheduledJobsData, error: scheduledJobsError } =
        await supabase
          .from("jobs")
          .select(
            `
            id,
            number,
            name,
            status,
            type,
            additional_type,
            schedule_start,
            schedule_duration,
            locations (
              name,
              zip
            ),
            job_technicians (
              technician_id,
              is_primary,
              users:technician_id (
                first_name,
                last_name
              )
            ),
            job_units (
              unit_id,
              units:unit_id (
                id,
                unit_number
              )
            )
          `
          )
          .gte("schedule_start", startOfDay.toISOString())
          .lte("schedule_start", endOfDay.toISOString())
          .order("schedule_start");

      if (!scheduledJobsError && scheduledJobsData) {
        // Transform the data to match the expected format
        const transformedJobs = scheduledJobsData.map((job) => ({
          ...job,
          units: job.job_units?.map((ju: any) => ju.units) || [],
        }));
        setScheduledJobs(transformedJobs);
      }

      // Build jobs by date for calendar
      const { data: allJobsData } = await supabase
        .from("jobs")
        .select("schedule_start")
        .not("schedule_start", "is", null);

      if (allJobsData) {
        const jobsByDateMap: Record<string, number> = {};
        allJobsData.forEach((job) => {
          if (job.schedule_start) {
            const dateKey = new Date(job.schedule_start)
              .toISOString()
              .split("T")[0];
            jobsByDateMap[dateKey] = (jobsByDateMap[dateKey] || 0) + 1;
          }
        });
        setJobsByDate(jobsByDateMap);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      await fetchStatsManually();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatsManually = async () => {
    if (!supabase) return;

    try {
      console.log("Fetching stats manually...");

      // Fetch basic counts with better error handling
      const [
        { count: totalJobs, error: totalJobsError },
        { count: scheduledJobs, error: scheduledJobsError },
        { count: completedJobs, error: completedJobsError },
        { count: unscheduledJobs, error: unscheduledJobsError },
        { count: unsentInvoices, error: unsentInvoicesError },
        { count: totalCompanies, error: totalCompaniesError },
        { count: totalLocations, error: totalLocationsError },
        { count: totalUnits, error: totalUnitsError },
      ] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }),
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("status", "scheduled"),
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("jobs")
          .select("*", { count: "exact", head: true })
          .eq("status", "unscheduled"),
        supabase
          .from("job_invoices")
          .select("*", { count: "exact", head: true })
          .eq("status", "draft"),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("locations").select("*", { count: "exact", head: true }),
        supabase.from("units").select("*", { count: "exact", head: true }),
      ]);

      // Log any errors
      if (totalJobsError)
        console.error("Error fetching total jobs:", totalJobsError);
      if (scheduledJobsError)
        console.error("Error fetching scheduled jobs:", scheduledJobsError);
      if (completedJobsError)
        console.error("Error fetching completed jobs:", completedJobsError);
      if (unscheduledJobsError)
        console.error("Error fetching unscheduled jobs:", unscheduledJobsError);
      if (unsentInvoicesError)
        console.error("Error fetching unsent invoices:", unsentInvoicesError);
      if (totalCompaniesError)
        console.error("Error fetching companies:", totalCompaniesError);
      if (totalLocationsError)
        console.error("Error fetching locations:", totalLocationsError);
      if (totalUnitsError)
        console.error("Error fetching units:", totalUnitsError);

      // Fetch overdue jobs (past due date) with better logic
      const { data: overdueJobs, error: overdueJobsError } = await supabase
        .from("jobs")
        .select("*")
        .lt("time_period_due", new Date().toISOString())
        .neq("status", "completed");

      if (overdueJobsError) {
        console.error("Error fetching overdue jobs:", overdueJobsError);
      }

      // Also fetch all jobs to verify counts
      const { data: allJobs, error: allJobsError } = await supabase
        .from("jobs")
        .select("id, status, time_period_due");

      if (allJobsError) {
        console.error("Error fetching all jobs:", allJobsError);
      } else {
        console.log("All jobs data:", allJobs);
        console.log(
          "Job statuses:",
          allJobs?.map((job) => ({
            id: job.id,
            status: job.status,
            due: job.time_period_due,
          }))
        );
      }

      // Fetch invoice statistics
      const [
        { count: totalInvoices, error: totalInvoicesError },
        { count: paidInvoices, error: paidInvoicesError },
        { count: pendingInvoices, error: pendingInvoicesError },
        { data: draftInvoiceData, error: draftInvoiceError },
        { data: paidInvoiceData, error: paidInvoiceError },
        { data: pendingInvoiceData, error: pendingInvoiceError },
      ] = await Promise.all([
        supabase
          .from("job_invoices")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("job_invoices")
          .select("*", { count: "exact", head: true })
          .eq("status", "paid"),
        supabase
          .from("job_invoices")
          .select("*", { count: "exact", head: true })
          .eq("status", "sent"),
        supabase.from("job_invoices").select("amount").eq("status", "draft"),
        supabase.from("job_invoices").select("amount").eq("status", "paid"),
        supabase.from("job_invoices").select("amount").eq("status", "sent"),
      ]);

      if (totalInvoicesError)
        console.error("Error fetching total invoices:", totalInvoicesError);
      if (paidInvoicesError)
        console.error("Error fetching paid invoices:", paidInvoicesError);
      if (pendingInvoicesError)
        console.error("Error fetching pending invoices:", pendingInvoicesError);
      if (draftInvoiceError)
        console.error("Error fetching draft invoice data:", draftInvoiceError);
      if (paidInvoiceError)
        console.error("Error fetching paid invoice data:", paidInvoiceError);
      if (pendingInvoiceError)
        console.error(
          "Error fetching pending invoice data:",
          pendingInvoiceError
        );

      const totalInvoiceValue =
        draftInvoiceData?.reduce(
          (sum, inv) => sum + Number(inv.amount || 0),
          0
        ) || 0;
      const totalPaidAmount =
        paidInvoiceData?.reduce(
          (sum, inv) => sum + Number(inv.amount || 0),
          0
        ) || 0;
      const totalPendingAmount =
        pendingInvoiceData?.reduce(
          (sum, inv) => sum + Number(inv.amount || 0),
          0
        ) || 0;

      // Fetch quote statistics
      const { data: quotesData, error: quotesError } = await supabase
        .from("job_quotes")
        .select("confirmed, approved");

      if (quotesError) {
        console.error("Error fetching quotes:", quotesError);
      }

      let confirmedQuotes = 0;
      let deniedQuotes = 0;
      let pendingQuotes = 0;

      if (quotesData) {
        quotesData.forEach((quote) => {
          if (quote.confirmed) {
            if (quote.approved) {
              confirmedQuotes++;
            } else {
              deniedQuotes++;
            }
          } else {
            pendingQuotes++;
          }
        });
      }

      // Log the counts for debugging
      console.log("Manual stats counts:", {
        totalJobs: totalJobs || 0,
        scheduledJobs: scheduledJobs || 0,
        completedJobs: completedJobs || 0,
        overdueJobs: overdueJobs?.length || 0,
        unsentInvoices: unsentInvoices || 0,
        totalCompanies: totalCompanies || 0,
        totalLocations: totalLocations || 0,
        totalUnits: totalUnits || 0,
        confirmedQuotes,
        deniedQuotes,
        pendingQuotes,
      });

      setStats({
        totalJobs: totalJobs || 0,
        scheduledJobs: scheduledJobs || 0,
        completedJobs: completedJobs || 0,
        overdueJobs: overdueJobs?.length || 0,
        unscheduledJobs: unscheduledJobs || 0,
        unsentInvoices: unsentInvoices || 0,
        totalInvoiceValue,
        jobsToSchedule: 0, // Will be calculated
        estimatedRevenue: totalInvoiceValue,
        submittedQuotes: confirmedQuotes + deniedQuotes + pendingQuotes,
        totalQuoteValue: 0, // Will be calculated
        totalCompanies: totalCompanies || 0,
        totalLocations: totalLocations || 0,
        totalUnits: totalUnits || 0,
        todayJobs: 0, // Will be calculated
        thisWeekJobs: 0, // Will be calculated
        thisMonthJobs: 0, // Will be calculated
        confirmedQuotes,
        deniedQuotes,
        pendingQuotes,
        totalInvoices: totalInvoices || 0,
        paidInvoices: paidInvoices || 0,
        pendingInvoices: pendingInvoices || 0,
        totalPaidAmount,
        totalPendingAmount,
      });

      console.log("Manual stats fetched successfully");
    } catch (err) {
      console.error("Error fetching manual stats:", err);
      // Set default values to prevent crashes
      setStats({
        totalJobs: 0,
        scheduledJobs: 0,
        completedJobs: 0,
        overdueJobs: 0,
        unscheduledJobs: 0,
        unsentInvoices: 0,
        totalInvoiceValue: 0,
        jobsToSchedule: 0,
        estimatedRevenue: 0,
        submittedQuotes: 0,
        totalQuoteValue: 0,
        totalCompanies: 0,
        totalLocations: 0,
        totalUnits: 0,
        todayJobs: 0,
        thisWeekJobs: 0,
        thisMonthJobs: 0,
        confirmedQuotes: 0,
        deniedQuotes: 0,
        pendingQuotes: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        totalPaidAmount: 0,
        totalPendingAmount: 0,
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [supabase, selectedDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "text-blue-600 bg-blue-50";
      case "completed":
        return "text-green-600 bg-green-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <ClockIcon size={14} />;
      case "completed":
        return <CheckCircle size={14} />;
      case "cancelled":
        return <XCircle size={14} />;
      default:
        return <ClockIcon size={14} />;
    }
  };

  const formatScheduleDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeSlot = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setDate(selectedDate.getDate() - 1);
    } else {
      newDate.setDate(selectedDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  // Helper functions for TechnicianSchedule component
  const getJobTypeColorClass = (type: string): string => {
    switch (type?.toLowerCase()) {
      case "preventative maintenance":
      case "planned maintenance":
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

  const handleJobDragStart = (job: any, from: { type: string; id: string }) => {
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

        // First, remove existing technician assignments for this job
        const { error: deleteError } = await supabase
          .from("job_technicians")
          .delete()
          .eq("job_id", draggedJob.id);

        if (deleteError) {
          console.error("Error removing existing assignments:", deleteError);
          throw deleteError;
        }

        // Add new technician assignment
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: draggedJob.id,
            technician_id: to.id,
            is_primary: true,
          });

        if (insertError) {
          console.error("Error assigning technician:", insertError);
          throw insertError;
        }

        // Update job status if needed
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ status: "scheduled" })
          .eq("id", draggedJob.id);

        if (updateError) {
          console.error("Error updating job status:", updateError);
          throw updateError;
        }

        console.log("Job assignment successful");

        // Refresh the jobs data to reflect changes
        await fetchDashboardData();
        setDragModeActive(false); // Exit drag mode after drop
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

  const handleJobDragEnd = () => {
    setIsDragging(false);
    setDraggedJob(null);
    setDraggedFrom(null);
    setDragModeActive(false);
    setSelectedJobToDrag(null);
    setIsDraggingEnabled(null);
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

      // First, remove existing technician assignments for this job
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
          technician_id: technicianId,
          is_primary: true,
        });

      if (insertError) {
        console.error("Error assigning technician:", insertError);
        throw insertError;
      }

      // Update job schedule time and status
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          schedule_start: newScheduleTime,
          status: "scheduled",
        })
        .eq("id", jobId);

      if (updateError) {
        console.error("Error updating job schedule:", updateError);
        throw updateError;
      }

      console.log("Job schedule update successful");

      // Refresh the jobs data to reflect changes
      await fetchDashboardData();
    } catch (err) {
      console.error("Error updating job schedule:", err);
      alert("Failed to update job schedule. Please try again.");
    }
  };

  const handleJobClick = (jobId: string) => {
    console.log("Job clicked:", jobId);
    // Find the job in scheduled jobs
    const job = scheduledJobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJobForModal(job);
      setShowJobModal(true);
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
        // Add new technician assignment without removing existing ones
        const { error: insertError } = await supabase
          .from("job_technicians")
          .insert({
            job_id: jobId,
            technician_id: toTechId,
            is_primary: false,
          });

        if (insertError) {
          console.error("Error sharing job with technician:", insertError);
          throw insertError;
        }
      }

      console.log("Job reassignment successful");

      // Refresh the jobs data to reflect changes
      await fetchDashboardData();
    } catch (err) {
      console.error("Error reassigning job:", err);
      alert("Failed to reassign job. Please try again.");
    }
  };

  const handleDragToggle = (jobId: string) => {
    setIsDraggingEnabled(isDraggingEnabled === jobId ? null : jobId);
  };

  const handleActivateDragMode = () => {
    setDragModeActive(true);
    setSelectedJobToDrag(null);
    setIsDraggingEnabled(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Airlast HVAC Administration
          </h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <Link to="/jobs/create" className="btn btn-primary">
          <Plus size={16} className="mr-2" />
          New Job
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          to="/jobs"
          className="card dashboard-card metric-card dashboard-link bg-white border border-gray-200 hover:border-gray-300 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Jobs</p>
              <p className="text-3xl font-semibold text-gray-900">
                {isLoading ? "..." : stats.totalJobs}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/jobs"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all jobs →
            </Link>
          </div>
        </Link>

        <Link
          to="/jobs?status=completed"
          className="card dashboard-card metric-card dashboard-link bg-white border border-gray-200 hover:border-gray-300 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-3xl font-semibold text-gray-900">
                {isLoading ? "..." : stats.completedJobs}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/jobs?status=completed"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View completed jobs →
            </Link>
          </div>
        </Link>

        <Link
          to="/jobs?overdue=true"
          className="card dashboard-card metric-card dashboard-link bg-white border border-gray-200 hover:border-gray-300 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-3xl font-semibold text-gray-900">
                {isLoading ? "..." : stats.overdueJobs}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/jobs?overdue=true"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View overdue jobs →
            </Link>
          </div>
        </Link>

        <Link
          to="/jobs?status=unscheduled"
          className="card dashboard-card metric-card dashboard-link bg-white border border-gray-200 hover:border-gray-300 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Jobs Unscheduled
              </p>
              <p className="text-3xl font-semibold text-gray-900">
                {isLoading ? "..." : stats.unscheduledJobs}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link
              to="/jobs?status=unscheduled"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View unscheduled jobs →
            </Link>
          </div>
        </Link>
      </div>

      {/* Business Overview and Quote Statistics with Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Revenue Statistics */}
        <div className="card dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary-600" />
              Revenue Statistics
            </h3>
            <Link
              to="/invoices"
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-4">
            <Link
              to="/invoices/paid"
              className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle size={16} className="text-green-600" />
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    Paid Invoices
                  </span>
                  <p className="text-xs text-gray-500">
                    {stats.paidInvoices} invoices
                  </p>
                </div>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.totalPaidAmount)}
              </span>
            </Link>
            <Link
              to="/invoices/pending"
              className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock size={16} className="text-yellow-600" />
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    Pending Invoices
                  </span>
                  <p className="text-xs text-gray-500">
                    {stats.pendingInvoices} invoices
                  </p>
                </div>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.totalPendingAmount)}
              </span>
            </Link>
            <Link
              to="/invoices?status=draft"
              className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileInvoice size={16} className="text-blue-600" />
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    Draft Invoices
                  </span>
                  <p className="text-xs text-gray-500">
                    {stats.unsentInvoices} invoices
                  </p>
                </div>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats.totalInvoiceValue)}
              </span>
            </Link>
          </div>
        </div>

        {/* Quote Statistics - Smaller */}
        <div className="card dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" />
              Quote Statistics
            </h3>
            <Link
              to="/all-quotes"
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <span className="font-medium text-gray-900">Confirmed</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {stats.confirmedQuotes}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-600" />
                <span className="font-medium text-gray-900">Denied</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {stats.deniedQuotes}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-yellow-600" />
                <span className="font-medium text-gray-900">Pending</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {stats.pendingQuotes}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions - Smaller */}
        <div className="card dashboard-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-600" />
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/jobs/create"
              className="p-3 border rounded-lg hover:bg-gray-50 text-center transition-colors duration-200"
            >
              <Plus className="h-6 w-6 mx-auto mb-2 text-primary-600" />
              <p className="font-medium text-sm">Create Job</p>
              <p className="text-xs text-gray-600">New service</p>
            </Link>
            <Link
              to="/companies/create"
              className="p-3 border rounded-lg hover:bg-gray-50 text-center transition-colors duration-200"
            >
              <Building2 className="h-6 w-6 mx-auto mb-2 text-primary-600" />
              <p className="font-medium text-sm">Add Company</p>
              <p className="text-xs text-gray-600">New client</p>
            </Link>
            <Link
              to="/jobs"
              className="p-3 border rounded-lg hover:bg-gray-50 text-center transition-colors duration-200"
            >
              <ClipboardList className="h-6 w-6 mx-auto mb-2 text-primary-600" />
              <p className="font-medium text-sm">View Jobs</p>
              <p className="text-xs text-gray-600">All jobs</p>
            </Link>
            <Link
              to="/invoices"
              className="p-3 border rounded-lg hover:bg-gray-50 text-center transition-colors duration-200"
            >
              <FileInvoice className="h-6 w-6 mx-auto mb-2 text-primary-600" />
              <p className="font-medium text-sm">Invoices</p>
              <p className="text-xs text-gray-600">Billing</p>
            </Link>
            <Link
              to="/all-quotes"
              className="p-3 border rounded-lg hover:bg-gray-50 text-center transition-colors duration-200"
            >
              <FileText className="h-6 w-6 mx-auto mb-2 text-primary-600" />
              <p className="font-medium text-sm">Quotes</p>
              <p className="text-xs text-gray-600">Manage quotes</p>
            </Link>
            <Link
              to="/jobs/dispatch"
              className="p-3 border rounded-lg hover:bg-gray-50 text-center transition-colors duration-200"
            >
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary-600" />
              <p className="font-medium text-sm">Dispatch</p>
              <p className="text-xs text-gray-600">Schedule</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Daily Schedule - Smaller */}
      <div className="card dashboard-card">
        {/* Drag Mode Banner */}
        {dragModeActive && (
          <div className="bg-blue-100 text-blue-800 text-center py-2 font-semibold mb-4 rounded-md">
            {selectedJobToDrag
              ? "Drag the job to a technician to reassign."
              : "Drag a job to reassign or reschedule."}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-600" />
              Daily Schedule
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Calendar Button */}
            <div className="relative">
              <button
                className="btn btn-secondary text-sm"
                onClick={() => setShowCalendar((v) => !v)}
                type="button"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </button>
              {showCalendar && (
                <div className="calendar-container absolute z-50 mt-2 bg-white border rounded shadow-lg p-2">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) setSelectedDate(date);
                      setShowCalendar(false);
                    }}
                    modifiers={{
                      hasJobs: (date) => {
                        const key = date.toISOString().split("T")[0];
                        return jobsByDate[key] > 0;
                      },
                    }}
                    modifiersClassNames={{
                      hasJobs: "bg-red-500 text-white",
                    }}
                    modifiersStyles={{
                      hasJobs: { backgroundColor: "#ef4444", color: "#fff" },
                    }}
                  />
                </div>
              )}
            </div>

            {/* Drag Mode Toggle */}
            {!dragModeActive ? (
              <button
                className="btn btn-success text-sm"
                onClick={handleActivateDragMode}
                type="button"
              >
                Enable Drag Mode
              </button>
            ) : (
              <button
                className="btn btn-outline-secondary text-sm"
                onClick={handleJobDragEnd}
                type="button"
              >
                Cancel Drag Mode
              </button>
            )}

            <Link
              to="/jobs/dispatch"
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
            >
              Dispatch & Schedule
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="h-64">
          <TechnicianSchedule
            technicians={technicians}
            jobs={scheduledJobs}
            currentDate={selectedDate}
            onDateChange={setSelectedDate}
            onJobDragStart={handleJobDragStart}
            onJobDrop={handleJobDrop}
            onJobDragEnd={handleJobDragEnd}
            onJobScheduleUpdate={handleJobScheduleUpdate}
            onJobClick={handleJobClick}
            selectedJobId={selectedJobId}
            getJobTypeColorClass={getJobTypeColorClass}
            onJobReassign={handleJobReassign}
            isDraggingEnabled={
              dragModeActive && selectedJobToDrag ? selectedJobToDrag : null
            }
            onDragToggle={handleDragToggle}
            dragModeActive={dragModeActive}
            selectedJobToDrag={selectedJobToDrag}
            highlightedJobId={null}
            onActivateDragMode={handleActivateDragMode}
          />
        </div>

        {/* Job Type Legend */}
        <JobTypeLegend />
      </div>

      {/* Recent Jobs */}
      <div className="card dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-600" />
            Recent Jobs
          </h3>
          <Link
            to="/jobs"
            className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
          >
            View All
            <ArrowRight size={14} />
          </Link>
        </div>
        {recentJobs.length > 0 ? (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${getStatusColor(job.status)}`}
                  >
                    {getStatusIcon(job.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      #{job.number} - {job.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {job.locations?.companies?.name} • {job.locations?.name}
                      {job.job_units && job.job_units.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          • Units:{" "}
                          {job.job_units
                            .map((ju) => ju.units?.unit_number)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {job.type}
                    {(job.type === "preventative maintenance" ||
                      job.type === "planned maintenance") &&
                      job.additional_type && (
                        <span className="ml-1">• {job.additional_type}</span>
                      )}
                  </p>
                  {job.schedule_start && (
                    <p className="text-xs text-gray-500">
                      {formatDate(job.schedule_start)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No recent jobs found</p>
          </div>
        )}
      </div>

      {/* Quick Job Details Modal */}
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
        showViewAssetsButton={true}
      />
    </div>
  );
};

export default Home;
