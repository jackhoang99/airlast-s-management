-- Insert test technicians
INSERT INTO technicians (
  first_name,
  last_name,
  email,
  phone,
  hire_date,
  status,
  job_title,
  hourly_rate
) VALUES
  ('Airlast', 'Demo', 'demo@airlast.com', '(555) 123-4567', DATE '2025-01-01', 'active', 'Senior Technician', 45.00),
  ('Jane', 'Tech', 'jane.tech@airlast.com', '(555) 234-5678', DATE '2025-02-01', 'active', 'HVAC Technician', 35.00),
  ('John', 'Tech', 'john.tech@airlast.com', '(555) 345-6789', DATE '2025-03-01', 'active', 'HVAC Technician', 35.00);

-- Add skills for technicians
WITH tech_ids AS (
  SELECT id, first_name FROM technicians
)
INSERT INTO technician_skills (
  technician_id,
  skill_name,
  proficiency_level,
  years_experience
)
SELECT 
  t.id,
  s.skill_name,
  s.proficiency_level,
  s.years_experience
FROM tech_ids t,
LATERAL (
  VALUES 
    ('Airlast', 'HVAC Installation', 'expert', 10),
    ('Airlast', 'HVAC Repair', 'expert', 10),
    ('Airlast', 'Preventative Maintenance', 'expert', 10),
    ('Jane', 'HVAC Installation', 'advanced', 5),
    ('Jane', 'HVAC Repair', 'intermediate', 3),
    ('John', 'HVAC Installation', 'intermediate', 2),
    ('John', 'HVAC Repair', 'advanced', 4)
) AS s(tech_name, skill_name, proficiency_level, years_experience)
WHERE t.first_name = s.tech_name;

-- Add certifications
WITH tech_ids AS (
  SELECT id, first_name FROM technicians
)
INSERT INTO technician_certifications (
  technician_id,
  certification_name,
  issuing_organization,
  certification_number,
  issue_date,
  expiry_date,
  status
)
SELECT 
  t.id,
  c.cert_name,
  c.org,
  c.number,
  DATE(c.issue_date),
  DATE(c.expiry_date),
  'active'
FROM tech_ids t,
LATERAL (
  VALUES 
    ('Airlast', 'HVAC Master License', 'HVAC Board', 'ML123456', '2024-01-01', '2026-01-01'),
    ('Jane', 'HVAC Technician License', 'HVAC Board', 'TL234567', '2024-02-01', '2026-02-01'),
    ('John', 'HVAC Technician License', 'HVAC Board', 'TL345678', '2024-03-01', '2026-03-01')
) AS c(tech_name, cert_name, org, number, issue_date, expiry_date)
WHERE t.first_name = c.tech_name;

-- Add availability (Monday-Friday, 8 AM - 5 PM)
WITH tech_ids AS (
  SELECT id FROM technicians
)
INSERT INTO technician_availability (
  technician_id,
  day_of_week,
  start_time,
  end_time
)
SELECT 
  t.id,
  d.day,
  TIME '08:00',
  TIME '17:00'
FROM tech_ids t
CROSS JOIN (
  SELECT generate_series(0, 4) as day
) d;