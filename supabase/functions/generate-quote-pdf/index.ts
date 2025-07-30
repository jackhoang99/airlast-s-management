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
      quoteType,
      quoteNumber,
      templateId,
      jobData,
      inspectionData,
      replacementData,
      jobItems,
      replacementDataById,
    } = await req.json();
    // Log received data for debugging
    console.log("Received data:", {
      jobId,
      quoteType,
      quoteNumber,
      templateId,
      hasJobData: !!jobData,
      jobDataStructure: jobData ? Object.keys(jobData) : null,
      unitData: jobData?.unit,
      unitNumber: jobData?.unit?.unit_number,
      inspectionCount: Array.isArray(inspectionData)
        ? inspectionData.length
        : 0,
      hasReplacementData: !!replacementData,
      hasReplacementDataById:
        !!replacementDataById &&
        Object.keys(replacementDataById || {}).length > 0,
      hasJobItems: !!jobItems,
      jobItemsCount: Array.isArray(jobItems) ? jobItems.length : 0,
      jobItemsData: Array.isArray(jobItems)
        ? jobItems.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            cost: item.total_cost,
          }))
        : null,
    });
    // Debug the repair condition
    console.log("Repair condition check:", {
      quoteType,
      isRepair: quoteType === "repair",
      jobItemsType: typeof jobItems,
      isArray: Array.isArray(jobItems),
      jobItemsLength: Array.isArray(jobItems) ? jobItems.length : "not array",
      conditionMet:
        quoteType === "repair" &&
        Array.isArray(jobItems) &&
        jobItems.length > 0,
    });
    console.log("=== AFTER CONDITION CHECK - BEFORE VALIDATION ===");
    if (!jobId || !quoteType) {
      console.log("=== EXITING DUE TO MISSING FIELDS ===");
      return new Response(
        JSON.stringify({
          error: "Missing required fields: jobId and quoteType",
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
    console.log("=== AFTER VALIDATION - BEFORE TEMPLATE FETCH ===");
    // Fetch template if templateId is provided
    let templateData = null;
    if (templateId) {
      const { data: fetchedTemplate, error: templateError } = await supabase
        .from("quote_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (templateError) {
        console.log("Template not found, using default template");
      } else {
        templateData = fetchedTemplate;
      }
    }
    // Use default template if no template found
    if (!templateData || !templateData.template_data?.fileUrl) {
      console.log("Using default template for quote generation");
      // Create a simple default template structure
      templateData = {
        template_data: {
          fileUrl: "https://example.com/default-template.pdf",
          preservedPages: [1],
        },
      };
    }
    // Fetch template PDF if available, otherwise create a new document
    let pdfDoc;
    if (
      templateData.template_data.fileUrl &&
      templateData.template_data.fileUrl !==
        "https://example.com/default-template.pdf"
    ) {
      const tplRes = await fetch(templateData.template_data.fileUrl);
      if (!tplRes.ok) {
        console.log("Failed to fetch template PDF, creating new document");
        pdfDoc = await PDFDocument.create();
      } else {
        const tplBytes = await tplRes.arrayBuffer();
        pdfDoc = await PDFDocument.load(tplBytes);
      }
    } else {
      console.log("Creating new PDF document without template");
      pdfDoc = await PDFDocument.create();
    }
    const newPdfDoc = await PDFDocument.create();
    // Get preserved pages if template exists
    const preserved = templateData?.template_data?.preservedPages || [1];
    const sorted = [...preserved].sort((a, b) => a - b);
    // Find insertion point
    let insertPos = sorted.length;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] > 1) {
        insertPos = i + 1;
        break;
      }
    }
    // Only copy preserved pages if we have a template with pages
    if (pdfDoc.getPageCount() > 0) {
      // Copy first set of preserved pages
      for (let i = 0; i < insertPos; i++) {
        const p = sorted[i];
        if (p > 0 && p <= pdfDoc.getPageCount()) {
          const [copied] = await newPdfDoc.copyPages(pdfDoc, [p - 1]);
          newPdfDoc.addPage(copied);
        }
      }
    }
    // Create dynamic page
    let dynamicPage = newPdfDoc.addPage();
    // Add background image with error handling
    let bgImage = null;
    try {
      const bgUrl =
        "https://ekxkjnygupehzpoyojwq.supabase.co/storage/v1/object/public/background-image//hvac-background.png";
      const bgRes = await fetch(bgUrl);
      if (bgRes.ok) {
        const bgBytes = await bgRes.arrayBuffer();
        bgImage = await newPdfDoc.embedPng(bgBytes);
      } else {
        console.log(
          "Background image not available, proceeding without background"
        );
      }
    } catch (error) {
      console.log("Error loading background image:", error);
    }
    const { width, height } = dynamicPage.getSize();
    // Draw background image if available
    if (bgImage) {
      dynamicPage.drawImage(bgImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }
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
      color: rgb(0, 0, 0),
    });
    y -= 40;
    // Draw quote info
    dynamicPage.drawText(`Quote #: ${quoteNumber}`, {
      x: margin,
      y,
      size: fontSize,
      font,
    });
    y -= lineHeight;
    // Fix job number display - handle different data structures
    const jobNumber = jobData?.number || jobData?.job?.number || jobId || "N/A";
    dynamicPage.drawText(`Job #: ${jobNumber}`, {
      x: margin,
      y,
      size: fontSize,
      font,
    });
    y -= lineHeight;
    dynamicPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: margin,
      y,
      size: fontSize,
      font,
    });
    y -= lineHeight * 2;
    // Draw customer info
    if (jobData?.locations) {
      dynamicPage.drawText("Customer:", {
        x: margin,
        y,
        size: fontSize + 2,
        font: bold,
      });
      y -= lineHeight;
      dynamicPage.drawText(jobData.locations.companies?.name || "", {
        x: margin,
        y,
        size: fontSize,
        font,
      });
      y -= lineHeight;
      dynamicPage.drawText(jobData.locations.name || "", {
        x: margin,
        y,
        size: fontSize,
        font,
      });
      y -= lineHeight;
      dynamicPage.drawText(jobData.locations.address || "", {
        x: margin,
        y,
        size: fontSize,
        font,
      });
      y -= lineHeight;
      dynamicPage.drawText(
        `${jobData.locations.city || ""}, ${jobData.locations.state || ""} ${
          jobData.locations.zip || ""
        }`,
        {
          x: margin,
          y,
          size: fontSize,
          font,
        }
      );
      // Add unit information if available
      if (jobData.units) {
        y -= lineHeight;
        dynamicPage.drawText(`Unit: ${jobData.units.unit_number || ""}`, {
          x: margin,
          y,
          size: fontSize,
          font,
        });
      }
      y -= lineHeight * 2;
    }
    // Note: Inspection Results section removed as requested - only Inspection Summary will be shown
    console.log("=== BEFORE REPLACEMENT CONDITION ===");
    // Process replacement data
    let replacementsToProcess = [];
    if (quoteType === "replacement") {
      console.log("=== REPLACEMENT QUOTE SECTION ENTERED ===");
      // Check if replacementDataById is provided in the request (this is the new format with multiple replacements)
      if (replacementDataById && Object.keys(replacementDataById).length > 0) {
        console.log(
          "Using replacementDataById with keys:",
          Object.keys(replacementDataById)
        );
        // Convert the object to an array for processing
        replacementsToProcess = Object.entries(replacementDataById).map(
          ([key, data], index) => ({
            ...data,
            replacementNumber: index + 1,
            created_at: data.created_at || new Date().toISOString(),
          })
        );
      } else if (Array.isArray(replacementData) && replacementData.length > 0) {
        console.log(
          "Using array replacementData with length:",
          replacementData.length
        );
        replacementsToProcess = replacementData.map((data, index) => ({
          ...data,
          replacementNumber: index + 1,
          created_at: data.created_at || new Date().toISOString(),
        }));
      } else if (replacementData && typeof replacementData === "object") {
        console.log("Using single replacementData object");
        replacementsToProcess = [
          {
            ...replacementData,
            replacementNumber: 1,
            created_at: replacementData.created_at || new Date().toISOString(),
          },
        ];
      } else {
        console.log("Fetching replacement data from database");
        // Fetch replacement data for this job
        const { data: fetchedReplacements, error: fetchError } = await supabase
          .from("job_replacements")
          .select("*")
          .eq("job_id", jobId);
        if (
          !fetchError &&
          fetchedReplacements &&
          fetchedReplacements.length > 0
        ) {
          replacementsToProcess = fetchedReplacements.map((data, index) => ({
            ...data,
            replacementNumber: index + 1,
            created_at: data.created_at || new Date().toISOString(),
          }));
        }
      }
    } else if (quoteType === "repair") {
      console.log("=== REPAIR CONDITION IN REPLACEMENT SECTION ===");
      // Use job items for repair quotes
      if (Array.isArray(jobItems) && jobItems.length > 0) {
        console.log("=== REPAIR JOB ITEMS CHECK PASSED ===");
        // We'll handle this separately below
      }
    }
    console.log("=== AFTER REPLACEMENT SECTION - BEFORE MAIN CONDITIONS ===");
    // Check if we need a new page
    if (y < 200) {
      dynamicPage = newPdfDoc.addPage();
      y = height - margin;
      // Add background to new page if available
      if (bgImage) {
        dynamicPage.drawImage(bgImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }
    }
    // Draw replacement summary header (only for replacement quotes)
    if (quoteType === "replacement") {
      dynamicPage.drawText("Replacement Summary:", {
        x: margin,
        y,
        size: fontSize + 2,
        font: bold,
      });
      y -= lineHeight * 2;
    }
    console.log("=== BEFORE REPLACEMENT PROCESSING SECTION ===");
    // Process each replacement entry
    let combinedTotal = 0;
    if (quoteType === "replacement" && replacementsToProcess.length > 0) {
      console.log("=== REPLACEMENT PROCESSING SECTION ENTERED ===");
      console.log(
        `Processing ${replacementsToProcess.length} replacement options`
      );
      // If multiple replacements, show them as a consolidated list
      if (replacementsToProcess.length > 1) {
        // Draw consolidated header
        dynamicPage.drawText("Multiple Replacement Options:", {
          x: margin,
          y,
          size: fontSize + 1,
          font: bold,
        });
        y -= lineHeight * 1.5;
        // Show each replacement as a numbered option
        for (let i = 0; i < replacementsToProcess.length; i++) {
          let entry = replacementsToProcess[i];
          const totalCost = Number(entry.totalCost || entry.total_cost || 0);
          combinedTotal += totalCost;
          // Draw replacement option header
          dynamicPage.drawText(
            `Option ${entry.replacementNumber}: $${totalCost.toLocaleString()}`,
            {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            }
          );
          y -= lineHeight;
          // Show key components for this option
          const components = [];
          if (entry.labor && Number(entry.labor) > 0) {
            components.push(`Labor: $${Number(entry.labor).toLocaleString()}`);
          }
          if (
            entry.refrigerationRecovery &&
            Number(entry.refrigerationRecovery) > 0
          ) {
            components.push(
              `Refrigeration: $${Number(
                entry.refrigerationRecovery
              ).toLocaleString()}`
            );
          }
          if (entry.startUpCosts && Number(entry.startUpCosts) > 0) {
            components.push(
              `Start-up: $${Number(entry.startUpCosts).toLocaleString()}`
            );
          }
          if (entry.removalCost && Number(entry.removalCost) > 0) {
            components.push(
              `Removal: $${Number(entry.removalCost).toLocaleString()}`
            );
          }
          if (entry.thermostatStartup && Number(entry.thermostatStartup) > 0) {
            components.push(
              `Thermostat: $${Number(entry.thermostatStartup).toLocaleString()}`
            );
          }
          if (entry.permitCost && Number(entry.permitCost) > 0) {
            components.push(
              `Permit: $${Number(entry.permitCost).toLocaleString()}`
            );
          }
          // Display components in a compact format
          if (components.length > 0) {
            const componentsText = components.join(" • ");
            dynamicPage.drawText(componentsText, {
              x: margin + 20,
              y,
              size: fontSize - 1,
              font,
            });
            y -= lineHeight;
          }
          // Add requirements if any
          const requirements = [];
          if (entry.needsCrane || entry.needs_crane) {
            requirements.push("Crane Required");
          }
          if (entry.requiresPermit || entry.requires_permit) {
            requirements.push("Permit Required");
          }
          if (entry.requiresBigLadder || entry.requires_big_ladder) {
            requirements.push("Big Ladder Required");
          }
          if (requirements.length > 0) {
            dynamicPage.drawText(`Requirements: ${requirements.join(", ")}`, {
              x: margin + 20,
              y,
              size: fontSize - 1,
              font,
              color: rgb(0.8, 0.4, 0),
            });
            y -= lineHeight;
          }
          y -= lineHeight * 0.5; // Small spacing between options
        }
        // Draw total line
        y -= lineHeight;
        dynamicPage.drawLine({
          start: {
            x: margin,
            y: y + 5,
          },
          end: {
            x: width - margin,
            y: y + 5,
          },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });
        y -= lineHeight;
        dynamicPage.drawText("Total Replacement Cost:", {
          x: margin,
          y,
          size: fontSize + 1,
          font: bold,
        });
        dynamicPage.drawText(`$${combinedTotal.toLocaleString()}`, {
          x: width - margin - 100,
          y,
          size: fontSize + 1,
          font: bold,
        });
        y -= lineHeight * 2;
      } else {
        // Single replacement - show detailed breakdown
        let entry = replacementsToProcess[0];
        const totalCost = Number(entry.totalCost || entry.total_cost || 0);
        combinedTotal = totalCost;
        // Draw replacement header
        dynamicPage.drawText("Replacement Details:", {
          x: margin,
          y,
          size: fontSize,
          font: bold,
        });
        dynamicPage.drawText(`$${totalCost.toLocaleString()}`, {
          x: width - margin - 100,
          y,
          size: fontSize,
          font: bold,
        });
        y -= lineHeight;
        // For single replacement, show detailed breakdown
        const components = [];
        if (entry.labor && Number(entry.labor) > 0) {
          components.push(`Labor: $${Number(entry.labor).toLocaleString()}`);
        }
        if (
          entry.refrigerationRecovery &&
          Number(entry.refrigerationRecovery) > 0
        ) {
          components.push(
            `Refrigeration Recovery: $${Number(
              entry.refrigerationRecovery
            ).toLocaleString()}`
          );
        }
        if (entry.startUpCosts && Number(entry.startUpCosts) > 0) {
          components.push(
            `Start Up Costs: $${Number(entry.startUpCosts).toLocaleString()}`
          );
        }
        if (entry.thermostatStartup && Number(entry.thermostatStartup) > 0) {
          components.push(
            `Thermostat Startup: $${Number(
              entry.thermostatStartup
            ).toLocaleString()}`
          );
        }
        if (entry.removalCost && Number(entry.removalCost) > 0) {
          components.push(
            `Removal Cost: $${Number(entry.removalCost).toLocaleString()}`
          );
        }
        if (entry.permitCost && Number(entry.permitCost) > 0) {
          components.push(
            `Permit Cost: $${Number(entry.permitCost).toLocaleString()}`
          );
        }
        // Display components
        if (components.length > 0) {
          for (const component of components) {
            dynamicPage.drawText(`• ${component}`, {
              x: margin + 20,
              y,
              size: fontSize - 1,
              font,
            });
            y -= lineHeight;
          }
        }
        // Add requirements if any
        const requirements = [];
        if (entry.needsCrane || entry.needs_crane) {
          requirements.push("Crane Required");
        }
        if (entry.requiresPermit || entry.requires_permit) {
          requirements.push("Permit Required");
        }
        if (entry.requiresBigLadder || entry.requires_big_ladder) {
          requirements.push("Big Ladder Required");
        }
        if (requirements.length > 0) {
          dynamicPage.drawText(`Requirements: ${requirements.join(", ")}`, {
            x: margin + 20,
            y,
            size: fontSize - 1,
            font,
            color: rgb(0.8, 0.4, 0),
          });
          y -= lineHeight;
        }
        y -= lineHeight;
      }
    }
    console.log("=== BEFORE INSPECTION RESULTS SECTION ===");
    // Add inspection results to all quote types
    if (Array.isArray(inspectionData) && inspectionData.length > 0) {
      console.log("=== INSPECTION RESULTS SECTION ENTERED ===");
      // Check if we need a new page
      if (y < 200) {
        dynamicPage = newPdfDoc.addPage();
        y = height - margin;
        // Add background to new page if available
        if (bgImage) {
          dynamicPage.drawImage(bgImage, {
            x: 0,
            y: 0,
            width,
            height,
          });
        }
      }
      // Draw inspection results header
      dynamicPage.drawText("Inspection Results:", {
        x: margin,
        y,
        size: fontSize + 2,
        font: bold,
      });
      y -= lineHeight * 2;
      // List each inspection with comments
      for (let i = 0; i < inspectionData.length; i++) {
        const insp = inspectionData[i];
        // Check if we need a new page
        if (y < 200) {
          dynamicPage = newPdfDoc.addPage();
          y = height - margin;
          // Add background to new page if available
          if (bgImage) {
            dynamicPage.drawImage(bgImage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }
        }
        // Draw inspection number
        dynamicPage.drawText(`${i + 1})`, {
          x: margin,
          y,
          size: fontSize,
          font: bold,
        });
        y -= lineHeight;
        // Draw unit information header
        console.log("Checking unit data:", {
          hasJobData: !!jobData,
          hasUnit: !!jobData?.unit,
          unitNumber: jobData?.unit?.unit_number,
          fullUnitData: jobData?.unit,
        });
        if (jobData?.unit?.unit_number) {
          console.log("Drawing unit number:", jobData.unit.unit_number);
          dynamicPage.drawText(`Unit: ${jobData.unit.unit_number}`, {
            x: margin,
            y,
            size: fontSize,
            font,
          });
          y -= lineHeight;
        } else {
          console.log("No unit number found, skipping unit display");
        }
        // Draw inspection details in two-column format like the image
        const leftColumn = [];
        const rightColumn = [];
        if (insp.model_number)
          leftColumn.push(`Model Number: ${insp.model_number}`);
        if (insp.age) leftColumn.push(`Age: ${insp.age} years`);
        if (insp.unit_type) leftColumn.push(`Unit Type: ${insp.unit_type}`);
        if (insp.serial_number)
          rightColumn.push(`Serial Number: ${insp.serial_number}`);
        if (insp.tonnage) rightColumn.push(`Tonnage: ${insp.tonnage}`);
        if (insp.system_type)
          rightColumn.push(`System Type: ${insp.system_type}`);
        // Draw left column
        let leftY = y;
        for (const detail of leftColumn) {
          dynamicPage.drawText(detail, {
            x: margin,
            y: leftY,
            size: fontSize,
            font,
          });
          leftY -= lineHeight;
        }
        // Draw right column
        let rightY = y;
        for (const detail of rightColumn) {
          dynamicPage.drawText(detail, {
            x: margin + 250,
            y: rightY,
            size: fontSize,
            font,
          });
          rightY -= lineHeight;
        }
        // Move Y to the lowest point of either column
        y = Math.min(leftY, rightY);
        // Show inspection comment if available
        if (insp.comment && insp.comment.trim()) {
          y -= lineHeight * 0.5; // Small spacing before comment
          dynamicPage.drawText(`Comment: ${insp.comment}`, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= lineHeight * 1.2;
        }
        y -= lineHeight; // Spacing between inspections
      }
      y -= lineHeight; // Final spacing after inspections
      // Add summary comment section if available
      if (
        jobData &&
        jobData.inspection_summary_comment &&
        jobData.inspection_summary_comment.trim()
      ) {
        // Check if we need a new page for the summary comment
        if (y < 150) {
          dynamicPage = newPdfDoc.addPage();
          y = height - margin;
          // Add background to new page if available
          if (bgImage) {
            dynamicPage.drawImage(bgImage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }
        }
        dynamicPage.drawText("Summary Comment:", {
          x: margin,
          y,
          size: fontSize + 1,
          font: bold,
        });
        y -= lineHeight * 1.5;
        // Split comment into lines if it's too long
        const commentText = jobData.inspection_summary_comment;
        const maxWidth = width - margin * 2;
        const words = commentText.split(" ");
        let currentLine = "";
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
          if (testWidth > maxWidth && currentLine) {
            // Draw current line and start new line
            dynamicPage.drawText(currentLine, {
              x: margin,
              y,
              size: fontSize - 1,
              font,
            });
            y -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        // Draw the last line
        if (currentLine) {
          dynamicPage.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize - 1,
            font,
          });
          y -= lineHeight * 2;
        }
      }
    }
    console.log("=== BEFORE MAIN IF/ELSE CONDITIONS ===");
    if (quoteType === "inspection") {
      // Handle inspection quotes
      console.log("=== INSPECTION QUOTE SECTION ENTERED ===");
      console.log("Processing inspection quote");
      // Check if we need a new page
      if (y < 200) {
        dynamicPage = newPdfDoc.addPage();
        y = height - margin;
        // Add background to new page if available
        if (bgImage) {
          dynamicPage.drawImage(bgImage, {
            x: 0,
            y: 0,
            width,
            height,
          });
        }
      }
      // Draw inspection details header
      dynamicPage.drawText("Inspection Details:", {
        x: margin,
        y,
        size: fontSize + 3,
        font: bold,
      });
      y -= lineHeight * 2;
      // Show inspection details
      const inspectionCount = Array.isArray(inspectionData)
        ? inspectionData.length
        : 0;
      if (inspectionCount > 0) {
        // List each inspection with comments
        for (let i = 0; i < inspectionData.length; i++) {
          const insp = inspectionData[i];
          // Check if we need a new page
          if (y < 200) {
            dynamicPage = newPdfDoc.addPage();
            y = height - margin;
            // Add background to new page if available
            if (bgImage) {
              dynamicPage.drawImage(bgImage, {
                x: 0,
                y: 0,
                width,
                height,
              });
            }
          }
          // Draw inspection number
          dynamicPage.drawText(`${i + 1})`, {
            x: margin,
            y,
            size: fontSize,
            font: bold,
          });
          y -= lineHeight;
          // Draw unit information header
          if (jobData?.unit?.unit_number) {
            dynamicPage.drawText(`Unit: ${jobData.unit.unit_number}`, {
              x: margin,
              y,
              size: fontSize,
              font,
            });
            y -= lineHeight;
          }
          // Draw inspection details in two-column format like the image
          const leftColumn = [];
          const rightColumn = [];
          if (insp.model_number)
            leftColumn.push(`Model Number: ${insp.model_number}`);
          if (insp.age) leftColumn.push(`Age: ${insp.age} years`);
          if (insp.unit_type) leftColumn.push(`Unit Type: ${insp.unit_type}`);
          if (insp.serial_number)
            rightColumn.push(`Serial Number: ${insp.serial_number}`);
          if (insp.tonnage) rightColumn.push(`Tonnage: ${insp.tonnage}`);
          if (insp.system_type)
            rightColumn.push(`System Type: ${insp.system_type}`);
          // Draw left column
          let leftY = y;
          for (const detail of leftColumn) {
            dynamicPage.drawText(detail, {
              x: margin,
              y: leftY,
              size: fontSize,
              font,
            });
            leftY -= lineHeight;
          }
          // Draw right column
          let rightY = y;
          for (const detail of rightColumn) {
            dynamicPage.drawText(detail, {
              x: margin + 250,
              y: rightY,
              size: fontSize,
              font,
            });
            rightY -= lineHeight;
          }
          // Move Y to the lowest point of either column
          y = Math.min(leftY, rightY);
          // Show inspection comment if available
          if (insp.comment && insp.comment.trim()) {
            y -= lineHeight * 0.5; // Small spacing before comment
            dynamicPage.drawText(`Comment: ${insp.comment}`, {
              x: margin,
              y,
              size: fontSize,
              font,
              color: rgb(0.4, 0.4, 0.4),
            });
            y -= lineHeight * 1.2;
          }
          y -= lineHeight; // Spacing between inspections
        }
        y -= lineHeight; // Final spacing after inspections
        // Add summary comment section if available
        if (
          jobData &&
          jobData.inspection_summary_comment &&
          jobData.inspection_summary_comment.trim()
        ) {
          // Check if we need a new page for the summary comment
          if (y < 150) {
            dynamicPage = newPdfDoc.addPage();
            y = height - margin;
            // Add background to new page if available
            if (bgImage) {
              dynamicPage.drawImage(bgImage, {
                x: 0,
                y: 0,
                width,
                height,
              });
            }
          }
          dynamicPage.drawText("Summary Comment:", {
            x: margin,
            y,
            size: fontSize + 1,
            font: bold,
          });
          y -= lineHeight * 1.5;
          // Split comment into lines if it's too long
          const commentText = jobData.inspection_summary_comment;
          const maxWidth = width - margin * 2;
          const words = commentText.split(" ");
          let currentLine = "";
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
            if (testWidth > maxWidth && currentLine) {
              // Draw current line and start new line
              dynamicPage.drawText(currentLine, {
                x: margin,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          // Draw the last line
          if (currentLine) {
            dynamicPage.drawText(currentLine, {
              x: margin,
              y,
              size: fontSize - 1,
              font,
            });
            y -= lineHeight * 2;
          }
        }
      } else {
        // No inspections found
        dynamicPage.drawText("No inspection data available", {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });
        y -= lineHeight * 2;
      }
    } else if (quoteType === "pm") {
      // Handle PM quotes
      console.log("Processing PM quote");

      // Fetch PM quotes from database
      const { data: pmQuotes, error: pmError } = await supabase
        .from("pm_quotes")
        .select("*")
        .eq("job_id", jobId);

      if (pmError) {
        console.error("Error fetching PM quotes:", pmError);
        throw new Error("Failed to fetch PM quotes");
      }

      if (!pmQuotes || pmQuotes.length === 0) {
        console.log("No PM quotes found for job:", jobId);
        // Check if we need a new page
        if (y < 200) {
          dynamicPage = newPdfDoc.addPage();
          y = height - margin;
          // Add background to new page if available
          if (bgImage) {
            dynamicPage.drawImage(bgImage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }
        }
        dynamicPage.drawText("No PM quotes available for this job.", {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });
        y -= lineHeight * 2;
      } else {
        console.log(`Found ${pmQuotes.length} PM quotes`);

        // Process each PM quote
        for (let i = 0; i < pmQuotes.length; i++) {
          const pmQuote = pmQuotes[i];

          // Check if we need a new page
          if (y < 200) {
            dynamicPage = newPdfDoc.addPage();
            y = height - margin;
            // Add background to new page if available
            if (bgImage) {
              dynamicPage.drawImage(bgImage, {
                x: 0,
                y: 0,
                width,
                height,
              });
            }
          }

          // Draw PM quote header
          dynamicPage.drawText(`PM Quote ${i + 1}:`, {
            x: margin,
            y,
            size: fontSize + 2,
            font: bold,
          });
          y -= lineHeight * 2;

          // Show client information if available
          if (pmQuote.client_name) {
            dynamicPage.drawText("Client:", {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            });
            dynamicPage.drawText(pmQuote.client_name, {
              x: margin + 30,
              y,
              size: fontSize,
              font,
            });
            y -= lineHeight;
          }

          if (pmQuote.property_address) {
            dynamicPage.drawText("Property Address:", {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            });
            dynamicPage.drawText(pmQuote.property_address, {
              x: margin + 50,
              y,
              size: fontSize,
              font,
            });
            y -= lineHeight * 2;
          }

          // Show basic information
          if (pmQuote.unit_count) {
            dynamicPage.drawText(`Number of Units: ${pmQuote.unit_count}`, {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;
          }

          // Show service configuration
          if (
            pmQuote.include_comprehensive_service &&
            pmQuote.comprehensive_visits_count
          ) {
            dynamicPage.drawText(
              `Comprehensive Visits: ${pmQuote.comprehensive_visits_count}`,
              {
                x: margin,
                y,
                size: fontSize,
                font,
              }
            );
            y -= lineHeight;
          }

          if (
            pmQuote.include_filter_change_service &&
            pmQuote.filter_visits_count
          ) {
            dynamicPage.drawText(
              `Filter Change Visits: ${pmQuote.filter_visits_count}`,
              {
                x: margin,
                y,
                size: fontSize,
                font,
              }
            );
            y -= lineHeight;
          }

          // Show individual visit costs
          if (
            pmQuote.comprehensive_visit_costs &&
            pmQuote.comprehensive_visit_costs.length > 0
          ) {
            y -= lineHeight * 0.5;
            dynamicPage.drawText("Comprehensive Visit Costs:", {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;

            pmQuote.comprehensive_visit_costs.forEach((cost, index) => {
              dynamicPage.drawText(
                `Visit ${index + 1}: $${(cost || 0).toLocaleString()}`,
                {
                  x: margin + 20,
                  y,
                  size: fontSize - 1,
                  font,
                }
              );
              y -= lineHeight;
            });
          }

          if (
            pmQuote.filter_visit_costs &&
            pmQuote.filter_visit_costs.length > 0
          ) {
            y -= lineHeight * 0.5;
            dynamicPage.drawText("Filter Change Visit Costs:", {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;

            pmQuote.filter_visit_costs.forEach((cost, index) => {
              dynamicPage.drawText(
                `Visit ${index + 1}: $${(cost || 0).toLocaleString()}`,
                {
                  x: margin + 20,
                  y,
                  size: fontSize - 1,
                  font,
                }
              );
              y -= lineHeight;
            });
          }

          // Show service periods
          if (pmQuote.service_period) {
            y -= lineHeight * 0.5;
            dynamicPage.drawText(
              `Comprehensive Service Period: ${pmQuote.service_period}`,
              {
                x: margin,
                y,
                size: fontSize - 1,
                font,
              }
            );
            y -= lineHeight;
          }

          if (pmQuote.filter_visit_period) {
            dynamicPage.drawText(
              `Filter Change Period: ${pmQuote.filter_visit_period}`,
              {
                x: margin,
                y,
                size: fontSize - 1,
                font,
              }
            );
            y -= lineHeight;
          }

          // Show scope of work
          if (pmQuote.scope_of_work) {
            y -= lineHeight * 0.5;
            dynamicPage.drawText("Scope of Work:", {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;

            const scopeLines = doc.splitTextToSize(
              pmQuote.scope_of_work,
              width - margin * 2
            );
            scopeLines.forEach((line) => {
              dynamicPage.drawText(line, {
                x: margin,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            });
          }

          // Show service breakdown
          if (pmQuote.service_breakdown) {
            y -= lineHeight * 0.5;
            dynamicPage.drawText("Service Breakdown:", {
              x: margin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;

            const breakdownLines = doc.splitTextToSize(
              pmQuote.service_breakdown,
              width - margin * 2
            );
            breakdownLines.forEach((line) => {
              dynamicPage.drawText(line, {
                x: margin,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            });
          }

          // Comprehensive Service Visits Section
          if (
            pmQuote.include_comprehensive_service &&
            pmQuote.comprehensive_visits_count &&
            pmQuote.comprehensive_visits_count > 0
          ) {
            y -= lineHeight * 0.5;
            dynamicPage.drawText(
              `1. ${
                pmQuote.comprehensive_visits_count
              } Comprehensive Service Visit${
                pmQuote.comprehensive_visits_count > 1 ? "s" : ""
              }:`,
              {
                x: margin,
                y,
                size: fontSize,
                font: bold,
              }
            );
            y -= lineHeight;

            if (pmQuote.service_period) {
              dynamicPage.drawText(`Schedule: ${pmQuote.service_period}`, {
                x: margin + 20,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            }

            const comprehensiveDesc =
              pmQuote.comprehensive_visit_description ||
              "During these visits, we will perform a detailed inspection and complete the following tasks";
            const comprehensiveLines = doc.splitTextToSize(
              comprehensiveDesc,
              width - margin * 2 - 20
            );
            comprehensiveLines.forEach((line) => {
              dynamicPage.drawText(line, {
                x: margin + 20,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            });

            // 20-Point Inspection
            y -= lineHeight * 0.5;
            dynamicPage.drawText(
              "20-Point Safety and Operational Inspection, which includes:",
              {
                x: margin + 20,
                y,
                size: fontSize - 1,
                font: bold,
              }
            );
            y -= lineHeight;

            const inspectionTasks = [
              "Checking and calibrating thermostat settings",
              "Testing system startup and shutdown sequences",
              "Inspecting and tightening electrical connections",
              "Checking refrigerant levels and pressures (for A/C)",
              "Inspecting condenser and evaporator coils for cleanliness",
              "Testing and verifying system safety controls",
              "Checking and adjusting system airflow",
              "Inspecting accessible ductwork for leaks or blockages",
              "Inspecting and cleaning blower components",
              "Testing fan motor and blades for proper operation",
              "Checking heat exchanger for any cracks or damage (for Heating)",
              "Inspecting and replacing air filters",
              "Cleaning and inspecting drain lines and pans",
              "Lubricating moving parts (motors, bearings, etc.)",
              "Inspecting belts and pulleys for wear and alignment",
              "Measuring voltage and amperage on motors",
              "Inspecting ductwork for leaks and insulation integrity",
              "Checking outside air dampers and economizer operation",
              "Replacing or calibrating sensors as required",
              "Reviewing building management system (BMS) controls",
            ];

            inspectionTasks.forEach((task) => {
              dynamicPage.drawText(`• ${task}`, {
                x: margin + 30,
                y,
                size: fontSize - 2,
                font,
              });
              y -= lineHeight;
            });
            y -= lineHeight;
          }

          // Filter Change Visits Section
          if (
            pmQuote.include_filter_change_service &&
            pmQuote.filter_visits_count &&
            pmQuote.filter_visits_count > 0
          ) {
            const sectionNumber = pmQuote.include_comprehensive_service
              ? "2"
              : "1";
            dynamicPage.drawText(
              `${sectionNumber}. ${
                pmQuote.filter_visits_count
              } Filter Change Visit${
                pmQuote.filter_visits_count > 1 ? "s" : ""
              }:`,
              {
                x: margin,
                y,
                size: fontSize,
                font: bold,
              }
            );
            y -= lineHeight;

            if (pmQuote.filter_visit_period) {
              dynamicPage.drawText(`Schedule: ${pmQuote.filter_visit_period}`, {
                x: margin + 20,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            }

            const filterDesc =
              pmQuote.filter_visit_description ||
              "During these visits, we will perform filter replacement and basic maintenance";
            const filterLines = doc.splitTextToSize(
              filterDesc,
              width - margin * 2 - 20
            );
            filterLines.forEach((line) => {
              dynamicPage.drawText(line, {
                x: margin + 20,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            });

            // Filter-specific tasks
            y -= lineHeight * 0.5;
            dynamicPage.drawText("Filter Change Services include:", {
              x: margin + 20,
              y,
              size: fontSize - 1,
              font: bold,
            });
            y -= lineHeight;

            const filterTasks = [
              "Filter Size inspection and replacement",
              "Replace & Date all filters",
              "Flush and Drain lines",
              "Cycle all condensate pumps",
              "Test all safety switches",
            ];

            filterTasks.forEach((task) => {
              dynamicPage.drawText(`• ${task}`, {
                x: margin + 30,
                y,
                size: fontSize - 2,
                font,
              });
              y -= lineHeight;
            });
            y -= lineHeight;
          }

          // Preventative Maintenance Section (Blue background)
          y -= lineHeight * 0.5;
          dynamicPage.setFillColor(59, 130, 246);
          dynamicPage.drawRectangle({
            x: margin - 5,
            y: y - 5,
            width: width - margin * 2 + 10,
            height: 40,
            color: rgb(0.23, 0.51, 0.96),
          });
          dynamicPage.setTextColor(255, 255, 255);
          dynamicPage.drawText("Preventative Maintenance", {
            x: margin,
            y,
            size: fontSize,
            font: bold,
          });
          y -= lineHeight * 2;

          dynamicPage.setTextColor(0, 0, 0);
          const maintenanceServices =
            pmQuote.preventative_maintenance_services || [
              "Replacement of All Filters",
              "Flushing and Clearing of Drain Lines",
              "Placement of Nu-Calgon Condensate Drain Pan Treatment Gel Tablets",
            ];

          maintenanceServices.forEach((service) => {
            dynamicPage.drawText(`• ${service}`, {
              x: margin,
              y,
              size: fontSize - 1,
              font: bold,
            });
            y -= lineHeight;

            // Add description based on service type
            let description = "";
            if (service.toLowerCase().includes("filter")) {
              description =
                "High-quality air filters will be replaced in all units to improve air quality, reduce energy consumption, and extend system longevity.";
            } else if (service.toLowerCase().includes("drain")) {
              description =
                "All condensate drain lines will be flushed and cleared to prevent water damage and mold buildup.";
            } else if (
              service.toLowerCase().includes("nu-calgon") ||
              service.toLowerCase().includes("treatment")
            ) {
              description =
                "Condensate pans will receive gel tablets to prevent clogs and algae growth, ensuring uninterrupted drainage.";
            }

            if (description) {
              const descLines = doc.splitTextToSize(
                description,
                width - margin * 2 - 20
              );
              descLines.forEach((line) => {
                dynamicPage.drawText(line, {
                  x: margin + 20,
                  y,
                  size: fontSize - 2,
                  font,
                });
                y -= lineHeight;
              });
            }
            y -= lineHeight * 0.5;
          });

          // Show total cost
          y -= lineHeight;
          dynamicPage.drawLine({
            start: {
              x: margin,
              y: y + 5,
            },
            end: {
              x: width - margin,
              y: y + 5,
            },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
          });
          y -= lineHeight;

          const totalCost = pmQuote.total_cost || 0;
          dynamicPage.drawText("Total Annual Cost:", {
            x: margin,
            y,
            size: fontSize + 1,
            font: bold,
          });
          dynamicPage.drawText(`$${totalCost.toLocaleString()}`, {
            x: width - margin - 100,
            y,
            size: fontSize + 1,
            font: bold,
          });
          y -= lineHeight * 2;

          // Add spacing between multiple PM quotes
          if (i < pmQuotes.length - 1) {
            y -= lineHeight;
          }
        }
      }
    } else if (
      quoteType === "repair" &&
      Array.isArray(jobItems) &&
      jobItems.length > 0
    ) {
      console.log("=== REPAIR QUOTE SECTION ENTERED ===");
      console.log(`Processing repair quote with ${jobItems.length} items`);
      console.log("Current y position:", y);
      console.log("minY value:", minY);
      // Check if we need a new page
      if (y < 200) {
        console.log("Creating new page for repair items - y was:", y);
        dynamicPage = newPdfDoc.addPage();
        y = height - margin;
        console.log("New page created, y is now:", y);
        // Add background to new page if available
        if (bgImage) {
          dynamicPage.drawImage(bgImage, {
            x: 0,
            y: 0,
            width,
            height,
          });
        }
      } else {
        console.log("Using existing page for repair items - y is:", y);
      }
      console.log("Drawing 'Items:' header at y position:", y);
      dynamicPage.drawText("Items:", {
        x: margin,
        y,
        size: fontSize + 2,
        font: bold,
      });
      y -= lineHeight * 1.5;
      // Table header
      dynamicPage.drawText("Item", {
        x: margin,
        y,
        size: fontSize,
        font: bold,
      });
      dynamicPage.drawText("Quantity", {
        x: 300,
        y,
        size: fontSize,
        font: bold,
      });
      dynamicPage.drawText("Price", {
        x: 400,
        y,
        size: fontSize,
        font: bold,
      });
      y -= lineHeight;
      let totalAmount = 0;
      // Filter items for repair job (only parts)
      const repairItems = jobItems.filter(
        (item) => item.type?.trim() === "part"
      );
      console.log(`Found ${repairItems.length} part items for repair quote`);
      console.log(
        "Repair items details:",
        repairItems.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          cost: item.total_cost || item.cost,
        }))
      );
      console.log(
        "Total PDF pages before adding repair items:",
        newPdfDoc.getPageCount()
      );
      for (const item of repairItems) {
        // Check if we need a new page
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - margin;
          // Add background to new page if available
          if (bgImage) {
            dynamicPage.drawImage(bgImage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }
          // Redraw table header on new page
          dynamicPage.drawText("Item", {
            x: margin,
            y,
            size: fontSize,
            font: bold,
          });
          dynamicPage.drawText("Quantity", {
            x: 300,
            y,
            size: fontSize,
            font: bold,
          });
          dynamicPage.drawText("Price", {
            x: 400,
            y,
            size: fontSize,
            font: bold,
          });
          y -= lineHeight;
        }
        const name = (item.name || "Unknown").trim();
        const quantity = item.quantity || 1;
        const cost = Number(item.total_cost || item.cost || 0);
        console.log(`Drawing repair item: ${name} at y position: ${y}`);
        dynamicPage.drawText(name, {
          x: margin,
          y,
          size: fontSize,
          font,
        });
        dynamicPage.drawText(quantity.toString(), {
          x: 300,
          y,
          size: fontSize,
          font,
        });
        dynamicPage.drawText(`$${cost.toFixed(2)}`, {
          x: 400,
          y,
          size: fontSize,
          font,
        });
        totalAmount += cost;
        y -= lineHeight;
      }
      y -= lineHeight;
      dynamicPage.drawText("Total:", {
        x: 300,
        y,
        size: fontSize + 2,
        font: bold,
      });
      dynamicPage.drawText(`$${totalAmount.toFixed(2)}`, {
        x: 400,
        y,
        size: fontSize + 2,
        font: bold,
      });
    }
    // Copy remaining preserved pages
    for (let i = insertPos; i < sorted.length; i++) {
      const p = sorted[i];
      if (p > 0 && p <= pdfDoc.getPageCount()) {
        const [copied] = await newPdfDoc.copyPages(pdfDoc, [p - 1]);
        newPdfDoc.addPage(copied);
      }
    }
    // Save PDF
    const outBytes = await newPdfDoc.save();
    // Upload to storage
    const filePath = `quotes/${jobId}/${quoteType}_${quoteNumber}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("quotes")
      .upload(filePath, outBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);
    // Create signed URL
    const { data: signed, error: urlError } = await supabase.storage
      .from("quotes")
      .createSignedUrl(filePath, 3600);
    if (urlError) throw new Error(`Signed URL error: ${urlError.message}`);
    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: signed.signedUrl,
        quoteNumber,
        quoteType,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Error generating PDF:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Unknown error",
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
