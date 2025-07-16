// supabase/functions/send-repair-quote/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail";
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
    const requestData = await req.json();
    const {
      jobId,
      customerEmail,
      quoteToken,
      jobNumber,
      jobName,
      customerName,
      inspectionData,
      replacementData,
      allReplacementData,
      location,
      unit,
      selectedPhase,
      totalCost,
      quoteNumber,
      quoteType,
      emailTemplate,
      pdfUrl,
      replacementDataByInspection,
    } = requestData;
    if (!quoteType) {
      return new Response(
        JSON.stringify({
          error: "quoteType is required",
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
    console.log("Received repair quote request:", {
      jobId,
      customerEmail,
      jobNumber,
      quoteNumber,
      quoteType,
      totalCost: totalCost || 0,
      hasInspectionData:
        Array.isArray(inspectionData) && inspectionData.length > 0,
      hasReplacementData: !!replacementData,
      hasAllReplacementData:
        Array.isArray(allReplacementData) && allReplacementData.length > 0,
      hasPdfUrl: !!pdfUrl,
    });
    if (!jobId || !customerEmail || !quoteToken || !jobNumber) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
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
    const confirmationUrl = `${req.headers.get(
      "origin"
    )}/quote/confirm/${quoteToken}`;
    // Build inspection details HTML and text
    let inspectionHtml = "";
    let inspectionText = "";
    if (Array.isArray(inspectionData) && inspectionData.length > 0) {
      inspectionHtml = `<div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
        <h3 style="margin-top:0;">Inspection Details</h3>`;
      inspectionText = "Inspection Details:\n\n";
      // Loop through inspections (limit to first 3 for email readability)
      const displayInspections = inspectionData.slice(0, 3);
      displayInspections.forEach((inspection, index) => {
        // Safe access to properties with fallbacks
        const modelNumber = inspection?.model_number || "N/A";
        const serialNumber = inspection?.serial_number || "N/A";
        const age = inspection?.age || "N/A";
        const tonnage = inspection?.tonnage || "N/A";
        const unitType = inspection?.unit_type || "N/A";
        const systemType = inspection?.system_type || "N/A";
        inspectionHtml += `
          <div style="margin-bottom: ${
            index < displayInspections.length - 1 ? "20px" : "0"
          }; ${
          index > 0 ? "border-top: 1px solid #ddd; padding-top: 15px;" : ""
        }">
            <h4 style="margin-top:0;">Inspection ${index + 1}</h4>
            <table style="width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Model Number:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${modelNumber}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Serial Number:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${serialNumber}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Age:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${age} years</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Tonnage:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${tonnage}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Unit Type:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${unitType}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>System Type:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${systemType}</td>
              </tr>
            </table>
          </div>`;
        inspectionText += `Inspection ${index + 1}:\n`;
        inspectionText += `- Model Number: ${modelNumber}\n`;
        inspectionText += `- Serial Number: ${serialNumber}\n`;
        inspectionText += `- Age: ${age} years\n`;
        inspectionText += `- Tonnage: ${tonnage}\n`;
        inspectionText += `- Unit Type: ${unitType}\n`;
        inspectionText += `- System Type: ${systemType}\n\n`;
      });
      if (inspectionData.length > 3) {
        inspectionHtml += `
          <div style="margin-top: 10px; font-style: italic; color: #666;">
            And ${inspectionData.length - 3} more inspection(s)...
          </div>`;
        inspectionText += `And ${
          inspectionData.length - 3
        } more inspection(s)...\n\n`;
      }
      inspectionHtml += `</div>`;
    }
    // Location and unit information
    let locationHtml = "";
    let locationText = "";
    if (location) {
      // Safe access to location properties with fallbacks
      const locationName = location?.name || "";
      const address = location?.address || "";
      const city = location?.city || "";
      const state = location?.state || "";
      const zip = location?.zip || "";
      const unitNumber = unit?.unit_number || "";
      locationHtml = `
        <div style="margin-bottom:15px;">
          <h3>Service Location</h3>
          <p>${locationName}</p>
          <p>${address}</p>
          <p>${city}, ${state} ${zip}</p>
          ${unitNumber ? `<p>Unit: ${unitNumber}</p>` : ""}
        </div>`;
      locationText = `
Service Location:
${locationName}
${address}
${city}, ${state} ${zip}
${unitNumber ? `Unit: ${unitNumber}` : ""}
`;
    }
    // Use custom email template if provided, otherwise use defaults
    const subject =
      emailTemplate?.subject ||
      `${
        quoteType === "replacement" ? "Replacement" : "Repair"
      } Quote #${quoteNumber} from Airlast HVAC`;
    const greeting =
      emailTemplate?.greeting || `Dear ${customerName || "Customer"},`;
    const introText =
      emailTemplate?.introText ||
      `Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a quote for your review.`;
    const approvalText =
      quoteType === "repair"
        ? "Please click one of the buttons below to approve or deny the recommended repairs:"
        : "Please click one of the buttons below to approve or deny the recommended replacements:";
    const approveButtonText = quoteType === "repair" ? "Approve" : "Approve";
    const denyButtonText = quoteType === "repair" ? "Deny" : "Deny";
    const approvalNote =
      quoteType === "repair"
        ? "If you approve, we will schedule the repair work at your earliest convenience."
        : "If you approve, we will schedule the replacement work at your earliest convenience.";
    const denialNote =
      emailTemplate?.denialNote ||
      "If you deny, you will be charged $180.00 for the inspection service.";
    const closingText =
      emailTemplate?.closingText ||
      "If you have any questions, please don't hesitate to contact us.";
    const signature =
      emailTemplate?.signature || "Best regards,\nAirlast HVAC Team";
    // Prepare email with attachment if pdfUrl is provided
    let attachments = [];
    let viewPdfButtonHtml = "";
    if (pdfUrl) {
      try {
        // Fetch the PDF content
        const pdfResponse = await fetch(pdfUrl);
        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          // Check if the PDF is not too large (10MB limit for email attachments)
          if (pdfBuffer.byteLength <= 10 * 1024 * 1024) {
            const pdfBase64 = btoa(
              String.fromCharCode(...new Uint8Array(pdfBuffer))
            );
            attachments.push({
              content: pdfBase64,
              filename: `${
                quoteType.charAt(0).toUpperCase() + quoteType.slice(1)
              }-Quote-${quoteNumber || jobNumber}.pdf`,
              type: "application/pdf",
              disposition: "attachment",
            });
            console.log(
              `PDF attached (${Math.round(pdfBuffer.byteLength / 1024)}KB)`
            );
          } else {
            console.log(
              `PDF too large for attachment (${Math.round(
                pdfBuffer.byteLength / 1024
              )}KB)`
            );
            // Add a button to view the PDF instead
            viewPdfButtonHtml = `
              <div style="text-align:center; margin:20px 0;">
                <a href="${pdfUrl}" style="background-color:#0672be; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold;">
                  View Quote PDF
                </a>
              </div>`;
          }
        } else {
          console.warn(
            `Failed to fetch PDF from ${pdfUrl}: ${pdfResponse.status} ${pdfResponse.statusText}`
          );
          // Add a button to view the PDF instead
          viewPdfButtonHtml = `
            <div style="text-align:center; margin:20px 0;">
              <a href="${pdfUrl}" style="background-color:#0672be; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold;">
                View Quote PDF
              </a>
            </div>`;
        }
      } catch (pdfError) {
        console.warn(`Error processing PDF attachment: ${pdfError.message}`);
        // Add a button to view the PDF instead
        viewPdfButtonHtml = `
          <div style="text-align:center; margin:20px 0;">
            <a href="${pdfUrl}" style="background-color:#0672be; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold;">
              View Quote PDF
            </a>
          </div>`;
      }
    }
    const msg = {
      to: customerEmail,
      from: "support@airlast-management.com",
      subject: `${
        quoteType === "replacement" ? "Replacement" : "Repair"
      } Quote #${quoteNumber} from Airlast HVAC`,
      text: `${greeting}

${introText}

Quote #${quoteNumber} for Job #${jobNumber} - ${jobName || "HVAC Service"}

${locationText}

${inspectionText}

Please click the link below to approve or deny the recommended ${
        quoteType === "replacement" ? "replacement" : "repairs"
      }:

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
              <h2 style="margin-top:0; color:#0672be;">Quote #${quoteNumber}</h2>
              <p>Job #${jobNumber} - ${jobName || "HVAC Service"}</p>
              <p><strong>${
                quoteType === "replacement" ? "Replacement" : "Repair"
              } Quote</strong></p>
            </div>

            ${locationHtml}
            ${inspectionHtml}
            ${viewPdfButtonHtml}

            <p>${approvalText}</p>
            
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
            <p>${signature.replace(/\n/g, "<br>")}</p>
          </div>

          <!-- Footer -->
          <div style="background-color:#f5f5f5; padding:15px; text-align:center; font-size:12px; color:#666;">
            <p>© 2025 Airlast HVAC. All rights reserved.</p>
            <p>1650 Marietta Boulevard Northwest, Atlanta, GA 30318</p>
          </div>
        </div>`,
      attachments: attachments,
    };
    console.log("Sending email to:", customerEmail);
    await sgMail.send(msg);
    console.log("Email sent successfully");
    return new Response(
      JSON.stringify({
        success: true,
        message: `${
          quoteType === "replacement" ? "Replacement" : "Repair"
        } quote email sent successfully`,
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
    console.error("Error sending repair quote:", error);
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
