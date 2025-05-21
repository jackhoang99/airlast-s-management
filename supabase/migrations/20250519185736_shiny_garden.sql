/*
  # Add sample data to labor and other item price tables
  
  1. Changes
    - Add sample labor pricing data to job_item_labor_prices table
    - Add sample other item pricing data to job_item_other_prices table
  
  2. Data Structure
    - Labor items include skill level, overtime status, etc.
    - Other items include category, taxable status, etc.
*/

-- Insert sample labor pricing data
INSERT INTO job_item_labor_prices (
  code,
  name,
  description,
  service_line,
  unit_cost,
  skill_level,
  is_overtime,
  is_emergency,
  duration_hours
) VALUES
  ('LABOR-TECH-REG', 'Technician Labor Rate (Regular)', 'Standard technician hourly rate', 'TRNG', 85.00, 'standard', false, false, 1.00),
  ('LABOR-TECH-OT', 'Technician Labor Rate (Overtime)', 'Overtime technician hourly rate', 'TRNG', 127.50, 'standard', true, false, 1.00),
  ('LABOR-TECH-EM', 'Technician Labor Rate (Emergency)', 'Emergency service technician hourly rate', 'TRNG', 170.00, 'standard', false, true, 1.00),
  ('LABOR-SENIOR-REG', 'Senior Technician Labor Rate (Regular)', 'Senior technician hourly rate', 'TRNG', 110.00, 'senior', false, false, 1.00),
  ('LABOR-SENIOR-OT', 'Senior Technician Labor Rate (Overtime)', 'Senior technician overtime hourly rate', 'TRNG', 165.00, 'senior', true, false, 1.00),
  ('LABOR-SENIOR-EM', 'Senior Technician Labor Rate (Emergency)', 'Senior technician emergency hourly rate', 'TRNG', 220.00, 'senior', false, true, 1.00),
  ('LABOR-MASTER-REG', 'Master Technician Labor Rate (Regular)', 'Master technician hourly rate', 'TRNG', 135.00, 'master', false, false, 1.00),
  ('LABOR-MASTER-OT', 'Master Technician Labor Rate (Overtime)', 'Master technician overtime hourly rate', 'TRNG', 202.50, 'master', true, false, 1.00),
  ('LABOR-MASTER-EM', 'Master Technician Labor Rate (Emergency)', 'Master technician emergency hourly rate', 'TRNG', 270.00, 'master', false, true, 1.00),
  ('LABOR-HELPER-REG', 'Helper Labor Rate (Regular)', 'Helper hourly rate', 'TRNG', 45.00, 'helper', false, false, 1.00),
  ('LABOR-PM-STD', 'Preventative Maintenance Labor', 'Standard preventative maintenance service', 'EQMAINT', 95.00, 'standard', false, false, 2.00),
  ('LABOR-DIAG', 'Diagnostic Service', 'System diagnostic service', 'TESTBAL', 125.00, 'senior', false, false, 1.50),
  ('LABOR-INSTALL-SPLIT', 'Split System Installation Labor', 'Labor for split system installation', 'INST', 450.00, 'senior', false, false, 6.00),
  ('LABOR-INSTALL-PKG', 'Package Unit Installation Labor', 'Labor for package unit installation', 'INST', 350.00, 'senior', false, false, 4.00),
  ('LABOR-STARTUP', 'System Startup and Testing', 'New system startup and testing', 'START', 150.00, 'senior', false, false, 2.00),
  ('LABOR-FAKE-REG', 'FAKE Tech Labor Rate (Regular)', 'Regular labor rate', 'TRNG', 85.00, 'standard', false, false, 1.00),
  ('LABOR-FAKE-OT', 'FAKE Tech Labor Rate (Overtime)', 'Overtime labor rate', 'TRNG', 112.50, 'standard', true, false, 1.00)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  service_line = EXCLUDED.service_line,
  unit_cost = EXCLUDED.unit_cost,
  skill_level = EXCLUDED.skill_level,
  is_overtime = EXCLUDED.is_overtime,
  is_emergency = EXCLUDED.is_emergency,
  duration_hours = EXCLUDED.duration_hours;

-- Insert sample other item pricing data
INSERT INTO job_item_other_prices (
  code,
  name,
  description,
  service_line,
  unit_cost,
  category,
  is_taxable
) VALUES
  ('LMCP-1', 'Level 1 Main Computer Diagnostic', 'Level 1 diagnostic service', 'TESTBAL', 1200.00, 'Diagnostic Services', true),
  ('LSSC-1', 'Life Support Service Call', 'Emergency life support system service', 'SAFT', 2450.00, 'Emergency Services', true),
  ('SPACE-DISPOSAL', 'Space Disposal', 'Proper disposal of hazardous materials', 'SAFT', 99.99, 'Disposal Services', true),
  ('TRIP-CHARGE', 'Trip Charge', 'Standard trip charge', 'OTHR', 75.00, 'Service Fees', true),
  ('DIAG-FEE', 'Diagnostic Fee', 'Standard diagnostic fee', 'TESTBAL', 89.00, 'Service Fees', true),
  ('PERMIT-STD', 'Standard Permit Fee', 'Standard municipal permit fee', 'OTHR', 150.00, 'Permits', false),
  ('PERMIT-COMM', 'Commercial Permit Fee', 'Commercial municipal permit fee', 'OTHR', 350.00, 'Permits', false),
  ('RECOVERY-R410A', 'R410A Refrigerant Recovery', 'Recovery of R410A refrigerant', 'REFRG', 125.00, 'Refrigerant Services', true),
  ('RECOVERY-R32', 'R32 Refrigerant Recovery', 'Recovery of R32 refrigerant', 'REFRG', 145.00, 'Refrigerant Services', true),
  ('MAINT-PLAN-RES', 'Residential Maintenance Plan', 'Annual residential maintenance plan', 'EQMAINT', 249.00, 'Maintenance Plans', false),
  ('MAINT-PLAN-COM', 'Commercial Maintenance Plan', 'Annual commercial maintenance plan', 'EQMAINT', 599.00, 'Maintenance Plans', false),
  ('WARR-EXT-1YR', '1-Year Extended Warranty', '1-year extended warranty', 'OTHR', 199.00, 'Warranties', false),
  ('WARR-EXT-5YR', '5-Year Extended Warranty', '5-year extended warranty', 'OTHR', 599.00, 'Warranties', false),
  ('WARR-LABOR-1YR', '1-Year Labor Warranty', '1-year labor warranty', 'OTHR', 149.00, 'Warranties', false),
  ('AFTER-HOURS', 'After Hours Fee', 'After hours service fee', 'OTHR', 150.00, 'Service Fees', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  service_line = EXCLUDED.service_line,
  unit_cost = EXCLUDED.unit_cost,
  category = EXCLUDED.category,
  is_taxable = EXCLUDED.is_taxable;