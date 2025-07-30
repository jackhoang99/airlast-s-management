import jsPDF from "jspdf";
import "jspdf-autotable";

type PMQuoteData = {
  id?: string;
  job_id: string;
  number_of_visits: number;
  total_cost: number;
  notes?: string;
  created_at?: string;
  visit_schedules?: any[];
  comprehensive_visit_cost?: number;
  filter_visit_cost?: number;
  comprehensive_visit_description?: string;
  filter_visit_description?: string;
  unit_count?: number;
  service_period?: string;
  filter_visit_period?: string;
  comprehensive_visits_count?: number;
  filter_visits_count?: number;
  total_comprehensive_cost?: number;
  total_filter_cost?: number;
  // Individual visit costs for flexible pricing
  comprehensive_visit_costs?: number[];
  filter_visit_costs?: number[];
  client_name?: string;
  property_address?: string;
  scope_of_work?: string;
  service_breakdown?: string;
  preventative_maintenance_services?: string[];
  include_comprehensive_service?: boolean;
  include_filter_change_service?: boolean;
};

const PMQuotePDFGenerator = (pmQuote: PMQuoteData) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFillColor(59, 130, 246); // Blue background
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PM HVAC Servicing Quote", 105, 18, { align: "center" });

  // Reset text color for content
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Date
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 20, yPos);
  doc.setFont("helvetica", "normal");
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
  doc.text(formattedDate, 35, yPos);
  yPos += 15;

  // Client Information
  if (pmQuote.client_name) {
    doc.setFont("helvetica", "bold");
    doc.text("Client:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(pmQuote.client_name, 35, yPos);
    yPos += 8;
  }

  if (pmQuote.property_address) {
    doc.setFont("helvetica", "bold");
    doc.text("Property Address:", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(pmQuote.property_address, 50, yPos);
    yPos += 15;
  }

  // Scope of Work
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Scope of Work", 20, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const scopeText =
    pmQuote.scope_of_work ||
    "This proposal includes comprehensive HVAC maintenance services.";
  const scopeLines = doc.splitTextToSize(scopeText, 170);
  doc.text(scopeLines, 20, yPos);
  yPos += scopeLines.length * 5 + 10;

  // Service Breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Service Breakdown", 20, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Comprehensive Service Visits
  if (
    pmQuote.include_comprehensive_service &&
    pmQuote.comprehensive_visits_count &&
    pmQuote.comprehensive_visits_count > 0
  ) {
    doc.setFont("helvetica", "bold");
    doc.text(
      `1. ${pmQuote.comprehensive_visits_count} Comprehensive Service Visit${
        pmQuote.comprehensive_visits_count > 1 ? "s" : ""
      }`,
      20,
      yPos
    );
    yPos += 6;

    if (pmQuote.service_period) {
      doc.setFont("helvetica", "normal");
      doc.text(`Schedule: ${pmQuote.service_period}`, 25, yPos);
      yPos += 6;
    }

    const comprehensiveDesc =
      pmQuote.comprehensive_visit_description ||
      "During these visits, we will perform a detailed inspection and complete the following tasks";
    const comprehensiveLines = doc.splitTextToSize(comprehensiveDesc, 165);
    doc.text(comprehensiveLines, 25, yPos);
    yPos += comprehensiveLines.length * 5 + 5;

    // 20-Point Inspection (based on selected checklists)
    doc.setFont("helvetica", "bold");
    doc.text(
      "20-Point Safety and Operational Inspection, which includes:",
      25,
      yPos
    );
    yPos += 6;

    doc.setFont("helvetica", "normal");
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
      doc.text(`• ${task}`, 30, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // Filter Change Visits (only if filter visits are configured)
  if (
    pmQuote.include_filter_change_service &&
    pmQuote.filter_visits_count &&
    pmQuote.filter_visits_count > 0
  ) {
    const sectionNumber = pmQuote.include_comprehensive_service ? "2" : "1";
    doc.setFont("helvetica", "bold");
    doc.text(
      `${sectionNumber}. ${pmQuote.filter_visits_count} Filter Change Visit${
        pmQuote.filter_visits_count > 1 ? "s" : ""
      }`,
      20,
      yPos
    );
    yPos += 6;

    if (pmQuote.filter_visit_period) {
      doc.setFont("helvetica", "normal");
      doc.text(`Schedule: ${pmQuote.filter_visit_period}`, 25, yPos);
      yPos += 6;
    }

    const filterDesc =
      pmQuote.filter_visit_description ||
      "During these visits, we will perform filter replacement and basic maintenance";
    const filterLines = doc.splitTextToSize(filterDesc, 165);
    doc.text(filterLines, 25, yPos);
    yPos += filterLines.length * 5 + 5;

    // Filter-specific tasks
    doc.setFont("helvetica", "bold");
    doc.text("Filter Change Services include:", 25, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    const filterTasks = [
      "Filter Size inspection and replacement",
      "Replace & Date all filters",
      "Flush and Drain lines",
      "Cycle all condensate pumps",
      "Test all safety switches",
    ];

    filterTasks.forEach((task) => {
      doc.text(`• ${task}`, 30, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // Check if we need a new page
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  // Preventative Maintenance Section (Blue background)
  doc.setFillColor(59, 130, 246);
  doc.rect(15, yPos - 5, 180, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Preventative Maintenance", 20, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const maintenanceServices = pmQuote.preventative_maintenance_services || [
    "Replacement of All Filters",
    "Flushing and Clearing of Drain Lines",
    "Placement of Nu-Calgon Condensate Drain Pan Treatment Gel Tablets",
  ];

  maintenanceServices.forEach((service) => {
    doc.setFont("helvetica", "bold");
    doc.text(`• ${service}`, 20, yPos);
    yPos += 5;

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
      const descLines = doc.splitTextToSize(description, 160);
      doc.setFont("helvetica", "normal");
      doc.text(descLines, 25, yPos);
      yPos += descLines.length * 5;
    }
    yPos += 3;
  });

  // Reset text color for cost section
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  // Total Cost Estimate
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Cost Estimate", 20, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Individual Visit Costs
  if (pmQuote.include_comprehensive_service && pmQuote.comprehensive_visit_costs && pmQuote.comprehensive_visit_costs.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Comprehensive Service Visit Costs:", 20, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    pmQuote.comprehensive_visit_costs.forEach((cost, index) => {
      const visitNumber = index + 1;
      const visitCost = cost || 0;
      doc.text(`Visit ${visitNumber}: $${visitCost.toLocaleString()}`, 25, yPos);
      yPos += 5;
    });
    yPos += 3;

    const comprehensiveCostDesc =
      pmQuote.comprehensive_visit_description ||
      "Includes full system inspection, filter replacement, drain line clearing, and treatment tablets";
    const comprehensiveCostLines = doc.splitTextToSize(
      comprehensiveCostDesc,
      170
    );
    doc.text(comprehensiveCostLines, 25, yPos);
    yPos += comprehensiveCostLines.length * 5 + 5;
  }

  // Filter Change Visit Costs
  if (pmQuote.include_filter_change_service && pmQuote.filter_visit_costs && pmQuote.filter_visit_costs.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Filter Change Visit Costs:", 20, yPos);
    yPos += 6;

    doc.setFont("helvetica", "normal");
    pmQuote.filter_visit_costs.forEach((cost, index) => {
      const visitNumber = index + 1;
      const visitCost = cost || 0;
      doc.text(`Visit ${visitNumber}: $${visitCost.toLocaleString()}`, 25, yPos);
      yPos += 5;
    });
    yPos += 3;

    const filterCostDesc =
      pmQuote.filter_visit_description ||
      "Includes filter replacement and drain line clearing";
    const filterCostLines = doc.splitTextToSize(filterCostDesc, 170);
    doc.text(filterCostLines, 25, yPos);
    yPos += filterCostLines.length * 5 + 5;
  }

  // Total Annual Cost
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const totalCost = pmQuote.total_cost || 0;
  doc.text(`Total Annual Cost: $${totalCost.toLocaleString()}`, 20, yPos);

  return doc;
};

export default PMQuotePDFGenerator;
