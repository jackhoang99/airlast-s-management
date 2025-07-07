// supabase/functions/schedule-job-reminders/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get reminder settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "job_reminders")
      .single();

    if (settingsError) {
      throw new Error(`Failed to fetch reminder settings: ${settingsError.message}`);
    }

    const settings = settingsData.value;
    if (!settings.enabled) {
      return new Response(
        JSON.stringify({ message: "Job reminders are disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const daysBefore = settings.days_before || 7;
    const reminderTypes = settings.reminder_types || ["email", "in_app"];
    const defaultEmail = settings.default_email || "jackhoang.99@gmail.com";

    // Calculate date range for jobs
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + daysBefore);
    
    // Format dates for SQL query
    const targetDateStart = targetDate.toISOString().split('T')[0];
    const targetDateEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Find jobs scheduled for the target date
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        id, 
        number, 
        name, 
        schedule_start, 
        contact_email,
        contact_name,
        locations (
          name
        )
      `)
      .gte("schedule_start", `${targetDateStart}T00:00:00`)
      .lt("schedule_start", `${targetDateEnd}T00:00:00`)
      .not("status", "eq", "completed")
      .not("status", "eq", "cancelled");

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    console.log(`Found ${jobs.length} jobs scheduled for ${targetDateStart}`);

    // Create reminders for each job
    const reminders = [];
    for (const job of jobs) {
      // Check if reminders already exist for this job
      const { data: existingReminders, error: checkError } = await supabase
        .from("job_reminders")
        .select("id")
        .eq("job_id", job.id)
        .eq("status", "pending")
        .is("sent_at", null);

      if (checkError) {
        console.error(`Error checking existing reminders for job ${job.id}: ${checkError.message}`);
        continue;
      }

      // Skip if reminders already exist
      if (existingReminders && existingReminders.length > 0) {
        console.log(`Reminders already exist for job ${job.id}`);
        continue;
      }

      // Create reminders for each type
      for (const type of reminderTypes) {
        const recipient = type === "email" 
          ? (job.contact_email || defaultEmail) 
          : "system";

        reminders.push({
          job_id: job.id,
          reminder_type: type,
          scheduled_for: now.toISOString(),
          recipient,
          status: "pending"
        });
      }
    }

    // Insert reminders
    let insertedCount = 0;
    if (reminders.length > 0) {
      const { data: insertedReminders, error: insertError } = await supabase
        .from("job_reminders")
        .insert(reminders)
        .select();

      if (insertError) {
        throw new Error(`Failed to insert reminders: ${insertError.message}`);
      }

      insertedCount = insertedReminders?.length || 0;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scheduled ${insertedCount} reminders for ${jobs.length} jobs` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error scheduling job reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});