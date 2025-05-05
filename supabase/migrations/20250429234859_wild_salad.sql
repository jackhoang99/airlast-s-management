/*
  # Import company and location data
  
  1. Data Import
    - Insert companies with proper UUIDs
    - Insert locations with references to company UUIDs
    - All records set as Active by default
  2. Data Structure
    - Companies include name, address, contact info
    - Locations include name, address, company reference
*/

-- Insert companies first
WITH company_data AS (
  INSERT INTO companies (name, address, city, state, zip, phone, status)
  VALUES
    ('5Rivers', '945 Heights Blvd', 'Houtson', 'TX', '77008', '(870) 493-2534', 'Active'),
    ('Aldea Ministry', '1101 Summit Ave', 'Greensboro', 'NC', '27405', NULL, 'Active'),
    ('Bridger Properties', '3565 Piedmont Road NE Bldg 4', 'Atlanta', 'GA', '30305', '(678) 655-0999', 'Active'),
    ('David Martos', '1230 Peachtree Street NE', 'Atlanta', 'GA', '30309', '(404) 574-1003', 'Active'),
    ('Faropoint', '111 River Street, Suite 1010', 'Hoboken', 'NJ', '7030', '(470) 220-3113', 'Active'),
    ('Klingon High Council', '201 West Davis Street', 'Burlington', 'NC', '27215', '(336) 378-9774', 'Active'),
    ('Net Leased Management', '10951 Sorrento Valley Road, Suite 2-A', 'San Diego', 'CA', '92121', '(858) 200-4265', 'Active'),
    ('Pinnacle Leasing & Management', '5865 North Point Pkwy', 'Alpharetta', 'GA', '30022', '(404) 375-0745', 'Active'),
    ('Quark''s Holdings LLC', '100 East Davie Street', 'Raleigh', 'NC', '27601', '(336) 274-1373', 'Active'),
    ('Risian Cultural Exchange', '201 West Main Street', 'Durham', 'NC', '27701', NULL, 'Active'),
    ('The Borg Collective', '2401 Utah Avenue South', 'Seattle', 'WA', '98134', '(555) 336-1234', 'Active')
  RETURNING id, name
)
INSERT INTO locations (company_id, name, address, city, state, zip, status)
SELECT 
  cd.id,
  l.name,
  l.address,
  l.city,
  l.state,
  l.zip,
  'Active'
