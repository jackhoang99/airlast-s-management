/*
  # Add more test data
  
  1. Changes
    - Add more test companies
    - Add more test locations
    - Add more test units
  2. Data Structure
    - Companies with varied locations and industries
    - Locations with multiple units
    - Units with different statuses
*/

-- Clear existing test data
TRUNCATE TABLE units CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Insert test companies
INSERT INTO companies (name, city, state, address, zip, phone) VALUES
  ('Acme Properties', 'Atlanta', 'GA', '123 Main Street', '30303', '(404) 555-0123'),
  ('Stellar Management', 'Miami', 'FL', '456 Ocean Drive', '33139', '(305) 555-0456'),
  ('Mountain View Holdings', 'Denver', 'CO', '789 Peak Road', '80202', '(720) 555-0789'),
  ('Coastal Investments', 'Charleston', 'SC', '321 Harbor Drive', '29401', '(843) 555-0321'),
  ('Desert Sun Properties', 'Phoenix', 'AZ', '567 Cactus Lane', '85001', '(602) 555-0567'),
  ('Evergreen Estates', 'Seattle', 'WA', '890 Pine Street', '98101', '(206) 555-0890'),
  ('Lakefront Management', 'Chicago', 'IL', '432 Lake Shore Drive', '60601', '(312) 555-0432'),
  ('Urban Core Development', 'Boston', 'MA', '765 Downtown Avenue', '02108', '(617) 555-0765'),
  ('Skyline Properties', 'New York', 'NY', '987 Broadway', '10001', '(212) 555-0987'),
  ('Golden Gate Realty', 'San Francisco', 'CA', '654 Bay Street', '94111', '(415) 555-0654');

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
  company_id
) VALUES
  -- Acme Properties locations
  ('Pine Valley Complex', 'Pine Valley Complex', '100 Pine Street', 'Atlanta', 'GA', '30303', 
   (SELECT id FROM company_data WHERE name = 'Acme Properties')),
  ('Oak Ridge Center', 'Oak Ridge Center', '200 Oak Avenue', 'Atlanta', 'GA', '30303',
   (SELECT id FROM company_data WHERE name = 'Acme Properties')),
  ('Maple Court Plaza', 'Maple Court Plaza', '300 Maple Court', 'Atlanta', 'GA', '30303',
   (SELECT id FROM company_data WHERE name = 'Acme Properties')),
   
  -- Stellar Management locations
  ('Ocean View Plaza', 'Ocean View Plaza', '300 Beach Road', 'Miami', 'FL', '33139',
   (SELECT id FROM company_data WHERE name = 'Stellar Management')),
  ('Harbor Point Tower', 'Harbor Point Tower', '400 Marina Way', 'Miami', 'FL', '33139',
   (SELECT id FROM company_data WHERE name = 'Stellar Management')),
  ('Sunset Bay Complex', 'Sunset Bay Complex', '500 Sunset Drive', 'Miami', 'FL', '33139',
   (SELECT id FROM company_data WHERE name = 'Stellar Management')),
   
  -- Mountain View Holdings locations
  ('Summit Business Park', 'Summit Business Park', '500 Mountain Road', 'Denver', 'CO', '80202',
   (SELECT id FROM company_data WHERE name = 'Mountain View Holdings')),
  ('Alpine Office Center', 'Alpine Office Center', '600 Valley Drive', 'Denver', 'CO', '80202',
   (SELECT id FROM company_data WHERE name = 'Mountain View Holdings')),
  ('Peak Professional Plaza', 'Peak Professional Plaza', '700 Summit Avenue', 'Denver', 'CO', '80202',
   (SELECT id FROM company_data WHERE name = 'Mountain View Holdings')),
   
  -- Coastal Investments locations
  ('Harbor View Center', 'Harbor View Center', '100 Waterfront Drive', 'Charleston', 'SC', '29401',
   (SELECT id FROM company_data WHERE name = 'Coastal Investments')),
  ('Maritime Plaza', 'Maritime Plaza', '200 Dock Street', 'Charleston', 'SC', '29401',
   (SELECT id FROM company_data WHERE name = 'Coastal Investments')),
   
  -- Desert Sun Properties locations
  ('Saguaro Business Center', 'Saguaro Business Center', '100 Desert Road', 'Phoenix', 'AZ', '85001',
   (SELECT id FROM company_data WHERE name = 'Desert Sun Properties')),
  ('Sonoran Office Park', 'Sonoran Office Park', '200 Cactus Boulevard', 'Phoenix', 'AZ', '85001',
   (SELECT id FROM company_data WHERE name = 'Desert Sun Properties')),
   
  -- Evergreen Estates locations
  ('Rainier Tower', 'Rainier Tower', '100 Evergreen Way', 'Seattle', 'WA', '98101',
   (SELECT id FROM company_data WHERE name = 'Evergreen Estates')),
  ('Cascade Center', 'Cascade Center', '200 Forest Drive', 'Seattle', 'WA', '98101',
   (SELECT id FROM company_data WHERE name = 'Evergreen Estates')),
   
  -- Lakefront Management locations
  ('Lakeshore Plaza', 'Lakeshore Plaza', '100 Michigan Avenue', 'Chicago', 'IL', '60601',
   (SELECT id FROM company_data WHERE name = 'Lakefront Management')),
  ('River Point Tower', 'River Point Tower', '200 Wacker Drive', 'Chicago', 'IL', '60601',
   (SELECT id FROM company_data WHERE name = 'Lakefront Management')),
   
  -- Urban Core Development locations
  ('Downtown Crossing Center', 'Downtown Crossing Center', '100 Washington Street', 'Boston', 'MA', '02108',
   (SELECT id FROM company_data WHERE name = 'Urban Core Development')),
  ('Beacon Hill Plaza', 'Beacon Hill Plaza', '200 State Street', 'Boston', 'MA', '02108',
   (SELECT id FROM company_data WHERE name = 'Urban Core Development')),
   
  -- Skyline Properties locations
  ('Empire State Plaza', 'Empire State Plaza', '100 Fifth Avenue', 'New York', 'NY', '10001',
   (SELECT id FROM company_data WHERE name = 'Skyline Properties')),
  ('Manhattan Center', 'Manhattan Center', '200 Madison Avenue', 'New York', 'NY', '10001',
   (SELECT id FROM company_data WHERE name = 'Skyline Properties')),
   
  -- Golden Gate Realty locations
  ('Bay View Tower', 'Bay View Tower', '100 Market Street', 'San Francisco', 'CA', '94111',
   (SELECT id FROM company_data WHERE name = 'Golden Gate Realty')),
  ('Financial District Plaza', 'Financial District Plaza', '200 California Street', 'San Francisco', 'CA', '94111',
   (SELECT id FROM company_data WHERE name = 'Golden Gate Realty'));

