-- Create job_technician_status_history table to track all status changes
CREATE TABLE IF NOT EXISTS job_technician_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('traveling', 'working', 'waiting on site', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_job_technician_status_history_job_id ON job_technician_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_technician_status_history_technician_id ON job_technician_status_history(technician_id);
CREATE INDEX IF NOT EXISTS idx_job_technician_status_history_created_at ON job_technician_status_history(created_at);

-- Enable RLS
ALTER TABLE job_technician_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies for status history
CREATE POLICY "Technicians can view their own status history" ON job_technician_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM job_technicians 
      WHERE job_technicians.job_id = job_technician_status_history.job_id 
      AND job_technicians.technician_id = job_technician_status_history.technician_id
    )
  );

CREATE POLICY "Technicians can insert their own status history" ON job_technician_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_technicians 
      WHERE job_technicians.job_id = job_technician_status_history.job_id 
      AND job_technicians.technician_id = job_technician_status_history.technician_id
    )
  );

-- Allow admins to view all status history
CREATE POLICY "Admins can view all status history" ON job_technician_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to insert status history
CREATE POLICY "Admins can insert status history" ON job_technician_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
