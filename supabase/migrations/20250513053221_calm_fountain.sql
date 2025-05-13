/*
  # Add Jane as user
  
  1. Changes
    - Add Jane to users table
    - Set up proper role and services
  2. Notes
    - No linking to technicians table needed
    - Services array includes HVAC-related services
*/

-- Add Jane as a user
INSERT INTO users (
  username,
  email,
  first_name,
  last_name,
  phone,
  role,
  status,
  services
) VALUES (
  'jane.tech',
  'jane.tech@airlast.com',
  'Jane',
  'Tech',
  '(555) 234-5678',
  'technician',
  'active',
  ARRAY['HVAC', 'COOLING', 'HEATING', 'MAINTENANCE', 'REPAIR', 'INSTALLATION']
);