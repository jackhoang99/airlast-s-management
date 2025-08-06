-- Optimize quote performance with additional indexes
-- Add index on job_quotes.created_at for faster ordering
CREATE INDEX IF NOT EXISTS "idx_job_quotes_created_at" ON "public"."job_quotes" ("created_at" DESC);

-- Add composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS "idx_job_quotes_type_created" ON "public"."job_quotes" ("quote_type", "created_at" DESC);

-- Add index on job_quotes.job_id for faster joins
CREATE INDEX IF NOT EXISTS "idx_job_quotes_job_id" ON "public"."job_quotes" ("job_id");

-- Add index on job_units for faster joins
CREATE INDEX IF NOT EXISTS "idx_job_units_job_id" ON "public"."job_units" ("job_id");

-- Add index on job_units.unit_id for faster joins
CREATE INDEX IF NOT EXISTS "idx_job_units_unit_id" ON "public"."job_units" ("unit_id");

-- Add index on jobs.created_at for faster ordering in related queries
CREATE INDEX IF NOT EXISTS "idx_jobs_created_at" ON "public"."jobs" ("created_at" DESC);

-- Add index on locations.company_id for faster company filtering
CREATE INDEX IF NOT EXISTS "idx_locations_company_id" ON "public"."locations" ("company_id");

-- Add index on companies.name for faster company name lookups
CREATE INDEX IF NOT EXISTS "idx_companies_name" ON "public"."companies" ("name");

-- Add index on units.unit_number for faster unit lookups
CREATE INDEX IF NOT EXISTS "idx_units_unit_number" ON "public"."units" ("unit_number");

-- Add composite index for PM quotes filtering
CREATE INDEX IF NOT EXISTS "idx_pm_quotes_job_created" ON "public"."pm_quotes" ("job_id", "created_at" DESC); 