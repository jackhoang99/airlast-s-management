import sgMail from "npm:@sendgrid/mail";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  // Handle CORS preflight
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
    sgMail.setApiKey(SENDGRID_API_KEY);
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
      jobItems,
      invoiceType = "standard",
    } = await req.json();
    if (!jobId || !customerEmail || !invoiceNumber) {
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job data
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select(
        `
         *,
         locations (
           name,
           address,
           city,
           state,
           zip,
           companies (
             name
           )
         ),
         units (
           unit_number
         )
       `
      )
      .eq("id", jobId)
      .single();

    if (jobError) {
      console.error("Error fetching job data:", jobError);
      throw new Error("Failed to fetch job data");
    }

    console.log("Sending invoice email with data:", {
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
      invoiceType,
    });
    // Format dates
    const formattedIssuedDate = issuedDate
      ? new Date(issuedDate).toLocaleDateString()
      : "N/A";
    const formattedDueDate = dueDate
      ? new Date(dueDate).toLocaleDateString()
      : "N/A";

    // Determine item label based on invoice type
    let itemLabel = "Replacement Parts";
    if (invoiceType === "inspection") {
      itemLabel = "Inspection Fee";
    } else if (invoiceType === "repair") {
      itemLabel = "Repair Services";
    } else if (invoiceType === "standard") {
      itemLabel = "Services & Parts";
    }
    // Build items table (HTML + text)
    let itemsHtml = "";
    let itemsText = "";
    if (Array.isArray(jobItems) && jobItems.length > 0) {
      // Check if this is an inspection invoice
      const isInspectionInvoice =
        amount === 180.0 && jobItems.some((item) => item.code === "INSP-FEE");
      // Filter items for display
      const displayItems = isInspectionInvoice
        ? jobItems.filter((item) => item.code === "INSP-FEE")
        : jobItems;
      itemsHtml = `
        <table style="width:100%; border-collapse: collapse; margin:15px 0;">
          <tr style="background-color:#f5f5f5;">
            <th style="padding:8px; text-align:left; border:1px solid #ddd;">${itemLabel}</th>
            <th style="padding:8px; text-align:left; border:1px solid #ddd;">Quantity</th>
            <th style="padding:8px; text-align:right; border:1px solid #ddd;">Price</th>
          </tr>
          ${displayItems
            .map(
              (item) => `
            <tr>
              <td style="padding:8px; border:1px solid #ddd;">${item.name}</td>
              <td style="padding:8px; border:1px solid #ddd;">${
                item.quantity
              }</td>
              <td style="padding:8px; text-align:right; border:1px solid #ddd;">$${Number(
                item.total_cost
              ).toFixed(2)}</td>
            </tr>`
            )
            .join("")}
          <tr style="background-color:#f5f5f5; font-weight:bold;">
            <td style="padding:8px; border:1px solid #ddd;" colspan="2">Total</td>
            <td style="padding:8px; text-align:right; border:1px solid #ddd;">$${Number(
              amount
            ).toFixed(2)}</td>
          </tr>
        </table>`;
      itemsText = `${itemLabel}:\n\n`;
      displayItems.forEach((item) => {
        itemsText += `- ${item.name} (Qty: ${item.quantity}): $${Number(
          item.total_cost
        ).toFixed(2)}\n`;
      });
      itemsText += `\nTotal: $${Number(amount).toFixed(2)}\n\n`;
    }
    // Get PDF URL from database or generate if not exists
    let pdfUrl = "";
    let attachments = [];
    let viewPdfButtonHtml = "";

    try {
      // First, try to get the PDF URL from the database
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("job_invoices")
        .select("pdf_url")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) {
        console.warn("Error fetching invoice PDF URL:", invoiceError);
      } else if (invoiceData?.pdf_url) {
        pdfUrl = invoiceData.pdf_url;
        console.log("Using existing PDF URL:", pdfUrl);
      } else {
        // Generate PDF if URL doesn't exist
        console.log("No PDF URL found, generating new PDF...");
        const generatePdfUrl = `${Deno.env.get(
          "SUPABASE_URL"
        )}/functions/v1/generate-invoice-pdf`;

        const pdfResponse = await fetch(generatePdfUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            jobId,
            invoiceId,
            jobData,
            jobItems,
            invoiceNumber,
            amount,
            issuedDate,
            dueDate,
            invoiceType,
          }),
        });

        if (pdfResponse.ok) {
          const pdfResult = await pdfResponse.json();
          if (pdfResult.pdfUrl) {
            pdfUrl = pdfResult.pdfUrl;
            console.log("Invoice PDF generated:", pdfUrl);

            // Update the invoice with the PDF URL
            const { error: updateError } = await supabase
              .from("job_invoices")
              .update({ pdf_url: pdfUrl })
              .eq("id", invoiceId);

            if (updateError) {
              console.warn("Error updating invoice with PDF URL:", updateError);
            }
          }
        } else {
          console.warn("Failed to generate PDF:", await pdfResponse.text());
        }
      }
    } catch (pdfError) {
      console.warn("Error with PDF handling:", pdfError.message);
    }

    // Now handle PDF attachment and button
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
              filename: `Invoice-${invoiceNumber}.pdf`,
              type: "application/pdf",
              disposition: "attachment",
            });
            console.log(
              `PDF attached (${Math.round(pdfBuffer.byteLength / 1024)}KB)`
            );
            // Always show the button even when PDF is attached
            viewPdfButtonHtml = `
              <div style="text-align:center; margin:20px 0;">
                <a href="${pdfUrl}" style="background-color:#0672be; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold;">
                  View Invoice PDF
                </a>
              </div>`;
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
                  View Invoice PDF
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
                View Invoice PDF
              </a>
            </div>`;
        }
      } catch (pdfError) {
        console.warn(`Error processing PDF attachment: ${pdfError.message}`);
        // Add a button to view the PDF instead
        viewPdfButtonHtml = `
          <div style="text-align:center; margin:20px 0;">
            <a href="${pdfUrl}" style="background-color:#0672be; color:white; padding:12px 24px; text-decoration:none; border-radius:4px; font-weight:bold;">
              View Invoice PDF
            </a>
          </div>`;
      }
    }
    const msg = {
      to: customerEmail,
      from: "support@airlast-management.com",
      subject: `Invoice #${invoiceNumber} from Airlast HVAC`,
      text: `Dear ${customerName || "Customer"},\n
Please find your invoice for job #${jobNumber} - ${
        jobName || "HVAC Service"
      } below.\n\n${itemsText}Total Amount: $${
        amount || "0.00"
      }\n\nInvoice Number: ${invoiceNumber}\nIssued Date: ${formattedIssuedDate}\nDue Date: ${formattedDueDate}\n\nPlease remit payment by the due date.\n\nIf you have any questions, please reach out.\n\nBest regards,\nAirlast HVAC Team`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <!-- Text-only header -->
          <div style="background-color:#0672be;padding:20px;text-align:center;">
            <h1 style="color:white;margin:0;">Airlast HVAC</h1>
          </div>

          <!-- Invoice body -->
          <div style="padding:20px;border:1px solid #ddd;border-top:none;">
            <p>Dear ${customerName || "Customer"},</p>
            <p>Please find your invoice for job #${jobNumber} - ${
        jobName || "HVAC Service"
      } below.</p>

            <div style="background-color:#f9f9f9;padding:15px;border-radius:5px;margin:20px 0;">
              <h2 style="margin-top:0;">Invoice Summary</h2>
              <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
              <p><strong>Issued Date:</strong> ${formattedIssuedDate}</p>
              <p><strong>Due Date:</strong> ${formattedDueDate}</p>
              <p><strong>Job #:</strong> ${jobNumber}</p>
              <p><strong>Service:</strong> ${jobName || "HVAC Service"}</p>
              ${itemsHtml}
              <p><strong>Total Amount:</strong> $${Number(amount).toFixed(
                2
              )}</p>
            </div>

            ${
              viewPdfButtonHtml ||
              (pdfUrl
                ? `
            <div style="text-align:center;margin:30px 0;">
              <a
                href="${pdfUrl}"
                style="background-color:#0672be;color:white;padding:12px 24px;
                       text-decoration:none;border-radius:4px;font-weight:bold;">
                View Invoice PDF
              </a>
            </div>`
                : "")
            }

            <p>Please remit payment by the due date.</p>
            <p>If you have any questions, please reach out.</p>
            <p>Best regards,<br>Airlast HVAC Team</p>
          </div>

          <!-- Footer -->
          <div style="background-color:#f5f5f5;padding:15px;text-align:center;
                      font-size:12px;color:#666;">
            <p>© 2025 Airlast HVAC. All rights reserved.</p>
            <p>1650 Marietta Boulevard Northwest, Atlanta, GA 30318</p>
          </div>
        </div>`,
      attachments: attachments,
    };
    console.log("Sending email to:", customerEmail);
    try {
      await sgMail.send(msg);
      console.log("Email sent successfully");
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Return a 200 response with a warning instead of failing
      return new Response(
        JSON.stringify({
          success: true,
          warning:
            "Invoice created but email could not be sent. Please try sending it manually.",
          emailError: emailError.message,
        }),
        {
          status: 200,
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
        message: "Invoice email sent successfully",
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
    console.error("Error in invoice email function:", error);
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
