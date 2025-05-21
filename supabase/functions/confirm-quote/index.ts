import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { token } = await req.json();

    // Validate required fields
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Find the job with this token
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('id, quote_confirmed')
      .eq('quote_token', token)
      .single();

    if (jobError) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired confirmation link" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!jobData) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // If already confirmed, just return success
    if (jobData.quote_confirmed) {
      return new Response(
        JSON.stringify({ success: true, message: "Quote already confirmed" }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Update the job to mark quote as confirmed
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        quote_confirmed: true,
        quote_confirmed_at: new Date().toISOString()
      })
      .eq('id', jobData.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to confirm quote" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Quote confirmed successfully" }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});