-- Comprehensive script to move existing units to Village Shoppes at Creekside
-- This script handles the entire process including verification

-- Step 1: Find and display current units that need to be moved
-- Replace 'CURRENT_LOCATION_ID' with the actual current location ID
SELECT 
  'BEFORE MOVE - Current Units:' as status,
  u.id,
  u.unit_number,
  u.billing_entity as current_billing_entity,
  l.name as current_location,
  c.name as current_company
FROM units u
JOIN locations l ON u.location_id = l.id
JOIN companies c ON l.company_id = c.id
WHERE u.location_id = 'CURRENT_LOCATION_ID'
ORDER BY u.unit_number;

-- Step 2: Get the Village Shoppes at Creekside location ID
-- Replace this with the actual location ID after creating the location
DECLARE @village_shoppes_location_id UUID;
SELECT @village_shoppes_location_id = id 
FROM locations 
WHERE name = 'Village Shoppes at Creekside';

-- Step 3: Move specific units by unit numbers
-- This will move units with the specified unit numbers to the new location
UPDATE units 
SET 
  location_id = @village_shoppes_location_id,
  billing_entity = 'VS Creekside, LP c/o 5Rivers, LLC',
  updated_at = NOW()
WHERE unit_number IN ('210', '1015', '265', '143', '1540', '175', '275')
AND location_id = 'CURRENT_LOCATION_ID';

-- Step 4: Verify the move was successful
SELECT 
  'AFTER MOVE - Moved Units:' as status,
  u.id,
  u.unit_number,
  u.billing_entity as new_billing_entity,
  l.name as new_location,
  c.name as new_company
FROM units u
JOIN locations l ON u.location_id = l.id
JOIN companies c ON l.company_id = c.id
WHERE l.name = 'Village Shoppes at Creekside'
ORDER BY u.unit_number;

-- Step 5: Check for any remaining units in the old location
SELECT 
  'REMAINING UNITS IN OLD LOCATION:' as status,
  u.id,
  u.unit_number,
  u.billing_entity,
  l.name as location_name
FROM units u
JOIN locations l ON u.location_id = l.id
WHERE u.location_id = 'CURRENT_LOCATION_ID'
ORDER BY u.unit_number;
