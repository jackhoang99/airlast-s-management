-- Add auth_id column to users table to link with Supabase auth
-- Run this in your Supabase SQL Editor

-- Add the auth_id column
ALTER TABLE "public"."users" 
ADD COLUMN "auth_id" "uuid" REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX "users_auth_id_idx" ON "public"."users"("auth_id");

-- Add unique constraint to ensure one-to-one relationship
ALTER TABLE "public"."users" 
ADD CONSTRAINT "users_auth_id_unique" UNIQUE ("auth_id");

-- Update RLS policies to include auth_id if needed
-- You may need to update your RLS policies to use auth_id instead of id for user-specific data 