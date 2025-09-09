-- Fix inspection attachments RLS policies to use correct auth_id field
-- and allow technicians to add attachments to any inspection

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Admins can insert inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Admins can update inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Admins can delete inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Technicians can view inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Technicians can insert inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Technicians can update inspection attachments" ON inspection_attachments;
DROP POLICY IF EXISTS "Technicians can delete inspection attachments" ON inspection_attachments;

-- Create corrected policies using auth_id instead of id
-- Admins can view all attachments
CREATE POLICY "Admins can view all inspection attachments" ON inspection_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert attachments
CREATE POLICY "Admins can insert inspection attachments" ON inspection_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update attachments
CREATE POLICY "Admins can update inspection attachments" ON inspection_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can delete attachments
CREATE POLICY "Admins can delete inspection attachments" ON inspection_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Technicians can view all inspection attachments
CREATE POLICY "Technicians can view all inspection attachments" ON inspection_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'technician'
    )
  );

-- Technicians can insert attachments for any inspection
CREATE POLICY "Technicians can insert inspection attachments" ON inspection_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'technician'
    )
  );

-- Technicians can update attachments for any inspection
CREATE POLICY "Technicians can update inspection attachments" ON inspection_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'technician'
    )
  );

-- Technicians can delete attachments for any inspection
CREATE POLICY "Technicians can delete inspection attachments" ON inspection_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'technician'
    )
  );
