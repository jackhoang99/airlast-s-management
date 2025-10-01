-- Add billing information fields to locations table
ALTER TABLE locations 
ADD COLUMN billing_entity text,
ADD COLUMN billing_email text,
ADD COLUMN billing_city text,
ADD COLUMN billing_state text,
ADD COLUMN billing_zip text,
ADD COLUMN office text;

-- Add indexes for better performance
CREATE INDEX idx_locations_billing_email ON locations(billing_email);
CREATE INDEX idx_locations_billing_entity ON locations(billing_entity);
