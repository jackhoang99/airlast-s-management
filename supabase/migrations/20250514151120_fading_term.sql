/*
  # Add comprehensive service lines
  
  1. Changes
    - Clear existing service lines
    - Add all service lines with unique codes
    - Fix duplicate HVAC code issue
  2. Data
    - Each service line has a unique code
    - Includes descriptions for clarity
*/

-- First remove existing service lines
TRUNCATE TABLE service_lines CASCADE;

-- Insert comprehensive list of service lines
INSERT INTO service_lines (name, code, description) VALUES
  ('Air Conditioner', 'ACON', 'Air conditioning units and systems'),
  ('Air Curtains', 'ACURT', 'Air curtain systems and maintenance'),
  ('Air Terminal Unit', 'ATU', 'Air terminal unit systems'),
  ('Chilled Water', 'CWATER', 'Chilled water systems'),
  ('Chiller', 'CHLLR', 'Chiller systems and maintenance'),
  ('Comfort Controls', 'CFCTRL', 'Comfort control systems'),
  ('Commercial Air Handling', 'CAIRH', 'Commercial air handling systems'),
  ('Commercial Air Quality', 'CAIRQ', 'Commercial air quality systems'),
  ('Commercial Controls', 'CCTRL', 'Commercial control systems'),
  ('Commercial Cooling', 'CCOOL', 'Commercial cooling systems'),
  ('Commercial Ductwork', 'CDUCT', 'Commercial ductwork systems'),
  ('Commercial Heat Pump', 'CHPMP', 'Commercial heat pump systems'),
  ('Commercial Heating', 'COMHEAT', 'Commercial heating systems'),
  ('Compressor', 'COMP', 'Compressor systems and maintenance'),
  ('Computer Room Air Conditioner', 'CRAC', 'Computer room air conditioning'),
  ('Computer Room Air Handler', 'CRAH', 'Computer room air handling'),
  ('Condensing Unit', 'CU', 'Condensing unit systems'),
  ('Cooler', 'COOL', 'Cooling systems'),
  ('Cooling', 'COOLING', 'General cooling services'),
  ('Cooling Tower', 'COOLTWR', 'Cooling tower systems'),
  ('Display Cooler', 'DCOOL', 'Display cooling systems'),
  ('Electric Heating', 'EHEAT', 'Electric heating systems'),
  ('Equipment Maintenance', 'EQMAINT', 'General equipment maintenance'),
  ('Evaporative Cooler', 'EVACLR', 'Evaporative cooling systems'),
  ('Fan Coil Unit', 'FCU', 'Fan coil unit systems'),
  ('Freezer', 'FREEZE', 'Freezer systems'),
  ('Fuel Oil Pumps', 'FUELPMP', 'Fuel oil pump systems'),
  ('Furnace', 'FURN', 'Furnace systems'),
  ('General Residential', 'GEO', 'General residential services'),
  ('Geothermal', 'GEOTHERM', 'Geothermal systems'),
  ('Heat Exchanger', 'HEXCH', 'Heat exchanger systems'),
  ('Heat/Energy Recovery Ventilation', 'HRVERV', 'Heat/energy recovery ventilation'),
  ('Heating', 'HEATNG', 'General heating services'),
  ('Humidifier', 'HUMID', 'Humidification systems'),
  ('HVAC', 'HVACGEN', 'General HVAC services'),
  ('HVACR', 'HVACR', 'HVAC and refrigeration services'),
  ('Ice Machine', 'ICEMA', 'Ice machine systems'),
  ('Ice Rink Service', 'ICRNK', 'Ice rink service and maintenance'),
  ('Make-Up Air System', 'MUAS', 'Make-up air systems'),
  ('Motor', 'MOTOR', 'Motor systems and maintenance'),
  ('Office Clerical', 'OFFC', 'Office clerical services'),
  ('OTHER', 'OTHR', 'Other miscellaneous services'),
  ('Paid Time Off', 'PAID', 'Paid time off tracking'),
  ('Panel Cooler', 'PCOOL', 'Panel cooling systems'),
  ('Piping', 'PIPING', 'Piping systems and maintenance'),
  ('Planning', 'PLAN', 'Planning and scheduling services'),
  ('Pool Dehumidifier', 'POOLDEHUM', 'Pool dehumidification systems'),
  ('Prep Table', 'PRTAB', 'Preparation table systems'),
  ('Programming', 'PGR', 'System programming services'),
  ('Re-Heat Coil', 'RECOIL', 'Re-heat coil systems'),
  ('Reach-In Cooler', 'RICOO', 'Reach-in cooler systems'),
  ('Refrigeration', 'REFRG', 'Refrigeration systems'),
  ('Residential Air Handling', 'RAIRH', 'Residential air handling'),
  ('Residential Air Quality', 'RAIRQ', 'Residential air quality'),
  ('Residential Controls', 'RCTRL', 'Residential control systems'),
  ('Residential Cooling', 'RCOOL', 'Residential cooling systems'),
  ('Residential Ductwork', 'RDUCT', 'Residential ductwork'),
  ('Residential Heat Pump', 'RHPMP', 'Residential heat pump systems'),
  ('Residential Heating', 'RHEAT', 'Residential heating systems'),
  ('Rooftop Unit', 'RTU', 'Rooftop unit systems'),
  ('Safety', 'SAFT', 'Safety services and training'),
  ('Shop', 'SHOP', 'Shop services'),
  ('Sick', 'SICK', 'Sick time tracking'),
  ('Test and Balance', 'TESTBAL', 'Testing and balancing services'),
  ('Thermostat', 'THERM', 'Thermostat systems'),
  ('Training', 'TRNG', 'Training services'),
  ('Unit Heater', 'UHEAT', 'Unit heater systems'),
  ('Unpaid Time Off', 'UNPAID', 'Unpaid time off tracking'),
  ('Vehicle Maintenance', 'VMAINT', 'Vehicle maintenance tracking'),
  ('Ventilation', 'VENT', 'Ventilation systems'),
  ('Walk-In Cooler', 'WICOO', 'Walk-in cooler systems'),
  ('Walk-In Freezer', 'WIFRE', 'Walk-in freezer systems'),
  ('Wholesale', 'WHLSLE', 'Wholesale services');