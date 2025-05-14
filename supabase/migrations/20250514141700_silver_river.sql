/*
  # Add test technicians to users table
  
  1. Changes
    - Add 4 test technician users
    - Set up proper roles and services
  2. Data
    - Each technician has unique skills and services
*/

INSERT INTO users (
  username,
  email,
  first_name,
  last_name,
  phone,
  role,
  status,
  services
) VALUES
  ('sarah.tech', 'sarah.tech@airlast.com', 'Sarah', 'Smith', '(555) 111-2222', 'technician', 'active',
   ARRAY['HVAC', 'COOLING', 'HEATING', 'MAINTENANCE']),
  ('mike.tech', 'mike.tech@airlast.com', 'Mike', 'Johnson', '(555) 222-3333', 'technician', 'active',
   ARRAY['HVAC', 'INSTALLATION', 'REPAIR']),
  ('alex.tech', 'alex.tech@airlast.com', 'Alex', 'Brown', '(555) 333-4444', 'technician', 'active',
   ARRAY['HVAC', 'MAINTENANCE', 'INSTALLATION']),
  ('lisa.tech', 'lisa.tech@airlast.com', 'Lisa', 'Davis', '(555) 444-5555', 'technician', 'active',
   ARRAY['HVAC', 'COOLING', 'REPAIR']);