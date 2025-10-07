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
  return {
    page,
    y,
  };
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
    } = await req.json();
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
    } else {
      // No template provided, create a cover page manually
      const coverPage = newPdfDoc.addPage();
      const { width, height } = coverPage.getSize();
      // Use unified margin system
      const leftMargin = MARGINS.LEFT;
      const rightMargin = MARGINS.RIGHT;
      const contentWidth = width - leftMargin - rightMargin;
      const columnSpacing = MARGINS.COLUMN_SPACING;
      const leftColumnWidth = (contentWidth - columnSpacing) / 2;
      const rightColumnX = leftMargin + leftColumnWidth + columnSpacing;
      // Draw background with exact color specified
      coverPage.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: height,
        color: rgb(7 / 255, 43 / 255, 48 / 255),
      });
      // Define dimensions and position for the larger hexagonal HVAC image
      const imageWidth = width * 0.7;
      const imageHeight = imageWidth;
      const imageX = width - imageWidth;
      const imageY = height - imageHeight;
      // Add HVAC image
      try {
        const hvacImageUrl =
          "https://ekxkjnygupehzpoyojwq.supabase.co/storage/v1/object/public/templates/quote-templates/output-onlinepngtools.png";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const hvacImageRes = await fetch(hvacImageUrl, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (hvacImageRes.ok) {
          const hvacImageBytes = await hvacImageRes.arrayBuffer();
          const hvacImage = await newPdfDoc.embedPng(hvacImageBytes);
          coverPage.drawImage(hvacImage, {
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
        coverPage.drawText("HVAC Units", {
          x: imageX + imageWidth / 2 - 30,
          y: imageY + imageHeight / 2,
          size: 16,
          font: bold,
          color: rgb(1, 1, 1),
        });
      }
      // Draw title
      const titleText =
        quoteType === "inspection"
          ? "Inspection Report"
          : `${quoteType.charAt(0).toUpperCase() + quoteType.slice(1)} Report`;
      coverPage.drawText(titleText, {
        x: leftMargin,
        y: 150,
        size: 28,
        font: bold,
        color: rgb(1, 1, 1),
      });
      // Draw date
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
      coverPage.drawText(sanitizeTextForPDF(formattedDate), {
        x: leftMargin,
        y: 190,
        size: 16,
        font: bold,
        color: rgb(0.9, 0.4, 0.2),
      });
      // Draw customer information
      let customerY = 120;
      const companyName =
        jobData?.locations?.companies?.name ||
        jobData?.location?.companies?.name;
      if (companyName) {
        coverPage.drawText(sanitizeTextForPDF(companyName), {
          x: leftMargin,
          y: customerY,
          size: 16,
          font: bold,
          color: rgb(1, 1, 1),
        });
        customerY -= 20;
      }
      const locationName = jobData?.locations?.name || jobData?.location?.name;
      const address = jobData?.locations?.address || jobData?.location?.address;
      if (locationName && locationName !== address) {
        coverPage.drawText(sanitizeTextForPDF(locationName), {
          x: leftMargin,
          y: customerY,
          size: 14,
          font: bold,
          color: rgb(1, 1, 1),
        });
        customerY -= 18;
      }
      if (address) {
        coverPage.drawText(sanitizeTextForPDF(address), {
          x: leftMargin,
          y: customerY,
          size: 14,
          font,
          color: rgb(1, 1, 1),
        });
        customerY -= 18;
      }
      const city = jobData?.locations?.city || jobData?.location?.city;
      const state = jobData?.locations?.state || jobData?.location?.state;
      const zip = jobData?.locations?.zip || jobData?.location?.zip;
      if (city || state || zip) {
        const cityStateZip = [city, state, zip].filter(Boolean).join(", ");
        coverPage.drawText(sanitizeTextForPDF(cityStateZip), {
          x: leftMargin,
          y: customerY,
          size: 14,
          font,
          color: rgb(1, 1, 1),
        });
        customerY -= 18;
      }
      // Unit information
      const units = jobData?.units || (jobData?.unit ? [jobData.unit] : []);
      if (units && units.length > 0) {
        if (units.length === 1) {
          const unitNumber = units[0]?.unit_number;
          if (unitNumber) {
            coverPage.drawText(`Unit: ${sanitizeTextForPDF(unitNumber)}`, {
              x: leftMargin,
              y: customerY,
              size: 14,
              font: bold,
              color: rgb(1, 1, 1),
            });
          }
        } else {
          const unitNumbers = units
            .map((unit) => unit.unit_number)
            .filter(Boolean)
            .join(", ");
          if (unitNumbers) {
            coverPage.drawText(`Units: ${sanitizeTextForPDF(unitNumbers)}`, {
              x: leftMargin,
              y: customerY,
              size: 14,
              font: bold,
              color: rgb(1, 1, 1),
            });
          }
        }
      }
      // Add AirLast logo
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
          coverPage.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
          });
        } else {
          throw new Error("Logo fetch failed");
        }
      } catch (error) {
        coverPage.drawText("AIRLAST", {
          x: width - rightMargin - 70,
          y: 70,
          size: 16,
          font: bold,
          color: rgb(1, 1, 1),
        });
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
    // Copy remaining preserved pages (for templates with multiple pages)
    for (let i = insertPos; i < sorted.length; i++) {
      const p = sorted[i];
      if (p > 0 && p <= pdfDoc.getPageCount()) {
        const [copied] = await newPdfDoc.copyPages(pdfDoc, [p - 1]);
        newPdfDoc.addPage(copied);
      }
    }
    // Generate PDF bytes and upload to storage
    const pdfBytes = await newPdfDoc.save();
    // Upload PDF to storage
    const fileName = `inspection-report-${jobId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("quote-pdfs")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }
    // Get public URL
    const { data: urlData } = supabase.storage
      .from("quote-pdfs")
      .getPublicUrl(fileName);
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
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate PDF",
        details: error.message,
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
