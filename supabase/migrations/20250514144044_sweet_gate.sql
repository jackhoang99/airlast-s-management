/*
  # Update job types with comprehensive list
  
  1. Changes
    - Clear existing job types
    - Insert complete list of job types
    - Maintain existing constraints and relationships
  2. Data
    - Add all HVAC-specific job types
    - Link to appropriate service lines
*/

-- First remove existing job types
TRUNCATE TABLE job_types CASCADE;

-- Insert comprehensive list of job types
INSERT INTO job_types (name, code, description, service_line_id) VALUES
  ('Administrative', 'ADMIN', 'Administrative tasks and paperwork', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Buildout', 'BUILD', 'Building and construction work', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Cleaning', 'CLEAN', 'System and component cleaning', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Construction', 'CONST', 'New construction installation', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Consultation', 'CONSULT', 'Customer consultation and assessment', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Delivery', 'DELIV', 'Equipment and parts delivery', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Design', 'DESIGN', 'System design and planning', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Emergency Service Call', 'EMERG', 'Emergency repair services', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Exchange', 'EXCH', 'Equipment exchange or swap', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Hookup', 'HOOK', 'System connection and hookup', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Inspection', 'INSP', 'System inspection and assessment', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Inspection Repair', 'INSPR', 'Repairs identified during inspection', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Installation', 'INST', 'New equipment installation', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Pickup', 'PICK', 'Equipment or parts pickup', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Planned Maintenance', 'PLANM', 'Scheduled maintenance work', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Preventative Maintenance', 'PM', 'Regular preventative maintenance', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Priority Inspection', 'PRINS', 'Urgent inspection needs', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Priority Service Call', 'PRSVC', 'High-priority service requests', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Quality Assurance', 'QA', 'Quality checks and verification', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Reinspection', 'REINS', 'Follow-up inspection', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Repair', 'REP', 'Equipment repairs', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Replacement', 'REPL', 'Equipment replacement', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Retrofit', 'RETRO', 'System retrofitting and upgrades', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Sales', 'SALES', 'Equipment and service sales', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Service Call', 'SVC', 'General service calls', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Start Up', 'START', 'New system startup and testing', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Survey', 'SURV', 'Site and system surveys', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Testing', 'TEST', 'System testing and diagnostics', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Training', 'TRAIN', 'Customer or staff training', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Unknown', 'UNK', 'Unclassified job type', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Upgrade', 'UPG', 'System upgrades', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Urgent Service Call', 'URG', 'Time-sensitive service needs', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Warranty Call', 'WAR', 'Warranty-related service', (SELECT id FROM service_lines WHERE code = 'HVAC'));