-- Add scheduled_at timestamp field to job_technicians table
ALTER TABLE job_technicians 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing schedule_date and schedule_time data to scheduled_at
UPDATE job_technicians 
SET scheduled_at = (
  CASE 
    WHEN schedule_date IS NOT NULL AND schedule_time IS NOT NULL 
    THEN (schedule_date || ' ' || schedule_time)::TIMESTAMP WITH TIME ZONE
    WHEN schedule_date IS NOT NULL 
    THEN (schedule_date || ' 00:00:00')::TIMESTAMP WITH TIME ZONE
    ELSE NULL
  END
)
WHERE scheduled_at IS NULL;

-- Add index for better query performance
CREATE INDEX idx_job_technicians_scheduled_at ON job_technicians(scheduled_at);

-- Add constraint to ensure scheduled_at is in the future for scheduled jobs
ALTER TABLE job_technicians 
ADD CONSTRAINT check_scheduled_at_future 
CHECK (scheduled_at IS NULL OR scheduled_at >= CURRENT_TIMESTAMP);

-- Update RLS policies if needed
-- (Add any necessary RLS policies for the new field) 