-- Add company_id to permits table
ALTER TABLE "public"."permits" 
ADD COLUMN "company_id" "uuid";

-- Add foreign key constraint
ALTER TABLE ONLY "public"."permits"
    ADD CONSTRAINT "permits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "permits_company_id_idx" ON "public"."permits" ("company_id");

-- Add comment
COMMENT ON COLUMN "public"."permits"."company_id" IS 'Reference to the company that owns this permit'; 