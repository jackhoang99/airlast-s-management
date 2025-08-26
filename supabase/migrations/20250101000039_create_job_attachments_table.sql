-- Create job_attachments table
CREATE TABLE IF NOT EXISTS job_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON job_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_created_at ON job_attachments(created_at);

-- Enable RLS
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for job attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job-attachments', 'job-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for job_attachments table
-- Admins can view all attachments
CREATE POLICY "Admins can view all job attachments" ON job_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert attachments
CREATE POLICY "Admins can insert job attachments" ON job_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update attachments
CREATE POLICY "Admins can update job attachments" ON job_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can delete attachments
CREATE POLICY "Admins can delete job attachments" ON job_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Technicians can view attachments for jobs they're assigned to
CREATE POLICY "Technicians can view job attachments" ON job_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM job_technicians
      WHERE job_technicians.job_id = job_attachments.job_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Technicians can insert attachments for jobs they're assigned to
CREATE POLICY "Technicians can insert job attachments" ON job_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_technicians
      WHERE job_technicians.job_id = job_attachments.job_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Technicians can update attachments for jobs they're assigned to
CREATE POLICY "Technicians can update job attachments" ON job_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM job_technicians
      WHERE job_technicians.job_id = job_attachments.job_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Technicians can delete attachments for jobs they're assigned to
CREATE POLICY "Technicians can delete job attachments" ON job_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM job_technicians
      WHERE job_technicians.job_id = job_attachments.job_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Create storage policies for job-attachments bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload job attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job-attachments' AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view job attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job-attachments' AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update job attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'job-attachments' AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete job attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'job-attachments' AND auth.role() = 'authenticated'
  );
