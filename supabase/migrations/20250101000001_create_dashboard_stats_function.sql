-- Create a function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  office_filter TEXT DEFAULT '',
  technician_filter TEXT DEFAULT '',
  period_start TIMESTAMPTZ DEFAULT NULL,
  period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_stats AS (
    SELECT
      -- Job counts (excluding completed jobs for date filtering)
      COUNT(*) as total_jobs,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_jobs,
      COUNT(*) FILTER (WHERE time_period_due < NOW() AND status != 'completed') as overdue_jobs,
      
      -- Date-based counts
      COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_jobs,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE)) as this_week_jobs,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month_jobs,
      
      -- Jobs ready to schedule (unscheduled jobs)
      COUNT(*) FILTER (WHERE status = 'unscheduled') as jobs_to_schedule
    FROM jobs
    WHERE 1=1
      AND (office_filter = '' OR office = office_filter)
      AND (technician_filter = '' OR id IN (
        SELECT job_id FROM job_technicians 
        WHERE technician_id = technician_filter
      ))
      AND (period_start IS NULL OR created_at >= period_start)
      AND (period_end IS NULL OR created_at <= period_end)
  ),
  completed_stats AS (
    SELECT
      COUNT(*) as completed_jobs
    FROM jobs
    WHERE 1=1
      AND status = 'completed'
      AND (office_filter = '' OR office = office_filter)
      AND (technician_filter = '' OR id IN (
        SELECT job_id FROM job_technicians 
        WHERE technician_id = technician_filter
      ))
  ),
  invoice_stats AS (
    SELECT
      COUNT(*) as unsent_invoices,
      COALESCE(SUM(amount), 0) as total_invoice_value
    FROM job_invoices
    WHERE status = 'draft'
  ),
  business_stats AS (
    SELECT
      (SELECT COUNT(*) FROM companies) as total_companies,
      (SELECT COUNT(*) FROM locations) as total_locations,
      (SELECT COUNT(*) FROM units) as total_units
  ),
  quote_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE confirmed = true AND approved = true) as confirmed_quotes,
      COUNT(*) FILTER (WHERE confirmed = true AND approved = false) as denied_quotes,
      COUNT(*) FILTER (WHERE confirmed = false) as pending_quotes
    FROM job_quotes
  )
  SELECT json_build_object(
    'totalJobs', s.total_jobs,
    'scheduledJobs', s.scheduled_jobs,
    'completedJobs', c.completed_jobs,
    'overdueJobs', s.overdue_jobs,
    'unsentInvoices', i.unsent_invoices,
    'totalInvoiceValue', i.total_invoice_value,
    'jobsToSchedule', s.jobs_to_schedule,
    'estimatedRevenue', 0, -- Placeholder for future implementation
    'submittedQuotes', 0, -- Placeholder for future implementation
    'totalQuoteValue', 0, -- Placeholder for future implementation
    'totalCompanies', b.total_companies,
    'totalLocations', b.total_locations,
    'totalUnits', b.total_units,
    'todayJobs', s.today_jobs,
    'thisWeekJobs', s.this_week_jobs,
    'thisMonthJobs', s.this_month_jobs,
    'confirmedQuotes', q.confirmed_quotes,
    'deniedQuotes', q.denied_quotes,
    'pendingQuotes', q.pending_quotes
  ) INTO result
  FROM filtered_stats s, completed_stats c, invoice_stats i, business_stats b, quote_stats q;

  RETURN result;
END;
$$ LANGUAGE plpgsql; 