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
    const { jobId, customerEmail, quoteToken, jobNumber, jobName, customerName, totalAmount, jobItems } = await req.json();
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
    // Build items HTML and text
    let itemsHtml = "";
    let itemsText = "";
    if (Array.isArray(jobItems) && jobItems.length > 0) {
      itemsHtml = `
        <table style="width:100%; border-collapse: collapse; margin:15px 0;">
          <tr style="background-color:#f5f5f5;">
            <th style="padding:8px; text-align:left; border:1px solid #ddd;">Item</th>
            <th style="padding:8px; text-align:left; border:1px solid #ddd;">Quantity</th>
            <th style="padding:8px; text-align:right; border:1px solid #ddd;">Price</th>
          </tr>
          ${jobItems.map((item)=>`
            <tr>
              <td style="padding:8px; border:1px solid #ddd;">${item.name}</td>
              <td style="padding:8px; border:1px solid #ddd;">${item.quantity}</td>
              <td style="padding:8px; text-align:right; border:1px solid #ddd;">$${Number(item.total_cost).toFixed(2)}</td>
            </tr>`).join("")}
          <tr style="background-color:#f5f5f5; font-weight:bold;">
            <td style="padding:8px; border:1px solid #ddd;" colspan="2">Total</td>
            <td style="padding:8px; text-align:right; border:1px solid #ddd;">$${totalAmount}</td>
          </tr>
        </table>`;
      itemsText = "Items:\n\n";
      jobItems.forEach((item)=>{
        itemsText += `- ${item.name} (Qty: ${item.quantity}): $${Number(item.total_cost).toFixed(2)}\n`;
      });
      itemsText += `\nTotal: $${totalAmount}\n\n`;
    }
    const msg = {
      to: customerEmail,
      from: "support@airlast-management.com",
      subject: `Quote #${jobNumber} from Airlast HVAC`,
      text: `Dear ${customerName || "Customer"},\n
Thank you for your interest in Airlast HVAC services. Please find your quote for job #${jobNumber} - ${jobName || "HVAC Service"} below.\n\n${itemsText}Total Amount: $${totalAmount || "0.00"}\n\nTo confirm this quote, please click the following link:\n${confirmationUrl}\n\nThis quote is valid for 30 days from the date of issue.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nAirlast HVAC Team`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
          <!-- Text-only header -->
          <div style="background-color:#0672be; padding:20px; text-align:center;">
            <h1 style="color:white; margin:0;">Airlast HVAC</h1>
          </div>

          <!-- Body -->
          <div style="padding:20px; border:1px solid #ddd; border-top:none;">
            <p>Dear ${customerName || "Customer"},</p>
            <p>Thank you for your interest in Airlast HVAC services. Below is your quote for job #${jobNumber} - ${jobName || "HVAC Service"}.</p>

            <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; margin:20px 0;">
              <h2 style="margin-top:0;">Quote Summary</h2>
              <p><strong>Job Number:</strong> ${jobNumber}</p>
              <p><strong>Service:</strong> ${jobName || "HVAC Service"}</p>
              ${itemsHtml}
              <p><strong>Total Amount:</strong> $${totalAmount || "0.00"}</p>
            </div>

            <p>To confirm this quote, please click the button below:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${confirmationUrl}" style="background-color:#0672be; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold;">
                Confirm Quote
              </a>
            </div>

            <p>This quote is valid for 30 days from the date of issue.</p>
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
      message: "Quote email sent successfully"
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
