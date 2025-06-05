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
      repairData,
      allRepairData,
      location,
      unit,
      selectedPhase,
      totalCost,
      quoteNumber,
      quoteType = 'repair', // Default to repair, but can be overridden to 'replacement'
      emailTemplate
    } = await req.json();

    console.log("Received repair quote request:", { 
      jobId, 
      customerEmail, 
      jobNumber,
      selectedPhase,
      totalCost,
      quoteType,
      inspectionCount: Array.isArray(inspectionData) ? inspectionData.length : 'none',
      allRepairDataCount: Array.isArray(allRepairData) ? allRepairData.length : 'none'
    });

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

    // Process all repair data for all inspections
    if (Array.isArray(allRepairData) && allRepairData.length > 0) {
      repairHtml = `
        <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
          <h3 style="margin-top:0;">${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Recommendations</h3>`;
          
      repairText = `${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Recommendations:\n\n`;
      
      // Loop through all repair data
      allRepairData.forEach((repair, index) => {
        const repairPhase = repair.selected_phase || 'phase2';
        const phaseData = repair[repairPhase];
        const phaseName = repairPhase === 'phase1' ? 'Economy Option' : 
                         repairPhase === 'phase2' ? 'Standard Option' : 
                         'Premium Option';
        
        repairHtml += `
          <div style="margin-bottom: ${index < allRepairData.length - 1 ? '20px' : '0'}; ${index > 0 ? 'border-top: 1px solid #ddd; padding-top: 15px;' : ''}">
            <h4 style="margin-top:0;">${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Option ${index + 1}</h4>
            <table style="width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Selected Option:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${phaseName}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Description:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${phaseData?.description || phaseName}</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Requires Crane:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${repair.needs_crane ? 'Yes' : 'No'}</td>
              </tr>`;
              
        if (phaseData && phaseData.cost) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Base Cost:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(phaseData.cost).toLocaleString()}</td>
              </tr>`;
        }
              
        if (repair.labor > 0) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Labor:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(repair.labor).toLocaleString()}</td>
              </tr>`;
        }
        
        if (repair.refrigeration_recovery > 0) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Refrigeration Recovery:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(repair.refrigeration_recovery).toLocaleString()}</td>
              </tr>`;
        }
        
        if (repair.start_up_costs > 0) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Start-Up Costs:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(repair.start_up_costs).toLocaleString()}</td>
              </tr>`;
        }
        
        if (repair.thermostat_startup > 0) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Thermostat Startup:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(repair.thermostat_startup).toLocaleString()}</td>
              </tr>`;
        }
        
        if (repair.removal_cost > 0) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Removal of Old Equipment:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(repair.removal_cost).toLocaleString()}</td>
              </tr>`;
        }
        
        if (repair.permit_cost > 0) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Permit Cost:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(repair.permit_cost).toLocaleString()}</td>
              </tr>`;
        }
        
        // Accessories
        if (Array.isArray(repair.accessories) && repair.accessories.length > 0) {
          const accessoriesTotal = repair.accessories.reduce(
            (sum, item) => sum + Number(item.cost || 0), 0
          );
          
          if (accessoriesTotal > 0) {
            repairHtml += `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd;"><strong>Accessories:</strong></td>
                  <td style="padding:8px; border:1px solid #ddd;">$${accessoriesTotal.toLocaleString()}</td>
                </tr>`;
                
            // List each accessory
            repair.accessories.forEach(accessory => {
              if (accessory.name && accessory.cost > 0) {
                repairHtml += `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd; padding-left: 20px;">- ${accessory.name}</td>
                  <td style="padding:8px; border:1px solid #ddd;">$${Number(accessory.cost).toLocaleString()}</td>
                </tr>`;
              }
            });
          }
        }
        
        // Additional Items
        if (Array.isArray(repair.additional_items) && repair.additional_items.length > 0) {
          const additionalItemsTotal = repair.additional_items.reduce(
            (sum, item) => sum + Number(item.cost || 0), 0
          );
          
          if (additionalItemsTotal > 0) {
            repairHtml += `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd;"><strong>Additional Items:</strong></td>
                  <td style="padding:8px; border:1px solid #ddd;">$${additionalItemsTotal.toLocaleString()}</td>
                </tr>`;
                
            // List each additional item
            repair.additional_items.forEach(item => {
              if (item.name && item.cost > 0) {
                repairHtml += `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd; padding-left: 20px;">- ${item.name}</td>
                  <td style="padding:8px; border:1px solid #ddd;">$${Number(item.cost).toLocaleString()}</td>
                </tr>`;
              }
            });
          }
        }
        
        if (repair.warranty) {
          repairHtml += `
              <tr>
                <td style="padding:8px; border:1px solid #ddd;"><strong>Warranty:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">${repair.warranty}</td>
              </tr>`;
        }
        
        // Add individual repair cost
        repairHtml += `
              <tr style="background-color:#f0f0f0;">
                <td style="padding:8px; border:1px solid #ddd;"><strong>${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Cost:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${Number(repair.total_cost || 0).toLocaleString()}</td>
              </tr>`;
              
        repairHtml += `
            </table>
          </div>`;
          
        // Add to text version
        repairText += `${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Option ${index + 1}:\n`;
        repairText += `- Selected Option: ${phaseName}\n`;
        repairText += `- Description: ${phaseData?.description || phaseName}\n`;
        repairText += `- Requires Crane: ${repair.needs_crane ? 'Yes' : 'No'}\n`;
        if (phaseData && phaseData.cost) {
          repairText += `- Base Cost: $${Number(phaseData.cost).toLocaleString()}\n`;
        }
        if (repair.labor > 0) {
          repairText += `- Labor: $${Number(repair.labor).toLocaleString()}\n`;
        }
        if (repair.refrigeration_recovery > 0) {
          repairText += `- Refrigeration Recovery: $${Number(repair.refrigeration_recovery).toLocaleString()}\n`;
        }
        if (repair.start_up_costs > 0) {
          repairText += `- Start-Up Costs: $${Number(repair.start_up_costs).toLocaleString()}\n`;
        }
        if (repair.thermostat_startup > 0) {
          repairText += `- Thermostat Startup: $${Number(repair.thermostat_startup).toLocaleString()}\n`;
        }
        if (repair.removal_cost > 0) {
          repairText += `- Removal of Old Equipment: $${Number(repair.removal_cost).toLocaleString()}\n`;
        }
        if (repair.permit_cost > 0) {
          repairText += `- Permit Cost: $${Number(repair.permit_cost).toLocaleString()}\n`;
        }
        
        // Add repair cost
        repairText += `- ${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Cost: $${Number(repair.total_cost || 0).toLocaleString()}\n\n`;
      });
      
      // Add total cost for all repairs - use the actual calculated total
      repairHtml += `
          <div style="margin-top: 20px; padding: 10px; background-color: #e6f7ef; border-radius: 5px;">
            <table style="width:100%; border-collapse: collapse;">
              <tr style="background-color:#e6f7ef; font-weight:bold;">
                <td style="padding:8px; border:1px solid #ddd;"><strong>TOTAL COST FOR ALL ${quoteType === 'replacement' ? 'REPLACEMENTS' : 'REPAIRS'}:</strong></td>
                <td style="padding:8px; border:1px solid #ddd;">$${totalCost.toLocaleString()}</td>
              </tr>
            </table>
          </div>
        </div>`;
        
      repairText += `TOTAL COST FOR ALL ${quoteType === 'replacement' ? 'REPLACEMENTS' : 'REPAIRS'}: $${totalCost.toLocaleString()}\n\n`;
    } else if (repairData) {
      // Fallback to single repair data if allRepairData is not available
      const selectedOption = selectedPhase === 'phase1' ? 'Economy Option' : 
                             selectedPhase === 'phase2' ? 'Standard Option' : 
                             'Premium Option';
      
      const selectedDescription = repairData[selectedPhase]?.description || selectedOption;
      
      // Calculate accessories total
      const accessoriesTotal = repairData.accessories.reduce(
        (sum, item) => sum + Number(item.cost), 0
      );
      
      // Calculate additional items total
      const additionalItemsTotal = repairData.additionalItems.reduce(
        (sum, item) => sum + Number(item.cost), 0
      );
      
      repairHtml = `
        <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
          <h3 style="margin-top:0;">${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Recommendation</h3>
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
              <td style="padding:8px; border:1px solid #ddd;"><strong>Requires Crane:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${repairData.needsCrane ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Base Cost:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${repairData[selectedPhase].cost.toLocaleString()}</td>
            </tr>`;
            
      if (repairData.labor > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Labor:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${repairData.labor.toLocaleString()}</td>
            </tr>`;
      }
      
      if (repairData.refrigerationRecovery > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Refrigeration Recovery:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${repairData.refrigerationRecovery.toLocaleString()}</td>
            </tr>`;
      }
      
      if (repairData.startUpCosts > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Start-Up Costs:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${repairData.startUpCosts.toLocaleString()}</td>
            </tr>`;
      }
      
      if (repairData.thermostatStartup > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Thermostat Startup:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${repairData.thermostatStartup.toLocaleString()}</td>
            </tr>`;
      }
      
      if (repairData.removalCost > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Removal of Old Equipment:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${repairData.removalCost.toLocaleString()}</td>
            </tr>`;
      }
      
      if (repairData.permitCost > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Permit Cost:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${repairData.permitCost.toLocaleString()}</td>
            </tr>`;
      }
      
      if (accessoriesTotal > 0) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Accessories:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${accessoriesTotal.toLocaleString()}</td>
            </tr>`;
            
        // List each accessory
        repairData.accessories.forEach(accessory => {
          if (accessory.name && accessory.cost > 0) {
            repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd; padding-left: 20px;">- ${accessory.name}</td>
              <td style="padding:8px; border:1px solid #ddd;">$${Number(accessory.cost).toLocaleString()}</td>
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
        repairData.additionalItems.forEach(item => {
          if (item.name && item.cost > 0) {
            repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd; padding-left: 20px;">- ${item.name}</td>
              <td style="padding:8px; border:1px solid #ddd;">$${Number(item.cost).toLocaleString()}</td>
            </tr>`;
          }
        });
      }
      
      if (repairData.warranty) {
        repairHtml += `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;"><strong>Warranty:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">${repairData.warranty}</td>
            </tr>`;
      }
      
      // Add total cost - use the actual calculated total
      repairHtml += `
            <tr style="background-color:#f0f0f0; font-weight:bold;">
              <td style="padding:8px; border:1px solid #ddd;"><strong>TOTAL COST:</strong></td>
              <td style="padding:8px; border:1px solid #ddd;">$${totalCost.toLocaleString()}</td>
            </tr>
          </table>
        </div>`;
      
      repairText = `
${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Recommendation:
- Selected Option: ${selectedOption}
- Description: ${selectedDescription}
- Requires Crane: ${repairData.needsCrane ? 'Yes' : 'No'}
- Base Cost: $${repairData[selectedPhase].cost.toLocaleString()}
`;

      if (repairData.labor > 0) {
        repairText += `- Labor: $${repairData.labor.toLocaleString()}\n`;
      }
      
      if (repairData.refrigerationRecovery > 0) {
        repairText += `- Refrigeration Recovery: $${repairData.refrigerationRecovery.toLocaleString()}\n`;
      }
      
      if (repairData.startUpCosts > 0) {
        repairText += `- Start-Up Costs: $${repairData.startUpCosts.toLocaleString()}\n`;
      }
      
      if (repairData.thermostatStartup > 0) {
        repairText += `- Thermostat Startup: $${repairData.thermostatStartup.toLocaleString()}\n`;
      }
      
      if (repairData.removalCost > 0) {
        repairText += `- Removal of Old Equipment: $${repairData.removalCost.toLocaleString()}\n`;
      }
      
      if (repairData.permitCost > 0) {
        repairText += `- Permit Cost: $${repairData.permitCost.toLocaleString()}\n`;
      }
      
      if (accessoriesTotal > 0) {
        repairText += `- Accessories: $${accessoriesTotal.toLocaleString()}\n`;
        repairData.accessories.forEach(accessory => {
          if (accessory.name && accessory.cost > 0) {
            repairText += `  * ${accessory.name}: $${Number(accessory.cost).toLocaleString()}\n`;
          }
        });
      }
      
      if (additionalItemsTotal > 0) {
        repairText += `- Additional Items: $${additionalItemsTotal.toLocaleString()}\n`;
        repairData.additionalItems.forEach(item => {
          if (item.name && item.cost > 0) {
            repairText += `  * ${item.name}: $${Number(item.cost).toLocaleString()}\n`;
          }
        });
      }
      
      if (repairData.warranty) {
        repairText += `- Warranty: ${repairData.warranty}\n`;
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

    // Use custom email template if provided, otherwise use defaults
    const subject = emailTemplate?.subject || `${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Quote #${quoteNumber} from Airlast HVAC`;
    const greeting = emailTemplate?.greeting || `Dear ${customerName || "Customer"},`;
    const introText = emailTemplate?.introText || `Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a ${quoteType === 'replacement' ? 'replacement' : 'repair'} quote for your review.`;
    const approvalText = emailTemplate?.approvalText || `Please click one of the buttons below to approve or deny the recommended ${quoteType === 'replacement' ? 'replacement' : 'repairs'}:`;
    const approveButtonText = emailTemplate?.approveButtonText || `Approve ${quoteType === 'replacement' ? 'Replacement' : 'Repairs'}`;
    const denyButtonText = emailTemplate?.denyButtonText || `Deny ${quoteType === 'replacement' ? 'Replacement' : 'Repairs'}`;
    const approvalNote = emailTemplate?.approvalNote || `If you approve, we will schedule the ${quoteType === 'replacement' ? 'replacement' : 'repair'} work at your earliest convenience.`;
    const denialNote = emailTemplate?.denialNote || "If you deny, you will be charged $180.00 for the inspection service.";
    const closingText = emailTemplate?.closingText || "If you have any questions, please don't hesitate to contact us.";
    const signature = emailTemplate?.signature || "Best regards,\nAirlast HVAC Team";

    const msg = {
      to: customerEmail,
      from: "support@airlast-management.com",
      subject: subject,
      text: `${greeting}

${introText}

Quote #${quoteNumber} for Job #${jobNumber} - ${jobName || "HVAC Service"}

${locationText}

${inspectionText}

${repairText}

Please click the link below to approve or deny the recommended ${quoteType === 'replacement' ? 'replacement' : 'repairs'}:

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
            </div>

            ${locationHtml}
            ${inspectionHtml}
            ${repairHtml}

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
            <p>${signature.replace(/\n/g, '<br>')}</p>
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
      message: `${quoteType === 'replacement' ? 'Replacement' : 'Repair'} quote email sent successfully`
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