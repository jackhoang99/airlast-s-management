-- Add DELETE policy for admins on job_technician_status_history table
CREATE POLICY "Admins can delete status history" ON job_technician_status_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
