import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib";

// Unified margin system constants
const MARGINS = {
  LEFT: 50,
  RIGHT: 50,
  TOP: 80,
  BOTTOM: 100,
  COLUMN_SPACING: 20,
};
// Utility function to sanitize text for PDF rendering
function sanitizeTextForPDF(text) {
  if (!text) return "";
  return String(text)
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
// Utility function to wrap text within column boundaries
function wrapTextInColumn(text, font, fontSize, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
// Utility function to draw text within boundaries
function drawBoundedText(page, text, x, y, options) {
  const {
    font,
    fontSize,
    color = undefined,
    maxWidth,
    leftMargin,
    rightMargin,
    width,
  } = options;
  const textLeftBoundary = leftMargin;
  const textRightBoundary = width - rightMargin;
  const contentWidth = textRightBoundary - textLeftBoundary;
  const safeMaxWidth = maxWidth || contentWidth;
  const boundedX = Math.max(
    textLeftBoundary,
    Math.min(x, textRightBoundary - 10)
  );
  const wrappedLines = wrapTextInColumn(text, font, fontSize, safeMaxWidth);
  for (const line of wrappedLines) {
    page.drawText(line, {
      x: boundedX,
      y: y,
      size: fontSize,
      font,
      color,
    });
    y -= fontSize * 1.2;
  }
  return y;
}
// Helper function for consistent page breaks
function checkPageBreak(
  y,
  minY,
  dynamicPage,
  newPdfDoc,
  height,
  topMargin,
  bgImage,
  width
) {
  if (y < minY) {
    const newPage = newPdfDoc.addPage();
    const newY = height - topMargin;
    if (bgImage && width) {
      newPage.drawImage(bgImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }
    return {
      page: newPage,
      y: newY,
    };
  }
  return {
    page: dynamicPage,
    y,
  };
}

// Helper to draw left/right columns with consistent margins & alignment
function drawTwoColumnRow(page, leftItems, rightItems, y, options) {
  const {
    font,
    fontSize,
    lineHeight,
    leftMargin,
    rightMargin,
    width,
    columnSpacing = 20,
    minY,
    newPdfDoc,
    height,
    topMargin,
    bgImage,
  } = options;

  const contentWidth = width - leftMargin - rightMargin;
  const colWidth = (contentWidth - columnSpacing) / 2;

  const leftX = leftMargin;
  const rightX = leftMargin + colWidth + columnSpacing;

  const rowCount = Math.max(leftItems.length, rightItems.length);

  for (let i = 0; i < rowCount; i++) {
    const leftText = leftItems[i] || "";
    const rightText = rightItems[i] || "";

    // Wrap each field independently within its column width
    const leftLines = wrapTextInColumn(leftText, font, fontSize, colWidth);
    const rightLines = wrapTextInColumn(rightText, font, fontSize, colWidth);

    // Calculate the height needed for this row (max of both sides)
    const maxLines = Math.max(leftLines.length, rightLines.length);
    const rowHeight = maxLines * lineHeight;

    // Page break check once per row
    if (y - rowHeight < minY) {
      const pageBreakResult = checkPageBreak(
        y,
        minY,
        page,
        newPdfDoc,
        height,
        topMargin,
        bgImage,
        width
      );
      page = pageBreakResult.page;
      y = pageBreakResult.y;
    }

    // Draw each field as a row - both sides start at the same Y and stay aligned
    for (let j = 0; j < maxLines; j++) {
      const currentY = y - j * lineHeight;

      // Draw left side text if it exists
      if (leftLines[j]) {
        page.drawText(leftLines[j], {
          x: leftX,
          y: currentY,
          size: fontSize,
          font,
        });
      }

      // Draw right side text if it exists
      if (rightLines[j]) {
        page.drawText(rightLines[j], {
          x: rightX,
          y: currentY,
          size: fontSize,
          font,
        });
      }
    }

    // Move Y down by the full height of this row
    y -= rowHeight;
  }

  return { page, y };
}
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
      pmQuotes,
    } = await req.json();

    console.log(
      "DEBUG: Edge function received replacementDataById:",
      JSON.stringify(replacementDataById, null, 2)
    );
    if (!jobId || !quoteType) {
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
    // Fetch template if templateId is provided
    let templateData = null;
    if (templateId) {
      const { data: fetchedTemplate, error: templateError } = await supabase
        .from("quote_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (!templateError) {
        templateData = fetchedTemplate;
      }
    }
    // Use default template if no template found
    if (!templateData || !templateData.template_data?.fileUrl) {
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
      templateData?.template_data?.fileUrl &&
      templateData.template_data.fileUrl !==
        "https://example.com/default-template.pdf"
    ) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const tplRes = await fetch(templateData.template_data.fileUrl, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!tplRes.ok) {
          pdfDoc = await PDFDocument.create();
        } else {
          const tplBytes = await tplRes.arrayBuffer();
          pdfDoc = await PDFDocument.load(tplBytes);
        }
      } catch (error) {
        pdfDoc = await PDFDocument.create();
      }
    } else {
      pdfDoc = await PDFDocument.create();
    }
    const newPdfDoc = await PDFDocument.create();
    // Initialize fonts early so they can be used in cover page generation
    const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);
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
          const addedPage = newPdfDoc.addPage(copied);
          // Generate custom cover page design
          if (p === 1) {
            // First page (cover page)
            const { width, height } = addedPage.getSize();
            // Use unified margin system
            const leftMargin = MARGINS.LEFT;
            const rightMargin = MARGINS.RIGHT;
            const contentWidth = width - leftMargin - rightMargin; // Available width for content
            const columnSpacing = MARGINS.COLUMN_SPACING; // Space between left and right columns
            const leftColumnWidth = (contentWidth - columnSpacing) / 2; // Width for left column
            const rightColumnX = leftMargin + leftColumnWidth + columnSpacing; // X position for right column
            // Draw background with exact color specified
            addedPage.drawRectangle({
              x: 0,
              y: 0,
              width: width,
              height: height,
              color: rgb(7 / 255, 43 / 255, 48 / 255),
            });
            // Define dimensions and position for the larger hexagonal HVAC image
            const imageWidth = width * 0.7; // Make it bigger (70% of page width)
            const imageHeight = imageWidth; // Make it square for hexagonal shape
            const imageX = width - imageWidth; // Position at the right edge
            const imageY = height - imageHeight; // Position at the top edge
            // Add HVAC image to the frame with timeout
            try {
              const hvacImageUrl =
                "https://ekxkjnygupehzpoyojwq.supabase.co/storage/v1/object/public/templates/quote-templates/output-onlinepngtools.png";
              // Add timeout to image fetch
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              const hvacImageRes = await fetch(hvacImageUrl, {
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              if (hvacImageRes.ok) {
                const hvacImageBytes = await hvacImageRes.arrayBuffer();
                const hvacImage = await newPdfDoc.embedPng(hvacImageBytes);
                // Draw the hexagonal image
                addedPage.drawImage(hvacImage, {
                  x: imageX,
                  y: imageY,
                  width: imageWidth,
                  height: imageHeight,
                });
              } else {
                throw new Error("Image fetch failed");
              }
            } catch (error) {
              console.log("Error loading HVAC image, using fallback:", error);
              // Fallback to placeholder text
              addedPage.drawText("HVAC Units", {
                x: imageX + imageWidth / 2 - 30,
                y: imageY + imageHeight / 2,
                size: 16,
                font: bold,
                color: rgb(1, 1, 1),
              });
            }
            // Draw subtle diagonal lines from bottom-left to top-right, only up to half page height
            const spacing = 25; // Increased spacing for more subtle effect
            const lineColor = rgb(0.4, 0.6, 0.8); // Light blue color
            const lineWidth = 0.5; // Thinner lines
            // Half page height for line termination
            const halfHeight = height / 2;
            // Draw date in lower left (reddish-orange)
            const currentDate = new Date();
            const monthNames = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
            const formattedDate = `${
              monthNames[currentDate.getMonth()]
            } ${currentDate.getFullYear()}`;
            // Draw quote title (only first page gets "Proposal for Preventative Maintenance")
            const titleText =
              quoteType === "pm"
                ? "Proposal for Preventative Maintenance"
                : quoteType === "inspection"
                ? "Inspection Report"
                : `${
                    quoteType.charAt(0).toUpperCase() + quoteType.slice(1)
                  } Quote`;
            addedPage.drawText(titleText, {
              x: leftMargin,
              y: 150,
              size: 28,
              font: bold,
              color: rgb(1, 1, 1),
            });
            // Draw date above the title
            addedPage.drawText(sanitizeTextForPDF(formattedDate), {
              x: leftMargin,
              y: 190,
              size: 16,
              font: bold,
              color: rgb(0.9, 0.4, 0.2),
            });
            // Draw customer company and location information
            let customerY = 120;
            // Company name
            const companyName =
              jobData?.locations?.companies?.name ||
              jobData?.location?.companies?.name;
            if (companyName) {
              addedPage.drawText(sanitizeTextForPDF(companyName), {
                x: leftMargin,
                y: customerY,
                size: 16,
                font: bold,
                color: rgb(1, 1, 1),
              });
              customerY -= 20;
            }
            // Location name and Address - avoid duplication
            const locationName =
              jobData?.locations?.name || jobData?.location?.name;
            const address =
              jobData?.locations?.address || jobData?.location?.address;

            // Only display location name if it's different from address
            if (locationName && locationName !== address) {
              addedPage.drawText(sanitizeTextForPDF(locationName), {
                x: leftMargin,
                y: customerY,
                size: 14,
                font: bold,
                color: rgb(1, 1, 1),
              });
              customerY -= 18;
            }

            // Always display address
            if (address) {
              addedPage.drawText(sanitizeTextForPDF(address), {
                x: leftMargin,
                y: customerY,
                size: 14,
                font,
                color: rgb(1, 1, 1),
              });
              customerY -= 18;
            }
            // City, State, ZIP
            const city = jobData?.locations?.city || jobData?.location?.city;
            const state = jobData?.locations?.state || jobData?.location?.state;
            const zip = jobData?.locations?.zip || jobData?.location?.zip;
            if (city || state || zip) {
              const cityStateZip = [city, state, zip]
                .filter(Boolean)
                .join(", ");
              addedPage.drawText(sanitizeTextForPDF(cityStateZip), {
                x: leftMargin,
                y: customerY,
                size: 14,
                font,
                color: rgb(1, 1, 1),
              });
              customerY -= 18;
            }
            // Unit number
            const units =
              jobData?.units || (jobData?.unit ? [jobData.unit] : []);
            if (units && units.length > 0) {
              if (units.length === 1) {
                const unitNumber = units[0]?.unit_number;
                if (unitNumber) {
                  addedPage.drawText(
                    `Unit: ${sanitizeTextForPDF(unitNumber)}`,
                    {
                      x: leftMargin,
                      y: customerY,
                      size: 14,
                      font: bold,
                      color: rgb(1, 1, 1),
                    }
                  );
                }
              } else {
                const unitNumbers = units
                  .map((unit) => unit.unit_number)
                  .filter(Boolean)
                  .join(", ");
                if (unitNumbers) {
                  addedPage.drawText(
                    `Units: ${sanitizeTextForPDF(unitNumbers)}`,
                    {
                      x: leftMargin,
                      y: customerY,
                      size: 14,
                      font: bold,
                      color: rgb(1, 1, 1),
                    }
                  );
                }
              }
            }
            // Add AirLast logo to bottom right
            try {
              const logoUrl =
                "https://ekxkjnygupehzpoyojwq.supabase.co/storage/v1/object/public/templates/quote-templates/Screenshot%202025-08-06%20at%202.00.14%20PM.png";
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const logoRes = await fetch(logoUrl, {
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              if (logoRes.ok) {
                const logoBytes = await logoRes.arrayBuffer();
                const logoImage = await newPdfDoc.embedPng(logoBytes);
                const logoWidth = 120;
                const logoHeight = 60;
                const logoX = width - rightMargin - logoWidth;
                const logoY = 5;
                addedPage.drawImage(logoImage, {
                  x: logoX,
                  y: logoY,
                  width: logoWidth,
                  height: logoHeight,
                });
              } else {
                throw new Error("Logo fetch failed");
              }
            } catch (error) {
              // Fallback to text logo
              addedPage.drawText("AIRLAST", {
                x: width - rightMargin - 70,
                y: 70,
                size: 16,
                font: bold,
                color: rgb(1, 1, 1),
              });
            }
          }
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
      }
    } catch (error) {
      // Background image not available, proceeding without background
    }
    // Get page dimensions for background image
    const { width: pageWidth, height: pageHeight } = dynamicPage.getSize();
    // Draw background image if available
    if (bgImage) {
      dynamicPage.drawImage(bgImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }
    // Set up layout (fonts already initialized)
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    // Use unified margin system
    const leftMargin = MARGINS.LEFT;
    const rightMargin = MARGINS.RIGHT;
    const topMargin = MARGINS.TOP;
    const bottomMargin = MARGINS.BOTTOM;
    const { width, height } = dynamicPage.getSize();
    // Content boundaries
    const textLeftBoundary = leftMargin;
    const textRightBoundary = width - rightMargin;
    const contentWidth = textRightBoundary - textLeftBoundary;
    const minY = bottomMargin;
    // Column system for two-column layouts
    const columnSpacing = MARGINS.COLUMN_SPACING;
    const leftColumnWidth = (contentWidth - columnSpacing) / 2;
    const rightColumnX = leftMargin + leftColumnWidth + columnSpacing;
    let y = height - topMargin;
    // Draw header
    const headerText =
      quoteType === "inspection"
        ? "INSPECTION REPORT"
        : `${quoteType.toUpperCase()} QUOTE`;
    y = drawBoundedText(
      dynamicPage,
      sanitizeTextForPDF(headerText),
      leftMargin,
      y,
      {
        font: bold,
        fontSize: 24,
        color: rgb(0, 0, 0),
        leftMargin,
        rightMargin,
        width,
      }
    );
    y -= 10; // Extra spacing after header
    // Customize date format - you can change this to any format you want
    const currentDate = new Date();
    const formattedDate = `${
      currentDate.getMonth() + 1
    }/${currentDate.getDate()}/${currentDate.getFullYear()}`;
    // Alternative formats you can use:
    // const formattedDate = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    // const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    y = drawBoundedText(
      dynamicPage,
      `Date: ${sanitizeTextForPDF(formattedDate)}`,
      leftMargin,
      y,
      {
        font,
        fontSize,
        leftMargin,
        rightMargin,
        width,
      }
    );
    // Add customer information under the date
    const hasLocations = jobData?.locations || jobData?.location;
    if (hasLocations) {
      // Company name
      const companyName =
        jobData?.locations?.companies?.name ||
        jobData?.location?.companies?.name;
      if (companyName) {
        y = drawBoundedText(
          dynamicPage,
          sanitizeTextForPDF(companyName),
          leftMargin,
          y,
          {
            font: bold,
            fontSize,
            leftMargin,
            rightMargin,
            width,
          }
        );
      }
      // Location name
      const locationName = jobData?.locations?.name || jobData?.location?.name;
      if (locationName) {
        y = drawBoundedText(
          dynamicPage,
          sanitizeTextForPDF(locationName),
          leftMargin,
          y,
          {
            font: bold,
            fontSize,
            leftMargin,
            rightMargin,
            width,
          }
        );
      }
      // Address
      const address = jobData?.locations?.address || jobData?.location?.address;
      if (address) {
        y = drawBoundedText(
          dynamicPage,
          sanitizeTextForPDF(address),
          leftMargin,
          y,
          {
            font,
            fontSize,
            leftMargin,
            rightMargin,
            width,
          }
        );
      }
      // City, State, ZIP
      const city = jobData?.locations?.city || jobData?.location?.city;
      const state = jobData?.locations?.state || jobData?.location?.state;
      const zip = jobData?.locations?.zip || jobData?.location?.zip;
      if (city || state || zip) {
        const cityStateZip = [city, state, zip].filter(Boolean).join(", ");
        y = drawBoundedText(
          dynamicPage,
          sanitizeTextForPDF(cityStateZip),
          leftMargin,
          y,
          {
            font,
            fontSize,
            leftMargin,
            rightMargin,
            width,
          }
        );
      }
      // Unit information
      const units = jobData?.units || (jobData?.unit ? [jobData.unit] : []);
      if (units && units.length > 0) {
        if (units.length === 1) {
          const unitNumber = units[0]?.unit_number;
          if (unitNumber) {
            y = drawBoundedText(
              dynamicPage,
              `Unit: ${sanitizeTextForPDF(unitNumber)}`,
              leftMargin,
              y,
              {
                font: bold,
                fontSize,
                leftMargin,
                rightMargin,
                width,
              }
            );
          }
        } else {
          const unitNumbers = units
            .map((unit) => unit.unit_number)
            .filter(Boolean)
            .join(", ");
          if (unitNumbers) {
            y = drawBoundedText(
              dynamicPage,
              `Units: ${sanitizeTextForPDF(unitNumbers)}`,
              leftMargin,
              y,
              {
                font: bold,
                fontSize,
                leftMargin,
                rightMargin,
                width,
              }
            );
          }
        }
        y -= lineHeight;
      }
      y -= lineHeight;
    }
    // Process replacement data
    let replacementsToProcess = [];
    if (quoteType === "replacement") {
      // Check if replacementDataById is provided in the request
      if (replacementDataById && Object.keys(replacementDataById).length > 0) {
        replacementsToProcess = Object.entries(replacementDataById).map(
          ([key, data], index) => ({
            ...data,
            replacementNumber: index + 1,
            created_at: data.created_at || new Date().toISOString(),
          })
        );
      } else if (Array.isArray(replacementData) && replacementData.length > 0) {
        replacementsToProcess = replacementData.map((data, index) => ({
          ...data,
          replacementNumber: index + 1,
          created_at: data.created_at || new Date().toISOString(),
        }));
      } else if (replacementData && typeof replacementData === "object") {
        replacementsToProcess = [
          {
            ...replacementData,
            replacementNumber: 1,
            created_at: replacementData.created_at || new Date().toISOString(),
          },
        ];
      } else {
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
    }
    // Check if we need a new page
    const pageBreakResult = checkPageBreak(
      y,
      minY,
      dynamicPage,
      newPdfDoc,
      height,
      topMargin,
      bgImage,
      width
    );
    dynamicPage = pageBreakResult.page;
    y = pageBreakResult.y;
    // Add inspection results to all quote types (BEFORE replacement data)
    if (Array.isArray(inspectionData) && inspectionData.length > 0) {
      // Check if we need a new page
      const pageBreakResult = checkPageBreak(
        y,
        minY,
        dynamicPage,
        newPdfDoc,
        height,
        topMargin,
        bgImage,
        width
      );
      dynamicPage = pageBreakResult.page;
      y = pageBreakResult.y;
      // Draw inspection results header
      y = drawBoundedText(dynamicPage, "Inspection Results:", leftMargin, y, {
        font: bold,
        fontSize: fontSize + 2,
        leftMargin,
        rightMargin,
        width,
      });
      y -= lineHeight; // Extra spacing after header
      // List each inspection with comments
      for (let i = 0; i < inspectionData.length; i++) {
        const insp = inspectionData[i];
        // Fetch attachments for this inspection
        let inspectionAttachments = [];
        try {
          const { data: attachments, error: attachmentError } = await supabase
            .from("inspection_attachments")
            .select("*")
            .eq("inspection_id", insp.id)
            .order("created_at", {
              ascending: false,
            });
          if (!attachmentError && attachments) {
            inspectionAttachments = attachments;
          }
        } catch (error) {
          // Error fetching inspection attachments
        }
        // Check if we need a new page
        const pageBreakResult = checkPageBreak(
          y,
          minY,
          dynamicPage,
          newPdfDoc,
          height,
          topMargin,
          bgImage,
          width
        );
        dynamicPage = pageBreakResult.page;
        y = pageBreakResult.y;
        // Draw inspection number
        dynamicPage.drawText(`${i + 1})`, {
          x: leftMargin,
          y,
          size: fontSize,
          font: bold,
        });
        y -= lineHeight;
        // Draw unit information header
        if (jobData?.unit?.unit_number) {
          y = drawBoundedText(
            dynamicPage,
            `Unit: ${sanitizeTextForPDF(jobData.unit.unit_number)}`,
            leftMargin,
            y,
            {
              font,
              fontSize,
              leftMargin,
              rightMargin,
              width,
            }
          );
        }
        // Draw inspection details in two-column format like the image
        const leftColumn = [];
        const rightColumn = [];
        leftColumn.push(
          `Manufacture Name: ${
            sanitizeTextForPDF(insp.manufacture_name) || "N/A"
          }`
        );
        leftColumn.push(
          `Model Number: ${sanitizeTextForPDF(insp.model_number) || "N/A"}`
        );
        leftColumn.push(`Age: ${insp.age ? `${insp.age} years` : "N/A"}`);
        leftColumn.push(
          `Unit Type: ${sanitizeTextForPDF(insp.unit_type) || "N/A"}`
        );
        leftColumn.push(
          `Belt Size: ${sanitizeTextForPDF(insp.belt_size) || "N/A"}`
        );
        rightColumn.push(
          `Serial Number: ${sanitizeTextForPDF(insp.serial_number) || "N/A"}`
        );
        rightColumn.push(`Tonnage: ${insp.tonnage || "N/A"}`);
        rightColumn.push(
          `System Type: ${sanitizeTextForPDF(insp.system_type) || "N/A"}`
        );
        rightColumn.push(
          `Filter Size: ${sanitizeTextForPDF(insp.filter_size) || "N/A"}`
        );
        // Draw columns using the helper function
        const columnResult = drawTwoColumnRow(
          dynamicPage,
          leftColumn,
          rightColumn,
          y,
          {
            font,
            fontSize,
            lineHeight,
            leftMargin,
            rightMargin,
            width,
            columnSpacing,
            minY,
            newPdfDoc,
            height,
            topMargin,
            bgImage,
          }
        );
        dynamicPage = columnResult.page;
        y = columnResult.y;
        // Add comment if available
        if (insp.comment) {
          // Check if we need a new page before drawing comment
          const pageBreakResult = checkPageBreak(
            y,
            minY,
            dynamicPage,
            newPdfDoc,
            height,
            topMargin,
            bgImage,
            width
          );
          dynamicPage = pageBreakResult.page;
          y = pageBreakResult.y;
          // Use drawBoundedText for proper margin handling
          const commentText = `Comment: ${sanitizeTextForPDF(insp.comment)}`;
          y = drawBoundedText(dynamicPage, commentText, leftMargin, y, {
            font,
            fontSize,
            leftMargin,
            rightMargin,
            width,
          });
        }
        // Add attachments section if there are any
        if (inspectionAttachments.length > 0) {
          // Check if we need a new page before drawing attachments
          const pageBreakResult = checkPageBreak(
            y,
            minY,
            dynamicPage,
            newPdfDoc,
            height,
            topMargin,
            bgImage,
            width
          );
          dynamicPage = pageBreakResult.page;
          y = pageBreakResult.y;
          // Draw attachments header
          dynamicPage.drawText("Attachments:", {
            x: leftMargin,
            y,
            size: fontSize,
            font: bold,
          });
          y -= lineHeight;
          // Display attachment images (limit to prevent timeout)
          const maxAttachments = Math.min(inspectionAttachments.length, 5); // Limit to 5 images max
          const imageWidth = 100; // Compact width
          const imageHeight = 50; // Compact height
          const spacing = 20;
          const imagesPerRow = Math.floor(
            contentWidth / (imageWidth + spacing)
          ); // Calculate how many images fit per row
          for (let j = 0; j < maxAttachments; j++) {
            const attachment = inspectionAttachments[j];
            // Calculate row and column for this image
            const row = Math.floor(j / imagesPerRow);
            const col = j % imagesPerRow;
            // Check if we need a new page (need space for image + some buffer)
            const requiredSpace =
              row === 0 ? 100 : (row + 1) * (imageHeight + 30);
            if (y - requiredSpace < minY) {
              const pageBreakResult = checkPageBreak(
                y,
                minY,
                dynamicPage,
                newPdfDoc,
                height,
                topMargin,
                bgImage,
                width
              );
              dynamicPage = pageBreakResult.page;
              y = pageBreakResult.y;
            }
            try {
              // Try to fetch and embed the image with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout per image
              const imageResponse = await fetch(attachment.file_url, {
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              if (imageResponse.ok) {
                const imageBytes = await imageResponse.arrayBuffer();
                // Determine image type and embed accordingly
                let embeddedImage;
                if (attachment.file_type.startsWith("image/png")) {
                  embeddedImage = await newPdfDoc.embedPng(imageBytes);
                } else if (
                  attachment.file_type.startsWith("image/jpeg") ||
                  attachment.file_type.startsWith("image/jpg")
                ) {
                  embeddedImage = await newPdfDoc.embedJpg(imageBytes);
                } else {
                  continue;
                }
                // Calculate position for image with proper row/column layout
                const imageX = leftMargin + col * (imageWidth + spacing);
                // Set 50px gap after "Attachments:" header for first row
                const imageY =
                  y - (row === 0 ? 50 : (row + 1) * (imageHeight + 30) - 20);
                // Draw image with fixed size while maintaining aspect ratio
                const { width: imgWidth, height: imgHeight } =
                  embeddedImage.scale(1);
                const aspectRatio = imgWidth / imgHeight;
                let drawWidth = imageWidth;
                let drawHeight = imageHeight;
                if (aspectRatio > 1) {
                  // Landscape image - fit to width
                  drawHeight = imageWidth / aspectRatio;
                } else {
                  // Portrait image - fit to height
                  drawWidth = imageHeight * aspectRatio;
                }
                // Center the image in the fixed area
                const centerX = imageX + (imageWidth - drawWidth) / 2;
                const centerY = imageY + (imageHeight - drawHeight) / 2;
                dynamicPage.drawImage(embeddedImage, {
                  x: centerX,
                  y: centerY,
                  width: drawWidth,
                  height: drawHeight,
                });
                // No border - clean image display
                // No clickable links or icons - just display the images
                // No text labels below images - clean display
              } else {
                continue;
              }
            } catch (error) {
              continue;
            }
          }
          // Show note if there are more attachments
          if (inspectionAttachments.length > 5) {
            const totalRows = Math.ceil(maxAttachments / imagesPerRow);
            // Calculate total space used: first row (50px) + subsequent rows (30px each)
            const totalSpaceUsed = 50 + (totalRows - 1) * (imageHeight + 30);
            const noteY = y - totalSpaceUsed - 10;
            dynamicPage.drawText(
              `+${
                inspectionAttachments.length - 5
              } more attachments (not shown to prevent timeout)`,
              {
                x: leftMargin,
                y: noteY,
                size: fontSize - 1,
                font,
                color: rgb(0.6, 0.6, 0.6),
              }
            );
            y = noteY - lineHeight;
          } else {
            const totalRows = Math.ceil(maxAttachments / imagesPerRow);
            // Calculate total space used: first row (50px) + subsequent rows (30px each)
            const totalSpaceUsed = 50 + (totalRows - 1) * (imageHeight + 30);
            y = y - totalSpaceUsed - 10;
          }
        }
        y -= lineHeight;
        // Add extra spacing below inspection if it had attachments
        if (inspectionAttachments.length > 0) {
          y -= 20; // Add extra spacing when attachments are present
        }
      }
      // Add summary comment section if available (skip for inspection quotes to avoid duplication)
      if (
        quoteType !== "inspection" &&
        jobData &&
        jobData.inspection_summary_comment &&
        jobData.inspection_summary_comment.trim()
      ) {
        // Check if we need a new page for the summary comment
        const pageBreakResult = checkPageBreak(
          y,
          minY,
          dynamicPage,
          newPdfDoc,
          height,
          topMargin,
          bgImage,
          width
        );
        dynamicPage = pageBreakResult.page;
        y = pageBreakResult.y;
        y -= lineHeight; // Add some spacing before summary comment
        // Use drawBoundedText for proper margin handling
        const summaryText = `Summary Comment: ${sanitizeTextForPDF(
          jobData.inspection_summary_comment
        )}`;
        y = drawBoundedText(dynamicPage, summaryText, leftMargin, y, {
          font: bold,
          fontSize: fontSize + 1,
          leftMargin,
          rightMargin,
          width,
        });
        y -= lineHeight; // Extra spacing after summary
      }
      y -= lineHeight * 2; // Add extra space after inspection results
    }
    // Draw replacement summary header (only for replacement quotes)
    if (quoteType === "replacement") {
      // Check if we need a new page before drawing replacement summary
      if (y < minY) {
        dynamicPage = newPdfDoc.addPage();
        y = height - topMargin;
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
      dynamicPage.drawText("Replacement Summary:", {
        x: leftMargin,
        y,
        size: fontSize + 2,
        font: bold,
      });
      y -= lineHeight * 2;
    }
    // Process each replacement entry
    let combinedTotal = 0;
    if (quoteType === "replacement" && replacementsToProcess.length > 0) {
      // If multiple replacements, show them as a consolidated list
      if (replacementsToProcess.length > 1) {
        // Check if we need a new page before drawing multiple options header
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - topMargin;
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
        // Draw consolidated header
        dynamicPage.drawText("Multiple Replacement Options:", {
          x: leftMargin,
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
          // Check if we need a new page before drawing option header
          if (y < minY) {
            dynamicPage = newPdfDoc.addPage();
            y = height - topMargin;
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
          // Draw replacement option header
          dynamicPage.drawText(
            `Option ${entry.replacementNumber}: $${totalCost.toLocaleString()}`,
            {
              x: leftMargin,
              y,
              size: fontSize,
              font: bold,
            }
          );
          y -= lineHeight;

          // Add unit information for this replacement option if available (MOVED TO TOP)
          console.log(
            "DEBUG: Multiple replacements - Checking unit_info for entry:",
            entry.id,
            "unit_info:",
            entry.unit_info
          );
          if (
            entry.unit_info &&
            Array.isArray(entry.unit_info) &&
            entry.unit_info.length > 0
          ) {
            // Check if we need a new page before drawing unit info
            if (y < minY) {
              dynamicPage = newPdfDoc.addPage();
              y = height - topMargin;
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

            dynamicPage.drawText("Unit Information:", {
              x: leftMargin + 20,
              y,
              size: fontSize - 1,
              font: bold,
              color: rgb(0.2, 0.4, 0.8),
            });
            y -= lineHeight;

            entry.unit_info.forEach((unit, unitIndex) => {
              if (unit.descriptor || unit.modelName) {
                const unitText = `- ${unit.descriptor || ""}${
                  unit.descriptor && unit.modelName ? " - " : ""
                }${unit.modelName || ""}`;
                dynamicPage.drawText(sanitizeTextForPDF(unitText), {
                  x: leftMargin + 40,
                  y,
                  size: fontSize - 2,
                  font,
                });
                y -= lineHeight;
              }
            });
            y -= lineHeight * 0.5; // Small spacing after unit info
          }

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
          // Add accessories if available
          if (
            entry.accessories &&
            Array.isArray(entry.accessories) &&
            entry.accessories.length > 0
          ) {
            const accessoriesCost = entry.accessories.reduce((sum, acc) => {
              // Handle both object format and direct cost format
              if (typeof acc === "object" && acc.cost !== undefined) {
                return sum + (Number(acc.cost) || 0);
              } else if (typeof acc === "number") {
                return sum + Number(acc);
              } else if (typeof acc === "string" && !isNaN(Number(acc))) {
                return sum + Number(acc);
              }
              return sum;
            }, 0);
            if (accessoriesCost > 0) {
              components.push(
                `Accessories: $${accessoriesCost.toLocaleString()}`
              );
            }
          }
          // Add additional items if available
          if (
            entry.additionalItems &&
            Array.isArray(entry.additionalItems) &&
            entry.additionalItems.length > 0
          ) {
            const additionalItemsCost = entry.additionalItems.reduce(
              (sum, item) => {
                // Handle both object format and direct cost format
                if (typeof item === "object" && item.cost !== undefined) {
                  return sum + (Number(item.cost) || 0);
                } else if (typeof item === "number") {
                  return sum + Number(item);
                } else if (typeof item === "string" && !isNaN(Number(item))) {
                  return sum + Number(item);
                }
                return sum;
              },
              0
            );
            if (additionalItemsCost > 0) {
              components.push(
                `Additional Items: $${additionalItemsCost.toLocaleString()}`
              );
            }
          }
          // Display components in a compact format with word wrapping
          if (components.length > 0) {
            // Check if we need a new page before drawing components
            if (y < minY) {
              dynamicPage = newPdfDoc.addPage();
              y = height - topMargin;
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
            const componentsText = components.join(" • ");
            // Split components into lines if they're too long
            const maxWidth = contentWidth - 20; // Account for left margin offset
            const words = componentsText.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Check if we need a new page
                if (y < minY) {
                  dynamicPage = newPdfDoc.addPage();
                  y = height - topMargin;
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
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
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
              // Check if we need a new page
              if (y < minY) {
                dynamicPage = newPdfDoc.addPage();
                y = height - topMargin;
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
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin + 20,
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
            // Split requirements into lines if they're too long
            const requirementsText = `Requirements: ${requirements.join(", ")}`;
            const maxWidth = contentWidth - 20; // Account for left margin offset
            const words = requirementsText.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
                  y,
                  size: fontSize - 1,
                  font,
                  color: rgb(0.8, 0.4, 0),
                });
                y -= lineHeight;
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            // Draw the last line
            if (currentLine) {
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin + 20,
                y,
                size: fontSize - 1,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });
              y -= lineHeight;
            }
          }

          y -= lineHeight * 0.5; // Small spacing between options
        }
        // Draw total line
        y -= lineHeight;
        // Check if we need a new page before drawing total
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - topMargin;
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
        dynamicPage.drawLine({
          start: {
            x: leftMargin,
            y: y + 5,
          },
          end: {
            x: width - rightMargin,
            y: y + 5,
          },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });
        y -= lineHeight;
        dynamicPage.drawText("Total Replacement Cost:", {
          x: leftMargin,
          y,
          size: fontSize + 1,
          font: bold,
        });
        dynamicPage.drawText(`$${combinedTotal.toLocaleString()}`, {
          x: width - rightMargin - 100,
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
        // Check if we need a new page before drawing single replacement details
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - topMargin;
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
        // Draw replacement header
        dynamicPage.drawText("Replacement Details:", {
          x: leftMargin,
          y,
          size: fontSize,
          font: bold,
        });
        dynamicPage.drawText(`$${totalCost.toLocaleString()}`, {
          x: width - rightMargin - 100,
          y,
          size: fontSize,
          font: bold,
        });
        y -= lineHeight;

        // Add unit information for single replacement if available (MOVED TO TOP)
        console.log(
          "DEBUG: Single replacement - Checking unit_info for entry:",
          entry.id,
          "unit_info:",
          entry.unit_info
        );
        if (
          entry.unit_info &&
          Array.isArray(entry.unit_info) &&
          entry.unit_info.length > 0
        ) {
          // Check if we need a new page before drawing unit info
          if (y < minY) {
            dynamicPage = newPdfDoc.addPage();
            y = height - topMargin;
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

          dynamicPage.drawText("Unit Information:", {
            x: leftMargin + 20,
            y,
            size: fontSize - 1,
            font: bold,
            color: rgb(0.2, 0.4, 0.8),
          });
          y -= lineHeight;

          entry.unit_info.forEach((unit, unitIndex) => {
            if (unit.descriptor || unit.modelName) {
              const unitText = `- ${unit.descriptor || ""}${
                unit.descriptor && unit.modelName ? " - " : ""
              }${unit.modelName || ""}`;
              dynamicPage.drawText(sanitizeTextForPDF(unitText), {
                x: leftMargin + 40,
                y,
                size: fontSize - 2,
                font,
              });
              y -= lineHeight;
            }
          });
          y -= lineHeight * 0.5; // Small spacing after unit info
        }

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
        // Add accessories if available
        if (
          entry.accessories &&
          Array.isArray(entry.accessories) &&
          entry.accessories.length > 0
        ) {
          const accessoriesCost = entry.accessories.reduce((sum, acc) => {
            // Handle both object format and direct cost format
            if (typeof acc === "object" && acc.cost !== undefined) {
              return sum + (Number(acc.cost) || 0);
            } else if (typeof acc === "number") {
              return sum + Number(acc);
            } else if (typeof acc === "string" && !isNaN(Number(acc))) {
              return sum + Number(acc);
            }
            return sum;
          }, 0);
          if (accessoriesCost > 0) {
            components.push(
              `Accessories: $${accessoriesCost.toLocaleString()}`
            );
          }
        }
        // Add additional items if available
        if (
          entry.additionalItems &&
          Array.isArray(entry.additionalItems) &&
          entry.additionalItems.length > 0
        ) {
          const additionalItemsCost = entry.additionalItems.reduce(
            (sum, item) => {
              // Handle both object format and direct cost format
              if (typeof item === "object" && item.cost !== undefined) {
                return sum + (Number(item.cost) || 0);
              } else if (typeof item === "number") {
                return sum + Number(item);
              } else if (typeof item === "string" && !isNaN(Number(item))) {
                return sum + Number(item);
              }
              return sum;
            },
            0
          );
          if (additionalItemsCost > 0) {
            components.push(
              `Additional Items: $${additionalItemsCost.toLocaleString()}`
            );
          }
        }
        // Display components
        if (components.length > 0) {
          for (const component of components) {
            // Check if we need a new page before drawing component
            if (y < minY) {
              dynamicPage = newPdfDoc.addPage();
              y = height - topMargin;
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
            // Split component into lines if it's too long
            const componentText = `• ${component}`;
            const maxWidth = contentWidth - 20; // Account for left margin offset
            const words = componentText.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
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
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin + 20,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            }
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
          // Check if we need a new page before drawing requirements
          if (y < minY) {
            dynamicPage = newPdfDoc.addPage();
            y = height - topMargin;
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
          // Split requirements into lines if they're too long
          const requirementsText = `Requirements: ${requirements.join(", ")}`;
          const maxWidth = contentWidth - 20; // Account for left margin offset
          const words = requirementsText.split(" ");
          let currentLine = "";
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
            if (testWidth > maxWidth && currentLine) {
              // Draw current line and start new line
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin + 20,
                y,
                size: fontSize - 1,
                font,
                color: rgb(0.8, 0.4, 0),
              });
              y -= lineHeight;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          // Draw the last line
          if (currentLine) {
            dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
              x: leftMargin + 20,
              y,
              size: fontSize - 1,
              font,
              color: rgb(0.8, 0.4, 0),
            });
            y -= lineHeight;
          }
        }

        y -= lineHeight;
      }
    }
    // Note: Duplicate inspection results section removed - only the first one is kept
    if (quoteType === "inspection") {
      // Handle inspection quotes
      // Add summary comment section if available
      if (
        jobData &&
        jobData.inspection_summary_comment &&
        jobData.inspection_summary_comment.trim()
      ) {
        // Check if we need a new page for the summary comment
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - topMargin;
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
        // Use drawBoundedText for proper margin handling
        const summaryText = `Summary Comment: ${sanitizeTextForPDF(
          jobData.inspection_summary_comment
        )}`;
        y = drawBoundedText(dynamicPage, summaryText, leftMargin, y, {
          font: bold,
          fontSize: fontSize + 1,
          leftMargin,
          rightMargin,
          width,
        });
        y -= lineHeight; // Extra spacing after summary
      }
    } else if (quoteType === "pm") {
      // Handle PM quotes
      // Use passed PM quotes data if available, otherwise fetch from database
      let pmQuotesToUse = pmQuotes;
      if (!pmQuotesToUse || pmQuotesToUse.length === 0) {
        const { data: dbPMQuotes, error: pmError } = await supabase
          .from("pm_quotes")
          .select("*")
          .eq("job_id", jobId);
        if (pmError) {
          throw new Error("Failed to fetch PM quotes");
        }
        pmQuotesToUse = dbPMQuotes;
      }
      if (!pmQuotesToUse || pmQuotesToUse.length === 0) {
        // Check if we need a new page
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - topMargin;
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
          x: leftMargin,
          y,
          size: fontSize,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });
        y -= lineHeight * 2;
      } else {
        // Process each PM quote
        for (let i = 0; i < pmQuotesToUse.length; i++) {
          const pmQuote = pmQuotesToUse[i];
          // Check if we need a new page
          if (y < minY) {
            dynamicPage = newPdfDoc.addPage();
            y = height - topMargin;
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
          dynamicPage.drawText("PM Quote Details:", {
            x: leftMargin,
            y,
            size: fontSize + 2,
            font: bold,
          });
          y -= lineHeight * 2;
          // Show basic information
          if (pmQuote.unit_count) {
            dynamicPage.drawText(
              `Number of Units: ${sanitizeTextForPDF(pmQuote.unit_count)}`,
              {
                x: leftMargin,
                y,
                size: fontSize,
                font: bold,
              }
            );
            y -= lineHeight;
          }
          // Show service configuration
          if (
            pmQuote.include_comprehensive_service &&
            pmQuote.comprehensive_visits_count
          ) {
            dynamicPage.drawText(
              `Comprehensive Visits: ${sanitizeTextForPDF(
                pmQuote.comprehensive_visits_count
              )}`,
              {
                x: leftMargin,
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
              `Filter Change Visits: ${sanitizeTextForPDF(
                pmQuote.filter_visits_count
              )}`,
              {
                x: leftMargin,
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
              x: leftMargin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;
            pmQuote.comprehensive_visit_costs.forEach((cost, index) => {
              dynamicPage.drawText(
                `Visit ${index + 1}: $${(cost || 0).toLocaleString()}`,
                {
                  x: leftMargin + 20,
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
              x: leftMargin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;
            pmQuote.filter_visit_costs.forEach((cost, index) => {
              dynamicPage.drawText(
                `Visit ${index + 1}: $${(cost || 0).toLocaleString()}`,
                {
                  x: leftMargin + 20,
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
              `Comprehensive Service Period: ${sanitizeTextForPDF(
                pmQuote.service_period
              )}`,
              {
                x: leftMargin,
                y,
                size: fontSize - 1,
                font,
              }
            );
            y -= lineHeight;
          }
          if (pmQuote.filter_visit_period) {
            dynamicPage.drawText(
              `Filter Change Period: ${sanitizeTextForPDF(
                pmQuote.filter_visit_period
              )}`,
              {
                x: leftMargin,
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
              x: leftMargin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;
            // Split text into lines manually
            const scopeText = pmQuote.scope_of_work;
            const maxWidth = contentWidth;
            const words = scopeText.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Check if we need a new page
                if (y < minY) {
                  dynamicPage = newPdfDoc.addPage();
                  y = height - topMargin;
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
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin,
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
              // Check if we need a new page
              if (y < minY) {
                dynamicPage = newPdfDoc.addPage();
                y = height - topMargin;
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
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight * 2;
            }
          }
          // Show service breakdown
          if (pmQuote.service_breakdown) {
            y -= lineHeight * 0.5;
            dynamicPage.drawText("Service Breakdown:", {
              x: leftMargin,
              y,
              size: fontSize,
              font: bold,
            });
            y -= lineHeight;
            // Split text into lines manually
            const breakdownText = pmQuote.service_breakdown;
            const maxWidth = contentWidth;
            const words = breakdownText.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Check if we need a new page
                if (y < minY) {
                  dynamicPage = newPdfDoc.addPage();
                  y = height - topMargin;
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
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin,
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
              // Check if we need a new page
              if (y < minY) {
                dynamicPage = newPdfDoc.addPage();
                y = height - topMargin;
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
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight * 2;
            }
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
                x: leftMargin,
                y,
                size: fontSize,
                font: bold,
              }
            );
            y -= lineHeight;
            if (pmQuote.service_period) {
              // Split service period into lines if it's too long
              const scheduleText = `Schedule: ${pmQuote.service_period}`;
              const maxWidth = contentWidth - 20;
              const words = scheduleText.split(" ");
              let currentLine = "";
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(
                  testLine,
                  fontSize - 1
                );
                if (testWidth > maxWidth && currentLine) {
                  // Draw current line and start new line
                  dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                    x: leftMargin + 20,
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
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
                  y,
                  size: fontSize - 1,
                  font,
                });
                y -= lineHeight;
              }
            }
            const comprehensiveDesc =
              pmQuote.comprehensive_visit_description ||
              "During these visits, we will perform a detailed inspection and complete the following tasks";
            // Split text into lines manually
            const maxWidth = contentWidth - 20;
            const words = comprehensiveDesc.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Check if we need a new page
                if (y < minY) {
                  dynamicPage = newPdfDoc.addPage();
                  y = height - topMargin;
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
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
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
              // Check if we need a new page
              if (y < minY) {
                dynamicPage = newPdfDoc.addPage();
                y = height - topMargin;
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
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin + 20,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            }
            // 20-Point Inspection
            y -= lineHeight * 0.5;
            dynamicPage.drawText(
              "20-Point Safety and Operational Inspection, which includes:",
              {
                x: leftMargin + 20,
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
              // Check if we need a new page before drawing each task
              if (y < minY) {
                dynamicPage = newPdfDoc.addPage();
                y = height - topMargin;
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
              // Split task into lines if it's too long
              const taskText = `• ${task}`;
              const maxWidth = contentWidth - 30; // Account for left margin offset
              const words = taskText.split(" ");
              let currentLine = "";
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(
                  testLine,
                  fontSize - 2
                );
                if (testWidth > maxWidth && currentLine) {
                  // Draw current line and start new line
                  dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                    x: leftMargin + 30,
                    y,
                    size: fontSize - 2,
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
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 30,
                  y,
                  size: fontSize - 2,
                  font,
                });
                y -= lineHeight;
              }
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
                x: leftMargin,
                y,
                size: fontSize,
                font: bold,
              }
            );
            y -= lineHeight;
            if (pmQuote.filter_visit_period) {
              // Split filter visit period into lines if it's too long
              const scheduleText = `Schedule: ${pmQuote.filter_visit_period}`;
              const maxWidth = contentWidth - 20;
              const words = scheduleText.split(" ");
              let currentLine = "";
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(
                  testLine,
                  fontSize - 1
                );
                if (testWidth > maxWidth && currentLine) {
                  // Draw current line and start new line
                  dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                    x: leftMargin + 20,
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
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
                  y,
                  size: fontSize - 1,
                  font,
                });
                y -= lineHeight;
              }
            }
            const filterDesc =
              pmQuote.filter_visit_description ||
              "During these visits, we will perform filter replacement and basic maintenance";
            // Split text into lines manually
            const maxWidth = contentWidth - 20;
            const words = filterDesc.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Check if we need a new page
                if (y < minY) {
                  dynamicPage = newPdfDoc.addPage();
                  y = height - topMargin;
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
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
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
              // Check if we need a new page
              if (y < minY) {
                dynamicPage = newPdfDoc.addPage();
                y = height - topMargin;
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
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin + 20,
                y,
                size: fontSize - 1,
                font,
              });
              y -= lineHeight;
            }
            // Filter-specific tasks
            y -= lineHeight * 0.5;
            dynamicPage.drawText("Filter Change Services include:", {
              x: leftMargin + 20,
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
              // Check if we need a new page before drawing each task
              if (y < minY) {
                dynamicPage = newPdfDoc.addPage();
                y = height - topMargin;
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
              // Split task into lines if it's too long
              const taskText = `• ${task}`;
              const maxWidth = contentWidth - 30; // Account for left margin offset
              const words = taskText.split(" ");
              let currentLine = "";
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(
                  testLine,
                  fontSize - 2
                );
                if (testWidth > maxWidth && currentLine) {
                  // Draw current line and start new line
                  dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                    x: leftMargin + 30,
                    y,
                    size: fontSize - 2,
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
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 30,
                  y,
                  size: fontSize - 2,
                  font,
                });
                y -= lineHeight;
              }
            });
            y -= lineHeight;
          }
          // Preventative Maintenance Section (Blue background) - Always start on new page
          dynamicPage = newPdfDoc.addPage();
          y = height - topMargin;
          // Add background to new page if available
          if (bgImage) {
            dynamicPage.drawImage(bgImage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }
          dynamicPage.drawRectangle({
            x: leftMargin - 5,
            y: y - 5,
            width: contentWidth + 10,
            height: 40,
            color: rgb(0.23, 0.51, 0.96),
          });
          dynamicPage.drawText("Preventative Maintenance", {
            x: leftMargin,
            y,
            size: fontSize,
            font: bold,
            color: rgb(1, 1, 1),
          });
          y -= lineHeight * 2;
          const maintenanceServices =
            pmQuote.preventative_maintenance_services || [
              "Replacement of All Filters",
              "Flushing and Clearing of Drain Lines",
              "Placement of Nu-Calgon Condensate Drain Pan Treatment Gel Tablets",
            ];
          maintenanceServices.forEach((service) => {
            // Check if we need a new page before drawing each service
            if (y < minY) {
              dynamicPage = newPdfDoc.addPage();
              y = height - topMargin;
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
            // Split service into lines if it's too long
            const serviceText = `• ${service}`;
            const maxWidth = contentWidth;
            const words = serviceText.split(" ");
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize - 1);
              if (testWidth > maxWidth && currentLine) {
                // Draw current line and start new line
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin,
                  y,
                  size: fontSize - 1,
                  font: bold,
                });
                y -= lineHeight;
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            // Draw the last line
            if (currentLine) {
              dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                x: leftMargin,
                y,
                size: fontSize - 1,
                font: bold,
              });
              y -= lineHeight;
            }
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
              // Split text into lines manually
              const maxWidth = contentWidth - 20;
              const words = description.split(" ");
              let currentLine = "";
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(
                  testLine,
                  fontSize - 2
                );
                if (testWidth > maxWidth && currentLine) {
                  // Check if we need a new page
                  if (y < minY) {
                    dynamicPage = newPdfDoc.addPage();
                    y = height - topMargin;
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
                  // Draw current line and start new line
                  dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                    x: leftMargin + 20,
                    y,
                    size: fontSize - 2,
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
                // Check if we need a new page
                if (y < minY) {
                  dynamicPage = newPdfDoc.addPage();
                  y = height - topMargin;
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
                dynamicPage.drawText(sanitizeTextForPDF(currentLine), {
                  x: leftMargin + 20,
                  y,
                  size: fontSize - 2,
                  font,
                });
                y -= lineHeight;
              }
            }
            y -= lineHeight * 0.5;
          });
          // Show total cost
          y -= lineHeight;
          dynamicPage.drawLine({
            start: {
              x: leftMargin,
              y: y + 5,
            },
            end: {
              x: width - rightMargin,
              y: y + 5,
            },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
          });
          y -= lineHeight;
          const totalCost = pmQuote.total_cost || 0;
          dynamicPage.drawText("Total Annual Cost:", {
            x: leftMargin,
            y,
            size: fontSize + 1,
            font: bold,
          });
          dynamicPage.drawText(`$${totalCost.toLocaleString()}`, {
            x: width - rightMargin - 100,
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
      // Check if we need a new page
      if (y < minY) {
        dynamicPage = newPdfDoc.addPage();
        y = height - topMargin;
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
      dynamicPage.drawText("Items:", {
        x: leftMargin,
        y,
        size: fontSize + 2,
        font: bold,
      });
      y -= lineHeight * 1.5;
      // Table header
      dynamicPage.drawText("Item", {
        x: leftMargin,
        y,
        size: fontSize,
        font: bold,
      });
      dynamicPage.drawText("Quantity", {
        x: leftMargin + contentWidth * 0.7,
        y,
        size: fontSize,
        font: bold,
      });
      dynamicPage.drawText("Price", {
        x: leftMargin + contentWidth * 0.85,
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
      for (const item of repairItems) {
        // Check if we need a new page
        if (y < minY) {
          dynamicPage = newPdfDoc.addPage();
          y = height - topMargin;
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
            x: leftMargin,
            y,
            size: fontSize,
            font: bold,
          });
          dynamicPage.drawText("Quantity", {
            x: leftMargin + contentWidth * 0.7,
            y,
            size: fontSize,
            font: bold,
          });
          dynamicPage.drawText("Price", {
            x: leftMargin + contentWidth * 0.85,
            y,
            size: fontSize,
            font: bold,
          });
          y -= lineHeight;
        }
        const name = (item.name || "Unknown").trim();
        const quantity = item.quantity || 1;
        const cost = Number(item.total_cost || item.cost || 0);
        dynamicPage.drawText(name, {
          x: leftMargin,
          y,
          size: fontSize,
          font,
        });
        dynamicPage.drawText(sanitizeTextForPDF(quantity.toString()), {
          x: leftMargin + contentWidth * 0.7,
          y,
          size: fontSize,
          font,
        });
        dynamicPage.drawText(`$${cost.toFixed(2)}`, {
          x: leftMargin + contentWidth * 0.85,
          y,
          size: fontSize,
          font,
        });
        totalAmount += cost;
        y -= lineHeight;
      }
      y -= lineHeight;
      dynamicPage.drawText("Total:", {
        x: leftMargin + contentWidth * 0.7,
        y,
        size: fontSize + 2,
        font: bold,
      });
      dynamicPage.drawText(`$${totalAmount.toFixed(2)}`, {
        x: leftMargin + contentWidth * 0.85,
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
    // Get public URL (no expiration)
    const { data: urlData } = supabase.storage
      .from("quotes")
      .getPublicUrl(filePath);
    const pdfUrl = urlData.publicUrl;
    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: pdfUrl,
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