-- Insert test units
WITH location_data AS (
  SELECT id, name FROM locations
)
INSERT INTO units (location_id, unit_number, status)
SELECT 
  l.id,
  u.unit_number,
  u.status
FROM location_data l,
LATERAL (
  VALUES 
    -- Pine Valley Complex units
    ('Pine Valley Complex', 'Suite 101', 'Active'),
    ('Pine Valley Complex', 'Suite 102', 'Active'),
    ('Pine Valley Complex', 'Suite 201', 'Inactive'),
    ('Pine Valley Complex', 'Suite 202', 'Active'),
    
    -- Oak Ridge Center units
    ('Oak Ridge Center', 'Suite A', 'Active'),
    ('Oak Ridge Center', 'Suite B', 'Active'),
    ('Oak Ridge Center', 'Suite C', 'Inactive'),
    
    -- Ocean View Plaza units
    ('Ocean View Plaza', 'Unit 1A', 'Active'),
    ('Ocean View Plaza', 'Unit 1B', 'Active'),
    ('Ocean View Plaza', 'Unit 2A', 'Inactive'),
    ('Ocean View Plaza', 'Unit 2B', 'Active'),
    
    -- Harbor Point Tower units
    ('Harbor Point Tower', 'Suite 501', 'Active'),
    ('Harbor Point Tower', 'Suite 502', 'Inactive'),
    ('Harbor Point Tower', 'Suite 601', 'Active'),
    
    -- Summit Business Park units
    ('Summit Business Park', 'Building A Suite 100', 'Active'),
    ('Summit Business Park', 'Building A Suite 200', 'Active'),
    ('Summit Business Park', 'Building B Suite 100', 'Inactive'),
    
    -- Alpine Office Center units
    ('Alpine Office Center', 'Suite 1', 'Active'),
    ('Alpine Office Center', 'Suite 2', 'Inactive'),
    ('Alpine Office Center', 'Suite 3', 'Active'),
    
    -- Harbor View Center units
    ('Harbor View Center', 'Suite 100', 'Active'),
    ('Harbor View Center', 'Suite 200', 'Active'),
    ('Harbor View Center', 'Suite 300', 'Inactive'),
    
    -- Maritime Plaza units
    ('Maritime Plaza', 'Unit A', 'Active'),
    ('Maritime Plaza', 'Unit B', 'Active'),
    ('Maritime Plaza', 'Unit C', 'Inactive'),
    
    -- Saguaro Business Center units
    ('Saguaro Business Center', 'Suite 101', 'Active'),
    ('Saguaro Business Center', 'Suite 102', 'Inactive'),
    ('Saguaro Business Center', 'Suite 201', 'Active'),
    
    -- Sonoran Office Park units
    ('Sonoran Office Park', 'Building 1 Suite 100', 'Active'),
    ('Sonoran Office Park', 'Building 1 Suite 200', 'Active'),
    ('Sonoran Office Park', 'Building 2 Suite 100', 'Inactive'),
    
    -- Rainier Tower units
    ('Rainier Tower', 'Floor 10 Suite A', 'Active'),
    ('Rainier Tower', 'Floor 10 Suite B', 'Active'),
    ('Rainier Tower', 'Floor 11 Suite A', 'Inactive'),
    
    -- Cascade Center units
    ('Cascade Center', 'Suite 100', 'Active'),
    ('Cascade Center', 'Suite 200', 'Active'),
    ('Cascade Center', 'Suite 300', 'Inactive'),
    
    -- Lakeshore Plaza units
    ('Lakeshore Plaza', 'Suite 1000', 'Active'),
    ('Lakeshore Plaza', 'Suite 2000', 'Active'),
    ('Lakeshore Plaza', 'Suite 3000', 'Inactive'),
    
    -- River Point Tower units
    ('River Point Tower', 'Floor 20 Suite A', 'Active'),
    ('River Point Tower', 'Floor 20 Suite B', 'Inactive'),
    ('River Point Tower', 'Floor 21 Suite A', 'Active'),
    
    -- Downtown Crossing Center units
    ('Downtown Crossing Center', 'Suite 500', 'Active'),
    ('Downtown Crossing Center', 'Suite 600', 'Active'),
    ('Downtown Crossing Center', 'Suite 700', 'Inactive'),
    
    -- Beacon Hill Plaza units
    ('Beacon Hill Plaza', 'Unit 1', 'Active'),
    ('Beacon Hill Plaza', 'Unit 2', 'Active'),
    ('Beacon Hill Plaza', 'Unit 3', 'Inactive'),
    
    -- Empire State Plaza units
    ('Empire State Plaza', 'Floor 15 Suite A', 'Active'),
    ('Empire State Plaza', 'Floor 15 Suite B', 'Active'),
    ('Empire State Plaza', 'Floor 16 Suite A', 'Inactive'),
    
    -- Manhattan Center units
    ('Manhattan Center', 'Suite 1000', 'Active'),
    ('Manhattan Center', 'Suite 2000', 'Inactive'),
    ('Manhattan Center', 'Suite 3000', 'Active'),
    
    -- Bay View Tower units
    ('Bay View Tower', 'Floor 30 Suite A', 'Active'),
    ('Bay View Tower', 'Floor 30 Suite B', 'Active'),
    ('Bay View Tower', 'Floor 31 Suite A', 'Inactive'),
    
    -- Financial District Plaza units
    ('Financial District Plaza', 'Suite 100', 'Active'),
    ('Financial District Plaza', 'Suite 200', 'Active'),
    ('Financial District Plaza', 'Suite 300', 'Inactive')
) AS u(location_name, unit_number, status)
WHERE l.name = u.location_name;