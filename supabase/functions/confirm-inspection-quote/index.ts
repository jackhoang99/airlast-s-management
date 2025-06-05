// Follow this setup guide to integrate the Deno runtime and Supabase Functions:
// https://supabase.com/docs/guides/functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
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
    const { token, approved } = await req.json();
    console.log("Received confirmation request:", {
      token,
      approved
    });
    // Validate required fields
    if (!token) {
      return new Response(JSON.stringify({
        error: "Token is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Find the job with this token
    const { data: jobData, error: jobError } = await supabase.from('jobs').select('id, quote_confirmed, quote_token').eq('quote_token', token).maybeSingle();
    if (jobError) {
      console.error('Error fetching job:', jobError);
      return new Response(JSON.stringify({
        error: "Error fetching quote details"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!jobData) {
      console.log('No job found for token:', token);
      return new Response(JSON.stringify({
        error: "Quote not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Verify token matches
    if (jobData.quote_token !== token) {
      console.log('Token mismatch:', {
        stored: jobData.quote_token,
        received: token
      });
      return new Response(JSON.stringify({
        error: "Invalid confirmation token"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // If already confirmed, just return success
    if (jobData.quote_confirmed) {
      return new Response(JSON.stringify({
        success: true,
        message: "Quote already confirmed",
        approved: approved
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Update the job to mark quote as confirmed
    const { error: updateError } = await supabase.from('jobs').update({
      quote_confirmed: true,
      quote_confirmed_at: new Date().toISOString(),
      repair_approved: approved
    }).eq('id', jobData.id);
    if (updateError) {
      console.error('Error updating job:', updateError);
      return new Response(JSON.stringify({
        error: "Failed to confirm quote"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("Quote confirmed successfully:", {
      jobId: jobData.id,
      approved
    });
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Quote confirmed successfully",
      approved: approved
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    // Return error response
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
