/*
  # Update location building names with more variety
  
  1. Changes
    - Update existing locations with more descriptive building names
    - Ensure each location has a meaningful building name
  2. Data Structure
    - Maintains existing location data
    - Adds variety to building names
*/

-- Update locations with more descriptive building names
UPDATE locations
SET building_name = 
  CASE 
    -- Acme Properties locations
    WHEN name = 'Pine Valley Complex' THEN 'Pine Valley Main Building'
    WHEN name = 'Oak Ridge Center' THEN 'Oak Ridge Professional Center'
    WHEN name = 'Maple Court Plaza' THEN 'Maple Court Business Plaza'
    
    -- Stellar Management locations
    WHEN name = 'Ocean View Plaza' THEN 'Ocean View Towers'
    WHEN name = 'Harbor Point Tower' THEN 'Harbor Point Executive Building'
    WHEN name = 'Sunset Bay Complex' THEN 'Sunset Bay Business Center'
    
    -- Mountain View Holdings locations
    WHEN name = 'Summit Business Park' THEN 'Summit Corporate Headquarters'
    WHEN name = 'Alpine Office Center' THEN 'Alpine Professional Building'
    WHEN name = 'Peak Professional Plaza' THEN 'Peak Professional Complex'
    
    -- Coastal Investments locations
    WHEN name = 'Harbor View Center' THEN 'Harbor View Maritime Building'
    WHEN name = 'Maritime Plaza' THEN 'Maritime Commerce Center'
    
    -- Desert Sun Properties locations
    WHEN name = 'Saguaro Business Center' THEN 'Saguaro Office Tower'
    WHEN name = 'Sonoran Office Park' THEN 'Sonoran Business Campus'
    
    -- Evergreen Estates locations
    WHEN name = 'Rainier Tower' THEN 'Rainier Executive Tower'
    WHEN name = 'Cascade Center' THEN 'Cascade Professional Building'
    
    -- Lakefront Management locations
    WHEN name = 'Lakeshore Plaza' THEN 'Lakeshore Corporate Plaza'
    WHEN name = 'River Point Tower' THEN 'River Point Executive Suites'
    
    -- Urban Core Development locations
    WHEN name = 'Downtown Crossing Center' THEN 'Downtown Crossing Office Tower'
    WHEN name = 'Beacon Hill Plaza' THEN 'Beacon Hill Executive Center'
    
    -- Skyline Properties locations
    WHEN name = 'Empire State Plaza' THEN 'Empire State Business Center'
    WHEN name = 'Manhattan Center' THEN 'Manhattan Professional Tower'
    
    -- Golden Gate Realty locations
    WHEN name = 'Bay View Tower' THEN 'Bay View Corporate Tower'
    WHEN name = 'Financial District Plaza' THEN 'Financial District Executive Building'
    
    -- 5Rivers locations
    WHEN name = 'Daiso' THEN 'Daiso Retail Building'
    WHEN name = 'Fayetteville Pavillion' THEN 'Fayetteville Shopping Center'
    
    -- Aldea Ministry locations
    WHEN name = 'The Aldean Children''s Hospital' THEN 'Aldean Medical Center'
    
    -- Bridger Properties locations
    WHEN name = '1040 Boulevard' THEN '1040 Boulevard Building'
    WHEN name = 'Church Street Plaza' THEN 'Church Street Shopping Center'
    WHEN name = 'Creative Lofts' THEN 'Creative Arts Building'
    WHEN name = 'Georgia Ave Upstairs' THEN 'Georgia Avenue Professional Building'
    WHEN name = 'Grant Street Complex' THEN 'Grant Street Business Complex'
    WHEN name = 'Peachtree Crossing' THEN 'Peachtree Crossing Mall'
    
    -- David Martos locations
    WHEN name = 'Cornelia Strip Center' THEN 'Cornelia Retail Plaza'
    
    -- Faropoint locations
    WHEN name = 'Minola Distribution Center' THEN 'Minola Logistics Building'
    WHEN name = 'Phil Niekro Center' THEN 'Phil Niekro Business Center'
    
    -- Klingon High Council locations
    WHEN name = 'Bat''leths & Disruptors' THEN 'Warrior''s Armory Building'
    WHEN name = 'Blood and Fire Winery' THEN 'Klingon Vineyard Estate'
    WHEN name = 'Gagh & Gladst' THEN 'Klingon Culinary Center'
    WHEN name = 'Kahless is More' THEN 'Kahless Memorial Building'
    
    -- Net Leased Management locations
    WHEN name = 'Hooters McDonough' THEN 'McDonough Restaurant Building'
    
    -- Pinnacle Leasing & Management locations
    WHEN name = 'D1 Fitness' THEN 'D1 Athletic Complex'
    WHEN name = 'Ellard Village' THEN 'Ellard Village Shopping Center'
    WHEN name = 'Grand Slam Center' THEN 'Grand Slam Sports Complex'
    WHEN name = 'Hwy 20 Center' THEN 'Highway 20 Business Park'
    WHEN name = 'Lakeland Plaza' THEN 'Lakeland Shopping Center'
    WHEN name = 'Thornton Plaza' THEN 'Thornton Business Plaza'
    WHEN name = 'Rivermont Square' THEN 'Rivermont Professional Building'
    WHEN name = 'Riverside Commons' THEN 'Riverside Office Park'
    WHEN name = 'Spalding Center' THEN 'Spalding Medical Building'
    WHEN name = 'Windward Pkwy Center' THEN 'Windward Executive Suites'
    
    -- Quark's Holdings LLC locations
    WHEN name = 'Quark''s Bar and Grill' THEN 'Ferengi Entertainment Complex'
    WHEN name = 'Quark''s Holosuites' THEN 'Quark''s Recreation Center'
    
    -- Risian Cultural Exchange locations
    WHEN name = 'Galartha Gastro Pub' THEN 'Galartha Culinary Building'
    WHEN name = 'Risian Suns Spa' THEN 'Risian Wellness Center'
    WHEN name = 'Suraya Bay Seafood' THEN 'Suraya Bay Restaurant Building'
    
    -- The Borg Collective locations
    WHEN name = 'AssimiLatte Coffee Shop' THEN 'Borg Cube Café'
    
    -- Default for any other locations
    ELSE 'Main Building'
  END
WHERE building_name = 'Main Building' OR building_name IS NULL OR building_name = '';