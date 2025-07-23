-- Create permits table
CREATE TABLE IF NOT EXISTS "public"."permits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "permit_number" "text" NOT NULL,
    "mobile" "text",
    "city" "text" NOT NULL,
    "county" "text" NOT NULL,
    "file_path" "text",
    "file_name" "text",
    "file_size" integer,
    "file_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "notes" "text",
    "location_id" "uuid",
    "company_id" "uuid",
    CONSTRAINT "permits_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'expired'::"text", 'pending'::"text"])))
);

-- Add primary key
ALTER TABLE ONLY "public"."permits"
    ADD CONSTRAINT "permits_pkey" PRIMARY KEY ("id");

-- Add unique constraint on permit_number
ALTER TABLE ONLY "public"."permits"
    ADD CONSTRAINT "permits_permit_number_key" UNIQUE ("permit_number");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."permits"
    ADD CONSTRAINT "permits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."permits"
    ADD CONSTRAINT "permits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "permits_city_idx" ON "public"."permits" ("city");
CREATE INDEX IF NOT EXISTS "permits_county_idx" ON "public"."permits" ("county");
CREATE INDEX IF NOT EXISTS "permits_status_idx" ON "public"."permits" ("status");
CREATE INDEX IF NOT EXISTS "permits_created_at_idx" ON "public"."permits" ("created_at");
CREATE INDEX IF NOT EXISTS "permits_location_id_idx" ON "public"."permits" ("location_id");
CREATE INDEX IF NOT EXISTS "permits_company_id_idx" ON "public"."permits" ("company_id");

-- Enable Row Level Security
ALTER TABLE "public"."permits" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all permits" ON "public"."permits" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Users can insert permits" ON "public"."permits" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Users can update permits" ON "public"."permits" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete permits" ON "public"."permits" FOR DELETE TO "authenticated" USING (true);

-- Create trigger for updated_at
CREATE TRIGGER "update_permits_updated_at" BEFORE UPDATE ON "public"."permits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add comments
COMMENT ON TABLE "public"."permits" IS 'Stores permit information including permit numbers, location details, and file attachments';
COMMENT ON COLUMN "public"."permits"."permit_number" IS 'Unique permit number issued by the jurisdiction';
COMMENT ON COLUMN "public"."permits"."mobile" IS 'Mobile number for permit contact';
COMMENT ON COLUMN "public"."permits"."city" IS 'City where the permit is issued';
COMMENT ON COLUMN "public"."permits"."county" IS 'County where the permit is issued';
COMMENT ON COLUMN "public"."permits"."file_path" IS 'Path to the permit file in storage';
COMMENT ON COLUMN "public"."permits"."file_name" IS 'Original filename of the uploaded permit';
COMMENT ON COLUMN "public"."permits"."file_size" IS 'Size of the permit file in bytes';
COMMENT ON COLUMN "public"."permits"."file_type" IS 'MIME type of the permit file';
COMMENT ON COLUMN "public"."permits"."status" IS 'Current status of the permit (active, inactive, expired, pending)';
COMMENT ON COLUMN "public"."permits"."notes" IS 'Additional notes about the permit';
COMMENT ON COLUMN "public"."permits"."location_id" IS 'Reference to the location this permit belongs to';
COMMENT ON COLUMN "public"."permits"."company_id" IS 'Reference to the company that owns this permit'; 