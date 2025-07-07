import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not set");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { jobId, quoteType, quoteNumber, templateId, jobData, inspectionData, replacementData, jobItems, replacementDataByInspection } = await req.json();
    // Log received data for debugging
    console.log("Received data:", {
      jobId, 
      quoteType, 
      quoteNumber, 
      templateId, 
      hasJobData: !!jobData,
      inspectionCount: Array.isArray(inspectionData) ? inspectionData.length : 0,
      hasReplacementDataByInspection: !!replacementDataByInspection,
      replacementDataByInspectionKeys: replacementDataByInspection ? Object.keys(replacementDataByInspection) : []
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
    // Fetch template
    const { data: templateData, error: templateError } = await supabase.from("quote_templates").select("*").eq("id", templateId).single();
    if (templateError || !templateData?.template_data.fileUrl) {
      throw new Error("Template not found or invalid");
    }
    // Fetch template PDF
    const tplRes = await fetch(templateData.template_data.fileUrl);
    if (!tplRes.ok) {
      throw new Error(`Failed to fetch template PDF: ${tplRes.statusText}`);
    }
    const tplBytes = await tplRes.arrayBuffer();
    const pdfDoc = await PDFDocument.load(tplBytes);
    const newPdfDoc = await PDFDocument.create();
    // Get preserved pages
    const preserved = templateData.template_data.preservedPages || [
      1
    ];
    const sorted = [
      ...preserved
    ].sort((a, b)=>a - b);
    // Find insertion point
    let insertPos = sorted.length;
    for(let i = 0; i < sorted.length - 1; i++){
      if (sorted[i + 1] - sorted[i] > 1) {
        insertPos = i + 1;
        break;
      }
    }
    // Copy first set of preserved pages
    for(let i = 0; i < insertPos; i++){
      const p = sorted[i];
      if (p > 0 && p <= pdfDoc.getPageCount()) {
        const [copied] = await newPdfDoc.copyPages(pdfDoc, [
          p - 1
        ]);
        newPdfDoc.addPage(copied);
      }
    }
    // Create dynamic page
    let dynamicPage = newPdfDoc.addPage();
    // Add background image
    const bgUrl = "https://ekxkjnygupehzpoyojwq.supabase.co/storage/v1/object/public/background-image//hvac-background.png";
    const bgBytes = await fetch(bgUrl).then((r)=>r.arrayBuffer());
    const bgImage = await newPdfDoc.embedPng(bgBytes);
    const { width, height } = dynamicPage.getSize();
    dynamicPage.drawImage(bgImage, {
      x: 0,
      y: 0,
      width,
      height
    });
    // Set up fonts and layout
    const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    const margin = 50;
    const minY = 100; // Minimum Y position before creating a new page
    let y = height - 80;
    // Draw header
    dynamicPage.drawText(`${quoteType.toUpperCase()} QUOTE`, {
      x: margin,
      y,
      size: 24,
      font: bold,
      color: rgb(0, 0, 0)
    });
    y -= 40;
    // Draw quote info
    dynamicPage.drawText(`Quote #: ${quoteNumber}`, {
      x: margin,
      y,
      size: fontSize,
      font
    });
    y -= lineHeight;
    dynamicPage.drawText(`Job #: ${jobData?.number || ""}`, {
      x: margin,
      y,
      size: fontSize,
      font
    });
    y -= lineHeight;
    dynamicPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: margin,
      y,
      size: fontSize,
      font
    });
    y -= lineHeight * 2;
    // Draw customer info
    if (jobData?.locations) {
      dynamicPage.drawText("Customer:", {
        x: margin,
        y,
        size: fontSize + 2,
        font: bold
      });
      y -= lineHeight;
      dynamicPage.drawText(jobData.locations.companies?.name || "", {
        x: margin,
        y,
        size: fontSize,
        font
      });
      y -= lineHeight;
      dynamicPage.drawText(jobData.locations.name || "", {
        x: margin,
        y,
        size: fontSize,
        font
      });
      y -= lineHeight;
      dynamicPage.drawText(jobData.locations.address || "", {
        x: margin,
        y,
        size: fontSize,
        font
      });
      y -= lineHeight;
      dynamicPage.drawText(`${jobData.locations.city || ""}, ${jobData.locations.state || ""} ${jobData.locations.zip || ""}`, {
        x: margin,
        y,
        size: fontSize,
        font
      });
      // Add unit information if available
      if (jobData.units) {
        y -= lineHeight;
        dynamicPage.drawText(`Unit: ${jobData.units.unit_number || ""}`, {
          x: margin,
          y,
          size: fontSize,
          font
        });
      }
      y -= lineHeight * 2;
    }
    // Draw inspection results
    if (Array.isArray(inspectionData) && inspectionData.length) {
      dynamicPage.drawText("Inspection Results:", {
        x: margin,
        y,
        size: fontSize + 2,
        font: bold
      });
      y -= lineHeight * 1.5;
      for (const insp of inspectionData){
        // Check if we need a new page
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - margin;
          // Add background to new page
          dynamicPage.drawImage(bgImage, {
            x: 0,
            y: 0,
            width,
            height
          });
          dynamicPage.drawText("Inspection Results (continued):", {
            x: margin,
            y,
            size: fontSize + 2,
            font: bold
          });
          y -= lineHeight * 1.5;
        }
        dynamicPage.drawText(`Model Number: ${insp.model_number || "N/A"}`, {
          x: margin,
          y,
          size: fontSize,
          font
        });
        dynamicPage.drawText(`Serial Number: ${insp.serial_number || "N/A"}`, {
          x: 300,
          y,
          size: fontSize,
          font
        });
        y -= lineHeight;
        dynamicPage.drawText(`Age: ${insp.age || "N/A"} years`, {
          x: margin,
          y,
          size: fontSize,
          font
        });
        dynamicPage.drawText(`Tonnage: ${insp.tonnage || "N/A"}`, {
          x: 300,
          y,
          size: fontSize,
          font
        });
        y -= lineHeight;
        // Add unit type and system type if available
        if (insp.unit_type || insp.system_type) {
          dynamicPage.drawText(`Unit Type: ${insp.unit_type || "N/A"}`, {
            x: margin,
            y,
            size: fontSize,
            font
          });
          dynamicPage.drawText(`System Type: ${insp.system_type || "N/A"}`, {
            x: 300,
            y,
            size: fontSize,
            font
          });
          y -= lineHeight;
        }
        y -= lineHeight;
      }
      y -= lineHeight;
    }
    // Process replacement data from replacementDataByInspection (preferred) or replacementData
    let replacementsToProcess = [];
    if (replacementDataByInspection && typeof replacementDataByInspection === 'object' && Object.keys(replacementDataByInspection).length > 0) {
      if (quoteType === 'replacement') {
        // For replacement quotes, include all options and details
        replacementsToProcess = Object.entries(replacementDataByInspection).map(([inspectionId, data], index) => {
          return {
            ...data,
            inspectionId,
            replacementNumber: index + 1,
            created_at: data.created_at || new Date().toISOString()
          };
        });
      } else {
        // For repair quotes, simplify to just include pricing
        replacementsToProcess = Object.entries(replacementDataByInspection).map(([inspectionId, data], index) => {
          return {
            ...data,
            inspectionId,
            replacementNumber: index + 1,
            created_at: data.created_at || new Date().toISOString(),
            // For repair quotes, we focus more on the pricing
            simplifiedRepair: true
          };
        });
      }
    } else if (Array.isArray(replacementData) && replacementData.length > 0) {
      replacementsToProcess = replacementData.map((data, index) => ({
          ...data,
          replacementNumber: index + 1,
          simplifiedRepair: quoteType === 'repair'
        }));
    } else if (replacementData && !Array.isArray(replacementData)) {
      // Single replacement data object
      replacementsToProcess = [
        {
          ...replacementData,
          replacementNumber: 1,
          simplifiedRepair: quoteType === 'repair'
        }
      ];
    }
    console.log("Replacements to process:", replacementsToProcess.length);
    if (replacementsToProcess.length > 0) {
      // Check if we need a new page
      if (y < 200) {
        dynamicPage = newPdfDoc.addPage();
        y = height - margin;
        // Add background to new page
        dynamicPage.drawImage(bgImage, {
          x: 0,
          y: 0,
          width,
          height
        });
      }
      // Draw repair summary header
      dynamicPage.drawText("Replacement Summary:", {
        x: margin,
        y,
        size: fontSize + 2,
        font: bold
      });
      y -= lineHeight * 2;
      // Process each replacement entry as a summary item
      let combinedTotal = 0;
      for(let i = 0; i < replacementsToProcess.length; i++){
        let entry = replacementsToProcess[i];
        // Check if we need a new page
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - margin;
          // Add background to new page
          dynamicPage.drawImage(bgImage, {
            x: 0,
            y: 0,
            width,
            height
          });
        }
        // Get the date from created_at or use current date
        const repairDate = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : new Date().toLocaleDateString();
        // Get the selected phase
        const selectedPhase = entry.selectedPhase || entry.selected_phase || 'phase2';
        const phaseData = entry[selectedPhase] || {};
        const phaseName = selectedPhase === 'phase1' ? 'Economy' : selectedPhase === 'phase2' ? 'Standard' : 'Premium';
        const totalCost = Number(entry.totalCost || entry.total_cost || 0);
        
        // Draw summary line with appropriate title based on quote type
        dynamicPage.drawText(`${quoteType === 'replacement' ? 'Replacement' : 'Repair'} ${entry.replacementNumber} (${repairDate})`, {
          x: margin,
          y,
          size: fontSize,
          font: bold
        });
        
        dynamicPage.drawText(`$${totalCost.toLocaleString()}`, {
          x: width - margin - 100,
          y,
          size: fontSize,
          font: bold
        });
        y -= lineHeight;
        
        if (quoteType === 'replacement' || !entry.simplifiedRepair) {
          // For replacement quotes, show full details
          dynamicPage.drawText(`${phaseName} Option`, {
            x: margin,
            y,
            size: fontSize,
            font
          });
          
          // Add "Crane Required" if needed
          if (entry.needsCrane || entry.needs_crane) {
            dynamicPage.drawText("• Crane Required", {
              x: margin + 150,
              y,
              size: fontSize,
              font
            });
          }
        } else {
          // For repair quotes, show simplified information
          dynamicPage.drawText(`Repair Service`, {
            x: margin,
            y,
            size: fontSize,
            font
          });
        }
        
        y -= lineHeight * 1.5;
        // Add to combined total
        combinedTotal += totalCost;
      }
      // Check if we need a new page for the combined total
      if (y < minY) {
        dynamicPage = newPdfDoc.addPage();
        y = height - margin;
        // Add background to new page
        dynamicPage.drawImage(bgImage, {
          x: 0,
          y: 0,
          width,
          height
        });
      }
      // Draw combined total if there are multiple repairs
      if (replacementsToProcess.length > 1) {
        // Add a separator line
        dynamicPage.drawLine({ 
          start: {
            x: margin,
            y: y + 10
          },
          end: {
            x: width - margin,
            y: y + 10
          },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8)
        });
        y -= lineHeight;
        dynamicPage.drawText(`Combined ${quoteType === 'replacement' ? 'Replacement' : 'Repair'} Total`, {
          x: margin,
          y,
          size: fontSize + 2,
          font: bold
        });
        dynamicPage.drawText(`$${combinedTotal.toLocaleString()}`, {
          x: width - margin - 100,
          y,
          size: fontSize + 2,
          font: bold
        });
        y -= lineHeight * 2;
      }
    }
    // Draw job items
    if (Array.isArray(jobItems) && jobItems.length) {
      // Check if we need a new page
      if (y < 200) { 
        dynamicPage = newPdfDoc.addPage();
        y = height - margin;
        // Add background to new page
        dynamicPage.drawImage(bgImage, {
          x: 0,
          y: 0,
          width,
          height
        });
      }
      dynamicPage.drawText("Items:", {
        x: margin,
        y, 
        size: fontSize + 2,
        font: bold
      });
      y -= lineHeight * 1.5;
      // Table header
      dynamicPage.drawText("Item", {
        x: margin,
        y, 
        size: fontSize,
        font: bold
      });
      dynamicPage.drawText("Quantity", {
        x: 300,
        y,
        size: fontSize,
        font: bold
      });
      dynamicPage.drawText("Price", {
        x: 400,
        y,
        size: fontSize,
        font: bold
      });
      y -= lineHeight;
      let totalAmount = 0;
      for (const item of jobItems) {
        // Check if we need a new page
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - margin;
          // Add background to new page
          dynamicPage.drawImage(bgImage, {
            x: 0,
            y: 0,
            width,
            height
          });
          // Redraw table header on new page
          dynamicPage.drawText("Item", {
            x: margin,
            y, 
            size: fontSize,
            font: bold
          });
          dynamicPage.drawText("Quantity", {
            x: 300,
            y,
            size: fontSize,
            font: bold
          });
          dynamicPage.drawText("Price", {
            x: 400,
            y,
            size: fontSize,
            font: bold
          });
          y -= lineHeight;
        }
        const name = item.name || "Unknown";
        const quantity = item.quantity || 1;
        const cost = Number(item.total_cost || 0);
        dynamicPage.drawText(name, {
          x: margin,
          y, 
          size: fontSize,
          font
        });
        dynamicPage.drawText(quantity.toString(), {
          x: 300,
          y,
          size: fontSize,
          font
        });
        dynamicPage.drawText(`$${cost.toFixed(2)}`, {
          x: 400,
          y, 
          size: fontSize,
          font
        });
        totalAmount += cost;
        y -= lineHeight;
      }
      y -= lineHeight;
      dynamicPage.drawText("Total:", {
        x: 300,
        y, 
        size: fontSize + 2,
        font: bold
      });
      dynamicPage.drawText(`$${totalAmount.toFixed(2)}`, {
        x: 400,
        y,
        size: fontSize + 2,
        font: bold
      });
    }
    // Copy remaining preserved pages
    for(let i = insertPos; i < sorted.length; i++){
      const p = sorted[i];
      if (p > 0 && p <= pdfDoc.getPageCount()) { 
        const [copied] = await newPdfDoc.copyPages(pdfDoc, [
          p - 1
        ]);
        newPdfDoc.addPage(copied);
      }
    }
    // Save PDF
    const outBytes = await newPdfDoc.save();
    // Upload to storage
    const filePath = `quotes/${jobId}/${quoteType}_${quoteNumber}.pdf`;
    const { error: uploadError } = await supabase.storage.from("quotes").upload(filePath, outBytes, {
      contentType: "application/pdf",
      upsert: true
    });
    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);
    // Create signed URL
    const { data: signed, error: urlError } = await supabase.storage.from("quotes").createSignedUrl(filePath, 3600);
    if (urlError) throw new Error(`Signed URL error: ${urlError.message}`);
    return new Response(JSON.stringify({
      success: true,
      pdfUrl: signed.signedUrl,
      quoteNumber,
      quoteType
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("Error generating PDF:", err);
    return new Response(JSON.stringify({
      error: err.message || "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
