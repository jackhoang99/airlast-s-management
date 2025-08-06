-- Add individual technician scheduling fields
ALTER TABLE job_technicians
ADD COLUMN schedule_date date,
ADD COLUMN schedule_time time without time zone;

-- Add indexes for better performance
CREATE INDEX idx_job_technicians_schedule_date ON job_technicians(schedule_date);
CREATE INDEX idx_job_technicians_technician_schedule ON job_technicians(technician_id, schedule_date);

-- Add comments for clarity
COMMENT ON COLUMN job_technicians.schedule_date IS 'Individual technician schedule date for this job';
COMMENT ON COLUMN job_technicians.schedule_time IS 'Individual technician schedule time for this job'; 