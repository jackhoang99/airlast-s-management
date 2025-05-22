/*
  # Update building_name default value
  
  1. Changes
    - Set default value for building_name column
    - Update existing locations with building_name if null
  2. Notes
    - Ensures all locations have a building name
    - Uses location name as default if building name is missing
*/

-- Set default value for building_name column
ALTER TABLE locations 
ALTER COLUMN building_name SET DEFAULT 'Main Building';

-- Update existing locations with null building_name
UPDATE locations
SET building_name = name
WHERE building_name IS NULL OR building_name = '';