/*
  # Remove duplicate companies and locations

  1. Changes
    - Remove duplicate location records while preserving the original entries
    - Remove duplicate company records while preserving the original entries
    - Handle foreign key constraints properly by removing locations first
  2. Data Integrity
    - Maintains referential integrity
    - Preserves the earliest created records
    - Safely handles dependencies between tables
*/

-- First, identify and delete duplicate locations
WITH ranked_locations AS (
  SELECT 
    id,
    company_id,
    name,
    address,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, name, address
      ORDER BY created_at
    ) as rn
  FROM locations
),
duplicate_locations AS (
  SELECT id 
  FROM ranked_locations 
  WHERE rn > 1
)
DELETE FROM locations 
WHERE id IN (SELECT id FROM duplicate_locations);

-- Then, identify companies that can be safely deleted
WITH ranked_companies AS (
  SELECT 
    id,
    name,
    address,
    ROW_NUMBER() OVER (
      PARTITION BY name, address
      ORDER BY created_at
    ) as rn
  FROM companies
),
deletable_companies AS (
  SELECT c.id
  FROM ranked_companies c
  WHERE c.rn > 1
  AND NOT EXISTS (
    SELECT 1 
    FROM locations l 
    WHERE l.company_id = c.id
  )
)
DELETE FROM companies 
WHERE id IN (SELECT id FROM deletable_companies);