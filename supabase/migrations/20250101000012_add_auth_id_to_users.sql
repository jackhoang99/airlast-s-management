-- Add auth_id column to users table to link with Supabase auth
ALTER TABLE "public"."users" 
ADD COLUMN "auth_id" "uuid" REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX "users_auth_id_idx" ON "public"."users"("auth_id");

-- Add unique constraint to ensure one-to-one relationship
ALTER TABLE "public"."users" 
ADD CONSTRAINT "users_auth_id_unique" UNIQUE ("auth_id"); 