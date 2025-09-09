-- Create inspection_attachments table
CREATE TABLE IF NOT EXISTS inspection_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES job_inspections(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_inspection_attachments_inspection_id ON inspection_attachments(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_attachments_created_at ON inspection_attachments(created_at);

-- Enable RLS
ALTER TABLE inspection_attachments ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for inspection attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inspection-attachments', 'inspection-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for inspection_attachments table
-- Admins can view all attachments
CREATE POLICY "Admins can view all inspection attachments" ON inspection_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert attachments
CREATE POLICY "Admins can insert inspection attachments" ON inspection_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update attachments
CREATE POLICY "Admins can update inspection attachments" ON inspection_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can delete attachments
CREATE POLICY "Admins can delete inspection attachments" ON inspection_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Technicians can view attachments for inspections they're assigned to
CREATE POLICY "Technicians can view inspection attachments" ON inspection_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM job_technicians
      JOIN job_inspections ON job_inspections.job_id = job_technicians.job_id
      WHERE job_inspections.id = inspection_attachments.inspection_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Technicians can insert attachments for inspections they're assigned to
CREATE POLICY "Technicians can insert inspection attachments" ON inspection_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_technicians
      JOIN job_inspections ON job_inspections.job_id = job_technicians.job_id
      WHERE job_inspections.id = inspection_attachments.inspection_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Technicians can update attachments for inspections they're assigned to
CREATE POLICY "Technicians can update inspection attachments" ON inspection_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM job_technicians
      JOIN job_inspections ON job_inspections.job_id = job_technicians.job_id
      WHERE job_inspections.id = inspection_attachments.inspection_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Technicians can delete attachments for inspections they're assigned to
CREATE POLICY "Technicians can delete inspection attachments" ON inspection_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM job_technicians
      JOIN job_inspections ON job_inspections.job_id = job_technicians.job_id
      WHERE job_inspections.id = inspection_attachments.inspection_id
      AND job_technicians.technician_id = auth.uid()
    )
  );

-- Create storage policies for inspection-attachments bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload inspection attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'inspection-attachments' AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view inspection attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'inspection-attachments' AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update inspection attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'inspection-attachments' AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete inspection attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'inspection-attachments' AND auth.role() = 'authenticated'
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inspection_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_inspection_attachments_updated_at
  BEFORE UPDATE ON inspection_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_inspection_attachments_updated_at();