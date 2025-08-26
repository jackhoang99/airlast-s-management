-- Add UPDATE policy for admins on job_technician_status_history table
CREATE POLICY "Admins can update status history" ON job_technician_status_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
