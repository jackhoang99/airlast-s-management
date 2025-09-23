-- Add customer portal access to inspection attachments
-- Allow authenticated users to view inspection attachments (similar to customer comments approach)

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Allow authenticated users to view job inspections" ON job_inspections;

-- Add policy for customers to view inspection attachments
CREATE POLICY "Allow authenticated users to view inspection attachments" ON inspection_attachments
  FOR SELECT USING (true);

-- Add policy for customers to view job inspections  
CREATE POLICY "Allow authenticated users to view job inspections" ON job_inspections
  FOR SELECT USING (true);
