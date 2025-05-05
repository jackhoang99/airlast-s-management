/*
  # Update locations and units with all data

  1. Changes
    - Clear existing data
    - Insert all locations with proper building names
    - Create corresponding units for each location
  2. Data Structure
    - Locations include building name and address info
    - Units include unit numbers and status
*/

-- Clear existing data
TRUNCATE TABLE units CASCADE;
TRUNCATE TABLE locations CASCADE;

-- Insert all locations and their units
WITH inserted_locations AS (
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
    -- 5Rivers locations
    ('Daiso', 'Daiso', '112 Pavilion Parkway', 'Fayetteville', 'GA', '30214', 'Active', (SELECT id FROM companies WHERE name = '5Rivers')),
    ('Fayetteville Pavillion', 'Fayetteville Pavillion', '72 Pavilion Parkway', 'Fayetteville', 'GA', '30214', 'Active', (SELECT id FROM companies WHERE name = '5Rivers')),
    
    -- Aldea Ministry locations
    ('The Aldean Children''s Hospital', 'The Aldean Children''s Hospital', '3403 NE 1st Ave', 'Miami', 'FL', '33137', 'Active', (SELECT id FROM companies WHERE name = 'Aldea Ministry')),
    
    -- Bridger Properties locations
    ('1040 Boulevard', '1040 Boulevard', '1040 Boulevard SE', 'Atlanta', 'GA', '30312', 'Active', (SELECT id FROM companies WHERE name = 'Bridger Properties')),
    ('Church Street Plaza', 'Church Street Plaza', '85-115 Church Street', 'Marietta', 'GA', '30060', 'Active', (SELECT id FROM companies WHERE name = 'Bridger Properties')),
    ('Creative Lofts', 'Creative Lofts', '650 Hamilton Ave SE', 'Atlanta', 'GA', '30312', 'Active', (SELECT id FROM companies WHERE name = 'Bridger Properties')),
    ('Georgia Ave Upstairs', 'Georgia Ave Upstairs', '33 Georgia Ave SE', 'Atlanta', 'GA', '30312', 'Active', (SELECT id FROM companies WHERE name = 'Bridger Properties')),
    ('Grant Street Complex', 'Grant Street Complex', '1030 Grant Street SE', 'Atlanta', 'GA', '30315', 'Active', (SELECT id FROM companies WHERE name = 'Bridger Properties')),
    ('Peachtree Crossing', 'Peachtree Crossing', '100 N Peachtree Parkway', 'Peachtree city', 'GA', '30269', 'Active', (SELECT id FROM companies WHERE name = 'Bridger Properties')),
    
    -- David Martos locations
    ('Cornelia Strip Center', 'Cornelia Strip Center', '216 Carpenters Cove Ln', 'Cornelia', 'GA', '30531', 'Active', (SELECT id FROM companies WHERE name = 'David Martos')),
    
    -- Faropoint locations
    ('Minola Distribution Center', 'Minola Distribution Center', '5070 Minola Dr.', 'Stonecrest', 'GA', '30038', 'Active', (SELECT id FROM companies WHERE name = 'Faropoint')),
    ('Phil Niekro Center', 'Phil Niekro Center', '4225 Phil Niekro', 'Norcross', 'GA', '30093', 'Active', (SELECT id FROM companies WHERE name = 'Faropoint')),
    
    -- Klingon High Council locations
    ('Bat''leths & Disruptors', 'Bat''leths & Disruptors', '1091 Virginia Center Pkwy', 'Glen Allen', 'VA', '23059', 'Active', (SELECT id FROM companies WHERE name = 'Klingon High Council')),
    ('Blood and Fire Winery', 'Blood and Fire Winery', '917 Broadway St', 'Little Rock', 'AR', '72201', 'Active', (SELECT id FROM companies WHERE name = 'Klingon High Council')),
    ('Gagh & Gladst', 'Gagh & Gladst', '12011 University Blvd', 'Orlando', 'FL', '32817', 'Active', (SELECT id FROM companies WHERE name = 'Klingon High Council')),
    ('Kahless is More', 'Kahless is More', '2190 34th St N', 'St. Petersburg', 'FL', '33713', 'Active', (SELECT id FROM companies WHERE name = 'Klingon High Council')),
    
    -- Net Leased Management locations
    ('Hooters McDonough', 'Hooters McDonough', '1858 Jonesboro Rd.', 'McDonough', 'GA', '30253', 'Active', (SELECT id FROM companies WHERE name = 'Net Leased Management')),
    
    -- Pinnacle Leasing & Management locations
    ('D1 Fitness', 'D1 Fitness', '2569 Peachtree Pkwy', 'Cumming', 'GA', '30041', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Ellard Village', 'Ellard Village', '8470 Holcomb Bridge Road', 'Alpharetta', 'GA', '30022', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Grand Slam Center', 'Grand Slam Center', '11005 Jones Bridge Rd', 'Jones creek', 'GA', '30022', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Hwy 20 Center', 'Hwy 20 Center', '1541-1545 GA-20', 'McDonough', 'GA', '30253', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Lakeland Plaza', 'Lakeland Plaza', '501 Lakeland Plaza', 'Cumming', 'GA', '30040', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Thornton Plaza', 'Thornton Plaza', '560 Thornton Rd', 'Lithia Springs', 'GA', '30122', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Rivermont Square', 'Rivermont Square', '8560 Holcomb Bridge Road', 'Alpharetta', 'GA', '30022', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Riverside Commons', 'Riverside Commons', '1090 Duluth Hwy', 'Lawrenceville', 'GA', '30043', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Spalding Center', 'Spalding Center', '6365 Spalding Dr', 'Norcross', 'GA', '30092', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    ('Windward Pkwy Center', 'Windward Pkwy Center', '5815 Windward Pkwy', 'Alpharetta', 'GA', '30005', 'Active', (SELECT id FROM companies WHERE name = 'Pinnacle Leasing & Management')),
    
    -- Quark's Holdings LLC locations
    ('Quark''s Bar and Grill', 'Quark''s Bar and Grill', '105 N Caraway Rd', 'Jonesboro', 'AR', '72401', 'Active', (SELECT id FROM companies WHERE name = 'Quark''s Holdings LLC')),
    ('Quark''s Holosuites', 'Quark''s Holosuites', '826 Mississippi 12 W', 'Starkville', 'MS', '39759', 'Active', (SELECT id FROM companies WHERE name = 'Quark''s Holdings LLC')),
    ('Quark''s Holosuites', 'Quark''s Holosuites', '116 Merchant Dr', 'Knoxville', 'TN', '37912', 'Active', (SELECT id FROM companies WHERE name = 'Quark''s Holdings LLC')),
    ('Quark''s Holosuites', 'Quark''s Holosuites', '2840 55 High House Rd Shops', 'Cary', 'NC', '27519', 'Active', (SELECT id FROM companies WHERE name = 'Quark''s Holdings LLC')),
    
    -- Risian Cultural Exchange locations
    ('Galartha Gastro Pub', 'Galartha Gastro Pub', '50 Hurt Plaza SE', 'Atlanta', 'GA', '30303', 'Active', (SELECT id FROM companies WHERE name = 'Risian Cultural Exchange')),
    ('Risian Suns Spa', 'Risian Suns Spa', '1640 Freed Street', 'Columbia', 'SC', '29201', 'Active', (SELECT id FROM companies WHERE name = 'Risian Cultural Exchange')),
    ('Suraya Bay Seafood', 'Suraya Bay Seafood', '2056 Interstate Dr', 'Opelika', 'AL', '36801', 'Active', (SELECT id FROM companies WHERE name = 'Risian Cultural Exchange')),
    
    -- The Borg Collective locations
    ('AssimiLatte Coffee Shop', 'AssimiLatte Coffee Shop', '7203 Highway 329', 'Crestwood', 'KY', '40014', 'Active', (SELECT id FROM companies WHERE name = 'The Borg Collective')),
    ('AssimiLatte Coffee Shop', 'AssimiLatte Coffee Shop', '4404 W Wendover Ave', 'Greensboro', 'NC', '27407', 'Active', (SELECT id FROM companies WHERE name = 'The Borg Collective')),
    ('AssimiLatte Coffee Shop', 'AssimiLatte Coffee Shop', '5040 Bayou Blvd', 'Pensacola', 'FL', '32503', 'Active', (SELECT id FROM companies WHERE name = 'The Borg Collective')),
    ('AssimiLatte Coffee Shop', 'AssimiLatte Coffee Shop', '1286 US Hwy 72 E', 'Athens', 'AL', '35611', 'Active', (SELECT id FROM companies WHERE name = 'The Borg Collective'))
  RETURNING id, name
)
INSERT INTO units (location_id, unit_number, status)
SELECT 
  l.id,
  u.unit_number,
  'Active'
FROM inserted_locations l,
LATERAL (
  VALUES 
    -- Fayetteville Pavillion units
    ('Fayetteville Pavillion', 'Suite 128B'),
    ('Fayetteville Pavillion', 'Suite 127'),
    ('Fayetteville Pavillion', 'Suite 405'),
    ('Fayetteville Pavillion', 'Suite 400'),
    ('Fayetteville Pavillion', 'Suite 123'),
    ('Fayetteville Pavillion', 'Suite 128A'),
    ('Fayetteville Pavillion', 'Suite 96B'),
    ('Fayetteville Pavillion', 'Suite 240'),
    ('Fayetteville Pavillion', 'Suite 1360D'),
    ('Fayetteville Pavillion', 'Suite ii-13'),
    
    -- Church Street Plaza units
    ('Church Street Plaza', 'Suite 85'),
    ('Church Street Plaza', 'Suite 91'),
    ('Church Street Plaza', 'Suite 93'),
    ('Church Street Plaza', 'Suite 115'),
    
    -- Grant Street Complex units
    ('Grant Street Complex', 'Suite 2'),
    ('Grant Street Complex', 'Suite 7'),
    
    -- Cornelia Strip Center units
    ('Cornelia Strip Center', 'Suite A'),
    ('Cornelia Strip Center', 'Suite B'),
    ('Cornelia Strip Center', 'Suite C'),
    ('Cornelia Strip Center', 'Suite D'),
    
    -- Phil Niekro Center units
    ('Phil Niekro Center', 'Suite 108'),
    
    -- Ellard Village units
    ('Ellard Village', 'Suite 140'),
    ('Ellard Village', 'Suite 160'),
    ('Ellard Village', 'Suite 170'),
    ('Ellard Village', 'Suite 220'),
    ('Ellard Village', 'Suite 520'),
    ('Ellard Village', 'Suite 560'),
    
    -- Grand Slam Center units
    ('Grand Slam Center', 'Suite 107'),
    
    -- Hwy 20 Center units
    ('Hwy 20 Center', 'Suite 102'),
    
    -- Lakeland Plaza units
    ('Lakeland Plaza', 'Suite 540A'),
    
    -- Thornton Plaza units
    ('Thornton Plaza', 'Suite 209'),
    ('Thornton Plaza', 'Suite 214'),
    
    -- Rivermont Square units
    ('Rivermont Square', 'Suite 102'),
    
    -- Riverside Commons units
    ('Riverside Commons', 'Suite 1100'),
    ('Riverside Commons', 'Suite 1200'),
    ('Riverside Commons', 'Suite 1300'),
    
    -- Spalding Center units
    ('Spalding Center', 'Suite B'),
    ('Spalding Center', 'Suite E'),
    
    -- Windward Pkwy Center units
    ('Windward Pkwy Center', 'Suite 210'),
    ('Windward Pkwy Center', 'Suite 211'),
    
    -- AssimiLatte Coffee Shop units
    ('AssimiLatte Coffee Shop', 'Store #1'),
    ('AssimiLatte Coffee Shop', 'Store #5'),
    ('AssimiLatte Coffee Shop', 'Store #8'),
    ('AssimiLatte Coffee Shop', 'Store #14')
) AS u(location_name, unit_number)
WHERE l.name = u.location_name;