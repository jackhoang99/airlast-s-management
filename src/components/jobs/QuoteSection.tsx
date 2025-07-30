import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  X,
  FileInput as FileInvoice,
  Plus,
  AlertTriangle,
  DollarSign,
  Send,
  Printer,
  Eye,
  Mail,
  Check,
  Package,
  Wrench,
  ShoppingCart,
  Home,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  CheckCircle,
  PenTool as Tool,
  Clock,
  FileText,
  CheckSquare,
} from "lucide-react";
import AddJobPricingModal from "./AddJobPricingModal";
import EditJobItemModal from "./EditJobItemModal";
import RepairsForm from "./replacement/RepairsForm";
import SendEmailModal from "./SendEmailModal";
import GenerateQuote from "../GenerateQuote";
import PMQuoteModal from "./PMQuoteModal";

type QuoteSectionProps = {
  jobId: string;
  jobItems: any[];
  onItemsUpdated: () => void;
  onQuoteStatusChange?: () => void;
  refreshTrigger?: number;
};

const QuoteSection = ({
  jobId,
  jobItems,
  onItemsUpdated,
  onQuoteStatusChange,
  refreshTrigger = 0,
}: QuoteSectionProps) => {
  const { supabase } = useSupabase();
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showRepairsForm, setShowRepairsForm] = useState(false);
  const [currentReplacementData, setCurrentReplacementData] = useState<
    any | null
  >(null);
  const [activeTab, setActiveTab] = useState<
    "replacement" | "repair" | "inspection" | "pm"
  >("replacement");
  const [jobDetails, setJobDetails] = useState<any>(null);

  // Hold all replacement data
  const [replacementData, setReplacementData] = useState<any[]>([]);
  const [allReplacementData, setAllReplacementData] = useState<any[]>([]);

  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [showGenerateQuoteModal, setShowGenerateQuoteModal] = useState(false);
  const [showPMQuoteModal, setShowPMQuoteModal] = useState(false);

  // Add a state to track if replacement data exists
  const [hasReplacementData, setHasReplacementData] = useState(false);

  // Add a refresh trigger
  const [refreshTriggerState, setRefreshTriggerState] = useState(0);

  // PM Quote states
  const [pmQuotes, setPmQuotes] = useState<any[]>([]);
  const [selectedPMQuote, setSelectedPMQuote] = useState<any | null>(null);

  // Fetch job details and PM quotes
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!supabase || !jobId) return;

      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(
            `
            *,
            locations (
              name,
              address,
              city,
              state,
              zip
            ),
            job_units:job_units!inner (
              unit_id,
              units:unit_id (
                id,
                unit_number
              )
            )
          `
          )
          .eq("id", jobId)
          .single();

        if (error) throw error;
        // Flatten units from job_units
        const units = (data.job_units || []).map((ju: any) => ju.units);
        setJobDetails({ ...data, units });
      } catch (err) {
        console.error("Error fetching job details:", err);
      }
    };

    fetchJobDetails();
  }, [supabase, jobId, refreshTrigger]);

  // Combined total across all inspections
  const [totalReplacementCost, setTotalReplacementCost] = useState<number>(0);

  const groupedItems = jobItems.reduce((groups, item) => {
    const type = item.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
    return groups;
  }, {} as Record<string, any[]>);

  // Fetch replacement data
  useEffect(() => {
    const fetchReplacementData = async () => {
      if (!supabase || !jobId) return;

      try {
        const { data: replacementData, error: replacementError } =
          await supabase
            .from("job_replacements")
            .select("*")
            .eq("job_id", jobId);

        if (replacementError) {
          console.error("Error fetching replacement data:", replacementError);
          throw replacementError;
        }

        if (replacementData && replacementData.length > 0) {
          // Process all replacement data
          const processedReplacements: any[] = [];
          // Calculate the total cost from all replacements
          const totalReplacementCostSum = replacementData.reduce(
            (sum, item) => {
              return sum + Number(item.total_cost || 0);
            },
            0
          );

          replacementData.forEach((item: any, index: number) => {
            processedReplacements.push({
              id: item.id,
              needsCrane: item.needs_crane,
              requiresPermit: item.requires_permit,
              requiresBigLadder: item.requires_big_ladder,
              phase2: item.phase2,
              labor: item.labor,
              refrigerationRecovery: item.refrigeration_recovery,
              startUpCosts: item.start_up_costs,
              accessories: item.accessories,
              thermostatStartup: item.thermostat_startup,
              removalCost: item.removal_cost,
              warranty: item.warranty,
              additionalItems: item.additional_items,
              permitCost: item.permit_cost,
              selectedPhase: item.selected_phase,
              totalCost: item.total_cost,
              created_at: item.created_at,
            });
          });

          setReplacementData(processedReplacements);
          setAllReplacementData(replacementData);
          setTotalReplacementCost(totalReplacementCostSum);
          setHasReplacementData(true);
        } else {
          setHasReplacementData(false);
        }
      } catch (err) {
        console.error("Error fetching replacement data:", err);
      }
    };

    fetchReplacementData();
  }, [supabase, jobId, refreshTrigger]);

  // Calculate total cost from job items
  const getJobTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // Calculate total replacement cost from all replacement options
  const calculateTotalReplacementCost = () => {
    if (!replacementData || replacementData.length === 0) return 0;

    return replacementData.reduce((sum, data) => {
      return sum + Number(data.totalCost || 0);
    }, 0);
  };

  // When a new pricing row is added
  const handleAddPricing = async () => {
    onItemsUpdated();
    if (onQuoteStatusChange) onQuoteStatusChange();
  };

  // Delete a single job item
  const handleDeleteItem = async (itemId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("job_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;

      onItemsUpdated();
      if (onQuoteStatusChange) onQuoteStatusChange();
    } catch (err) {
      console.error("Error deleting job item:", err);
    }
  };

  // Open edit modal for a jobItem
  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setShowEditItemModal(true);
  };

  // Callback after editing completes
  const handleItemUpdated = async (wasUpdated: boolean) => {
    if (wasUpdated) {
      onItemsUpdated();
      if (onQuoteStatusChange) onQuoteStatusChange();
    }
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch PM quotes
  useEffect(() => {
    const fetchPMQuotes = async () => {
      if (!supabase || !jobId) return;

      try {
        const { data, error } = await supabase
          .from("pm_quotes")
          .select("*")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        // Ensure checklist_types is always an array, even if it comes back as null
        const processedData = (data || []).map((quote) => ({
          ...quote,
          checklist_types: quote.checklist_types || [],
        }));
        setPmQuotes(processedData);
      } catch (err) {
        console.error("Error fetching PM quotes:", err);
      }
    };

    fetchPMQuotes();
  }, [supabase, jobId, refreshTrigger]);

  // Handle PM quote save
  const handlePMSave = async (pmQuoteData: any) => {
    if (!supabase) return;

    try {
      let result;
      if (pmQuoteData.id) {
        // Update existing quote
        const { data, error } = await supabase
          .from("pm_quotes")
          .update({
            checklist_types: pmQuoteData.checklist_types,
            number_of_visits: pmQuoteData.number_of_visits,
            cost_per_visit: pmQuoteData.cost_per_visit,
            total_cost: pmQuoteData.total_cost,
            notes: pmQuoteData.notes,
            comprehensive_visit_cost: pmQuoteData.comprehensive_visit_cost,
            filter_visit_cost: pmQuoteData.filter_visit_cost,
            comprehensive_visit_description:
              pmQuoteData.comprehensive_visit_description,
            filter_visit_description: pmQuoteData.filter_visit_description,
            unit_count: pmQuoteData.unit_count,
            service_period: pmQuoteData.service_period,
            filter_visit_period: pmQuoteData.filter_visit_period,
            comprehensive_visits_count: pmQuoteData.comprehensive_visits_count,
            filter_visits_count: pmQuoteData.filter_visits_count,
            total_comprehensive_cost: pmQuoteData.total_comprehensive_cost,
            total_filter_cost: pmQuoteData.total_filter_cost,
            client_name: pmQuoteData.client_name,
            property_address: pmQuoteData.property_address,
            scope_of_work: pmQuoteData.scope_of_work,
            service_breakdown: pmQuoteData.service_breakdown,
            preventative_maintenance_services:
              pmQuoteData.preventative_maintenance_services,
            include_comprehensive_service:
              pmQuoteData.include_comprehensive_service,
            include_filter_change_service:
              pmQuoteData.include_filter_change_service,
          })
          .eq("id", pmQuoteData.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new quote
        const { data, error } = await supabase
          .from("pm_quotes")
          .insert({
            job_id: jobId,
            checklist_types: pmQuoteData.checklist_types,
            number_of_visits: pmQuoteData.number_of_visits,
            cost_per_visit: pmQuoteData.cost_per_visit,
            total_cost: pmQuoteData.total_cost,
            notes: pmQuoteData.notes,
            comprehensive_visit_cost: pmQuoteData.comprehensive_visit_cost,
            filter_visit_cost: pmQuoteData.filter_visit_cost,
            comprehensive_visit_description:
              pmQuoteData.comprehensive_visit_description,
            filter_visit_description: pmQuoteData.filter_visit_description,
            unit_count: pmQuoteData.unit_count,
            service_period: pmQuoteData.service_period,
            filter_visit_period: pmQuoteData.filter_visit_period,
            comprehensive_visits_count: pmQuoteData.comprehensive_visits_count,
            filter_visits_count: pmQuoteData.filter_visits_count,
            total_comprehensive_cost: pmQuoteData.total_comprehensive_cost,
            total_filter_cost: pmQuoteData.total_filter_cost,
            client_name: pmQuoteData.client_name,
            property_address: pmQuoteData.property_address,
            scope_of_work: pmQuoteData.scope_of_work,
            service_breakdown: pmQuoteData.service_breakdown,
            preventative_maintenance_services:
              pmQuoteData.preventative_maintenance_services,
            include_comprehensive_service:
              pmQuoteData.include_comprehensive_service,
            include_filter_change_service:
              pmQuoteData.include_filter_change_service,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Refresh PM quotes
      const { data: updatedQuotes, error: fetchError } = await supabase
        .from("pm_quotes")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setPmQuotes(updatedQuotes || []);

      if (onQuoteStatusChange) onQuoteStatusChange();
    } catch (err) {
      console.error("Error saving PM quote:", err);
      throw err;
    }
  };

  // Handle PM quote delete
  const handlePMDelete = async (quoteId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("pm_quotes")
        .delete()
        .eq("id", quoteId);

      if (error) throw error;

      // Refresh PM quotes
      const { data: updatedQuotes, error: fetchError } = await supabase
        .from("pm_quotes")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setPmQuotes(updatedQuotes || []);

      if (onQuoteStatusChange) onQuoteStatusChange();
    } catch (err) {
      console.error("Error deleting PM quote:", err);
    }
  };

  // Handle PM quote edit
  const handlePMEdit = (quote: any) => {
    setSelectedPMQuote(quote);
    setShowPMQuoteModal(true);
  };

  return (
    <div>
      {showEditItemModal && selectedItem && (
        <EditJobItemModal
          isOpen={showEditItemModal}
          onClose={() => setShowEditItemModal(false)}
          onSave={handleItemUpdated}
          item={selectedItem}
        />
      )}

      {/* Replacement/Repair Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row border-b border-gray-200 gap-2 sm:gap-0 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab("replacement");
          }}
          className={`w-full sm:w-auto px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "replacement"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center">
            <Home size={16} className="mr-2" />
            Replacement Quote
          </div>
        </button>
        <button
          onClick={() => setActiveTab("repair")}
          className={`w-full sm:w-auto px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "repair"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center">
            <Package size={16} className="mr-2" />
            Repair Quote
          </div>
        </button>
        <button
          onClick={() => setActiveTab("pm")}
          className={`w-full sm:w-auto px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === "pm"
              ? "text-gray-900 border-b-2 border-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <div className="flex items-center">
            <CheckSquare size={16} className="mr-2" />
            PM Quote
          </div>
        </button>
      </div>

      {/* Replacement Section */}
      {activeTab === "replacement" && (
        <>
          {replacementData.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:justify-end items-start sm:items-center mb-6 gap-2 sm:gap-0">
              <button
                onClick={() => {
                  setCurrentReplacementData(null);
                  setShowRepairsForm(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} className="mr-1" />
                Add Replacement
              </button>
              <button
                onClick={() => setShowGenerateQuoteModal(true)}
                className="btn btn-secondary btn-sm"
              >
                <FileText size={14} className="mr-1" />
                Generate Quote
              </button>
            </div>
          ) : null}

          {replacementData.map((data, index) => {
            const selectedPhase = data.selectedPhase || "phase2";
            const optionType =
              selectedPhase === "phase1"
                ? "Economy"
                : selectedPhase === "phase2"
                ? "Standard"
                : "Premium";
            return (
              <div
                key={data.id || index}
                className="border rounded-lg overflow-hidden mb-4 p-2 sm:p-4 flex flex-col gap-2"
              >
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 border-b border-green-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium flex items-center">
                        <Home size={14} className="mr-1 text-blue-500" />
                        Replacement Option {index + 1}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${Number(data.totalCost || 0).toLocaleString()}
                      </div>

                      {(data.needsCrane ||
                        data.requiresPermit ||
                        data.requiresBigLadder) && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {[
                            data.needsCrane && "Crane Required",
                            data.requiresPermit && "Permit Required",
                            data.requiresBigLadder && "Big Ladder Required",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date display */}
                {data.created_at && (
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="text-xs text-gray-500">
                      Created:{" "}
                      {new Date(data.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                )}

                <div>
                  {data.phase2 && data.phase2.cost > 0 && (
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                      <span>Crane Option:</span>
                      <span className="font-semibold">
                        ${Number(data.phase2.cost).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {data.labor > 0 && (
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                      <span>Labor:</span>
                      <span className="font-semibold">
                        ${Number(data.labor).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.refrigerationRecovery > 0 && (
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                      <span>Refrigeration Recovery:</span>
                      <span className="font-semibold">
                        ${Number(data.refrigerationRecovery).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.startUpCosts > 0 && (
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                      <span>Start Up Costs:</span>
                      <span className="font-semibold">
                        ${Number(data.startUpCosts).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.thermostatStartup > 0 && (
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                      <span>Thermostat Startup:</span>
                      <span className="font-semibold">
                        ${Number(data.thermostatStartup).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.removalCost > 0 && (
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                      <span>Removal Cost:</span>
                      <span className="font-semibold">
                        ${Number(data.removalCost).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {data.permitCost > 0 && (
                    <div className="flex justify-between items-center p-3 border-b border-gray-100">
                      <span>Permit Cost:</span>
                      <span className="font-semibold">
                        ${Number(data.permitCost).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Accessories */}
                  {data.accessories &&
                    data.accessories.length > 0 &&
                    data.accessories.some(
                      (acc: any) => acc.name && acc.cost > 0
                    ) && (
                      <div className="p-3 border-b border-gray-100">
                        <h4 className="font-medium mb-2">Accessories:</h4>
                        {data.accessories.map((acc: any, i: number) =>
                          acc.name && acc.cost > 0 ? (
                            <div
                              key={i}
                              className="flex justify-between items-center"
                            >
                              <span>{acc.name}</span>
                              <span className="font-semibold">
                                ${Number(acc.cost).toLocaleString()}
                              </span>
                            </div>
                          ) : null
                        )}
                      </div>
                    )}

                  {/* Additional Items */}
                  {data.additionalItems &&
                    data.additionalItems.length > 0 &&
                    data.additionalItems.some(
                      (item: any) => item.name && item.cost > 0
                    ) && (
                      <div className="p-3 border-b border-gray-100">
                        <h4 className="font-medium mb-2">Additional Items:</h4>
                        {data.additionalItems.map((item: any, i: number) =>
                          item.name && item.cost > 0 ? (
                            <div
                              key={i}
                              className="flex justify-between items-center"
                            >
                              <span>{item.name}</span>
                              <span className="font-semibold">
                                ${Number(item.cost).toLocaleString()}
                              </span>
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 p-3 bg-gray-50">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        // Use the database ID to edit the correct replacement
                        const replacementToEdit = allReplacementData.find(
                          (r) => r.id === data.id
                        );
                        setCurrentReplacementData(replacementToEdit);
                        setShowRepairsForm(true);
                      }}
                      className="p-1 text-primary-600 hover:text-primary-800"
                      aria-label="Edit replacement"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!supabase) return;
                        if (
                          window.confirm(
                            "Are you sure you want to delete this replacement?"
                          )
                        ) {
                          setDeleteError(null);
                          try {
                            const { error } = await supabase
                              .from("job_replacements")
                              .delete()
                              .eq("id", data.id);
                            if (error) throw error;

                            // Refresh replacement data and update all related states
                            const {
                              data: replacementData,
                              error: replacementError,
                            } = await supabase
                              .from("job_replacements")
                              .select("*")
                              .eq("job_id", jobId);

                            if (!replacementError) {
                              console.log(
                                "Replacement data after delete:",
                                replacementData
                              );
                              // Process the updated replacement data
                              if (
                                replacementData &&
                                replacementData.length > 0
                              ) {
                                const processedReplacements: any[] = [];
                                const totalReplacementCostSum =
                                  replacementData.reduce((sum, item) => {
                                    return sum + Number(item.total_cost || 0);
                                  }, 0);

                                replacementData.forEach(
                                  (item: any, index: number) => {
                                    console.log(
                                      "Processing replacement item:",
                                      item
                                    );
                                    processedReplacements.push({
                                      id: item.id,
                                      needsCrane: item.needs_crane,
                                      requiresPermit: item.requires_permit,
                                      requiresBigLadder:
                                        item.requires_big_ladder,
                                      phase2: item.phase2,
                                      labor: item.labor,
                                      refrigerationRecovery:
                                        item.refrigeration_recovery,
                                      startUpCosts: item.start_up_costs,
                                      accessories: item.accessories,
                                      thermostatStartup:
                                        item.thermostat_startup,
                                      removalCost: item.removal_cost,
                                      warranty: item.warranty,
                                      additionalItems: item.additional_items,
                                      permitCost: item.permit_cost,
                                      selectedPhase: item.selected_phase,
                                      totalCost: item.total_cost,
                                      created_at: item.created_at,
                                    });
                                  }
                                );

                                setReplacementData(processedReplacements);
                                setAllReplacementData(replacementData);
                                setTotalReplacementCost(
                                  totalReplacementCostSum
                                );
                                setHasReplacementData(true);
                              } else {
                                // No replacement data left
                                setReplacementData([]);
                                setAllReplacementData([]);
                                setTotalReplacementCost(0);
                                setHasReplacementData(false);
                              }
                            }

                            // Notify parent components of the update
                            onItemsUpdated();
                            if (onQuoteStatusChange) onQuoteStatusChange();

                            // Trigger a refresh to ensure all data is properly updated
                            setRefreshTriggerState((prev) => prev + 1);
                          } catch (err) {
                            setDeleteError("Failed to delete replacement");
                          }
                        }
                      }}
                      className="p-1 text-error-600 hover:text-error-800"
                      aria-label="Delete replacement"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {deleteError && (
                  <div className="bg-error-50 text-error-700 p-2 rounded mb-2">
                    {deleteError}
                  </div>
                )}
              </div>
            );
          })}

          {replacementData.length > 0 && (
            <div className="border rounded-lg overflow-hidden mt-4 shadow-sm">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100">
                <h3 className="font-medium text-blue-800 text-lg flex items-center gap-2">
                  <Home size={16} className="text-blue-600" />
                  Total Replacement Cost
                </h3>
                <span className="font-bold text-base">
                  ${totalReplacementCost.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Removed Send Replacement Quote button */}

          {!hasReplacementData && (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-3">No items added yet</p>
              <button
                onClick={() => {
                  setCurrentReplacementData(null);
                  setShowRepairsForm(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} className="mr-1" />
                Add First Replacement
              </button>
            </div>
          )}
        </>
      )}

      {/* Repair Items Tab */}
      {activeTab === "repair" &&
        (jobItems.length > 0 ? (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-end items-start sm:items-center mb-6 gap-2 sm:gap-0">
              <button
                onClick={() => setShowAddPricingModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} className="mr-1" />
                Add Repair
              </button>
              <button
                onClick={() => setShowGenerateQuoteModal(true)}
                className="btn btn-secondary btn-sm"
              >
                <FileText size={14} className="mr-1" />
                Generate Quote
              </button>
            </div>

            {/* Parts Section */}
            {groupedItems["part"] && groupedItems["part"].length > 0 && (
              <div className="border rounded-lg overflow-hidden mb-4">
                <div className="bg-blue-50 p-2 border-b border-blue-100">
                  <h4 className="text-sm font-medium flex items-center">
                    <Package size={14} className="mr-1 text-blue-500" />
                    Parts
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedItems["part"].map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Qty: {item.quantity}
                          </div>
                          <div className="font-medium">
                            ${Number(item.total_cost).toFixed(2)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-error-600 hover:text-error-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labor Section */}
            {groupedItems["labor"] && groupedItems["labor"].length > 0 && (
              <div className="border rounded-lg overflow-hidden mb-4">
                <div className="bg-green-50 p-2 border-b border-green-100">
                  <h4 className="text-sm font-medium flex items-center">
                    <Wrench size={14} className="mr-1 text-green-500" />
                    Labor
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedItems["labor"].map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Qty: {item.quantity}
                          </div>
                          <div className="font-medium">
                            ${Number(item.total_cost).toFixed(2)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-error-600 hover:text-error-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Items Section */}
            {groupedItems["item"] && groupedItems["item"].length > 0 && (
              <div className="border rounded-lg overflow-hidden mb-4">
                <div className="bg-purple-50 p-2 border-b border-purple-100">
                  <h4 className="text-sm font-medium flex items-center">
                    <ShoppingCart size={14} className="mr-1 text-purple-500" />
                    Other Items
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedItems["item"].map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            Qty: {item.quantity}
                          </div>
                          <div className="font-medium">
                            ${Number(item.total_cost).toFixed(2)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-error-600 hover:text-error-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-blue-800 text-lg flex items-center">
                  <Package size={16} className="mr-2 text-blue-600" />
                  Total Repair Cost
                </h3>
                <span className="font-bold text-lg">
                  ${getJobTotalCost().toFixed(2)}
                </span>
              </div>
            </div>

            {/* Removed Send Repair Quote button */}
          </>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-3">No items added yet</p>
            <button
              onClick={() => setShowAddPricingModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} className="mr-1" />
              Add First Repair
            </button>
          </div>
        ))}

      {/* PM Quote Section */}
      {activeTab === "pm" && (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-end items-start sm:items-center mb-6 gap-2 sm:gap-0">
            <button
              onClick={() => {
                setSelectedPMQuote(null);
                setShowPMQuoteModal(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} className="mr-1" />
              Add PM Quote
            </button>
          </div>

          {pmQuotes.length > 0 ? (
            <div className="space-y-4">
              {pmQuotes.map((quote, index) => (
                <div
                  key={quote.id}
                  className="border rounded-lg overflow-hidden p-4 flex flex-col gap-3"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium flex items-center">
                          <CheckSquare
                            size={14}
                            className="mr-1 text-blue-500"
                          />
                          PM Quote {index + 1}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Created:{" "}
                          {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          ${Number(quote.total_cost).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          {quote.comprehensive_visits_count || 0} comprehensive
                          + {quote.filter_visits_count || 0} filter visits
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Service Schedule */}
                    {(quote.service_period || quote.filter_visit_period) && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Service Schedule:
                        </h5>
                        <div className="space-y-2 text-sm">
                          {quote.service_period && (
                            <div className="bg-green-50 p-2 rounded">
                              <div className="font-medium text-green-800">
                                Comprehensive Service: {quote.service_period}
                              </div>
                              {quote.comprehensive_visit_description && (
                                <div className="text-green-700 text-xs mt-1">
                                  {quote.comprehensive_visit_description}
                                </div>
                              )}
                            </div>
                          )}
                          {quote.filter_visit_period && (
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="font-medium text-blue-800">
                                Filter Change: {quote.filter_visit_period}
                              </div>
                              {quote.filter_visit_description && (
                                <div className="text-blue-700 text-xs mt-1">
                                  {quote.filter_visit_description}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cost Breakdown */}
                    {(quote.comprehensive_visit_cost ||
                      quote.filter_visit_cost) && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Cost Breakdown:
                        </h5>
                        <div className="space-y-1 text-sm">
                          {quote.comprehensive_visit_cost && (
                            <div className="flex justify-between">
                              <span>
                                Comprehensive Visits (
                                {quote.comprehensive_visits_count || 0}):
                              </span>
                              <span className="font-medium">
                                $
                                {(
                                  quote.comprehensive_visit_cost *
                                  (quote.comprehensive_visits_count || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {quote.filter_visit_cost && (
                            <div className="flex justify-between">
                              <span>
                                Filter Change Visits (
                                {quote.filter_visits_count || 0}):
                              </span>
                              <span className="font-medium">
                                $
                                {(
                                  quote.filter_visit_cost *
                                  (quote.filter_visits_count || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="border-t pt-1 flex justify-between font-medium">
                            <span>Total Annual:</span>
                            <span className="text-primary-600">
                              $
                              {(
                                (quote.comprehensive_visit_cost || 0) *
                                  (quote.comprehensive_visits_count || 0) +
                                (quote.filter_visit_cost || 0) *
                                  (quote.filter_visits_count || 0)
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Checklist Types */}
                    {quote.checklist_types &&
                      quote.checklist_types.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Selected Checklists:
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {quote.checklist_types.map((type: string) => {
                              const checklistNames: { [key: string]: string } =
                                {
                                  pm_filter_change: "PM Filter Change",
                                  pm_cleaning_ac: "PM Cleaning AC",
                                  pm_cleaning_heat: "PM Cleaning HEAT",
                                };
                              return (
                                <span
                                  key={type}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                                >
                                  {checklistNames[type] || type}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Notes */}
                    {quote.notes && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">
                          Notes:
                        </h5>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {quote.notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          import("./PMQuotePDFGenerator")
                            .then(({ default: PMQuotePDFGenerator }) => {
                              const doc = PMQuotePDFGenerator(quote);
                              const fileName = `PM_HVAC_Quote_${
                                new Date().toISOString().split("T")[0]
                              }.pdf`;
                              doc.save(fileName);
                            })
                            .catch((error) => {
                              console.error("Error generating PDF:", error);
                            });
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Generate PDF"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => handlePMEdit(quote)}
                        className="p-1 text-primary-600 hover:text-primary-800"
                        title="Edit PM Quote"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this PM quote?"
                            )
                          ) {
                            handlePMDelete(quote.id);
                          }
                        }}
                        className="p-1 text-error-600 hover:text-error-800"
                        title="Delete PM Quote"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-3">No PM quotes created yet</p>
              <button
                onClick={() => {
                  setSelectedPMQuote(null);
                  setShowPMQuoteModal(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} className="mr-1" />
                Create First PM Quote
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Pricing Modal */}
      <AddJobPricingModal
        isOpen={showAddPricingModal}
        onClose={() => setShowAddPricingModal(false)}
        onPriceAdded={handleAddPricing}
        jobId={jobId}
      />

      {/* Edit Item Modal */}
      <EditJobItemModal
        isOpen={showEditItemModal}
        onClose={() => setShowEditItemModal(false)}
        onSave={handleItemUpdated}
        item={selectedItem}
      />

      {/* Repairs/Replacement Form Modal */}
      {showRepairsForm && (
        <RepairsForm
          jobId={jobId}
          initialData={currentReplacementData}
          onSave={() => {
            setShowRepairsForm(false);
            setCurrentReplacementData(null);
            setRefreshTriggerState((prev) => prev + 1); // Trigger a refresh
            onItemsUpdated();
            if (onQuoteStatusChange) onQuoteStatusChange();
          }}
          onClose={() => {
            console.log("Closing RepairsForm");
            setShowRepairsForm(false);
            setCurrentReplacementData(null);
          }}
        />
      )}

      {/* Send Quote Modal (for all inspections & combined replacement data) */}
      {showSendQuoteModal && jobDetails && (
        <SendEmailModal
          isOpen={showSendQuoteModal}
          onClose={() => setShowSendQuoteModal(false)}
          jobId={jobId}
          jobNumber={jobDetails.number}
          jobName={jobDetails.name}
          customerName={jobDetails.contact_name}
          initialEmail={jobDetails.contact_email || ""}
          allReplacementData={allReplacementData}
          totalCost={
            activeTab === "replacement"
              ? totalReplacementCost
              : getJobTotalCost()
          }
          location={
            jobDetails.locations
              ? {
                  name: jobDetails.locations.name,
                  address: jobDetails.locations.address,
                  city: jobDetails.locations.city,
                  state: jobDetails.locations.state,
                  zip: jobDetails.locations.zip,
                }
              : null
          }
          unit={
            jobDetails.units
              ? jobDetails.units.map((u: any) => ({
                  unit_number: u.unit_number,
                }))
              : null
          }
          quoteType={activeTab === "pm" ? undefined : activeTab}
          onEmailSent={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Generate Quote Modal */}
      {showGenerateQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Generate Quote
              </h2>
              <button
                onClick={() => setShowGenerateQuoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <GenerateQuote
                jobId={jobId}
                jobItems={jobItems}
                onQuoteSent={() => {
                  setShowGenerateQuoteModal(false);
                  // Refresh data
                  onItemsUpdated();
                  if (onQuoteStatusChange) onQuoteStatusChange();
                }}
                onPreviewQuote={(quoteType) => {
                  // Handle preview - could open PDF or navigate
                  // Preview functionality handled by parent component
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PM Quote Modal */}
      {showPMQuoteModal && (
        <PMQuoteModal
          isOpen={showPMQuoteModal}
          onClose={() => {
            setShowPMQuoteModal(false);
            setSelectedPMQuote(null);
          }}
          jobId={jobId}
          onSave={handlePMSave}
          existingQuote={selectedPMQuote}
          jobDetails={jobDetails}
        />
      )}
    </div>
  );
};

export default QuoteSection;
