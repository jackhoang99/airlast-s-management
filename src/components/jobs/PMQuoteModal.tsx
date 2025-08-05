import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  CheckSquare,
  Square,
  FileText,
  Save,
  Send,
  Clock,
  MapPin,
  Settings,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type PMVisitSchedule = {
  month: string;
  description: string;
  services: string[];
};

type PMQuoteData = {
  id?: string;
  job_id: string;
  number_of_visits: number;
  total_cost: number;
  notes?: string;
  created_at?: string;
  // Enhanced fields for detailed PDF generation
  visit_schedules?: PMVisitSchedule[];
  comprehensive_visit_cost?: number;
  filter_visit_cost?: number;
  comprehensive_visit_description?: string;
  filter_visit_description?: string;
  unit_count?: number;
  service_period?: string; // e.g., "March & September"
  filter_visit_period?: string; // e.g., "June & December"
  // New fields for commercial quote format
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
  // Toggle fields for enabling/disabling services
  include_comprehensive_service?: boolean;
  include_filter_change_service?: boolean;
};

type PMQuoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onSave: (pmQuote: PMQuoteData) => void;
  onSendQuote?: (pmQuote: PMQuoteData) => void;
  existingQuote?: PMQuoteData | null;
  jobDetails?: any;
};

const PMQuoteModal = ({
  isOpen,
  onClose,
  jobId,
  onSave,
  onSendQuote,
  existingQuote,
  jobDetails,
}: PMQuoteModalProps) => {
  const { supabase } = useSupabase();
  const [pmQuote, setPmQuote] = useState<PMQuoteData>({
    job_id: jobId,
    number_of_visits: 1,
    total_cost: 0,
    notes: "",
    unit_count: 1,
    comprehensive_visit_cost: 360,
    filter_visit_cost: 320,
    comprehensive_visit_description:
      "Includes full system inspection, filter replacement, drain line clearing, and treatment tablets",
    filter_visit_description:
      "Includes filter replacement and drain line clearing",
    service_period: "March (A/C Servicing) & September (Heating Servicing)",
    filter_visit_period: "June & December",
    comprehensive_visits_count: 2,
    filter_visits_count: 2,
    total_comprehensive_cost: 720,
    total_filter_cost: 640,
    comprehensive_visit_costs: [360, 360],
    filter_visit_costs: [320, 320],
    client_name: jobDetails?.contact_name || "",
    property_address: jobDetails?.locations
      ? `${jobDetails.locations.address}, ${jobDetails.locations.city}, ${jobDetails.locations.state} ${jobDetails.locations.zip}`
      : "",
    scope_of_work:
      "This proposal includes comprehensive HVAC maintenance services for units across four scheduled service visits annually and two additional filter change visits to ensure consistent performance, safety, and efficiency.",
    service_breakdown:
      "During these visits, we will perform a detailed 20-point inspection and complete the following tasks for all units:",
    preventative_maintenance_services: [
      "Replacement of All Filters",
      "Flushing and Clearing of Drain Lines",
      "Placement of Nu-Calgon Condensate Drain Pan Treatment Gel Tablets",
    ],
    include_comprehensive_service: true,
    include_filter_change_service: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detailed" | "commercial">(
    "detailed"
  );

  // Initialize with existing quote data
  useEffect(() => {
    if (existingQuote) {
      setPmQuote(existingQuote);
    } else {
      setPmQuote({
        job_id: jobId,
        number_of_visits: 1,
        total_cost: 0,
        notes: "",
        unit_count: 1,
        comprehensive_visit_cost: 360,
        filter_visit_cost: 320,
        comprehensive_visit_description:
          "Includes full system inspection, filter replacement, drain line clearing, and treatment tablets",
        filter_visit_description:
          "Includes filter replacement and drain line clearing",
        service_period: "March (A/C Servicing) & September (Heating Servicing)",
        filter_visit_period: "June & December",
        comprehensive_visits_count: 2,
        filter_visits_count: 2,
        total_comprehensive_cost: 720,
        total_filter_cost: 640,
        comprehensive_visit_costs: [360, 360],
        filter_visit_costs: [320, 320],
        client_name: jobDetails?.contact_name || "",
        property_address: jobDetails?.locations
          ? `${jobDetails.locations.address}, ${jobDetails.locations.city}, ${jobDetails.locations.state} ${jobDetails.locations.zip}`
          : "",
        scope_of_work:
          "This proposal includes comprehensive HVAC maintenance services for units across four scheduled service visits annually and two additional filter change visits to ensure consistent performance, safety, and efficiency.",
        service_breakdown:
          "During these visits, we will perform a detailed 20-point inspection and complete the following tasks for all units:",
        preventative_maintenance_services: [
          "Replacement of All Filters",
          "Flushing and Clearing of Drain Lines",
          "Placement of Nu-Calgon Condensate Drain Pan Treatment Gel Tablets",
        ],
        include_comprehensive_service: true,
        include_filter_change_service: true,
      });
    }
  }, [existingQuote, jobId, jobDetails]);

  // Calculate costs when unit count or visit costs change
  useEffect(() => {
    const comprehensiveTotal = pmQuote.include_comprehensive_service
      ? (pmQuote.comprehensive_visit_cost ?? 0) *
        (pmQuote.comprehensive_visits_count ?? 0)
      : 0;
    const filterTotal = pmQuote.include_filter_change_service
      ? (pmQuote.filter_visit_cost ?? 0) * (pmQuote.filter_visits_count ?? 0)
      : 0;
    const total = comprehensiveTotal + filterTotal;

    setPmQuote((prev) => ({
      ...prev,
      total_comprehensive_cost: comprehensiveTotal,
      total_filter_cost: filterTotal,
      total_cost: total,
    }));
  }, [
    pmQuote.comprehensive_visit_cost,
    pmQuote.filter_visit_cost,
    pmQuote.comprehensive_visits_count,
    pmQuote.filter_visits_count,
    pmQuote.include_comprehensive_service,
    pmQuote.include_filter_change_service,
  ]);

  // Update scope of work when basic settings change
  useEffect(() => {
    const unitText = pmQuote.unit_count === 1 ? "unit" : "units";
    const comprehensiveVisits = pmQuote.include_comprehensive_service
      ? pmQuote.comprehensive_visits_count ?? 0
      : 0;
    const filterVisits = pmQuote.include_filter_change_service
      ? pmQuote.filter_visits_count ?? 0
      : 0;
    const totalVisits = comprehensiveVisits + filterVisits;

    let scopeText = "";

    if (totalVisits === 0) {
      scopeText = `This proposal includes comprehensive HVAC maintenance services for ${pmQuote.unit_count} ${unitText}.`;
    } else if (comprehensiveVisits > 0 && filterVisits > 0) {
      scopeText = `This proposal includes comprehensive HVAC maintenance services for ${pmQuote.unit_count} ${unitText} across ${totalVisits} scheduled service visits annually (${comprehensiveVisits} comprehensive maintenance visits and ${filterVisits} filter change visits) to ensure consistent performance, safety, and efficiency.`;
    } else if (comprehensiveVisits > 0) {
      scopeText = `This proposal includes comprehensive HVAC maintenance services for ${pmQuote.unit_count} ${unitText} across ${comprehensiveVisits} scheduled service visits annually to ensure consistent performance, safety, and efficiency.`;
    } else if (filterVisits > 0) {
      scopeText = `This proposal includes filter change services for ${pmQuote.unit_count} ${unitText} across ${filterVisits} scheduled service visits annually to ensure consistent performance, safety, and efficiency.`;
    }

    setPmQuote((prev) => ({ ...prev, scope_of_work: scopeText }));
  }, [
    pmQuote.unit_count,
    pmQuote.comprehensive_visits_count,
    pmQuote.filter_visits_count,
    pmQuote.include_comprehensive_service,
    pmQuote.include_filter_change_service,
  ]);

  // Update service breakdown when basic settings change
  useEffect(() => {
    const comprehensiveVisits = pmQuote.include_comprehensive_service
      ? pmQuote.comprehensive_visits_count ?? 0
      : 0;
    const filterVisits = pmQuote.include_filter_change_service
      ? pmQuote.filter_visits_count ?? 0
      : 0;

    let breakdownText = "";

    if (comprehensiveVisits > 0 && filterVisits > 0) {
      breakdownText = `During these visits, we will perform a detailed 20-point inspection and complete the following tasks for all units:`;
    } else if (comprehensiveVisits > 0) {
      breakdownText = `During these comprehensive maintenance visits, we will perform a detailed 20-point inspection and complete the following tasks for all units:`;
    } else if (filterVisits > 0) {
      breakdownText = `During these filter change visits, we will complete the following tasks for all units:`;
    } else {
      breakdownText = `During these visits, we will complete the following tasks for all units:`;
    }

    setPmQuote((prev) => ({ ...prev, service_breakdown: breakdownText }));
  }, [
    pmQuote.comprehensive_visits_count,
    pmQuote.filter_visits_count,
    pmQuote.include_comprehensive_service,
    pmQuote.include_filter_change_service,
  ]);

  // Update individual visit costs arrays when visit counts change
  useEffect(() => {
    const comprehensiveVisits = pmQuote.comprehensive_visits_count ?? 0;
    const filterVisits = pmQuote.filter_visits_count ?? 0;

    // Update comprehensive visit costs array
    const currentComprehensiveCosts = pmQuote.comprehensive_visit_costs || [];
    const newComprehensiveCosts = Array(comprehensiveVisits)
      .fill(0)
      .map(
        (_, index) =>
          currentComprehensiveCosts[index] ??
          pmQuote.comprehensive_visit_cost ??
          360
      );

    // Update filter visit costs array
    const currentFilterCosts = pmQuote.filter_visit_costs || [];
    const newFilterCosts = Array(filterVisits)
      .fill(0)
      .map(
        (_, index) =>
          currentFilterCosts[index] ?? pmQuote.filter_visit_cost ?? 320
      );

    setPmQuote((prev) => ({
      ...prev,
      comprehensive_visit_costs: newComprehensiveCosts,
      filter_visit_costs: newFilterCosts,
    }));
  }, [pmQuote.comprehensive_visits_count, pmQuote.filter_visits_count]);

  // Update total costs when individual visit costs change
  useEffect(() => {
    const comprehensiveTotal = pmQuote.include_comprehensive_service
      ? (pmQuote.comprehensive_visit_costs || []).reduce(
          (sum, cost) => sum + (cost || 0),
          0
        )
      : 0;
    const filterTotal = pmQuote.include_filter_change_service
      ? (pmQuote.filter_visit_costs || []).reduce(
          (sum, cost) => sum + (cost || 0),
          0
        )
      : 0;
    const total = comprehensiveTotal + filterTotal;

    setPmQuote((prev) => ({
      ...prev,
      total_comprehensive_cost: comprehensiveTotal,
      total_filter_cost: filterTotal,
      total_cost: total,
    }));
  }, [
    pmQuote.comprehensive_visit_costs,
    pmQuote.filter_visit_costs,
    pmQuote.include_comprehensive_service,
    pmQuote.include_filter_change_service,
  ]);

  // Helper functions for updating individual visit costs
  const updateComprehensiveVisitCost = (index: number, cost: number) => {
    const newCosts = [...(pmQuote.comprehensive_visit_costs || [])];
    newCosts[index] = cost;
    setPmQuote((prev) => ({ ...prev, comprehensive_visit_costs: newCosts }));
  };

  const updateFilterVisitCost = (index: number, cost: number) => {
    const newCosts = [...(pmQuote.filter_visit_costs || [])];
    newCosts[index] = cost;
    setPmQuote((prev) => ({ ...prev, filter_visit_costs: newCosts }));
  };

  const handleSave = async () => {
    if (
      !pmQuote.include_comprehensive_service &&
      !pmQuote.include_filter_change_service
    ) {
      setError("Please enable at least one service type");
      return;
    }

    if (
      pmQuote.include_comprehensive_service &&
      (pmQuote.comprehensive_visit_cost ?? 0) <= 0
    ) {
      setError("Please enter a valid comprehensive visit cost");
      return;
    }

    if (
      pmQuote.include_filter_change_service &&
      (pmQuote.filter_visit_cost ?? 0) <= 0
    ) {
      setError("Please enter a valid filter visit cost");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      onSave(pmQuote);
      onClose();
    } catch (err) {
      setError("Failed to save PM quote");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendQuote = () => {
    if (onSendQuote) {
      onSendQuote(pmQuote);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary-600" />
            {existingQuote ? "Edit PM Quote" : "Create PM Quote"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("detailed")}
            className={`px-6 py-3 font-medium ${
              activeTab === "detailed"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab("commercial")}
            className={`px-6 py-3 font-medium ${
              activeTab === "commercial"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Commercial Quote
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {activeTab === "detailed" && (
            <>
              {/* Basic Settings */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4 text-blue-900">
                  Basic Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Unit Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Units
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={pmQuote.unit_count || 1}
                      onChange={(e) =>
                        setPmQuote((prev) => ({
                          ...prev,
                          unit_count: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Comprehensive Visits */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Comprehensive Visits
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={pmQuote.comprehensive_visits_count || 0}
                      onChange={(e) =>
                        setPmQuote((prev) => ({
                          ...prev,
                          comprehensive_visits_count:
                            parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Filter Visits */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Filter Change Visits
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={pmQuote.filter_visits_count || 0}
                      onChange={(e) =>
                        setPmQuote((prev) => ({
                          ...prev,
                          filter_visits_count: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Service Toggles */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">
                  Service Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Comprehensive Service Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Comprehensive Service
                      </h4>
                      <p className="text-sm text-gray-600">
                        Full system inspection and maintenance
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setPmQuote((prev) => ({
                          ...prev,
                          include_comprehensive_service:
                            !prev.include_comprehensive_service,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pmQuote.include_comprehensive_service
                          ? "bg-primary-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pmQuote.include_comprehensive_service
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Filter Change Service Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Filter Change Service
                      </h4>
                      <p className="text-sm text-gray-600">
                        Filter replacement and basic maintenance
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setPmQuote((prev) => ({
                          ...prev,
                          include_filter_change_service:
                            !prev.include_filter_change_service,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pmQuote.include_filter_change_service
                          ? "bg-primary-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pmQuote.include_filter_change_service
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Service Periods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pmQuote.include_comprehensive_service && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comprehensive Service Period
                    </label>
                    <input
                      type="text"
                      value={pmQuote.service_period || ""}
                      onChange={(e) =>
                        setPmQuote((prev) => ({
                          ...prev,
                          service_period: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., March (A/C Servicing) & September (Heating Servicing)"
                    />
                  </div>
                )}

                {pmQuote.include_filter_change_service && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Change Period
                    </label>
                    <input
                      type="text"
                      value={pmQuote.filter_visit_period || ""}
                      onChange={(e) =>
                        setPmQuote((prev) => ({
                          ...prev,
                          filter_visit_period: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., June & December"
                    />
                  </div>
                )}
              </div>

              {/* Individual Visit Costs */}
              <div className="space-y-6">
                {pmQuote.include_comprehensive_service &&
                  (pmQuote.comprehensive_visits_count ?? 0) > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-3">
                        Comprehensive Visit Costs
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from(
                          { length: pmQuote.comprehensive_visits_count ?? 0 },
                          (_, index) => (
                            <div key={index}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Visit {index + 1} Cost
                              </label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    pmQuote.comprehensive_visit_costs?.[
                                      index
                                    ] || 0
                                  }
                                  onChange={(e) =>
                                    updateComprehensiveVisitCost(
                                      index,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full pl-10 pr-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {pmQuote.include_filter_change_service &&
                  (pmQuote.filter_visits_count ?? 0) > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3">
                        Filter Change Visit Costs
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from(
                          { length: pmQuote.filter_visits_count ?? 0 },
                          (_, index) => (
                            <div key={index}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Visit {index + 1} Cost
                              </label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    pmQuote.filter_visit_costs?.[index] || 0
                                  }
                                  onChange={(e) =>
                                    updateFilterVisitCost(
                                      index,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full pl-10 pr-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Service Descriptions */}
              <div className="space-y-4">
                {pmQuote.include_comprehensive_service && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comprehensive Visit Description
                    </label>
                    <textarea
                      value={pmQuote.comprehensive_visit_description || ""}
                      onChange={(e) =>
                        setPmQuote((prev) => ({
                          ...prev,
                          comprehensive_visit_description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe what's included in comprehensive visits..."
                    />
                  </div>
                )}

                {pmQuote.include_filter_change_service && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter Visit Description
                    </label>
                    <textarea
                      value={pmQuote.filter_visit_description || ""}
                      onChange={(e) =>
                        setPmQuote((prev) => ({
                          ...prev,
                          filter_visit_description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Describe what's included in filter change visits..."
                    />
                  </div>
                )}
              </div>

              {/* Cost Summary */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Cost Summary</h4>
                <div className="space-y-2 text-sm">
                  {pmQuote.include_comprehensive_service && (
                    <div className="flex justify-between">
                      <span>
                        Comprehensive Visits (
                        {pmQuote.comprehensive_visits_count}):
                      </span>
                      <span className="font-medium">
                        $
                        {(
                          pmQuote.total_comprehensive_cost || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {pmQuote.include_filter_change_service && (
                    <div className="flex justify-between">
                      <span>
                        Filter Change Visits ({pmQuote.filter_visits_count}):
                      </span>
                      <span className="font-medium">
                        ${(pmQuote.total_filter_cost || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total Annual Cost:</span>
                    <span className="text-blue-900">
                      ${(pmQuote.total_cost || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "commercial" && (
            <>
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={pmQuote.client_name || ""}
                    onChange={(e) =>
                      setPmQuote((prev) => ({
                        ...prev,
                        client_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Restore Hyper Wellness"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Address
                  </label>
                  <input
                    type="text"
                    value={pmQuote.property_address || ""}
                    onChange={(e) =>
                      setPmQuote((prev) => ({
                        ...prev,
                        property_address: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., 2250 Marietta Blvd NW Suite 208, Atlanta, GA 30318"
                  />
                </div>
              </div>

              {/* Scope of Work */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope of Work (Auto-generated, but editable)
                </label>
                <textarea
                  value={pmQuote.scope_of_work || ""}
                  onChange={(e) =>
                    setPmQuote((prev) => ({
                      ...prev,
                      scope_of_work: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Scope of work will be automatically generated based on your basic settings..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This field is automatically updated based on your settings,
                  but you can edit it if needed.
                </p>
              </div>

              {/* Service Breakdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Breakdown Description (Auto-generated, but editable)
                </label>
                <textarea
                  value={pmQuote.service_breakdown || ""}
                  onChange={(e) =>
                    setPmQuote((prev) => ({
                      ...prev,
                      service_breakdown: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Service breakdown will be automatically generated based on your basic settings..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This field is automatically updated based on your settings,
                  but you can edit it if needed.
                </p>
              </div>

              {/* Preventative Maintenance Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preventative Maintenance Services
                </label>
                <div className="space-y-2">
                  {pmQuote.preventative_maintenance_services?.map(
                    (service, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={service}
                          onChange={(e) => {
                            const newServices = [
                              ...(pmQuote.preventative_maintenance_services ||
                                []),
                            ];
                            newServices[index] = e.target.value;
                            setPmQuote((prev) => ({
                              ...prev,
                              preventative_maintenance_services: newServices,
                            }));
                          }}
                          className="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Service description"
                        />
                        <button
                          onClick={() => {
                            const newServices =
                              pmQuote.preventative_maintenance_services?.filter(
                                (_, i) => i !== index
                              ) || [];
                            setPmQuote((prev) => ({
                              ...prev,
                              preventative_maintenance_services: newServices,
                            }));
                          }}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  )}
                  <button
                    onClick={() => {
                      const newServices = [
                        ...(pmQuote.preventative_maintenance_services || []),
                        "",
                      ];
                      setPmQuote((prev) => ({
                        ...prev,
                        preventative_maintenance_services: newServices,
                      }));
                    }}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-800"
                  >
                    <Plus size={16} />
                    Add Service
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={pmQuote.notes || ""}
              onChange={(e) =>
                setPmQuote((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add any additional notes or special instructions..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            {isLoading ? "Saving..." : "Save Quote"}
          </button>
          {onSendQuote && (
            <button
              onClick={handleSendQuote}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} />
              Send Quote
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PMQuoteModal;
