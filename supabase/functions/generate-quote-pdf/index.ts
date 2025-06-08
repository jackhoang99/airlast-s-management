import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib";

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
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { jobId, quoteType, quoteNumber, templateId, jobData, inspectionData, repairData, jobItems } = await req.json();

    console.log("Generating PDF for:", {
      jobId,
      quoteType,
      quoteNumber,
      templateId,
      hasJobData: !!jobData,
      hasInspectionData: Array.isArray(inspectionData) && inspectionData.length > 0,
      hasRepairData: !!repairData,
      hasJobItems: Array.isArray(jobItems) && jobItems.length > 0
    });

    if (!jobId || !quoteType || !templateId) {
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

    // 1. Get the template details
    const { data: templateData, error: templateError } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      throw new Error(`Error fetching template: ${templateError.message}`);
    }

    if (!templateData || !templateData.template_data.fileUrl) {
      throw new Error("Template not found or invalid");
    }

    // 2. Download the template PDF
    const templateUrl = templateData.template_data.fileUrl;
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch template PDF: ${templateResponse.statusText}`);
    }

    const templatePdfBytes = await templateResponse.arrayBuffer();

    // 3. Load the template PDF
    const pdfDoc = await PDFDocument.load(templatePdfBytes);
    
    // 4. Create a new PDF document
    const newPdfDoc = await PDFDocument.create();

    // 5. Get the preserved page ranges
    const preservedPages = templateData.template_data.preservedPages || [1];
    
    // Sort preserved pages in ascending order
    const sortedPreservedPages = [...preservedPages].sort((a, b) => a - b);
    
    // Find the gap in preserved pages where we should insert dynamic content
    let insertPosition = -1;
    let firstRangeEnd = -1;
    let secondRangeStart = -1;
    
    for (let i = 0; i < sortedPreservedPages.length - 1; i++) {
      if (sortedPreservedPages[i + 1] - sortedPreservedPages[i] > 1) {
        insertPosition = i + 1;
        firstRangeEnd = sortedPreservedPages[i];
        secondRangeStart = sortedPreservedPages[i + 1];
        break;
      }
    }
    
    console.log("Page analysis:", {
      preservedPages: sortedPreservedPages,
      insertPosition,
      firstRangeEnd,
      secondRangeStart
    });
    
    // If no gap found, we'll add dynamic content at the end
    if (insertPosition === -1) {
      insertPosition = sortedPreservedPages.length;
    }

    // 6. Copy the preserved pages from the template
    // First, copy pages before the insert position
    for (let i = 0; i < insertPosition; i++) {
      const pageNum = sortedPreservedPages[i];
      if (pageNum > 0 && pageNum <= pdfDoc.getPageCount()) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(copiedPage);
      }
    }

    // 7. Add a dynamic content page
    const dynamicPage = newPdfDoc.addPage();

    // 8. Add content to the dynamic page based on quote type
    const { width, height } = dynamicPage.getSize();
    const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    
    let yPosition = height - 80;

    // Add title
    dynamicPage.drawText(`${quoteType.toUpperCase()} QUOTE`, {
      x: 50,
      y: yPosition,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    yPosition -= 40;

    // Add job details
    dynamicPage.drawText(`Quote #: ${quoteNumber}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font
    });
    yPosition -= lineHeight;

    dynamicPage.drawText(`Job #: ${jobData?.number || ""}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font
    });
    yPosition -= lineHeight;

    dynamicPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font
    });
    yPosition -= lineHeight * 2;

    // Add customer details
    if (jobData?.locations) {
      dynamicPage.drawText("Customer:", {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font: boldFont
      });
      yPosition -= lineHeight;

      dynamicPage.drawText(`${jobData.locations.companies?.name || ""}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      yPosition -= lineHeight;

      dynamicPage.drawText(`${jobData.locations.name || ""}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      yPosition -= lineHeight;

      dynamicPage.drawText(`${jobData.locations.address || ""}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      yPosition -= lineHeight;

      dynamicPage.drawText(`${jobData.locations.city || ""}, ${jobData.locations.state || ""} ${jobData.locations.zip || ""}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      yPosition -= lineHeight;

      if (jobData.units) {
        dynamicPage.drawText(`Unit: ${jobData.units.unit_number || ""}`, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font
        });
        yPosition -= lineHeight;
      }
    }
    yPosition -= lineHeight * 2;

    // Add inspection data if available
    if (inspectionData && inspectionData.length > 0) {
      dynamicPage.drawText("Inspection Results:", {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font: boldFont
      });
      yPosition -= lineHeight * 1.5;

      const inspection = inspectionData[0]; // Use the first inspection
      dynamicPage.drawText(`Model Number: ${inspection?.model_number || 'N/A'}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      dynamicPage.drawText(`Serial Number: ${inspection?.serial_number || 'N/A'}`, {
        x: 300,
        y: yPosition,
        size: fontSize,
        font
      });
      yPosition -= lineHeight;

      dynamicPage.drawText(`Age: ${inspection?.age || 'N/A'} years`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      dynamicPage.drawText(`Tonnage: ${inspection?.tonnage || 'N/A'}`, {
        x: 300,
        y: yPosition,
        size: fontSize,
        font
      });
      yPosition -= lineHeight;

      dynamicPage.drawText(`Unit Type: ${inspection?.unit_type || 'N/A'}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      dynamicPage.drawText(`System Type: ${inspection?.system_type || 'N/A'}`, {
        x: 300,
        y: yPosition,
        size: fontSize,
        font
      });
      yPosition -= lineHeight * 2;
    }

    // Add repair data if available
    if (repairData && (quoteType === 'repair' || quoteType === 'replacement')) {
      dynamicPage.drawText(`${quoteType === 'repair' ? 'Repair' : 'Replacement'} Recommendation:`, {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font: boldFont
      });
      yPosition -= lineHeight * 1.5;

      const selectedPhase = repairData.selected_phase || 'phase2';
      const phaseData = repairData[selectedPhase];
      
      if (phaseData) {
        dynamicPage.drawText(`Selected Option: ${selectedPhase === 'phase1' ? 'Economy' : selectedPhase === 'phase2' ? 'Standard' : 'Premium'}`, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font
        });
        yPosition -= lineHeight;

        dynamicPage.drawText(`Description: ${phaseData.description || 'N/A'}`, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font
        });
        yPosition -= lineHeight;
      }

      // Add total cost
      const totalCostValue = repairData.total_cost || 0;
      dynamicPage.drawText(`Total Cost: $${Number(totalCostValue).toLocaleString()}`, {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font: boldFont
      });
      yPosition -= lineHeight * 2;
    }

    // Add job items if available
    if (jobItems && jobItems.length > 0) {
      dynamicPage.drawText("Items:", {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font: boldFont
      });
      yPosition -= lineHeight * 1.5;

      // Draw table header
      dynamicPage.drawText("Item", {
        x: 50,
        y: yPosition,
        size: fontSize,
        font: boldFont
      });
      dynamicPage.drawText("Quantity", {
        x: 300,
        y: yPosition,
        size: fontSize,
        font: boldFont
      });
      dynamicPage.drawText("Price", {
        x: 400,
        y: yPosition,
        size: fontSize,
        font: boldFont
      });
      yPosition -= lineHeight;

      // Draw items
      let totalCost = 0;
      for (const item of jobItems) {
        if (yPosition < 100) {
          // If we're running out of space, add a note and break
          dynamicPage.drawText("(Additional items not shown due to space constraints)", {
            x: 50,
            y: yPosition,
            size: fontSize - 2,
            font,
            color: rgb(0.5, 0.5, 0.5)
          });
          break;
        }

        // Safe access with fallbacks
        const itemName = item?.name || 'Unknown Item';
        const itemQuantity = item?.quantity || 1;
        const itemCost = Number(item?.total_cost || 0);

        dynamicPage.drawText(itemName, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font
        });
        dynamicPage.drawText(itemQuantity.toString(), {
          x: 300,
          y: yPosition,
          size: fontSize,
          font
        });
        dynamicPage.drawText(`$${itemCost.toFixed(2)}`, {
          x: 400,
          y: yPosition,
          size: fontSize,
          font
        });
        totalCost += itemCost;
        yPosition -= lineHeight;
      }

      // Draw total
      yPosition -= lineHeight;
      dynamicPage.drawText("Total:", {
        x: 300,
        y: yPosition,
        size: fontSize + 2,
        font: boldFont
      });
      dynamicPage.drawText(`$${totalCost.toFixed(2)}`, {
        x: 400,
        y: yPosition,
        size: fontSize + 2,
        font: boldFont
      });
    }

    // 9. Copy the remaining preserved pages after the dynamic content
    for (let i = insertPosition; i < sortedPreservedPages.length; i++) {
      const pageNum = sortedPreservedPages[i];
      if (pageNum > 0 && pageNum <= pdfDoc.getPageCount()) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(copiedPage);
      }
    }

    // 10. Serialize the PDF to bytes
    const pdfBytes = await newPdfDoc.save();

    // 11. Upload the generated PDF to storage
    const pdfPath = `quotes/${jobId}/${quoteNumber}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error uploading generated PDF: ${uploadError.message}`);
    }

    // 12. Get a signed URL for the uploaded PDF
    const { data: urlData, error: urlError } = await supabase.storage
      .from('quotes')
      .createSignedUrl(pdfPath, 3600); // 1 hour expiry

    if (urlError) {
      throw new Error(`Error creating signed URL: ${urlError.message}`);
    }

    // 13. Create a record in the job_quotes table if it doesn't exist
    const { data: existingQuote, error: existingQuoteError } = await supabase
      .from('job_quotes')
      .select('*')
      .eq('job_id', jobId)
      .eq('quote_type', quoteType)
      .eq('quote_number', quoteNumber)
      .maybeSingle();

    if (existingQuoteError && !existingQuoteError.message.includes('contains 0 rows')) {
      throw new Error(`Error checking existing quote: ${existingQuoteError.message}`);
    }

    if (!existingQuote) {
      // Calculate total amount
      let totalAmount = 0;
      if (repairData && repairData.total_cost) {
        totalAmount = Number(repairData.total_cost);
      } else if (jobItems && jobItems.length > 0) {
        totalAmount = jobItems.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
      }

      const { error: insertError } = await supabase
        .from('job_quotes')
        .insert({
          job_id: jobId,
          quote_number: quoteNumber,
          quote_type: quoteType,
          amount: totalAmount,
          token: crypto.randomUUID(),
          confirmed: false,
          approved: false,
          email: jobData?.contact_email || ''
        });

      if (insertError) {
        throw new Error(`Error creating quote record: ${insertError.message}`);
      }
    }

    // 14. Return the signed URL
    return new Response(JSON.stringify({
      success: true,
      pdfUrl: urlData.signedUrl,
      quoteNumber
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unknown error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});