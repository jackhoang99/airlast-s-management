import { useState, useEffect } from "react";
import { Clipboard, Plus, X, ArrowLeft } from "lucide-react";
import { useSupabase } from "../../../lib/supabase-context";
import AddAssetForm from "../../locations/AddAssetForm";

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
};

type InspectionFormProps = {
  jobId: string;
  initialData?: InspectionData;
  onSave?: (data: InspectionData) => void;
  onCancel?: () => void;
};

const InspectionForm = ({
  jobId,
  initialData,
  onSave,
  onCancel,
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

  // Assume you have access to unitId, locationId, companyId from job context or props
  // For this example, we'll use placeholders. Replace with real values as needed.
  const unitId = initialData?.unit_id || "";
  const locationId = initialData?.location_id || "";
  const companyId = initialData?.company_id || "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-auto">
      {/* Modal Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <h3 className="font-medium text-lg">Add Asset from Inspection</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <AddAssetForm
          unitId={unitId}
          locationId={locationId}
          companyId={companyId}
          onSuccess={onSave}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
};

export default InspectionForm;
