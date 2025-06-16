import { createClient } from "npm:@supabase/supabase-js";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
Deno.serve(async (req)=>{
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
    // Get form data with the PDF file
    const formData = await req.formData();
    const file = formData.get("file");
    const templateId = formData.get("templateId");
    if (!file || !templateId) {
      return new Response(JSON.stringify({
        error: "File and templateId are required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Validate file type
    if (file.type !== "application/pdf") {
      return new Response(JSON.stringify({
        error: "Only PDF files are allowed"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({
        error: "File size exceeds 10MB limit"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Create a unique file path
    const filePath = `quote-templates/${templateId}/${file.name}`;
    // Upload the file to Supabase Storage
    const { data, error: uploadError } = await supabase.storage.from("templates").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true
    });
    if (uploadError) {
      throw uploadError;
    }
    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage.from("templates").getPublicUrl(filePath);
    // Return success response with the file URL
    return new Response(JSON.stringify({
      success: true,
      fileUrl: urlData.publicUrl,
      filePath: filePath
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error('Error uploading PDF template:', error);
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