FROM company_data cd,
LATERAL (
  VALUES 
    -- 5Rivers locations
    ('5Rivers', 'Daiso', '112 Pavilion Parkway', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 128B', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 127', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 405', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 400', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 123', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 128A', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 96B', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 240', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite 1360D', 'Fayetteville', 'GA', '30214'),
    ('5Rivers', 'Fayetteville Pavillion', '72 Pavilion Parkway Suite ii-13 (Headspace)', 'Fayetteville', 'GA', '30214'),

    -- Aldea Ministry locations
    ('Aldea Ministry', 'The Aldean Children''s Hosiptal', '3403 NE 1st Ave', 'Miami', 'FL', '33137'),

    -- Bridger Properties locations
    ('Bridger Properties', '1040 Boulevard', '1040 Boulevard SE', 'Atlanta', 'GA', '30312'),
    ('Bridger Properties', '7 Tequilas', '115 Church Street', 'Marietta', 'GA', '30060'),
    ('Bridger Properties', 'Creative Lofts', '650 Hamilton Ave SE', 'Atlanta', 'GA', '30312'),
    ('Bridger Properties', 'Eden Smoothies', '91 Church Street', 'Marietta', 'GA', '30060'),
    ('Bridger Properties', 'Georgia Ave Upstairs', '33 Georgia Ave SE', 'Atlanta', 'GA', '30312'),
    ('Bridger Properties', 'Gianni and Macs', '85 Church Street', 'Marietta', 'GA', '30060'),
    ('Bridger Properties', 'Grant Street Suite 2', '1030 Grant Street Southeast', 'Atlanta', 'GA', '30315'),
    ('Bridger Properties', 'Grant Street Suite 7', '1030 Grant Street SE', 'Atlanta', 'GA', '30315'),
    ('Bridger Properties', 'Jeni''s Splendid Ice Cream', '93 Church Street', 'Marietta', 'GA', '30060'),
    ('Bridger Properties', 'Peachtree Crossing', '100 N Peachtree Parkway Suite 6', 'Peachtree city', 'GA', '30269'),

    -- David Martos locations
    ('David Martos', 'Cornelia Strip center', '216 Carpenters Cove Ln Suite A', 'Cornelia', 'GA', '30531'),
    ('David Martos', 'Cornelia Strip center', '216 Carpenters Cove Ln Suite B', 'Cornelia', 'GA', '30531'),
    ('David Martos', 'Cornelia Strip center', '216 Carpenters Cove Ln Suite C', 'Cornelia', 'GA', '30531'),
    ('David Martos', 'Cornelia Strip center', '216 Carpenters Cove Ln Suite D', 'Cornelia', 'GA', '30531'),

    -- Faropoint locations
    ('Faropoint', '5070 Minola Dr', '5070 Minola Dr.', 'Stonecrest', 'GA', '30038'),
    ('Faropoint', 'Phil Niekro', '4225 Phil Niekro Suite 108', 'Norcross', 'GA', '30093'),

    -- Klingon High Council locations
    ('Klingon High Council', 'Bat''leths & Disruptors Pawn', '1091 Virginia Center Pkwy', 'Glen Allen', 'VA', '23059'),
    ('Klingon High Council', 'Blood and Fire Winery', '917 Broadway St', 'Little Rock', 'AR', '72201'),
    ('Klingon High Council', 'Gagh & Gladst', '12011 University Blvd', 'Orlando', 'FL', '32817'),
    ('Klingon High Council', 'Kahless is More Consignment', '2190 34th St N', 'St. Petersburg', 'FL', '33713'),

    -- Net Leased Management locations
    ('Net Leased Management', 'Hooters McDonough', '1858 Jonesboro Rd.', 'McDonough', 'GA', '30253'),

    -- Pinnacle Leasing & Management locations
    ('Pinnacle Leasing & Management', 'D1 Fitness', '2569 Peachtree Pkwy', 'Cumming', 'GA', '30041'),
    ('Pinnacle Leasing & Management', 'Ellard Village', '8470 Holcomb Bridge Road Suite 560', 'Alpharetta', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Ellard Village', '8470 Holcomb Bridge Road Suite 140', 'Alpharetta', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Ellard Village', '8470 Holcomb Bridge Road Suite 160', 'Alpharetta', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Ellard Village', '8470 Holcomb Bridge Road Suite 170', 'Alpharetta', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Ellard Village', '8470 Holcomb Bridge Road Suite 220', 'Alpharetta', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Ellard Village', '8470 Holcomb Bridge Road Suite 520', 'Alpharetta', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Grand Slam Center', '11005 Jones bridge Rd Suite 107', 'Jones creek', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Hwy 20', '1541-1545 GA-20 Suite 102', 'McDonough', 'GA', '30253'),
    ('Pinnacle Leasing & Management', 'Lakeland Plaza', '501 Lakeland Plasa Suite 540A', 'Cumming', 'GA', '30040'),
    ('Pinnacle Leasing & Management', 'Lotique Atlanta', '560 Thornton Rd Suite 209', 'Lithia Springs', 'GA', '30122'),
    ('Pinnacle Leasing & Management', 'Omni Healthcare', '560 Thornton Rd, UNIT 214', 'Lithia Springs', 'GA', '30122'),
    ('Pinnacle Leasing & Management', 'Rivermont Square', '8560 Holcomb Bridge Road Suite 102', 'Alpharetta', 'GA', '30022'),
    ('Pinnacle Leasing & Management', 'Riverside Commons', '1090 Duluth Hwy Suite 1100,1200,1300 (1 space)', 'Lawrenceville', 'GA', '30043'),
    ('Pinnacle Leasing & Management', 'Spalding Center', '6365 Spalding Dr Suite E', 'Norcross', 'GA', '30092'),
    ('Pinnacle Leasing & Management', 'Spalding Center', '6365 Spalding Dr Suite B', 'Norcross', 'GA', '30092'),
    ('Pinnacle Leasing & Management', 'Windward Pkwy', '5815 Windward Pkwy Suite 211', 'Alpharetta', 'GA', '30005'),
    ('Pinnacle Leasing & Management', 'Windward Pkwy', '5815 Windward Pkwy Suite 210', 'Alpharetta', 'GA', '30005'),

    -- Quark's Holdings LLC locations
    ('Quark''s Holdings LLC', 'Quark''s Bar and Grill', '105 N Caraway Rd', 'Jonesboro', 'AR', '72401'),
    ('Quark''s Holdings LLC', 'Quark''s Holosuites Arcade #1', '826 Mississippi 12 W', 'Starkville', 'MS', '39759'),
    ('Quark''s Holdings LLC', 'Quark''s Holosuites Arcade #2', '116 Merchant Dr', 'Knoxville', 'TN', '37912'),
    ('Quark''s Holdings LLC', 'Quark''s Holosuites Arcade #3', '2840 55 High House Rd Shops', 'Cary', 'NC', '27519'),

    -- Risian Cultural Exchange locations
    ('Risian Cultural Exchange', 'Galartha Gastro Pub', '50 Hurt Plaza SEAtlanta', 'Atlanta', 'GA', '30303'),
    ('Risian Cultural Exchange', 'Risian Suns Spa', '1640 Freed Street', 'Columbia', 'SC', '29201'),
    ('Risian Cultural Exchange', 'Suraya Bay Seafood', '2056 Interstate Dr', 'Opelika', 'AL', '36801'),

    -- The Borg Collective locations
    ('The Borg Collective', 'AssimiLatte Coffee Shop (Store #1)', '7203 Highway 329', 'Crestwood', 'KY', '40014'),
    ('The Borg Collective', 'AssimiLatte Coffee Shop (Store #14)', '4404 W Wendover Ave', 'Greensboro', 'NC', '27407'),
    ('The Borg Collective', 'AssimiLatte Coffee Shop (Store #5)', '5040 Bayou Blvd', 'Pensacola', 'FL', '32503'),
    ('The Borg Collective', 'AssimiLatte Coffee Shop (Store #8)', '1286 US Hwy 72 E', 'Athens', 'AL', '35611')
) AS l(company_name, name, address, city, state, zip)
WHERE cd.name = l.company_name;