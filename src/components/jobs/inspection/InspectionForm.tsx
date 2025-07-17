import { useState, useEffect } from "react";
import { Clipboard, Plus, X, ArrowLeft } from "lucide-react";
import { useSupabase } from "../../../lib/supabase-context";

type InspectionData = {
  id?: string;
  job_id?: string;
  model_number: string;
  serial_number: string;
  age: string;
  tonnage: string;
  unit_type: "Gas" | "Electric";
  system_type: "RTU" | "Split System";
  comment?: string;
  job_unit_id?: string; // Use job_unit_id instead of unit_id
};

type InspectionFormProps = {
  jobId: string;
  initialData?: InspectionData;
  onSave?: (data: InspectionData) => void;
  onCancel?: () => void;
  jobUnits?: { id: string; unit_number: string }[]; // id is job_unit_id
};

const InspectionForm = ({
  jobId,
  initialData,
  onSave,
  onCancel,
  jobUnits,
}: InspectionFormProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<InspectionData>(
    initialData || {
      model_number: "",
      serial_number: "",
      age: "",
      tonnage: "",
      unit_type: "Gas",
      system_type: "RTU",
      comment: "",
      // If only one unit, set job_unit_id by default
      ...(jobUnits && jobUnits.length === 1
        ? { job_unit_id: jobUnits[0].id }
        : {}),
    }
  );

  const isEditMode = !!initialData?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !jobId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEditMode && initialData?.id) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("job_inspections")
          .update({
            model_number: inspectionData.model_number,
            serial_number: inspectionData.serial_number,
            age: inspectionData.age ? parseInt(inspectionData.age) : null,
            tonnage: inspectionData.tonnage || null,
            unit_type: inspectionData.unit_type,
            system_type: inspectionData.system_type,
            comment: inspectionData.comment || null,
            updated_at: new Date().toISOString(),
            job_unit_id: inspectionData.job_unit_id || null, // Use job_unit_id
          })
          .eq("id", initialData.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("job_inspections")
          .insert({
            job_id: jobId,
            model_number: inspectionData.model_number,
            serial_number: inspectionData.serial_number,
            age: inspectionData.age ? parseInt(inspectionData.age) : null,
            tonnage: inspectionData.tonnage || null,
            unit_type: inspectionData.unit_type,
            system_type: inspectionData.system_type,
            comment: inspectionData.comment || null,
            completed: false,
            job_unit_id: inspectionData.job_unit_id || null, // Use job_unit_id
          });

        if (insertError) throw insertError;
      }

      setSuccess("Inspection data saved successfully");

      if (onSave) {
        onSave(inspectionData);
      }
    } catch (err) {
      console.error("Error saving inspection data:", err);
      setError("Failed to save inspection data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-auto">
      {/* Modal Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <h3 className="font-medium text-lg">
          {isEditMode ? "Edit Inspection" : "Add Inspection"}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-4">
            {jobUnits && jobUnits.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Unit
                </label>
                <select
                  value={inspectionData.job_unit_id || ""}
                  onChange={(e) =>
                    setInspectionData((prev) => ({
                      ...prev,
                      job_unit_id: e.target.value,
                    }))
                  }
                  className="select w-full text-base sm:text-sm"
                  required
                >
                  <option value="">Select Unit</option>
                  {jobUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {jobUnits && jobUnits.length === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={jobUnits[0].unit_number}
                  className="input w-full text-base sm:text-sm"
                  readOnly
                />
                {/* Ensure job_unit_id is set for single unit */}
                <input type="hidden" value={jobUnits[0].id} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Number
              </label>
              <input
                type="text"
                value={inspectionData.model_number}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    model_number: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter model number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                value={inspectionData.serial_number}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    serial_number: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter serial number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age (Years)
              </label>
              <input
                type="number"
                value={inspectionData.age}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    age: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter age in years"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tonnage
              </label>
              <input
                type="text"
                value={inspectionData.tonnage}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    tonnage: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter tonnage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Type
              </label>
              <select
                value={inspectionData.unit_type}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    unit_type: e.target.value as "Gas" | "Electric",
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="select w-full text-base sm:text-sm"
              >
                <option value="Gas">Gas</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Type
              </label>
              <select
                value={inspectionData.system_type}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    system_type: e.target.value as "RTU" | "Split System",
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="select w-full text-base sm:text-sm"
              >
                <option value="RTU">RTU</option>
                <option value="Split System">Split System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment
              </label>
              <textarea
                value={inspectionData.comment || ""}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter any comments or notes"
                rows={2}
              />
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" />
                  {isEditMode ? "Update Inspection" : "Add Inspection"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InspectionForm;
