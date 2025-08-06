// supabase/functions/send-quote/index.ts
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
      pmQuotes,
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
    console.log("Received quote request:", {
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
      hasPMQuotes: Array.isArray(pmQuotes) && pmQuotes.length > 0,
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
    )}/quote/confirm/${quoteToken}?type=${quoteType}`;
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
    // Build PM quote details HTML and text
    let pmQuoteHtml = "";
    let pmQuoteText = "";
    if (quoteType === "pm" && Array.isArray(pmQuotes) && pmQuotes.length > 0) {
      pmQuoteHtml = `<div style="background-color:#f0f7ff; padding:15px; border-radius:5px; margin:20px 0;">
        <h3 style="margin-top:0; color:#0672be;">Preventative Maintenance Quote Details</h3>`;
      pmQuoteText = "Preventative Maintenance Quote Details:\n\n";

      pmQuotes.forEach((pmQuote, index) => {
        const unitCount = pmQuote.unit_count || "N/A";
        const totalCost = pmQuote.total_cost || 0;
        const comprehensiveVisits = pmQuote.comprehensive_visits_count || 0;
        const filterVisits = pmQuote.filter_visits_count || 0;
        const servicePeriod = pmQuote.service_period || "N/A";
        const filterPeriod = pmQuote.filter_visit_period || "N/A";

        pmQuoteHtml += `
          <div style="margin-bottom: ${
            index < pmQuotes.length - 1 ? "20px" : "0"
          }; ${
          index > 0 ? "border-top: 1px solid #ddd; padding-top: 15px;" : ""
        }">
            <h4 style="margin-top:0;">PM Quote ${index + 1}</h4>
            <table style="width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Number of Units:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${unitCount}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Comprehensive Visits:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${comprehensiveVisits}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Filter Change Visits:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${filterVisits}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Service Period:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${servicePeriod}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Filter Period:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${filterPeriod}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Total Annual Cost:</strong></td>
                <td style="padding:8px; border:1px solid #ddd; font-weight:bold; color:#0672be;">$${totalCost.toLocaleString()}</td>
              </tr>
            </table>
          </div>`;
        pmQuoteText += `PM Quote ${index + 1}:\n`;
        pmQuoteText += `- Number of Units: ${unitCount}\n`;
        pmQuoteText += `- Comprehensive Visits: ${comprehensiveVisits}\n`;
        pmQuoteText += `- Filter Change Visits: ${filterVisits}\n`;
        pmQuoteText += `- Service Period: ${servicePeriod}\n`;
        pmQuoteText += `- Filter Period: ${filterPeriod}\n`;
        pmQuoteText += `- Total Annual Cost: $${totalCost.toLocaleString()}\n\n`;
      });
      pmQuoteHtml += `</div>`;
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
    // Determine quote type specific content
    const getQuoteTypeContent = () => {
      switch (quoteType) {
        case "repair":
          return {
            subject: `Repair Quote #${quoteNumber} from Airlast HVAC`,
            introText: `Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a repair quote for your review.`,
            approvalText:
              "Please click one of the buttons below to approve or deny the recommended repairs:",
            approveButtonText: "Approve Repairs",
            denyButtonText: "Deny Repairs",
            approvalNote:
              "If you approve, we will schedule the repair work at your earliest convenience.",
            denialNote:
              "If you deny, you will be charged $180.00 for the inspection service.",
            quoteTypeLabel: "Repair Quote",
          };
        case "replacement":
          return {
            subject: `Replacement Quote #${quoteNumber} from Airlast HVAC`,
            introText: `Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a replacement quote for your review.`,
            approvalText:
              "Please click one of the buttons below to approve or deny the recommended replacements:",
            approveButtonText: "Approve Replacements",
            denyButtonText: "Deny Replacements",
            approvalNote:
              "If you approve, we will schedule the replacement work at your earliest convenience.",
            denialNote:
              "If you deny, you will be charged $180.00 for the inspection service.",
            quoteTypeLabel: "Replacement Quote",
          };
        case "pm":
          return {
            subject: `Preventative Maintenance Quote #${quoteNumber} from Airlast HVAC`,
            introText: `Thank you for choosing Airlast HVAC services. We have prepared a preventative maintenance quote to help keep your HVAC systems running efficiently.`,
            approvalText:
              "Please click one of the buttons below to approve or deny the preventative maintenance service:",
            approveButtonText: "Approve PM Service",
            denyButtonText: "Deny PM Service",
            approvalNote:
              "If you approve, we will schedule the preventative maintenance service at your earliest convenience.",
            denialNote: "If you deny, no charges will be applied.",
            quoteTypeLabel: "Preventative Maintenance Quote",
          };
        case "inspection":
          return {
            subject: `Inspection Quote #${quoteNumber} from Airlast HVAC`,
            introText: `Thank you for choosing Airlast HVAC services. We have completed a comprehensive inspection of your HVAC systems.`,
            approvalText:
              "Please click one of the buttons below to approve or deny the inspection service:",
            approveButtonText: "Approve Inspection",
            denyButtonText: "Deny Inspection",
            approvalNote:
              "If you approve, the inspection service will be completed.",
            denialNote:
              "If you deny, you will be charged $180.00 for the inspection service.",
            quoteTypeLabel: "Inspection Quote",
          };
        default:
          return {
            subject: `Quote #${quoteNumber} from Airlast HVAC`,
            introText: `Thank you for choosing Airlast HVAC services. We have prepared a quote for your review.`,
            approvalText:
              "Please click one of the buttons below to approve or deny the service:",
            approveButtonText: "Approve",
            denyButtonText: "Deny",
            approvalNote:
              "If you approve, we will schedule the work at your earliest convenience.",
            denialNote:
              "If you deny, you will be charged $180.00 for the inspection service.",
            quoteTypeLabel: "Quote",
          };
      }
    };
    const quoteContent = getQuoteTypeContent();
    // Use custom email template if provided, otherwise use defaults
    const subject = emailTemplate?.subject || quoteContent.subject;
    const greeting =
      emailTemplate?.greeting || `Dear ${customerName || "Customer"},`;
    const introText = emailTemplate?.introText || quoteContent.introText;
    const approvalText =
      emailTemplate?.approvalText || quoteContent.approvalText;
    const approveButtonText =
      emailTemplate?.approveButtonText || quoteContent.approveButtonText;
    const denyButtonText =
      emailTemplate?.denyButtonText || quoteContent.denyButtonText;
    const approvalNote =
      emailTemplate?.approvalNote || quoteContent.approvalNote;
    const denialNote = emailTemplate?.denialNote || quoteContent.denialNote;
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
              filename: `${quoteContent.quoteTypeLabel.replace(/\s+/g, "-")}-${
                quoteNumber || jobNumber
              }.pdf`,
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
      subject: subject,
      text: `${greeting}

${introText}

Quote #${quoteNumber} for Job #${jobNumber} - ${jobName || "HVAC Service"}

${locationText}

${inspectionText}
${pmQuoteText}

Please click the link below to approve or deny the recommended service:

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
              <p><strong>${quoteContent.quoteTypeLabel}</strong></p>
            </div>

            ${locationHtml}
            ${inspectionHtml}
            ${pmQuoteHtml}
            ${viewPdfButtonHtml}

            <p>${approvalText}</p>
            
            <div style="text-align:center; margin:30px 0;">
              <a href="${confirmationUrl}&approve=true" style="background-color:#22c55e; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; display:block; margin-bottom:10px;">
                ${approveButtonText}
              </a>
              <a href="${confirmationUrl}&approve=false" style="background-color:#ef4444; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; display:block;">
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
        message: `${quoteContent.quoteTypeLabel} email sent successfully`,
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
    console.error("Error sending quote:", error);
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
