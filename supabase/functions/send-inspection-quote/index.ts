// Follow this setup guide to integrate the Deno runtime and Supabase Functions:
// https://supabase.com/docs/guides/functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    const { SENDGRID_API_KEY } = Deno.env.toObject();
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not set");
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    const { 
      jobId, 
      customerEmail, 
      quoteToken, 
      jobNumber, 
      jobName, 
      customerName, 
      inspectionData,
      location,
      unit
    } = await req.json();

    if (!jobId || !customerEmail || !quoteToken || !jobNumber) {
      return new Response(JSON.stringify({
        error: "Missing required fields"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const confirmationUrl = `${req.headers.get("origin")}/quote/confirm/${quoteToken}`;

    // Build inspection details HTML and text
    let inspectionHtml = "";
    let inspectionText = "";

    if (Array.isArray(inspectionData) && inspectionData.length > 0) {
      const inspection = inspectionData[0]; // Use the first inspection for simplicity
      
      inspectionHtml = `
        <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
          <h3 style="margin-top:0;">Inspection Details</h3>
          <table style="width:100%; border-collapse: collapse;">
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Model Number:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${inspection.model_number || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Serial Number:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${inspection.serial_number || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Age:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${inspection.age || 'N/A'} years</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Tonnage:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${inspection.tonnage || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Unit Type:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${inspection.unit_type || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>System Type:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${inspection.system_type || 'N/A'}</td>
            </tr>
          </table>
        </div>`;
      
      inspectionText = `
Inspection Details:
- Model Number: ${inspection.model_number || 'N/A'}
- Serial Number: ${inspection.serial_number || 'N/A'}
- Age: ${inspection.age || 'N/A'} years
- Tonnage: ${inspection.tonnage || 'N/A'}
- Unit Type: ${inspection.unit_type || 'N/A'}
- System Type: ${inspection.system_type || 'N/A'}
`;
    }

    // Location and unit information
    let locationHtml = "";
    let locationText = "";

    if (location) {
      locationHtml = `
        <div style="margin-bottom:15px;">
          <h3>Service Location</h3>
          <p>${location.name}</p>
          <p>${location.address}</p>
          <p>${location.city}, ${location.state} ${location.zip}</p>
          ${unit ? `<p>Unit: ${unit.unit_number}</p>` : ''}
        </div>`;
      
      locationText = `
Service Location:
${location.name}
${location.address}
${location.city}, ${location.state} ${location.zip}
${unit ? `Unit: ${unit.unit_number}` : ''}
`;
    }

    const msg = {
      to: customerEmail,
      from: "support@airlast-management.com",
      subject: `Inspection Quote #${jobNumber} from Airlast HVAC`,
      text: `Dear ${customerName || "Customer"},

Thank you for choosing Airlast HVAC services. We have completed the inspection for job #${jobNumber} - ${jobName || "HVAC Service"}.

${locationText}

${inspectionText}

Based on our inspection, we recommend proceeding with repairs. Please click the link below to approve or deny the recommended repairs:

${confirmationUrl}

If you have any questions, please don't hesitate to contact us.

Best regards,
Airlast HVAC Team`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
          <!-- Text-only header -->
          <div style="background-color:#0672be; padding:20px; text-align:center;">
            <h1 style="color:white; margin:0;">Airlast HVAC</h1>
          </div>

          <!-- Body -->
          <div style="padding:20px; border:1px solid #ddd; border-top:none;">
            <p>Dear ${customerName || "Customer"},</p>
            <p>Thank you for choosing Airlast HVAC services. We have completed the inspection for job #${jobNumber} - ${jobName || "HVAC Service"}.</p>

            ${locationHtml}
            ${inspectionHtml}

            <p>Based on our inspection, we recommend proceeding with repairs. Please click one of the buttons below to approve or deny the recommended repairs:</p>
            
            <div style="text-align:center; margin:30px 0;">
              <a href="${confirmationUrl}?approve=true" style="background-color:#22c55e; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-right:10px;">
                Approve Repairs
              </a>
              <a href="${confirmationUrl}?approve=false" style="background-color:#ef4444; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-left:10px;">
                Deny Repairs
              </a>
            </div>

            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>Airlast HVAC Team</p>
          </div>

          <!-- Footer -->
          <div style="background-color:#f5f5f5; padding:15px; text-align:center; font-size:12px; color:#666;">
            <p>© 2025 Airlast HVAC. All rights reserved.</p>
            <p>1650 Marietta Boulevard Northwest, Atlanta, GA 30318</p>
          </div>
        </div>`
    };

    await sgMail.send(msg);

    return new Response(JSON.stringify({
      success: true,
      message: "Inspection quote email sent successfully"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
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