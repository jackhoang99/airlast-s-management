-- Add "parts ordered" job type and related fields
-- Add new "parts ordered" job type
INSERT INTO "public"."job_types" ("name", "code", "description", "is_active") 
VALUES ('Parts Ordered', 'PARTS_ORDERED', 'Jobs where parts have been ordered and are waiting for arrival', true)
ON CONFLICT (name) DO NOTHING;

-- Add parts ordered fields to jobs table
ALTER TABLE "public"."jobs" 
ADD COLUMN "vendor" text,
ADD COLUMN "date_ordered" date,
ADD COLUMN "estimated_arrival_date" date,
ADD COLUMN "part_number" text,
ADD COLUMN "po_number" text;

-- Add comments to explain the new fields
COMMENT ON COLUMN "public"."jobs"."vendor" IS 'Vendor/supplier for the ordered parts';
COMMENT ON COLUMN "public"."jobs"."date_ordered" IS 'Date when parts were ordered';
COMMENT ON COLUMN "public"."jobs"."estimated_arrival_date" IS 'Estimated date when parts will arrive';
COMMENT ON COLUMN "public"."jobs"."part_number" IS 'Part number for the ordered parts';
COMMENT ON COLUMN "public"."jobs"."po_number" IS 'Purchase order number for the parts order';

-- Update the jobs table constraint to include the new parts ordered type
-- First, drop the existing constraint
ALTER TABLE "public"."jobs" DROP CONSTRAINT IF EXISTS "jobs_type_check";

-- Add the new constraint with the updated job types
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_type_check" 
CHECK (("type" = ANY (ARRAY['administrative'::"text", 'buildout'::"text", 'cleaning'::"text", 'construction'::"text", 'consultation'::"text", 'delivery'::"text", 'design'::"text", 'emergency service call'::"text", 'exchange'::"text", 'hookup'::"text", 'inspection'::"text", 'inspection repair'::"text", 'installation'::"text", 'maintenance'::"text", 'parts ordered'::"text", 'pickup'::"text", 'planned maintenance'::"text", 'preventative maintenance'::"text", 'priority inspection'::"text", 'priority service call'::"text", 'quality assurance'::"text", 'reinspection'::"text", 'repair'::"text", 'replacement'::"text", 'retrofit'::"text", 'sales'::"text", 'service call'::"text", 'start up'::"text", 'survey'::"text", 'testing'::"text", 'training'::"text", 'unknown'::"text", 'upgrade'::"text", 'urgent service call'::"text", 'warranty call'::"text"])));

