-- Create unit_contacts table for additional contacts
CREATE TABLE unit_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    email text,
    type text,
    created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_unit_contacts_unit_id ON unit_contacts(unit_id);
CREATE INDEX idx_unit_contacts_email ON unit_contacts(email);
CREATE INDEX idx_unit_contacts_phone ON unit_contacts(phone); 