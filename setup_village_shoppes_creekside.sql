-- Setup script for Village Shoppes at Creekside under 5 Rivers
-- This script creates the location and all units with proper billing entity

-- First, let's find the 5 Rivers company ID (assuming it exists)
-- You may need to adjust this query based on your actual company name
-- SELECT id, name FROM companies WHERE name ILIKE '%5 Rivers%' OR name ILIKE '%5Rivers%';

-- Create the Village Shoppes at Creekside location
-- Replace 'COMPANY_ID_HERE' with the actual 5 Rivers company ID
INSERT INTO locations (
  name,
  address,
  city,
  state,
  zip,
  company_id,
  billing_entity,
  created_at,
  updated_at
) VALUES (
  'Village Shoppes at Creekside',
  '858 GA-120 Hwy',
  'Lawrenceville',
  'GA',
  '30043',
  'COMPANY_ID_HERE', -- Replace with actual 5 Rivers company ID
  'VS Creekside, LP c/o 5Rivers, LLC',
  NOW(),
  NOW()
);

-- Get the location ID that was just created
-- You'll need to run this query to get the location ID:
-- SELECT id FROM locations WHERE name = 'Village Shoppes at Creekside' ORDER BY created_at DESC LIMIT 1;

-- Create all the units for Village Shoppes at Creekside
-- Replace 'LOCATION_ID_HERE' with the actual location ID from the previous insert
INSERT INTO units (
  unit_number,
  status,
  location_id,
  billing_entity,
  created_at
) VALUES 
  ('210', 'active', 'LOCATION_ID_HERE', 'VS Creekside, LP c/o 5Rivers, LLC', NOW()),
  ('1015', 'active', 'LOCATION_ID_HERE', 'VS Creekside, LP c/o 5Rivers, LLC', NOW()),
  ('265', 'active', 'LOCATION_ID_HERE', 'VS Creekside, LP c/o 5Rivers, LLC', NOW()),
  ('143', 'active', 'LOCATION_ID_HERE', 'VS Creekside, LP c/o 5Rivers, LLC', NOW()),
  ('1540', 'active', 'LOCATION_ID_HERE', 'VS Creekside, LP c/o 5Rivers, LLC', NOW()),
  ('175', 'active', 'LOCATION_ID_HERE', 'VS Creekside, LP c/o 5Rivers, LLC', NOW()),
  ('275', 'active', 'LOCATION_ID_HERE', 'VS Creekside, LP c/o 5Rivers, LLC', NOW());

-- Special note for unit 210 - Mila Nail Salon
-- You may want to add additional contact information for this unit
-- UPDATE units SET primary_contact_type = 'Tenant', primary_contact_email = 'contact@milanailsalon.com' 
-- WHERE unit_number = '210' AND location_id = 'LOCATION_ID_HERE';

-- Verify the setup
-- SELECT 
--   l.name as location_name,
--   l.address,
--   l.city,
--   l.state,
--   l.zip,
--   l.billing_entity as location_billing_entity,
--   u.unit_number,
--   u.billing_entity as unit_billing_entity,
--   u.status
-- FROM locations l
-- JOIN units u ON l.id = u.location_id
-- WHERE l.name = 'Village Shoppes at Creekside'
-- ORDER BY u.unit_number;
