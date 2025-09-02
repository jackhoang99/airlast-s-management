import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { SENDGRID_API_KEY } = Deno.env.toObject();
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not set");
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    // Parse request body
    const { quoteId, jobId, token } = await req.json();

    if (!quoteId && !token) {
      return new Response(
        JSON.stringify({
          error: "Either quoteId or token is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ATOMIC CLAIM: Try to claim this quote for notification by setting admin_notification_sent_at
    // Only one invocation will succeed - others will get 0 rows affected
    let quoteData;
    let jobData;
    let claimSuccess = false;

    // Create timestamp with error handling
    const now = new Date();
    console.log("Date object:", now);
    console.log("Date type:", typeof now);
    console.log("Date value:", now.valueOf());

    // Generate timestamp - use a more reliable approach
    const timestamp = now.toISOString();
    console.log("Generated timestamp:", timestamp);
    console.log("Timestamp type:", typeof timestamp);

    // Validate timestamp
    if (!timestamp || timestamp === "null" || timestamp === "undefined") {
      throw new Error(`Failed to generate valid timestamp: ${timestamp}`);
    }

    console.log("Final timestamp being used:", timestamp);

    if (quoteId) {
      // Try to claim by quote ID
      console.log("About to update with timestamp:", timestamp);
      console.log("Update payload:", { admin_notification_sent_at: timestamp });

      // Use direct SQL to avoid any serialization issues
      const { data: claimResult, error: claimError } = await supabase
        .from("job_quotes")
        .update({ admin_notification_sent_at: timestamp })
        .eq("id", quoteId)
        .eq("admin_notification_sent_at", null)
        .select("id");

      if (claimError) {
        throw claimError;
      }

      // Check if we successfully claimed the quote (any rows returned means success)
      if (!claimResult || claimResult.length === 0) {
        console.log("Quote already claimed for notification, skipping...");
        return new Response(
          JSON.stringify({
            success: true,
            message:
              "Quote already claimed for notification, skipping duplicate",
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Fetch the updated quote data
      const { data: fetchedQuote, error: fetchError } = await supabase
        .from("job_quotes")
        .select(
          `
          *,
          jobs (
            id,
            number,
            name,
            contact_name,
            contact_email,
            locations (
              name,
              address,
              city,
              state,
              zip
            )
          )
        `
        )
        .eq("id", quoteId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      quoteData = fetchedQuote;
      jobData = fetchedQuote.jobs;
      claimSuccess = true;
    } else {
      // Try to claim by token
      console.log("About to update with timestamp (token):", timestamp);
      console.log("Update payload (token):", {
        admin_notification_sent_at: timestamp,
      });

      // First get the quote ID from the token
      const { data: quoteByToken, error: tokenError } = await supabase
        .from("job_quotes")
        .select("id")
        .eq("token", token)
        .single();

      if (tokenError) {
        throw tokenError;
      }

      if (!quoteByToken) {
        throw new Error("Quote not found with provided token");
      }

      // Use direct SQL to avoid any serialization issues
      const { data: claimResult, error: claimError } = await supabase
        .from("job_quotes")
        .update({ admin_notification_sent_at: timestamp })
        .eq("id", quoteByToken.id)
        .eq("admin_notification_sent_at", null)
        .select("id");

      if (claimError) {
        throw claimError;
      }

      // Check if we successfully claimed the quote (any rows returned means success)
      if (!claimResult || claimResult.length === 0) {
        console.log("Quote already claimed for notification, skipping...");
        return new Response(
          JSON.stringify({
            success: true,
            message:
              "Quote already claimed for notification, skipping duplicate",
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Fetch the updated quote data
      const { data: fetchedQuote, error: fetchError } = await supabase
        .from("job_quotes")
        .select(
          `
          *,
          jobs (
            id,
            number,
            name,
            contact_name,
            contact_email,
            locations (
              name,
              address,
              city,
              state,
              zip
            )
          )
        `
        )
        .eq("id", quoteByToken.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      quoteData = fetchedQuote;
      jobData = fetchedQuote.jobs;
      claimSuccess = true;
    }

    // If we didn't successfully claim the quote, something went wrong
    if (!claimSuccess || !quoteData || !jobData) {
      throw new Error(
        "Failed to claim quote for notification or quote/job not found"
      );
    }

    // Get the origin for building the job link
    const origin =
      req.headers.get("origin") || "https://airlast-management.com";
    const jobLink = `${origin}/jobs/${jobData.id}`;

    // Format the amount
    const formattedAmount = quoteData.amount
      ? `$${parseFloat(quoteData.amount).toLocaleString()}`
      : "Not specified";

    // Get quote type display name
    const getQuoteTypeDisplay = (type: string) => {
      switch (type) {
        case "repair":
          return "Repair Quote";
        case "replacement":
          return "Replacement Quote";
        case "pm":
          return "Preventative Maintenance Quote";
        case "inspection":
          return "Inspection Quote";
        default:
          return type.charAt(0).toUpperCase() + type.slice(1) + " Quote";
      }
    };

    const quoteTypeDisplay = getQuoteTypeDisplay(quoteData.quote_type);

    // Build email content
    const subject = `Quote Confirmed - ${quoteTypeDisplay} for Job #${jobData.number}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0672be; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Quote Confirmed!</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            A customer has confirmed a quote for one of your jobs.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e9ecef;">
            <h2 style="color: #0672be; margin-top: 0; font-size: 20px;">Quote Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; width: 40%;">Quote Type:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${quoteTypeDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Amount:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 18px; color: #28a745; font-weight: bold;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Quote Number:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${
                  quoteData.quote_number || "N/A"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Confirmed At:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${new Date(
                  quoteData.confirmed_at
                ).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e9ecef;">
            <h2 style="color: #0672be; margin-top: 0; font-size: 20px;">Job Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; width: 40%;">Job Number:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${
                  jobData.number
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Job Name:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${
                  jobData.name
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Customer:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${
                  jobData.contact_name || "N/A"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Customer Email:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${
                  jobData.contact_email || "N/A"
                }</td>
              </tr>
              ${
                jobData.locations
                  ? `
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Location:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">
                  ${jobData.locations.name}<br>
                  ${jobData.locations.address}<br>
                  ${jobData.locations.city}, ${jobData.locations.state} ${jobData.locations.zip}
                </td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${jobLink}" style="background-color: #0672be; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
              View Job Details
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6c757d; text-align: center; margin-top: 20px;">
            Click the button above to view the complete job details and take any necessary actions.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This is an automated notification from Airlast Management System</p>
        </div>
      </div>
    `;

    const emailText = `
Quote Confirmed - ${quoteTypeDisplay} for Job #${jobData.number}

A customer has confirmed a quote for one of your jobs.

QUOTE DETAILS:
- Quote Type: ${quoteTypeDisplay}
- Amount: ${formattedAmount}
- Quote Number: ${quoteData.quote_number || "N/A"}
- Confirmed At: ${new Date(quoteData.confirmed_at).toLocaleString()}

JOB INFORMATION:
- Job Number: ${jobData.number}
- Job Name: ${jobData.name}
- Customer: ${jobData.contact_name || "N/A"}
- Customer Email: ${jobData.contact_email || "N/A"}
${
  jobData.locations
    ? `- Location: ${jobData.locations.name}, ${jobData.locations.address}, ${jobData.locations.city}, ${jobData.locations.state} ${jobData.locations.zip}`
    : ""
}

View Job Details: ${jobLink}

This is an automated notification from Airlast Management System.
    `;

    // Send email (we already claimed this quote, so we're guaranteed to be the only sender)
    const msg = {
      to: "jackhoang.99@gmail.com",
      from: "support@airlast-management.com",
      subject: subject,
      text: emailText,
      html: emailHtml,
    };

    await sgMail.send(msg);
    console.log("Quote confirmation notification sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Quote confirmation notification sent successfully",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending quote confirmation notification:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send notification",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
