-- Add notes column to units table
ALTER TABLE "public"."units" 
ADD COLUMN "notes" text;

-- Add comment for the new column
COMMENT ON COLUMN "public"."units"."notes" IS 'Notes about the unit for internal reference';

