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
    // First check if there's a quote record with this token
    const { data: quoteData, error: quoteError } = await supabase
      .from("job_quotes")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (quoteError && !quoteError.message.includes("contains 0 rows")) {
      throw quoteError;
    }
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
      // Also update the job record
      // Get quote type to determine which approval column to update
      const quoteType = quoteData.quote_type || "replacement";
      let updateObj = {
        quote_confirmed: true,
        quote_confirmed_at: new Date().toISOString(),
      };
      // Set the appropriate approval column based on quote type
      if (quoteType === "repair") {
        updateObj["repair_approved"] = approved;
      } else {
        updateObj["replacement_approved"] = approved;
      }
      const { error: updateJobError } = await supabase
        .from("jobs")
        .update(updateObj)
        .eq("id", quoteData.job_id);
      if (updateJobError) {
        throw updateJobError;
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
    // If no quote record, check the job record
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
    // Update the job record
    // Use quoteType from request if provided, otherwise default to 'replacement'
    const quoteType = requestQuoteType || "replacement";
    let updateObj = {
      quote_confirmed: true,
      quote_confirmed_at: new Date().toISOString(),
    };
    // Set the appropriate approval column based on quote type
    if (quoteType === "repair") {
      updateObj["repair_approved"] = approved;
    } else {
      updateObj["replacement_approved"] = approved;
    }
    const { error: updateError } = await supabase
      .from("jobs")
      .update(updateObj)
      .eq("id", jobData.id);
    if (updateError) {
      throw updateError;
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
