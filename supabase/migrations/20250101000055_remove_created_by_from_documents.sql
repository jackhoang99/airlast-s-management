-- Remove created_by column from location_documents table
ALTER TABLE location_documents DROP COLUMN IF EXISTS created_by;

-- Remove created_by column from unit_documents table  
ALTER TABLE unit_documents DROP COLUMN IF EXISTS created_by;

-- Remove updated_by column from location_documents table (if it exists)
ALTER TABLE location_documents DROP COLUMN IF EXISTS updated_by;

-- Remove updated_by column from unit_documents table (if it exists)
ALTER TABLE unit_documents DROP COLUMN IF EXISTS updated_by;
