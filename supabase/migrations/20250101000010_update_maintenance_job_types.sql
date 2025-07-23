-- Update maintenance job types logic
-- Add new "maintenance" job type
INSERT INTO "public"."job_types" ("name", "code", "description", "is_active") 
VALUES ('Maintenance', 'MAINT', 'General maintenance jobs (PM or ONE)', true)
ON CONFLICT (name) DO NOTHING;

-- Update the jobs table constraint to include the new maintenance type
-- First, drop the existing constraint
ALTER TABLE "public"."jobs" DROP CONSTRAINT IF EXISTS "jobs_type_check";

-- Add the new constraint with the updated job types
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_type_check" 
CHECK (("type" = ANY (ARRAY['administrative'::"text", 'buildout'::"text", 'cleaning'::"text", 'construction'::"text", 'consultation'::"text", 'delivery'::"text", 'design'::"text", 'emergency service call'::"text", 'exchange'::"text", 'hookup'::"text", 'inspection'::"text", 'inspection repair'::"text", 'installation'::"text", 'maintenance'::"text", 'pickup'::"text", 'planned maintenance'::"text", 'preventative maintenance'::"text", 'priority inspection'::"text", 'priority service call'::"text", 'quality assurance'::"text", 'reinspection'::"text", 'repair'::"text", 'replacement'::"text", 'retrofit'::"text", 'sales'::"text", 'service call'::"text", 'start up'::"text", 'survey'::"text", 'testing'::"text", 'training'::"text", 'unknown'::"text", 'upgrade'::"text", 'urgent service call'::"text", 'warranty call'::"text"])));

-- Add a new column to track if the customer is on agreement
ALTER TABLE "public"."jobs" 
ADD COLUMN "is_agreement_customer" boolean DEFAULT false;

-- Add comment to explain the new field
COMMENT ON COLUMN "public"."jobs"."is_agreement_customer" IS 'Whether the customer is on a maintenance agreement (determines PM vs ONE additional types)'; 