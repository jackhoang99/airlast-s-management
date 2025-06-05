import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { PDFDocument } from "npm:pdf-lib";

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
    const { 
      jobId, 
      quoteType, 
      quoteNumber, 
      templateId,
      jobData,
      inspectionData,
      repairData,
      jobItems
    } = await req.json();

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
    
    // 4. Get the preserved pages
    const preservedPages = templateData.template_data.preservedPages || [1];
    
    // 5. Create a new PDF document
    const newPdfDoc = await PDFDocument.create();
    
    // 6. Copy the preserved pages from the template
    for (const pageNum of preservedPages) {
      if (pageNum > 0 && pageNum <= pdfDoc.getPageCount()) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(copiedPage);
      }
    }
    
    // 7. Add a new page for the quote details
    const page = newPdfDoc.addPage();
    
    // 8. Add content to the new page based on quote type
    // This is a simplified version - in a real implementation, you would add more detailed content
    const { width, height } = page.getSize();
    const font = await newPdfDoc.embedFont('Helvetica');
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    
    let yPosition = height - 50;
    
    // Add title
    page.drawText(`${quoteType.toUpperCase()} QUOTE`, {
      x: 50,
      y: yPosition,
      size: 24,
      font
    });
    
    yPosition -= 40;
    
    // Add job details
    page.drawText(`Quote #: ${quoteNumber}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font
    });
    
    yPosition -= lineHeight;
    
    page.drawText(`Job #: ${jobData.number}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font
    });
    
    yPosition -= lineHeight;
    
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font
    });
    
    yPosition -= lineHeight * 2;
    
    // Add customer details
    if (jobData.locations) {
      page.drawText("Customer:", {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`${jobData.locations.companies?.name || ""}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`${jobData.locations.name}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`${jobData.locations.address}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`${jobData.locations.city}, ${jobData.locations.state} ${jobData.locations.zip}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      if (jobData.units) {
        page.drawText(`Unit: ${jobData.units.unit_number}`, {
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
      page.drawText("Inspection Results:", {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font
      });
      
      yPosition -= lineHeight * 1.5;
      
      const inspection = inspectionData[0]; // Use the first inspection
      
      page.drawText(`Model Number: ${inspection.model_number || 'N/A'}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      page.drawText(`Serial Number: ${inspection.serial_number || 'N/A'}`, {
        x: 300,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`Age: ${inspection.age || 'N/A'} years`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      page.drawText(`Tonnage: ${inspection.tonnage || 'N/A'}`, {
        x: 300,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`Unit Type: ${inspection.unit_type || 'N/A'}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      page.drawText(`System Type: ${inspection.system_type || 'N/A'}`, {
        x: 300,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight * 2;
    }
    
    // Add repair data if available
    if (repairData && (quoteType === 'repair' || quoteType === 'replacement')) {
      page.drawText(`${quoteType === 'repair' ? 'Repair' : 'Replacement'} Recommendation:`, {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font
      });
      
      yPosition -= lineHeight * 1.5;
      
      const selectedPhase = repairData.selected_phase || 'phase2';
      const phaseData = repairData[selectedPhase];
      
      page.drawText(`Selected Option: ${selectedPhase === 'phase1' ? 'Economy' : selectedPhase === 'phase2' ? 'Standard' : 'Premium'}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`Description: ${phaseData?.description || 'N/A'}`, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      page.drawText(`Total Cost: $${Number(repairData.total_cost || 0).toLocaleString()}`, {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font
      });
      
      yPosition -= lineHeight * 2;
    }
    
    // Add job items if available
    if (jobItems && jobItems.length > 0) {
      page.drawText("Items:", {
        x: 50,
        y: yPosition,
        size: fontSize + 2,
        font
      });
      
      yPosition -= lineHeight * 1.5;
      
      // Draw table header
      page.drawText("Item", {
        x: 50,
        y: yPosition,
        size: fontSize,
        font
      });
      
      page.drawText("Quantity", {
        x: 300,
        y: yPosition,
        size: fontSize,
        font
      });
      
      page.drawText("Price", {
        x: 400,
        y: yPosition,
        size: fontSize,
        font
      });
      
      yPosition -= lineHeight;
      
      // Draw items
      let totalCost = 0;
      
      for (const item of jobItems) {
        if (yPosition < 100) {
          // Add a new page if we're running out of space
          page = newPdfDoc.addPage();
          yPosition = height - 50;
        }
        
        page.drawText(item.name, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font
        });
        
        page.drawText(item.quantity.toString(), {
          x: 300,
          y: yPosition,
          size: fontSize,
          font
        });
        
        page.drawText(`$${Number(item.total_cost).toFixed(2)}`, {
          x: 400,
          y: yPosition,
          size: fontSize,
          font
        });
        
        totalCost += Number(item.total_cost);
        yPosition -= lineHeight;
      }
      
      // Draw total
      yPosition -= lineHeight;
      
      page.drawText("Total:", {
        x: 300,
        y: yPosition,
        size: fontSize + 2,
        font
      });
      
      page.drawText(`$${totalCost.toFixed(2)}`, {
        x: 400,
        y: yPosition,
        size: fontSize + 2,
        font
      });
    }
    
    // 9. Serialize the PDF to bytes
    const pdfBytes = await newPdfDoc.save();
    
    // 10. Upload the generated PDF to storage
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
    
    // 11. Get a signed URL for the uploaded PDF
    const { data: urlData, error: urlError } = await supabase.storage
      .from('quotes')
      .createSignedUrl(pdfPath, 3600); // 1 hour expiry
    
    if (urlError) {
      throw new Error(`Error creating signed URL: ${urlError.message}`);
    }
    
    // 12. Create a record in the job_quotes table if it doesn't exist
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
        totalAmount = jobItems.reduce((sum, item) => sum + Number(item.total_cost), 0);
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
          email: jobData.contact_email || ''
        });
      
      if (insertError) {
        throw new Error(`Error creating quote record: ${insertError.message}`);
      }
    }
    
    // 13. Return the signed URL
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