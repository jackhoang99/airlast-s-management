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
} from "lucide-react";
import AddJobPricingModal from "./AddJobPricingModal";
import EditJobItemModal from "./EditJobItemModal";
import RepairsForm from "./replacement/RepairsForm";
import SendEmailModal from "./SendEmailModal";

type JobServiceSectionProps = {
  jobId: string;
  jobItems: any[];
  onItemsUpdated: () => void;
  onQuoteStatusChange?: () => void;
};

const ServiceSection = ({
  jobId,
  jobItems,
  onItemsUpdated,
  onQuoteStatusChange,
}: JobServiceSectionProps) => {
  const { supabase } = useSupabase();
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showRepairsForm, setShowRepairsForm] = useState(false);
  const [currentReplacementData, setCurrentReplacementData] = useState<
    any | null
  >(null);
  const [activeTab, setActiveTab] = useState<"replacement" | "repair">(
    "replacement"
  );
  const [jobDetails, setJobDetails] = useState<any>(null);

  // Hold all replacement data
  const [replacementData, setReplacementData] = useState<any[]>([]);
  const [allReplacementData, setAllReplacementData] = useState<any[]>([]);

  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);

  // Add a state to track if replacement data exists
  const [hasReplacementData, setHasReplacementData] = useState(false);

  // Add a refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch job details
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
            units (
              unit_number
            )
          `
          )
          .eq("id", jobId)
          .single();

        if (error) throw error;
        setJobDetails(data);
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
                      <p className="text-sm text-gray-600">
                        {optionType} Option
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${Number(data.totalCost || 0).toLocaleString()}
                      </div>

                      {data.needsCrane && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Crane Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
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
                      onClick={() => {
                        /* TODO: implement delete logic for replacement */
                      }}
                      className="p-1 text-error-600 hover:text-error-800"
                      aria-label="Delete replacement"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
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

          {replacementData.length > 0 && (
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSendQuoteModal(true)}
                className="btn btn-primary"
                disabled={calculateTotalReplacementCost() === 0}
              >
                <Send size={16} className="mr-2" />
                Send Replacement Quote
              </button>
            </div>
          )}

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

            {/* Send Quote Button */}
            {groupedItems["part"] && groupedItems["part"].length > 0 && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowSendQuoteModal(true)}
                  className="btn btn-primary"
                >
                  <Send size={16} className="mr-2" />
                  Send Repair Quote
                </button>
              </div>
            )}
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
            setRefreshTrigger((prev) => prev + 1); // Trigger a refresh
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
              ? {
                  unit_number: jobDetails.units.unit_number,
                }
              : null
          }
          quoteType={activeTab}
          onEmailSent={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default ServiceSection;
