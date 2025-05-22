import { createClient } from "npm:@supabase/supabase-js";
import sgMail from "npm:@sendgrid/mail";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { SENDGRID_API_KEY } = Deno.env.toObject();
    
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not set");
    }

    // Set SendGrid API key
    sgMail.setApiKey(SENDGRID_API_KEY);

    // Get request body
    const { 
      jobId, 
      invoiceId,
      customerEmail, 
      jobNumber, 
      jobName, 
      customerName, 
      invoiceNumber,
      amount,
      issuedDate,
      dueDate,
      jobItems 
    } = await req.json();

    // Validate required fields
    if (!jobId || !invoiceId || !customerEmail || !invoiceNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Format job items for email
    let itemsHtml = '';
    let itemsText = '';
    
    if (jobItems && jobItems.length > 0) {
      itemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Item</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Quantity</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Price</th>
          </tr>
          ${jobItems.map(item => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${Number(item.total_cost).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background-color: #f5f5f5; font-weight: bold;">
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="2">Total</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${amount}</td>
          </tr>
        </table>
      `;
      
      itemsText = "Items:\n\n";
      jobItems.forEach(item => {
        itemsText += `- ${item.name} (Qty: ${item.quantity}): $${Number(item.total_cost).toFixed(2)}\n`;
      });
      itemsText += `\nTotal: $${amount}\n\n`;
    }

    // Format dates
    const formattedIssuedDate = issuedDate ? new Date(issuedDate).toLocaleDateString() : 'N/A';
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A';

    // Create email message
    const msg = {
      to: customerEmail,
      from: "jackhoang.99@gmail.com", // Use your verified sender email
      subject: `Invoice #${invoiceNumber} from Airlast HVAC`,
      text: `Dear ${customerName || "Customer"},\n\nPlease find your invoice for job #${jobNumber} - ${jobName || "HVAC Service"} attached.\n\n${itemsText}Total Amount: $${amount || "0.00"}\n\nInvoice Number: ${invoiceNumber}\nIssued Date: ${formattedIssuedDate}\nDue Date: ${formattedDueDate}\n\nPlease remit payment by the due date.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nAirlast HVAC Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0672be; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Airlast HVAC</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>Dear ${customerName || "Customer"},</p>
            <p>Please find your invoice for job #${jobNumber} - ${jobName || "HVAC Service"} below.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Invoice Summary</h2>
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Issued Date:</strong> ${formattedIssuedDate}</p>
              <p><strong>Due Date:</strong> ${formattedDueDate}</p>
              <p><strong>Job Number:</strong> ${jobNumber}</p>
              <p><strong>Service:</strong> ${jobName || "HVAC Service"}</p>
              ${itemsHtml}
              <p><strong>Total Amount:</strong> $${amount || "0.00"}</p>
            </div>
            <p>Please remit payment by the due date.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>Airlast HVAC Team</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>© 2025 Airlast HVAC. All rights reserved.</p>
            <p>1650 Marietta Boulevard Northwest, Atlanta, GA 30318</p>
          </div>
        </div>
      `,
    };

    // Send email
    await sgMail.send(msg);

    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Invoice email sent successfully" }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});