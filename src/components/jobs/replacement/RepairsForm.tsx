import { useState, useEffect } from "react";
import {
  Edit,
  Save,
  Plus,
  Trash2,
  Calculator,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSupabase } from "../../../lib/supabase-context";

type PhaseOption = {
  description: string;
  cost: string | number;
};

type AccessoryItem = {
  name: string;
  cost: string | number;
};

type ReplacementData = {
  needsCrane: boolean;
  requiresPermit: boolean;
  requiresBigLadder: boolean;
  replacementOption: PhaseOption;
  labor: string | number;
  refrigerationRecovery: string | number;
  startUpCosts: string | number;
  accessories: AccessoryItem[];
  thermostatStartup: string | number;
  removalCost: string | number;
  warranty: string;
  additionalItems: AccessoryItem[];
  permitCost: string | number;
  totalCost?: number;
};

type InspectionData = {
  id: string;
  job_id: string;
  model_number: string | null;
  serial_number: string | null;
  age: number | null;
  tonnage: string | null;
  unit_type: "Gas" | "Electric" | null;
  system_type: string | null;
  created_at: string;
  updated_at: string;
  completed: boolean;
};

type RepairFormProps = {
  jobId: string;
  initialData?: any; // Database row from job_replacements table
  onSave?: (data: ReplacementData) => void;
  onClose?: () => void;
};

