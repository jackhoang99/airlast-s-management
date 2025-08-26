-- Drop the existing UPDATE policy and recreate it with a more robust condition
DROP POLICY IF EXISTS "Admins can update status history" ON job_technician_status_history;

-- Create a new UPDATE policy with better condition checking
CREATE POLICY "Admins can update status history" ON job_technician_status_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.status = 'active'
    )
  );
