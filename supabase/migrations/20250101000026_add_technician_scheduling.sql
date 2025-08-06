-- Add individual technician scheduling fields
ALTER TABLE job_technicians 
ADD COLUMN schedule_start timestamp with time zone,
ADD COLUMN schedule_end timestamp with time zone,
ADD COLUMN schedule_duration interval,
ADD COLUMN arrival_time timestamp with time zone;

-- Add indexes for better performance
CREATE INDEX idx_job_technicians_schedule_start ON job_technicians(schedule_start);
CREATE INDEX idx_job_technicians_technician_schedule ON job_technicians(technician_id, schedule_start);

-- Add comments for clarity
COMMENT ON COLUMN job_technicians.schedule_start IS 'Individual technician start time for this job';
COMMENT ON COLUMN job_technicians.schedule_end IS 'Individual technician end time for this job';
COMMENT ON COLUMN job_technicians.schedule_duration IS 'Individual technician duration for this job';
COMMENT ON COLUMN job_technicians.arrival_time IS 'When technician should arrive at location'; 