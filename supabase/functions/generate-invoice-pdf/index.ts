// supabase/functions/generate-invoice-pdf/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      jobId,
      invoiceId,
      jobData,
      jobItems,
      invoiceNumber,
      amount,
      issuedDate,
      dueDate,
      invoiceType,
    } = await req.json();

    if (!jobId || !invoiceNumber) {
      throw new Error("Missing required fields: jobId and invoiceNumber");
    }

    console.log("Generating invoice PDF for:", {
      jobId,
      invoiceId,
      invoiceNumber,
      amount,
    });

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = page.getSize();

    // Set up fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Helper function to add text
    const addText = (
      text: string,
      x: number,
      y: number,
      size: number = 12,
      font: any = helveticaFont,
      color: any = rgb(0, 0, 0)
    ) => {
      page.drawText(text, {
        x,
        y: height - y,
        size,
        font,
        color,
      });
    };

    // Helper function to add line
    const addLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      thickness: number = 1
    ) => {
      page.drawLine({
        start: { x: x1, y: height - y1 },
        end: { x: x2, y: height - y2 },
        thickness,
        color: rgb(0.8, 0.8, 0.8),
      });
    };

    let yPos = 50;

    // Header
    addText("INVOICE", 50, yPos, 24, helveticaBold, rgb(0.2, 0.4, 0.8));
    yPos += 40;

    // Add AirLast logo to top right
    try {
      const logoUrl =
        "https://ekxkjnygupehzpoyojwq.supabase.co/storage/v1/object/public/templates/quote-templates/airlast-logo%20(1).png";

      // Add timeout to logo fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const logoRes = await fetch(logoUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (logoRes.ok) {
        const logoBytes = await logoRes.arrayBuffer();
        // Try to embed as PNG first, if that fails, use text fallback
        try {
          const logoImage = await pdfDoc.embedPng(logoBytes);

          // Position logo in top right corner
          const logoWidth = 100;
          const logoHeight = 50;
          const logoX = width - logoWidth - 50; // 50px from right edge
          const logoY = height - logoHeight - 50; // 50px from top

          page.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
          });
        } catch (embedError) {
          console.log(
            "Error embedding logo as PNG, using text fallback:",
            embedError
          );
          throw new Error("Logo embedding failed");
        }
      } else {
        throw new Error("Logo fetch failed");
      }
    } catch (error) {
      console.log("Error loading AirLast logo, using fallback text:", error);
      // Fallback to text logo
      addText(
        "AIRLAST",
        width - 120,
        70,
        16,
        helveticaBold,
        rgb(0.2, 0.4, 0.8)
      );
    }

    // Company Info (Left side)
    addText("Airlast HVAC", 50, yPos, 16, helveticaBold);
    yPos += 20;
    addText("1650 Marietta Boulevard Northwest", 50, yPos, 10);
    yPos += 15;
    addText("Atlanta, GA 30318", 50, yPos, 10);
    yPos += 15;
    addText("(404) 632-9074", 50, yPos, 10);
    yPos += 15;
    addText("www.airlast.com", 50, yPos, 10);
    yPos += 30;

    // Invoice Details (Right side)
    const rightX = 350;
    addText("Invoice details", rightX, yPos, 12, helveticaBold);
    yPos += 20;

    const details = [
      ["Invoice no:", invoiceNumber],
      ["Terms:", "Net 30"],
      [
        "Invoice date:",
        issuedDate ? new Date(issuedDate).toLocaleDateString() : "N/A",
      ],
      ["Due date:", dueDate ? new Date(dueDate).toLocaleDateString() : "N/A"],
      ["Job #:", jobData?.number || "N/A"],
    ];

    details.forEach(([label, value]) => {
      addText(label, rightX, yPos, 10);
      addText(value, rightX + 80, yPos, 10);
      yPos += 15;
    });

    yPos += 20;

    // Bill To Section
    addText("Bill to", 50, yPos, 12, helveticaBold);
    yPos += 20;
    if (jobData?.locations?.companies?.name) {
      addText(jobData.locations.companies.name, 50, yPos, 10, helveticaBold);
      yPos += 15;
    }
    if (jobData?.locations?.address) {
      addText(jobData.locations.address, 50, yPos, 10);
      yPos += 15;
    }
    if (
      jobData?.locations?.city &&
      jobData?.locations?.state &&
      jobData?.locations?.zip
    ) {
      addText(
        `${jobData.locations.city}, ${jobData.locations.state} ${jobData.locations.zip}`,
        50,
        yPos,
        10
      );
      yPos += 15;
    }
    if (jobData?.contact_name) {
      addText(`Attn: ${jobData.contact_name}`, 50, yPos, 10);
      yPos += 20;
    }

    // Service Location
    addText("Service Location", 50, yPos, 12, helveticaBold);
    yPos += 20;
    if (jobData?.locations?.name) {
      addText(jobData.locations.name, 50, yPos, 10);
      yPos += 15;
    }
    if (jobData?.locations?.address) {
      addText(jobData.locations.address, 50, yPos, 10);
      yPos += 15;
    }
    if (
      jobData?.locations?.city &&
      jobData?.locations?.state &&
      jobData?.locations?.zip
    ) {
      addText(
        `${jobData.locations.city}, ${jobData.locations.state} ${jobData.locations.zip}`,
        50,
        yPos,
        10
      );
      yPos += 15;
    }
    if (jobData?.units?.unit_number) {
      addText(`Unit: ${jobData.units.unit_number}`, 50, yPos, 10);
      yPos += 20;
    }

    // Items Table
    addLine(50, yPos, 562, yPos, 2);
    yPos += 10;

    // Table Headers
    addText("#", 50, yPos, 10, helveticaBold);
    addText("Date", 100, yPos, 10, helveticaBold);
    addText("Type", 160, yPos, 10, helveticaBold);
    addText("Description", 280, yPos, 10, helveticaBold);
    addText("Amount", 500, yPos, 10, helveticaBold);
    yPos += 15;

    addLine(50, yPos, 562, yPos);
    yPos += 10;

    // Table Content
    if (Array.isArray(jobItems) && jobItems.length > 0) {
      jobItems.forEach((item, index) => {
        addText(`${index + 1}.`, 50, yPos, 10);
        addText(
          issuedDate ? new Date(issuedDate).toLocaleDateString() : "N/A",
          100,
          yPos,
          10
        );
        addText(
          invoiceType
            ? invoiceType.charAt(0).toUpperCase() + invoiceType.slice(1)
            : "Standard",
          160,
          yPos,
          10
        );
        addText(item.name || "Service", 280, yPos, 10);
        addText(`$${Number(item.total_cost || 0).toFixed(2)}`, 500, yPos, 10);
        yPos += 15;
      });
    } else {
      // Single line item for the total amount
      addText("1.", 50, yPos, 10);
      addText(
        issuedDate ? new Date(issuedDate).toLocaleDateString() : "N/A",
        100,
        yPos,
        10
      );
      addText(
        invoiceType
          ? invoiceType.charAt(0).toUpperCase() + invoiceType.slice(1)
          : "Standard",
        160,
        yPos,
        10
      );
      addText(jobData?.name || "HVAC Service", 280, yPos, 10);
      addText(`$${Number(amount || 0).toFixed(2)}`, 500, yPos, 10);
      yPos += 15;
    }

    addLine(50, yPos, 562, yPos);
    yPos += 10;

    // Total
    addText("Total", 400, yPos, 12, helveticaBold);
    addText(`$${Number(amount || 0).toFixed(2)}`, 500, yPos, 12, helveticaBold);
    yPos += 30;

    // Ways to Pay
    addText("Ways to pay", 50, yPos, 12, helveticaBold);
    yPos += 20;
    addText("Send checks to:", 50, yPos, 10);
    yPos += 15;
    addText("332 Chinquapin Drive SW", 50, yPos, 10);
    yPos += 15;
    addText("Marietta, Ga 30064", 50, yPos, 10);
    yPos += 30;

    // Notes
    addText("Notes", 50, yPos, 12, helveticaBold);
    yPos += 20;
    addText(
      "Thank you for your business! Please include the invoice number on your payment.",
      50,
      yPos,
      10
    );
    yPos += 15;
    addText(
      "For questions regarding this invoice, please contact our office at (404) 632-9074.",
      50,
      yPos,
      10
    );

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Upload to Supabase Storage
    const fileName = `invoice_${invoiceNumber}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      throw new Error("Failed to upload PDF to storage");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("invoices")
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    console.log("Invoice PDF generated successfully:", {
      fileName,
      pdfUrl,
      size: pdfBytes.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: pdfUrl,
        fileName: fileName,
        message: "Invoice PDF generated successfully",
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
    console.error("Error generating invoice PDF:", error);
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
