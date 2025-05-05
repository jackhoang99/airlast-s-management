/*
  # Migrate units from locations table

  1. Data Migration
    - Extract unit numbers from location names
    - Create unit records for each location
    - Handle various unit number formats (Suite, Unit, #, etc.)
  2. Data Cleanup
    - Trim whitespace
    - Standardize unit number format
*/

-- Function to extract unit number from location name
CREATE OR REPLACE FUNCTION extract_unit_number(location_name text)
RETURNS text AS $$
DECLARE
  unit_number text;
BEGIN
  -- Try to extract Suite number
  IF location_name ~ 'Suite' THEN
    unit_number := 'Suite ' || trim(split_part(location_name, 'Suite', 2));
  -- Try to extract Unit number
  ELSIF location_name ~ 'Unit' THEN
    unit_number := 'Unit ' || trim(split_part(location_name, 'Unit', 2));
  -- Try to extract # number
  ELSIF location_name ~ '#' THEN
    unit_number := '#' || trim(split_part(location_name, '#', 2));
  -- If no unit number found, return NULL
  ELSE
    RETURN NULL;
  END IF;

  -- Clean up the unit number
  unit_number := regexp_replace(unit_number, '\s+', ' ', 'g'); -- Replace multiple spaces with single space
  unit_number := trim(unit_number); -- Remove leading/trailing spaces
  
  RETURN unit_number;
END;
$$ LANGUAGE plpgsql;

-- Insert units from locations
INSERT INTO units (location_id, unit_number, status)
SELECT 
  l.id as location_id,
  COALESCE(
    extract_unit_number(l.name),
    CASE 
      WHEN l.building_name IS NOT NULL THEN 'Main'
      ELSE 'Unit 1'
    END
  ) as unit_number,
  l.status
FROM locations l
WHERE 
  NOT EXISTS (
    SELECT 1 
    FROM units u 
    WHERE u.location_id = l.id
  )
  AND (
    l.name ~ 'Suite' 
    OR l.name ~ 'Unit'
    OR l.name ~ '#'
    OR l.building_name IS NOT NULL
  );

-- Drop the function as it's no longer needed
DROP FUNCTION IF EXISTS extract_unit_number(text);