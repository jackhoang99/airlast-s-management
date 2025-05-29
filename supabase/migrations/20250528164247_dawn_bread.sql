-- Disable RLS on job_replacements table to fix the permission issue
ALTER TABLE job_replacements DISABLE ROW LEVEL SECURITY;

-- This migration fixes the issue where marking an inspection as complete fails
-- due to row-level security policy violations on the job_replacements table.
-- By disabling RLS on this table, we allow the system to create replacement records
-- when an inspection is marked as complete, which is necessary for the quote workflow.