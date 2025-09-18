import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useSupabase } from "../../../lib/supabase-context";
import InspectionAttachmentSection from "../InspectionAttachmentSection";
import {
  PendingInspectionAttachmentSection,
  PendingInspectionAttachment,
} from "../attachments";

type InspectionData = {
  id?: string;
  job_id?: string;
  model_number: string;
  manufacture_name: string;
  serial_number: string;
  age: string;
  tonnage: string;
  unit_type: "Gas" | "Electric";
  system_type: string;
  belt_size?: string;
  filter_size?: string;
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
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingInspectionAttachment[]
  >([]);
  const [inspectionData, setInspectionData] = useState<InspectionData>(
    initialData || {
      model_number: "",
      manufacture_name: "",
      serial_number: "",
      age: "",
      tonnage: "",
      unit_type: "Gas",
      system_type: "",
      belt_size: "",
      filter_size: "",
      comment: "",
      // If only one unit, set job_unit_id by default
      ...(jobUnits && jobUnits.length === 1
        ? { job_unit_id: jobUnits[0].id }
        : {}),
    }
  );

  const isEditMode = !!initialData?.id;

  // Ensure job_unit_id is set when there's only one unit
  useEffect(() => {
    if (jobUnits && jobUnits.length === 1 && !inspectionData.job_unit_id) {
      setInspectionData((prev) => ({
        ...prev,
        job_unit_id: jobUnits[0].id,
      }));
    }
  }, [jobUnits, inspectionData.job_unit_id]);

  // Functions to handle pending attachments
  const addPendingAttachment = (
    attachment: Omit<PendingInspectionAttachment, "id">
  ) => {
    const newAttachment: PendingInspectionAttachment = {
      ...attachment,
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setPendingAttachments((prev) => [...prev, newAttachment]);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const processPendingAttachments = async (inspectionId: string) => {
    if (!supabase || pendingAttachments.length === 0) return;

    for (const pendingAttachment of pendingAttachments) {
      try {
        // Upload file to storage
        // Sanitize filename by removing/replacing invalid characters
        const sanitizedFileName = pendingAttachment.file.name
          .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace invalid chars with underscore
          .replace(/_{2,}/g, "_") // Replace multiple underscores with single
          .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

        const fileName = `${Date.now()}-${sanitizedFileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("inspection-attachments")
          .upload(fileName, pendingAttachment.file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("inspection-attachments")
          .getPublicUrl(fileName);

        // Create attachment record
        const { error: insertError } = await supabase
          .from("inspection_attachments")
          .insert({
            inspection_id: inspectionId,
            title: pendingAttachment.title,
            description: pendingAttachment.description || null,
            file_name: pendingAttachment.file_name,
            file_path: fileName,
            file_url: urlData.publicUrl,
            file_size: pendingAttachment.file_size,
            file_type: pendingAttachment.file_type,
          });

        if (insertError) throw insertError;
      } catch (error) {
        console.error("Error processing pending attachment:", error);
        // Continue with other attachments even if one fails
      }
    }

    // Clear pending attachments after processing
    setPendingAttachments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !jobId) return;

    // Validate that a unit is selected
    if (!inspectionData.job_unit_id) {
      setError("Please select a unit for this inspection");
      return;
    }

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
            manufacture_name: inspectionData.manufacture_name,
            serial_number: inspectionData.serial_number,
            age: inspectionData.age ? parseInt(inspectionData.age) : null,
            tonnage: inspectionData.tonnage || null,
            unit_type: inspectionData.unit_type,
            system_type: inspectionData.system_type,
            belt_size: inspectionData.belt_size || null,
            filter_size: inspectionData.filter_size || null,
            comment: inspectionData.comment || null,
            updated_at: new Date().toISOString(),
            job_unit_id: inspectionData.job_unit_id || null, // Use job_unit_id
          })
          .eq("id", initialData.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { data: insertData, error: insertError } = await supabase
          .from("job_inspections")
          .insert({
            job_id: jobId,
            model_number: inspectionData.model_number,
            manufacture_name: inspectionData.manufacture_name,
            serial_number: inspectionData.serial_number,
            age: inspectionData.age ? parseInt(inspectionData.age) : null,
            tonnage: inspectionData.tonnage || null,
            unit_type: inspectionData.unit_type,
            system_type: inspectionData.system_type,
            belt_size: inspectionData.belt_size || null,
            filter_size: inspectionData.filter_size || null,
            comment: inspectionData.comment || null,
            completed: false,
            job_unit_id: inspectionData.job_unit_id || null, // Use job_unit_id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Process pending attachments if any
        if (insertData && pendingAttachments.length > 0) {
          await processPendingAttachments(insertData.id);
        }
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
            {!jobUnits || jobUnits.length === 0 ? (
              <div className="bg-warning-50 border border-warning-200 rounded-md p-3">
                <p className="text-warning-700 text-sm">
                  No units are available for this job. Please add units to the
                  job first.
                </p>
              </div>
            ) : jobUnits.length > 1 ? (
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
            ) : jobUnits.length === 1 ? (
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
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacture Name
              </label>
              <input
                type="text"
                value={inspectionData.manufacture_name}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    manufacture_name: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter manufacture name"
              />
            </div>
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
              <input
                type="text"
                value={inspectionData.system_type}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    system_type: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter system type"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Belt Size
              </label>
              <input
                type="text"
                value={inspectionData.belt_size || ""}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    belt_size: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter belt size"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Size
              </label>
              <input
                type="text"
                value={inspectionData.filter_size || ""}
                onChange={(e) =>
                  setInspectionData((prev) => ({
                    ...prev,
                    filter_size: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                className="input w-full text-base sm:text-sm"
                placeholder="Enter filter size"
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                placeholder="Enter any comments or notes"
                rows={4}
                style={{ minHeight: "100px" }}
              />
            </div>
          </div>

          {/* Inspection Attachments Section */}
          <div className="mt-6">
            {isEditMode && initialData?.id ? (
              <InspectionAttachmentSection
                inspectionId={initialData.id}
                title="Inspection Attachments"
              />
            ) : (
              <PendingInspectionAttachmentSection
                attachments={pendingAttachments}
                onAdd={addPendingAttachment}
                onRemove={removePendingAttachment}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                "Saving..."
              ) : (
                <>
                  <Plus size={16} className="mr-1" />
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
