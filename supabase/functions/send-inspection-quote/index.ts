// supabase/functions/send-inspection-quote/index.ts
// Follow this setup guide to integrate the Deno runtime and Supabase Functions:
// https://supabase.com/docs/guides/functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
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
    const { jobId, customerEmail, quoteToken, jobNumber, jobName, customerName, inspectionData, location, unit, quoteNumber, emailTemplate, pdfUrl } = await req.json();
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
    // Use custom email template if provided, otherwise use defaults
    const subject = emailTemplate?.subject || `Inspection Quote #${quoteNumber || jobNumber} from Airlast HVAC`;
    const greeting = emailTemplate?.greeting || `Dear ${customerName || "Customer"},`;
    const introText = emailTemplate?.introText || "Thank you for choosing Airlast HVAC services. We have completed the inspection for your HVAC system.";
    const approvalText = emailTemplate?.approvalText || "Please click one of the buttons below to approve or deny the recommended repairs:";
    const approveButtonText = emailTemplate?.approveButtonText || "Approve Repairs";
    const denyButtonText = emailTemplate?.denyButtonText || "Deny Repairs";
    const approvalNote = emailTemplate?.approvalNote || "If you approve, we will schedule the repair work at your earliest convenience.";
    const denialNote = emailTemplate?.denialNote || "If you deny, you will be charged $180.00 for the inspection service.";
    const closingText = emailTemplate?.closingText || "If you have any questions, please don't hesitate to contact us.";
    const signature = emailTemplate?.signature || "Best regards,\nAirlast HVAC Team";
    // Prepare email with attachment if pdfUrl is provided
    let attachments = [];
    if (pdfUrl) {
      // Fetch the PDF content
      const pdfResponse = await fetch(pdfUrl);
      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        attachments.push({
          content: pdfBase64,
          filename: `Quote-${quoteNumber || jobNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        });
      }
    }
    const msg = {
      to: customerEmail,
      from: "support@airlast-management.com",
      subject: subject,
      text: `${greeting}

${introText}

Quote #${quoteNumber || jobNumber} for Job #${jobNumber} - ${jobName || "HVAC Service"}

${locationText}

${inspectionText}

Based on our inspection, we recommend proceeding with repairs. Please click the link below to approve or deny the recommended repairs:

${confirmationUrl}

${approvalNote}
${denialNote}

${closingText}

${signature}`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
          <!-- Text-only header -->
          <div style="background-color:#0672be; padding:20px; text-align:center;">
            <h1 style="color:white; margin:0;">Airlast HVAC</h1>
          </div>

          <!-- Body -->
          <div style="padding:20px; border:1px solid #ddd; border-top:none;">
            <p>${greeting}</p>
            <p>${introText}</p>
            
            <div style="background-color:#f0f7ff; padding:10px; border-radius:5px; margin:15px 0;">
              <h2 style="margin-top:0; color:#0672be;">Quote #${quoteNumber || jobNumber}</h2>
              <p>Job #${jobNumber} - ${jobName || "HVAC Service"}</p>
            </div>

            ${locationHtml}
            ${inspectionHtml}

            <p>Based on our inspection, we recommend proceeding with repairs. Please click one of the buttons below to approve or deny the recommended repairs:</p>
            
            <div style="text-align:center; margin:30px 0;">
              <a href="${confirmationUrl}?approve=true" style="background-color:#22c55e; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-right:10px;">
                ${approveButtonText}
              </a>
              <a href="${confirmationUrl}?approve=false" style="background-color:#ef4444; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-left:10px;">
                ${denyButtonText}
              </a>
            </div>

            <p>${approvalNote}</p>
            <p style="color:#ef4444; font-weight:bold;">${denialNote}</p>

            <p>${closingText}</p>
            <p>${signature.replace(/\n/g, '<br>')}</p>
          </div>

          <!-- Footer -->
          <div style="background-color:#f5f5f5; padding:15px; text-align:center; font-size:12px; color:#666;">
            <p>© 2025 Airlast HVAC. All rights reserved.</p>
            <p>1650 Marietta Boulevard Northwest, Atlanta, GA 30318</p>
          </div>
        </div>`,
      attachments: attachments
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
