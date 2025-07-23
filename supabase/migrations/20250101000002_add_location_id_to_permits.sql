-- Add location_id to permits table
ALTER TABLE "public"."permits" 
ADD COLUMN "location_id" "uuid";

-- Add foreign key constraint
ALTER TABLE ONLY "public"."permits"
    ADD CONSTRAINT "permits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "permits_location_id_idx" ON "public"."permits" ("location_id");

-- Add comment
COMMENT ON COLUMN "public"."permits"."location_id" IS 'Reference to the location where this permit is applicable'; 