const RepairsForm = ({
  jobId,
  initialData,
  onSave,
  onClose,
}: RepairFormProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize replacement data with proper handling of database structure
  const initializeReplacementData = (dbData?: any): ReplacementData => {
    // Always initialize with empty values for new replacements
    if (!dbData || !initialData) {
      return {
        needsCrane: false,
        requiresPermit: false,
        requiresBigLadder: false,
        replacementOption: { description: "", cost: "" },
        labor: "",
        refrigerationRecovery: "",
        startUpCosts: "",
        accessories: [{ name: "", cost: "" }],
        thermostatStartup: "",
        removalCost: "",
        warranty: "",
        additionalItems: [{ name: "", cost: "" }],
        permitCost: "",
      };
    }

    // Extract the selected phase data
    const selectedPhase = dbData.selected_phase || "phase2";
    const phaseData = dbData[selectedPhase] || {
      description: "Replacement Option",
      cost: 0,
    };

    return {
      needsCrane: dbData.needs_crane || false,
      requiresPermit: dbData.requires_permit || false,
      requiresBigLadder: dbData.requires_big_ladder || false,
      replacementOption: {
        description: phaseData.description || "Replacement Option",
        cost: phaseData.cost || "",
      },
      labor: dbData.labor || "",
      refrigerationRecovery: dbData.refrigeration_recovery || "",
      startUpCosts: dbData.start_up_costs || "",
      accessories: dbData.accessories || [{ name: "", cost: "" }],
      thermostatStartup: dbData.thermostat_startup || "",
      removalCost: dbData.removal_cost || "",
      warranty: dbData.warranty || "",
      additionalItems: dbData.additional_items || [{ name: "", cost: "" }],
      permitCost: dbData.permit_cost || "",
      totalCost: dbData.total_cost,
    };
  };

  const [replacementData, setReplacementData] = useState<ReplacementData>(
    initializeReplacementData(initialData)
  );
  const [totalCost, setTotalCost] = useState(0);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "options" | "accessories" | "additional"
  >("options");
  const [expandedSection, setExpandedSection] = useState<
    "options" | "accessories" | "additional" | null
  >("options");

  // Fetch existing replacement + inspection + job details
  useEffect(() => {
    const fetchReplacementData = async () => {
      if (!supabase || !jobId) return;
      try {
        // Fetch job details (with location + unit)
        const { data: jobData, error: jobError } = await supabase
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

        if (jobError) throw jobError;
        setJobDetails(jobData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      }
    };

    fetchReplacementData();
  }, [supabase, jobId, initialData]);

  // Calculate total cost whenever replacement fields or selectedPhase change
  useEffect(() => {
    const calculateTotalCost = () => {
      // Calculate direct costs
      const phaseCost = Number(replacementData.replacementOption.cost) || 0;
      const laborCost = Number(replacementData.labor) || 0;
      const refrigerationCost =
        Number(replacementData.refrigerationRecovery) || 0;
      const startUpCost = Number(replacementData.startUpCosts) || 0;
      const thermostatCost = Number(replacementData.thermostatStartup) || 0;
      const removalCost = Number(replacementData.removalCost) || 0;
      const permitCost = Number(replacementData.permitCost) || 0;

      const baseCosts =
        phaseCost +
        laborCost +
        refrigerationCost +
        startUpCost +
        thermostatCost +
        removalCost +
        permitCost;

      const accessoriesCost = replacementData.accessories.reduce(
        (sum, item) => sum + (Number(item.cost) || 0),
        0
      );

      const additionalItemsCost = replacementData.additionalItems.reduce(
        (sum, item) => sum + (Number(item.cost) || 0),
        0
      );

      const totalDirectCosts =
        baseCosts + accessoriesCost + additionalItemsCost;
      const totalWithMargin =
        totalDirectCosts > 0 ? Math.round(totalDirectCosts / 0.6) : 0; // Apply 40% gross margin
      return totalWithMargin;
    };

    setTotalCost(calculateTotalCost());
  }, [replacementData]);

  const handleAddAccessory = () => {
    setReplacementData((prev) => ({
      ...prev,
      accessories: [...prev.accessories, { name: "", cost: "" }],
    }));
  };

  const handleRemoveAccessory = (index: number) => {
    setReplacementData((prev) => ({
      ...prev,
      accessories: prev.accessories.filter((_, i) => i !== index),
    }));
  };

  const handleAddAdditionalItem = () => {
    setReplacementData((prev) => ({
      ...prev,
      additionalItems: [...prev.additionalItems, { name: "", cost: "" }],
    }));
  };

  const handleRemoveAdditionalItem = (index: number) => {
    setReplacementData((prev) => ({
      ...prev,
      additionalItems: prev.additionalItems.filter((_, i) => i !== index),
    }));
  };

  const toggleSection = (section: "options" | "accessories" | "additional") => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !jobId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    console.log("Submitting replacement data", replacementData);

    try {
      // Create a structure that matches the database schema
      const dataToSave = {
        job_id: jobId,
        needs_crane: replacementData.needsCrane,
        requires_permit: replacementData.requiresPermit,
        requires_big_ladder: replacementData.requiresBigLadder,
        // Map the single replacementOption to phase2 (standard) for database compatibility
        phase2: {
          description:
            replacementData.replacementOption.description ||
            "Replacement Option",
          cost: Number(replacementData.replacementOption.cost) || 0,
        },
        selected_phase: "phase2", // Always use phase2 since we only have one option now
        labor: Number(replacementData.labor) || 0,
        refrigeration_recovery:
          Number(replacementData.refrigerationRecovery) || 0,
        start_up_costs: Number(replacementData.startUpCosts) || 0,
        accessories: replacementData.accessories.map((item) => ({
          name: item.name,
          cost: Number(item.cost) || 0,
        })),
        thermostat_startup: Number(replacementData.thermostatStartup) || 0,
        removal_cost: Number(replacementData.removalCost) || 0,
        warranty: replacementData.warranty,
        additional_items: replacementData.additionalItems.map((item) => ({
          name: item.name,
          cost: Number(item.cost) || 0,
        })),
        permit_cost: Number(replacementData.permitCost) || 0,
        total_cost: totalCost, // Save the total cost with 40% margin
        updated_at: new Date().toISOString(),
      };

      let savedData;

      if (initialData && initialData.id) {
        console.log("Updating existing replacement data", initialData.id);
        // Update
        const { data, error: updateError } = await supabase
          .from("job_replacements")
          .update(dataToSave)
          .eq("id", initialData.id)
          .select()
          .single();

        if (updateError) throw updateError;
        savedData = data;
      } else {
        console.log("Creating new replacement data for job:", jobId);
        // Insert
        const { data, error: insertError } = await supabase
          .from("job_replacements")
          .insert(dataToSave)
          .select()
          .single();

        if (insertError) throw insertError;
        savedData = data;
      }

      console.log("Saved data:", savedData);
      setSuccess("Replacement data saved successfully");
      setIsFormVisible(false);

      // Create a properly formatted data object to pass to the parent component
      const formattedData: ReplacementData = {
        needsCrane: replacementData.needsCrane,
        requiresPermit: replacementData.requiresPermit,
        requiresBigLadder: replacementData.requiresBigLadder,
        replacementOption: replacementData.replacementOption,
        labor: replacementData.labor,
        refrigerationRecovery: replacementData.refrigerationRecovery,
        startUpCosts: replacementData.startUpCosts,
        accessories: replacementData.accessories,
        thermostatStartup: replacementData.thermostatStartup,
        removalCost: replacementData.removalCost,
        warranty: replacementData.warranty,
        additionalItems: replacementData.additionalItems,
        permitCost: replacementData.permitCost,
        totalCost: totalCost,
      };

      if (onSave) {
        console.log("Calling onSave callback");
        onSave(formattedData);
      }

      if (onClose) {
        console.log("Calling onClose callback");
        onClose();
      }
    } catch (err) {
      console.error("Error saving replacement data:", err);
      setError("Failed to save replacement data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-auto">
      {/* Modal Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <h3 className="font-medium text-lg">
          {initialData ? "Edit Replacement Details" : "Add Replacement Details"}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-success-50 text-success-700 p-3 rounded-md mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 flex flex-col gap-4">
            {/* Replacement Options Section - Collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <div
                className="flex justify-between items-center p-3 bg-blue-50 cursor-pointer"
                onClick={() => toggleSection("options")}
              >
                <h3 className="font-medium">Replacement Option</h3>
                {expandedSection === "options" ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </div>

              {expandedSection === "options" && (
                <div className="p-3 flex flex-col gap-4">
                  <div className="flex items-center gap-6 mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="needsCrane"
                        checked={replacementData.needsCrane}
                        onChange={(e) =>
                          setReplacementData((prev) => ({
                            ...prev,
                            needsCrane: e.target.checked,
                            // Optionally clear the cost if unchecked
                            replacementOption: {
                              ...prev.replacementOption,
                              cost: e.target.checked
                                ? prev.replacementOption.cost
                                : "",
                            },
                          }))
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <label
                        htmlFor="needsCrane"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Requires Crane
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requiresPermit"
                        checked={replacementData.requiresPermit}
                        onChange={(e) =>
                          setReplacementData((prev) => ({
                            ...prev,
                            requiresPermit: e.target.checked,
                            // Clear permit cost if unchecked
                            permitCost: e.target.checked ? prev.permitCost : "",
                          }))
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <label
                        htmlFor="requiresPermit"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Requires Permit
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requiresBigLadder"
                        checked={replacementData.requiresBigLadder}
                        onChange={(e) =>
                          setReplacementData((prev) => ({
                            ...prev,
                            requiresBigLadder: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <label
                        htmlFor="requiresBigLadder"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Requires Big Ladder
                      </label>
                    </div>
                  </div>

                  {/* Crane Option (only if crane required) */}
                  {replacementData.needsCrane && (
                    <div className="mb-4 p-3 border rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Crane Option</h4>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.replacementOption.cost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            setReplacementData((prev) => ({
                              ...prev,
                              replacementOption: {
                                ...prev.replacementOption,
                                cost: value,
                              },
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          placeholder="Cost"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Permit Cost (only if permit required) */}
                  {replacementData.requiresPermit && (
                    <div className="mb-4 p-3 border rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Permit Cost</h4>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.permitCost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            setReplacementData((prev) => ({
                              ...prev,
                              permitCost: value,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          placeholder="Cost"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Labor
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.labor}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            setReplacementData((prev) => ({
                              ...prev,
                              labor: value,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Refrigeration Recovery
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.refrigerationRecovery}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            setReplacementData((prev) => ({
                              ...prev,
                              refrigerationRecovery: value,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Up Costs
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.startUpCosts}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            setReplacementData((prev) => ({
                              ...prev,
                              startUpCosts: value,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Thermostat Start Up
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.thermostatStartup}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            setReplacementData((prev) => ({
                              ...prev,
                              thermostatStartup: value,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Removal of Old Equipment
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.removalCost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            setReplacementData((prev) => ({
                              ...prev,
                              removalCost: value,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Warranty Information
                    </label>
                    <textarea
                      value={replacementData.warranty}
                      onChange={(e) =>
                        setReplacementData((prev) => ({
                          ...prev,
                          warranty: e.target.value,
                        }))
                      }
                      className="input w-full text-base sm:text-sm"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accessories Section - Collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <div
                className="flex justify-between items-center p-3 bg-green-50 cursor-pointer"
                onClick={() => toggleSection("accessories")}
              >
                <h3 className="font-medium">Accessories</h3>
                {expandedSection === "accessories" ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </div>

              {expandedSection === "accessories" && (
                <div className="p-3 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Accessories
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAccessory}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Add Accessory
                    </button>
                  </div>
                  {replacementData.accessories.map((accessory, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Accessory name"
                        value={accessory.name}
                        onChange={(e) => {
                          const newAccessories = [
                            ...replacementData.accessories,
                          ];
                          newAccessories[index].name = e.target.value;
                          setReplacementData((prev) => ({
                            ...prev,
                            accessories: newAccessories,
                          }));
                        }}
                        className="input flex-grow text-base sm:text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <div className="relative w-24">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Cost"
                          value={accessory.cost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            const newAccessories = [
                              ...replacementData.accessories,
                            ];
                            newAccessories[index].cost = value;
                            setReplacementData((prev) => ({
                              ...prev,
                              accessories: newAccessories,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAccessory(index)}
                          className="text-error-600 hover:text-error-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Items Section - Collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <div
                className="flex justify-between items-center p-3 bg-purple-50 cursor-pointer"
                onClick={() => toggleSection("additional")}
              >
                <h3 className="font-medium">Additional Items</h3>
                {expandedSection === "additional" ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </div>

              {expandedSection === "additional" && (
                <div className="p-3 flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Items
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAdditionalItem}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Add Item
                    </button>
                  </div>
                  {replacementData.additionalItems.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...replacementData.additionalItems];
                          newItems[index].name = e.target.value;
                          setReplacementData((prev) => ({
                            ...prev,
                            additionalItems: newItems,
                          }));
                        }}
                        className="input flex-grow text-base sm:text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <div className="relative w-24">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Cost"
                          value={item.cost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/^0+/, "");
                            const newItems = [
                              ...replacementData.additionalItems,
                            ];
                            newItems[index].cost = value;
                            setReplacementData((prev) => ({
                              ...prev,
                              additionalItems: newItems,
                            }));
                          }}
                          className="input pl-7 w-full text-base sm:text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                        />
                      </div>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalItem(index)}
                          className="text-error-600 hover:text-error-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cost Summary - Always visible */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-2">
              <h4 className="font-medium mb-2 flex items-center text-sm">
                <Calculator size={16} className="mr-2 text-gray-700" />
                Cost Summary
              </h4>
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      Replacement Option
                    </div>
                    <div className="text-xs text-gray-500">
                      {replacementData.replacementOption.description}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary-700">
                    ${totalCost.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  Includes 40% gross margin ($
                  {Math.round(totalCost * 0.4).toLocaleString()} profit)
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Footer with action buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => onClose && onClose()}
          className="btn btn-secondary w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e)}
          className="btn btn-primary w-full sm:w-auto"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Replacement
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RepairsForm;
