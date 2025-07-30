-- Create technician_locations table
CREATE TABLE technician_locations (
  tech_id UUID PRIMARY KEY REFERENCES users(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

-- Allow technicians to read their own location
CREATE POLICY "Technicians can read their own location" ON technician_locations
  FOR SELECT USING (auth.uid() = tech_id);

-- Allow technicians to update their own location
CREATE POLICY "Technicians can update their own location" ON technician_locations
  FOR UPDATE USING (auth.uid() = tech_id);

-- Allow technicians to insert their own location
CREATE POLICY "Technicians can insert their own location" ON technician_locations
  FOR INSERT WITH CHECK (auth.uid() = tech_id);

-- Allow admins to read all locations
CREATE POLICY "Admins can read all technician locations" ON technician_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to update all locations
CREATE POLICY "Admins can update all technician locations" ON technician_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create function to update location timestamp
CREATE OR REPLACE FUNCTION update_technician_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER update_technician_location_timestamp
  BEFORE UPDATE ON technician_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_technician_location_timestamp(); 