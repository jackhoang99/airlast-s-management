// supabase/functions/send-manual-reminder/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { SENDGRID_API_KEY } = Deno.env.toObject();
    if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY is not set");
    sgMail.setApiKey(SENDGRID_API_KEY);

    const requestData = await req.json();
    const { reminderId, recipient, subject, message, reminderType, jobId } =
      requestData;

    if (!reminderId || !recipient || !message) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: reminderId, recipient, message",
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

    if (reminderType === "email") {
      if (!subject) {
        return new Response(
          JSON.stringify({
            error: "Subject is required for email reminders",
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

      const msg = {
        to: recipient,
        from: "support@airlast-management.com",
        subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0672be; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Airlast HVAC</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <div style="background-color: #f0f7ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #0672be;">
                <h2 style="margin-top: 0; color: #0672be;">${subject}</h2>
              </div>
              <div style="line-height: 1.6; color: #333;">${message.replace(
                /\n/g,
                "<br>"
              )}</div>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  This is an automated reminder from Airlast HVAC Management System.
                </p>
              </div>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              <p>© 2025 Airlast HVAC. All rights reserved.</p>
              <p>1650 Marietta Boulevard Northwest, Atlanta, GA 30318</p>
            </div>
          </div>`,
      };

      await sgMail.send(msg);

      return new Response(
        JSON.stringify({
          success: true,
          type: "email",
          message: `Manual email reminder sent successfully`,
          reminderId,
          jobId,
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

    if (reminderType === "in_app") {
      // Just acknowledge in-app reminder
      return new Response(
        JSON.stringify({
          success: true,
          type: "in_app",
          message: "In-app reminder acknowledged",
          reminderId,
          jobId,
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

    // If unsupported type
    return new Response(
      JSON.stringify({
        error:
          "Unsupported reminder type. Only 'email' and 'in_app' are supported.",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
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
