-- Add UPDATE and DELETE policies for admins on job_technician_status_history table

-- Allow admins to update status history
CREATE POLICY "Admins can update status history" ON job_technician_status_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to delete status history
CREATE POLICY "Admins can delete status history" ON job_technician_status_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add UPDATE and DELETE policies for admins on job_technician_status table as well
CREATE POLICY "Admins can update job technician status" ON job_technician_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete job technician status" ON job_technician_status
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
