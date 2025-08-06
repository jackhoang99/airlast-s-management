-- Add contact information fields to locations table
ALTER TABLE locations 
ADD COLUMN contact_name text,
ADD COLUMN contact_phone text,
ADD COLUMN contact_email text,
ADD COLUMN contact_type text;

-- Create location_contacts table for additional contacts
CREATE TABLE location_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    email text,
    type text,
    created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_location_contacts_location_id ON location_contacts(location_id);
CREATE INDEX idx_locations_contact_email ON locations(contact_email);
CREATE INDEX idx_locations_contact_phone ON locations(contact_phone); 