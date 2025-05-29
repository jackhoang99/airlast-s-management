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
      replacementData,
      location,
      unit,
      selectedPhase,
      totalCost
    } = await req.json();

    console.log("Received repair quote request:", { 
      jobId, 
      customerEmail, 
      jobNumber,
      selectedPhase,
      totalCost,
      inspectionCount: Array.isArray(inspectionData) ? inspectionData.length : 'none'
    });

    if (!jobId || !customerEmail || !quoteToken || !jobNumber || !replacementData) {
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
      inspectionHtml = `<div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
        <h3 style="margin-top:0;">Inspection Details</h3>`;
      
      inspectionText = "Inspection Details:\n\n";
      
      // Loop through all inspections
      inspectionData.forEach((inspection, index) => {
        inspectionHtml += `
          <div style="margin-bottom: ${index < inspectionData.length - 1 ? '20px' : '0'}; ${index > 0 ? 'border-top: 1px solid #ddd; padding-top: 15px;' : ''}">
            <h4 style="margin-top:0;">Inspection ${index + 1}</h4>
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
        
        inspectionText += `Inspection ${index + 1}:\n`;
        inspectionText += `- Model Number: ${inspection.model_number || 'N/A'}\n`;
        inspectionText += `- Serial Number: ${inspection.serial_number || 'N/A'}\n`;
        inspectionText += `- Age: ${inspection.age || 'N/A'} years\n`;
        inspectionText += `- Tonnage: ${inspection.tonnage || 'N/A'}\n`;
        inspectionText += `- Unit Type: ${inspection.unit_type || 'N/A'}\n`;
        inspectionText += `- System Type: ${inspection.system_type || 'N/A'}\n\n`;
      });
      
      inspectionHtml += `</div>`;
    }

    // Build repair details HTML and text
    let repairHtml = "";
    let repairText = "";

    if (replacementData) {
      const selectedOption = selectedPhase === 'phase1' ? 'Economy Option' : 
                            selectedPhase === 'phase2' ? 'Standard Option' : 
                            'Premium Option';
      
      const selectedDescription = replacementData[selectedPhase]?.description || selectedOption;
      
      // Calculate accessories total
      const accessoriesTotal = replacementData.accessories.reduce(
        (sum, item) => sum + Number(item.cost), 0
      );
      
      // Calculate additional items total
      const additionalItemsTotal = replacementData.additionalItems.reduce(
        (sum, item) => sum + Number(item.cost), 0
      );
      
      repairHtml = `
        <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
          <h3 style="margin-top:0;">Repair Recommendation</h3>
          <table style="width:100%; border-collapse: collapse;">
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Selected Option:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${selectedOption}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Description:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${selectedDescription}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Base Cost:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${replacementData[selectedPhase].cost.toLocaleString()}</td>
            </tr>`;
            
      if (replacementData.labor > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Labor:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${replacementData.labor.toLocaleString()}</td>
            </tr>`;
      }
      
      if (replacementData.refrigerationRecovery > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Refrigeration Recovery:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${replacementData.refrigerationRecovery.toLocaleString()}</td>
            </tr>`;
      }
      
      if (replacementData.startUpCosts > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Start-Up Costs:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${replacementData.startUpCosts.toLocaleString()}</td>
            </tr>`;
      }
      
      if (replacementData.thermostatStartup > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Thermostat Startup:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${replacementData.thermostatStartup.toLocaleString()}</td>
            </tr>`;
      }
      
      if (replacementData.removalCost > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Removal of Old Equipment:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${replacementData.removalCost.toLocaleString()}</td>
            </tr>`;
      }
      
      if (replacementData.permitCost > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Permit Cost:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${replacementData.permitCost.toLocaleString()}</td>
            </tr>`;
      }
      
      if (accessoriesTotal > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Accessories:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${accessoriesTotal.toLocaleString()}</td>
            </tr>`;
            
        // List each accessory
        replacementData.accessories.forEach(accessory => {
          if (accessory.name && accessory.cost > 0) {
            repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd; padding-left: 20px;">- ${accessory.name}</td>
              <td style="padding:8px; border:1px solid #ddd;">$${accessory.cost.toLocaleString()}</td>
            </tr>`;
          }
        });
      }
      
      if (additionalItemsTotal > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Additional Items:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${additionalItemsTotal.toLocaleString()}</td>
            </tr>`;
            
        // List each additional item
        replacementData.additionalItems.forEach(item => {
          if (item.name && item.cost > 0) {
            repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd; padding-left: 20px;">- ${item.name}</td>
              <td style="padding:8px; border:1px solid #ddd;">$${item.cost.toLocaleString()}</td>
            </tr>`;
          }
        });
      }
      
      if (replacementData.warranty) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Warranty:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${replacementData.warranty}</td>
            </tr>`;
      }
      
      // Add total cost
      repairHtml += `
            <tr style="background-color:#f0f0f0; font-weight:bold;">
              <td style="padding:8px; border:1px solid #ddd;"><strong>TOTAL COST:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${totalCost.toLocaleString()}</td>
            </tr>
          </table>
        </div>`;
      
      repairText = `
Repair Recommendation:
- Selected Option: ${selectedOption}
- Description: ${selectedDescription}
- Base Cost: $${replacementData[selectedPhase].cost.toLocaleString()}
`;

      if (replacementData.labor > 0) {
        repairText += `- Labor: $${replacementData.labor.toLocaleString()}\n`;
      }
      
      if (replacementData.refrigerationRecovery > 0) {
        repairText += `- Refrigeration Recovery: $${replacementData.refrigerationRecovery.toLocaleString()}\n`;
      }
      
      if (replacementData.startUpCosts > 0) {
        repairText += `- Start-Up Costs: $${replacementData.startUpCosts.toLocaleString()}\n`;
      }
      
      if (replacementData.thermostatStartup > 0) {
        repairText += `- Thermostat Startup: $${replacementData.thermostatStartup.toLocaleString()}\n`;
      }
      
      if (replacementData.removalCost > 0) {
        repairText += `- Removal of Old Equipment: $${replacementData.removalCost.toLocaleString()}\n`;
      }
      
      if (replacementData.permitCost > 0) {
        repairText += `- Permit Cost: $${replacementData.permitCost.toLocaleString()}\n`;
      }
      
      if (accessoriesTotal > 0) {
        repairText += `- Accessories: $${accessoriesTotal.toLocaleString()}\n`;
        replacementData.accessories.forEach(accessory => {
          if (accessory.name && accessory.cost > 0) {
            repairText += `  * ${accessory.name}: $${accessory.cost.toLocaleString()}\n`;
          }
        });
      }
      
      if (additionalItemsTotal > 0) {
        repairText += `- Additional Items: $${additionalItemsTotal.toLocaleString()}\n`;
        replacementData.additionalItems.forEach(item => {
          if (item.name && item.cost > 0) {
            repairText += `  * ${item.name}: $${item.cost.toLocaleString()}\n`;
          }
        });
      }
      
      if (replacementData.warranty) {
        repairText += `- Warranty: ${replacementData.warranty}\n`;
      }
      
      repairText += `\nTOTAL COST: $${totalCost.toLocaleString()}\n`;
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
      subject: `Repair Quote #${jobNumber} from Airlast HVAC`,
      text: `Dear ${customerName || "Customer"},

Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a repair quote for job #${jobNumber} - ${jobName || "HVAC Service"}.

${locationText}

${inspectionText}

${repairText}

Please click the link below to approve or deny the recommended repairs:

${confirmationUrl}

If you approve, we will schedule the repair work at your earliest convenience.
If you deny, you will be charged $180.00 for the inspection service.

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
            <p>Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a repair quote for job #${jobNumber} - ${jobName || "HVAC Service"}.</p>

            ${locationHtml}
            ${inspectionHtml}
            ${repairHtml}

            <p>Please click one of the buttons below to approve or deny the recommended repairs:</p>
            
            <div style="text-align:center; margin:30px 0;">
              <a href="${confirmationUrl}?approve=true" style="background-color:#22c55e; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-right:10px;">
                Approve Repairs
              </a>
              <a href="${confirmationUrl}?approve=false" style="background-color:#ef4444; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold; margin-left:10px;">
                Deny Repairs
              </a>
            </div>

            <p>If you approve, we will schedule the repair work at your earliest convenience.</p>
            <p style="color:#ef4444; font-weight:bold;">If you deny, you will be charged $180.00 for the inspection service.</p>

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

    console.log("Sending email to:", customerEmail);
    await sgMail.send(msg);
    console.log("Email sent successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Repair quote email sent successfully"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error sending repair quote:", error);
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