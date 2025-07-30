import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, password, email } = await req.json();

    if (!username || !password || !email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: username, password, email",
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

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, check if the user exists in our users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, username, email, role, auth_id")
      .eq("username", username)
      .maybeSingle();

    if (userError) {
      throw new Error(`Error checking user: ${userError.message}`);
    }

    if (!userData) {
      return new Response(
        JSON.stringify({
          error: "User not found in system. Please contact your administrator.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // If user already has an auth_id, return error
    if (userData.auth_id) {
      return new Response(
        JSON.stringify({
          error:
            "User already has an authentication account. Please sign in normally.",
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create the auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          username: username,
          role: userData.role,
        },
      });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new Response(
        JSON.stringify({
          error: `Failed to create authentication account: ${authError.message}`,
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

    // Link the auth user to the existing user record
    const { error: updateError } = await supabase
      .from("users")
      .update({ auth_id: authData.user.id })
      .eq("id", userData.id);

    if (updateError) {
      console.error("Update error:", updateError);
      // Try to clean up the auth user if we can't link it
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error("Failed to cleanup auth user:", cleanupError);
      }

      return new Response(
        JSON.stringify({
          error: "Failed to link authentication account to user profile",
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Authentication account created successfully",
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          auth_id: authData.user.id,
        },
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
