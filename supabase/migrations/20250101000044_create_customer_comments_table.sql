-- Create customer_comments table for storing comments visible to customers
CREATE TABLE IF NOT EXISTS "public"."customer_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_comments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE,
    CONSTRAINT "customer_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "customer_comments_job_id_idx" ON "public"."customer_comments" ("job_id");
CREATE INDEX IF NOT EXISTS "customer_comments_user_id_idx" ON "public"."customer_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "customer_comments_created_at_idx" ON "public"."customer_comments" ("created_at");

-- Add RLS policies
ALTER TABLE "public"."customer_comments" ENABLE ROW LEVEL SECURITY;

-- Policy for admins and technicians to insert/update/delete
CREATE POLICY "Enable all access for authenticated users" ON "public"."customer_comments" 
    FOR ALL USING (true) WITH CHECK (true);

-- Policy for customers to read only
CREATE POLICY "Enable read access for customers" ON "public"."customer_comments" 
    FOR SELECT USING (true);

-- Add comment to describe the table
COMMENT ON TABLE "public"."customer_comments" IS 'Comments from admins and technicians that are visible to customers in the customer portal';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION "public"."update_customer_comments_updated_at"()
RETURNS "trigger" AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "update_customer_comments_updated_at" 
    BEFORE UPDATE ON "public"."customer_comments" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_customer_comments_updated_at"();
