-- Create job_technician_status table
CREATE TABLE IF NOT EXISTS job_technician_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('traveling', 'working', 'waiting on site', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, technician_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_job_technician_status_job_id ON job_technician_status(job_id);
CREATE INDEX IF NOT EXISTS idx_job_technician_status_technician_id ON job_technician_status(technician_id);

-- Enable RLS
ALTER TABLE job_technician_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view job technician status for jobs they are assigned to" ON job_technician_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM job_technicians 
      WHERE job_technicians.job_id = job_technician_status.job_id 
      AND job_technicians.technician_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own job technician status" ON job_technician_status
  FOR UPDATE USING (
    technician_id = auth.uid()
  );

CREATE POLICY "Users can insert their own job technician status" ON job_technician_status
  FOR INSERT WITH CHECK (
    technician_id = auth.uid()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_technician_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_job_technician_status_updated_at
  BEFORE UPDATE ON job_technician_status
  FOR EACH ROW
  EXECUTE FUNCTION update_job_technician_status_updated_at();
