-- Script to move existing units to Village Shoppes at Creekside location
-- IMPORTANT: Replace the placeholder values with actual IDs before running

-- Step 1: Find the Village Shoppes at Creekside location ID
-- Run this query first to get the location ID:
-- SELECT id, name, address FROM locations WHERE name = 'Village Shoppes at Creekside';

-- Step 2: Find the units you want to move
-- Replace 'CURRENT_LOCATION_ID' with the current location ID of the units
-- SELECT id, unit_number, location_id, billing_entity FROM units WHERE location_id = 'CURRENT_LOCATION_ID';

-- Step 3: Update the units to move them to Village Shoppes at Creekside
-- Replace 'VILLAGE_SHOPPES_LOCATION_ID' with the actual Village Shoppes location ID
-- Replace 'UNIT_ID_1', 'UNIT_ID_2', etc. with the actual unit IDs you want to move

UPDATE units 
SET 
  location_id = 'VILLAGE_SHOPPES_LOCATION_ID',
  billing_entity = 'VS Creekside, LP c/o 5Rivers, LLC',
  updated_at = NOW()
WHERE id IN (
  'UNIT_ID_1',
  'UNIT_ID_2', 
  'UNIT_ID_3',
  'UNIT_ID_4',
  'UNIT_ID_5',
  'UNIT_ID_6',
  'UNIT_ID_7'
  -- Add more unit IDs as needed
);

-- Step 4: Verify the move was successful
-- SELECT 
--   u.id,
--   u.unit_number,
--   u.billing_entity,
--   l.name as location_name,
--   l.address,
--   c.name as company_name
-- FROM units u
-- JOIN locations l ON u.location_id = l.id
-- JOIN companies c ON l.company_id = c.id
-- WHERE l.name = 'Village Shoppes at Creekside'
-- ORDER BY u.unit_number;

-- Alternative: Move units by unit numbers (if you know the unit numbers)
-- UPDATE units 
-- SET 
--   location_id = 'VILLAGE_SHOPPES_LOCATION_ID',
--   billing_entity = 'VS Creekside, LP c/o 5Rivers, LLC',
--   updated_at = NOW()
-- WHERE unit_number IN ('210', '1015', '265', '143', '1540', '175', '275')
-- AND location_id = 'CURRENT_LOCATION_ID';
