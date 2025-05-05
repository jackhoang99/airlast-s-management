/*
  # Create test data for companies, locations, and units
  
  1. Changes
    - Clear existing data
    - Insert test companies
    - Insert test locations
    - Insert test units
  2. Data Structure
    - Companies: Basic company information
    - Locations: Building/property information
    - Units: Individual units within locations
*/

-- Clear existing data
TRUNCATE TABLE units CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Insert test companies
INSERT INTO companies (name, city, state, status, address, zip, phone) VALUES
  ('Acme Properties', 'Atlanta', 'GA', 'Active', '123 Main Street', '30303', '(404) 555-0123'),
  ('Stellar Management', 'Miami', 'FL', 'Active', '456 Ocean Drive', '33139', '(305) 555-0456'),
  ('Mountain View Holdings', 'Denver', 'CO', 'Active', '789 Peak Road', '80202', '(720) 555-0789');

-- Insert test locations
WITH company_data AS (
  SELECT id, name FROM companies
)
INSERT INTO locations (
  name,
  building_name,
  address,
  city,
  state,
  zip,
  status,
  company_id
) VALUES
  -- Acme Properties locations
  ('Pine Valley Complex', 'Pine Valley Complex', '100 Pine Street', 'Atlanta', 'GA', '30303', 'Active', 
   (SELECT id FROM company_data WHERE name = 'Acme Properties')),
  ('Oak Ridge Center', 'Oak Ridge Center', '200 Oak Avenue', 'Atlanta', 'GA', '30303', 'Active',
   (SELECT id FROM company_data WHERE name = 'Acme Properties')),
  
  -- Stellar Management locations
  ('Ocean View Plaza', 'Ocean View Plaza', '300 Beach Road', 'Miami', 'FL', '33139', 'Active',
   (SELECT id FROM company_data WHERE name = 'Stellar Management')),
  ('Harbor Point Tower', 'Harbor Point Tower', '400 Marina Way', 'Miami', 'FL', '33139', 'Active',
   (SELECT id FROM company_data WHERE name = 'Stellar Management')),
  
  -- Mountain View Holdings locations
  ('Summit Business Park', 'Summit Business Park', '500 Mountain Road', 'Denver', 'CO', '80202', 'Active',
   (SELECT id FROM company_data WHERE name = 'Mountain View Holdings')),
  ('Alpine Office Center', 'Alpine Office Center', '600 Valley Drive', 'Denver', 'CO', '80202', 'Active',
   (SELECT id FROM company_data WHERE name = 'Mountain View Holdings'));

-- Insert test units
WITH location_data AS (
  SELECT id, name FROM locations
)
INSERT INTO units (location_id, unit_number, status)
SELECT 
  l.id,
  u.unit_number,
  'Active'
FROM location_data l,
LATERAL (
  VALUES 
    -- Pine Valley Complex units
    ('Pine Valley Complex', 'Suite 101'),
    ('Pine Valley Complex', 'Suite 102'),
    ('Pine Valley Complex', 'Suite 201'),
    ('Pine Valley Complex', 'Suite 202'),
    
    -- Oak Ridge Center units
    ('Oak Ridge Center', 'Suite A'),
    ('Oak Ridge Center', 'Suite B'),
    ('Oak Ridge Center', 'Suite C'),
    
    -- Ocean View Plaza units
    ('Ocean View Plaza', 'Unit 1A'),
    ('Ocean View Plaza', 'Unit 1B'),
    ('Ocean View Plaza', 'Unit 2A'),
    ('Ocean View Plaza', 'Unit 2B'),
    
    -- Harbor Point Tower units
    ('Harbor Point Tower', 'Suite 501'),
    ('Harbor Point Tower', 'Suite 502'),
    ('Harbor Point Tower', 'Suite 601'),
    
    -- Summit Business Park units
    ('Summit Business Park', 'Building A Suite 100'),
    ('Summit Business Park', 'Building A Suite 200'),
    ('Summit Business Park', 'Building B Suite 100'),
    
    -- Alpine Office Center units
    ('Alpine Office Center', 'Suite 1'),
    ('Alpine Office Center', 'Suite 2'),
    ('Alpine Office Center', 'Suite 3')
) AS u(location_name, unit_number)
WHERE l.name = u.location_name;