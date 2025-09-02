import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { token, approved, quoteType: requestQuoteType } = await req.json();
    if (!token) {
      throw new Error("Token is required");
    }

    console.log("Confirming quote:", {
      token,
      approved,
      requestQuoteType,
    });
    // Check if there's a quote record with this token
    console.log("Looking for quote with token:", token);
    const { data: quoteData, error: quoteError } = await supabase
      .from("job_quotes")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (quoteError && !quoteError.message.includes("contains 0 rows")) {
      throw quoteError;
    }
    console.log("Found quote data:", quoteData);
    // If quote record exists, update it
    if (quoteData) {
      const { error: updateQuoteError } = await supabase
        .from("job_quotes")
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          approved: approved,
        })
        .eq("id", quoteData.id);
      if (updateQuoteError) {
        throw updateQuoteError;
      }

      // Store quote ID for notification (will be sent after all processing is complete)
      const quoteIdForNotification = approved ? quoteData.id : null;

      // Send notification email to admin if quote is approved (consolidated logic)
      if (approved && quoteIdForNotification) {
        try {
          const notificationResponse = await fetch(
            `${Deno.env.get(
              "SUPABASE_URL"
            )}/functions/v1/quote-confirmation-notification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get(
                  "SUPABASE_SERVICE_ROLE_KEY"
                )}`,
              },
              body: JSON.stringify({
                quoteId: quoteIdForNotification,
              }),
            }
          );

          if (!notificationResponse.ok) {
            console.warn(
              "Failed to send notification email:",
              await notificationResponse.text()
            );
          } else {
            console.log("Notification email sent successfully");
          }
        } catch (notificationError) {
          console.warn("Error sending notification email:", notificationError);
          // Don't fail the quote confirmation if notification fails
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Quote ${approved ? "approved" : "declined"} successfully`,
          quoteType: quoteData.quote_type,
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
    // If no quote record, check the job record (for backward compatibility)
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("quote_token", token)
      .maybeSingle();
    if (jobError) {
      throw jobError;
    }
    if (!jobData) {
      throw new Error("Quote not found");
    }
    // For backward compatibility, create a quote record if one doesn't exist
    const validQuoteTypes = ["repair", "replacement", "pm", "inspection"];
    const quoteType = validQuoteTypes.includes(requestQuoteType)
      ? requestQuoteType
      : "replacement";
    const { data: newQuote, error: insertError } = await supabase
      .from("job_quotes")
      .insert({
        job_id: jobData.id,
        quote_number: `QT-${jobData.number}-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`,
        quote_type: quoteType,
        amount: 0, // Default amount since we don't have quote data
        token: token,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        approved: approved,
        email: jobData.contact_email || "",
      })
      .select()
      .single();
    if (insertError) {
      throw insertError;
    }

    // Store quote ID for notification (will be sent after all processing is complete)
    const quoteIdForNotification = approved ? newQuote.id : null;

    // Send notification email to admin if quote is approved (consolidated logic)
    if (approved && quoteIdForNotification) {
      try {
        const notificationResponse = await fetch(
          `${Deno.env.get(
            "SUPABASE_URL"
          )}/functions/v1/quote-confirmation-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY"
              )}`,
            },
            body: JSON.stringify({
              quoteId: quoteIdForNotification,
            }),
          }
        );

        if (!notificationResponse.ok) {
          console.warn(
            "Failed to send notification email:",
            await notificationResponse.text()
          );
        } else {
          console.log("Notification email sent successfully");
        }
      } catch (notificationError) {
        console.warn("Error sending notification email:", notificationError);
        // Don't fail the quote confirmation if notification fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Quote ${approved ? "approved" : "declined"} successfully`,
        quoteType: quoteType,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Error confirming quote:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to confirm quote",
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
});
