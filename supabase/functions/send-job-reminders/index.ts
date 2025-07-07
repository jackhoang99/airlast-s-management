// supabase/functions/send-job-reminders/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import sgMail from "npm:@sendgrid/mail";

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
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }
    
    if (!sendgridApiKey) {
      throw new Error("SendGrid API key is not set");
    }
    
    sgMail.setApiKey(sendgridApiKey);
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

    const defaultEmail = settings.default_email || "jackhoang.99@gmail.com";

    // Get pending reminders
    const { data: reminders, error: remindersError } = await supabase
      .from("job_reminders")
      .select(`
        id,
        job_id,
        reminder_type,
        scheduled_for,
        recipient,
        status,
        jobs (
          id,
          number,
          name,
          schedule_start,
          contact_name,
          locations (
            name,
            address,
            city,
            state,
            zip
          )
        )
      `)
      .eq("status", "pending")
      .is("sent_at", null);

    if (remindersError) {
      throw new Error(`Failed to fetch reminders: ${remindersError.message}`);
    }

    console.log(`Found ${reminders.length} pending reminders`);

    // Process each reminder
    const results = [];
    for (const reminder of reminders) {
      try {
        if (reminder.reminder_type === "email") {
          // Send email reminder
          const job = reminder.jobs;
          if (!job) {
            throw new Error(`Job not found for reminder ${reminder.id}`);
          }

          const jobDate = job.schedule_start 
            ? new Date(job.schedule_start).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Unscheduled';

          const location = job.locations 
            ? `${job.locations.name}, ${job.locations.address}, ${job.locations.city}, ${job.locations.state} ${job.locations.zip}`
            : 'No location specified';

          // Prepare email
          const msg = {
            to: reminder.recipient || defaultEmail,
            from: "support@airlast-management.com",
            subject: `Upcoming Job Reminder: ${job.name} (Job #${job.number})`,
            text: `
Hello ${job.contact_name || 'Customer'},

This is a reminder about your upcoming job:

Job #${job.number}: ${job.name}
Scheduled for: ${jobDate}
Location: ${location}

Please ensure you are prepared for this appointment. If you need to reschedule, please contact us as soon as possible.

Thank you,
Airlast HVAC Team
            `,
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #0672be; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Airlast HVAC</h1>
  </div>
  
  <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
    <p>Hello ${job.contact_name || 'Customer'},</p>
    
    <p>This is a reminder about your upcoming job:</p>
    
    <div style="background-color: #f0f7ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h2 style="margin-top: 0; color: #0672be;">Job #${job.number}: ${job.name}</h2>
      <p><strong>Scheduled for:</strong> ${jobDate}</p>
      <p><strong>Location:</strong> ${location}</p>
    </div>
    
    <p>Please ensure you are prepared for this appointment. If you need to reschedule, please contact us as soon as possible.</p>
    
    <p>Thank you,<br>Airlast HVAC Team</p>
  </div>
  
  <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
    <p>© 2025 Airlast HVAC. All rights reserved.</p>
    <p>1650 Marietta Boulevard Northwest, Atlanta, GA 30318</p>
  </div>
</div>
            `
          };

          // Send email
          await sgMail.send(msg);
          console.log(`Email sent for reminder ${reminder.id}`);
        }

        // Update reminder status
        const { error: updateError } = await supabase
          .from("job_reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", reminder.id);

        if (updateError) {
          throw new Error(`Failed to update reminder status: ${updateError.message}`);
        }

        results.push({
          id: reminder.id,
          success: true,
          message: `Reminder sent for job #${reminder.jobs?.number}`
        });
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        
        // Update reminder with error
        await supabase
          .from("job_reminders")
          .update({
            status: "failed",
            error_message: error.message
          })
          .eq("id", reminder.id);
        
        results.push({
          id: reminder.id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${reminders.length} reminders`,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending job reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});