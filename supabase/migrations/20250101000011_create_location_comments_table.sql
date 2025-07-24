-- Create location_comments table
CREATE TABLE IF NOT EXISTS "public"."location_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- Add primary key
ALTER TABLE ONLY "public"."location_comments"
ADD CONSTRAINT "location_comments_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."location_comments"
ADD CONSTRAINT "location_comments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."location_comments"
ADD CONSTRAINT "location_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");

-- Add indexes
CREATE INDEX "location_comments_location_id_idx" ON "public"."location_comments" USING "btree" ("location_id");
CREATE INDEX "location_comments_created_at_idx" ON "public"."location_comments" USING "btree" ("created_at");

-- Enable RLS
ALTER TABLE "public"."location_comments" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON "public"."location_comments" FOR SELECT USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON "public"."location_comments" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Enable update access for comment authors" ON "public"."location_comments" FOR UPDATE TO "authenticated" USING ("auth"."uid"() = "user_id") WITH CHECK ("auth"."uid"() = "user_id");
CREATE POLICY "Enable delete access for comment authors" ON "public"."location_comments" FOR DELETE TO "authenticated" USING ("auth"."uid"() = "user_id");

-- Grant permissions
GRANT ALL ON TABLE "public"."location_comments" TO "anon";
GRANT ALL ON TABLE "public"."location_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."location_comments" TO "service_role"; 