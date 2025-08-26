-- Add "tech completed" status to job_technician_status table
ALTER TABLE job_technician_status 
DROP CONSTRAINT IF EXISTS job_technician_status_status_check;

ALTER TABLE job_technician_status 
ADD CONSTRAINT job_technician_status_status_check 
CHECK (status IN ('traveling', 'working', 'waiting on site', 'tech completed', 'completed'));

-- Add "tech completed" status to job_technician_status_history table
ALTER TABLE job_technician_status_history 
DROP CONSTRAINT IF EXISTS job_technician_status_history_status_check;

ALTER TABLE job_technician_status_history 
ADD CONSTRAINT job_technician_status_history_status_check 
CHECK (status IN ('traveling', 'working', 'waiting on site', 'tech completed', 'completed'));
