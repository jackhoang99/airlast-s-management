import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  Plus,
  Edit,
  Trash2,
  Clipboard,
  AlertTriangle,
  FileText,
  X,
} from "lucide-react";
import InspectionForm from "./inspection/InspectionForm";
import GenerateQuote from "../GenerateQuote";

type InspectionSectionProps = {
  jobId: string;
  inspectionData?: any[];
  onInspectionUpdated?: () => void;
  jobUnits?: { id: string; unit_id: string; unit_number: string }[];
};

const InspectionSection = ({
  jobId,
  inspectionData = [],
  onInspectionUpdated,
  jobUnits, // Add this line
}: InspectionSectionProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showGenerateQuoteModal, setShowGenerateQuoteModal] = useState(false);
  const [showSummaryCommentModal, setShowSummaryCommentModal] = useState(false);
  const [inspectionToEdit, setInspectionToEdit] = useState<any>(null);
  const [localInspectionData, setLocalInspectionData] =
    useState<any[]>(inspectionData);
  const [summaryComment, setSummaryComment] = useState<string>("");
  const [currentSummaryComment, setCurrentSummaryComment] =
    useState<string>("");

  useEffect(() => {
    setLocalInspectionData(inspectionData);
  }, [inspectionData]);

  // Fetch current summary comment
  useEffect(() => {
    const fetchSummaryComment = async () => {
      if (!supabase || !jobId) return;

      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("inspection_summary_comment")
          .eq("id", jobId)
          .single();

        if (error) {
          console.error("Error fetching summary comment:", error);
        } else if (data) {
          setCurrentSummaryComment(data.inspection_summary_comment || "");
        }
      } catch (err) {
        console.error("Error fetching summary comment:", err);
      }
    };

    fetchSummaryComment();
  }, [supabase, jobId]);

  const handleAddInspection = () => {
    setInspectionToEdit(null);
    setShowInspectionForm(true);
  };

  const handleEditInspection = (inspection: any) => {
    setInspectionToEdit(inspection);
    setShowInspectionForm(true);
  };

  const handleSaveInspection = () => {
    setShowInspectionForm(false);
    setInspectionToEdit(null);
    if (onInspectionUpdated) {
      onInspectionUpdated();
    }
  };

  const handleSaveSummaryComment = async () => {
    if (!supabase || !summaryComment.trim()) return;

    try {
      setIsLoading(true);

      // Save the summary comment to the job record
      const { error } = await supabase
        .from("jobs")
        .update({
          inspection_summary_comment: summaryComment.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) throw error;

      setShowSummaryCommentModal(false);
      setSummaryComment("");
      setCurrentSummaryComment(summaryComment.trim());

      if (onInspectionUpdated) {
        onInspectionUpdated();
      }
    } catch (err: any) {
      console.error("Error saving summary comment:", err);
      setError(err.message || "Failed to save summary comment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInspection = async (inspectionId: string) => {
    if (!supabase) return;

    try {
      setIsLoading(true);

      // First, delete the asset(s) associated with this inspection
      // Find all assets where model.inspection_id === inspectionId
      const { data: assetsToDelete, error: assetFetchError } = await supabase
        .from("assets")
        .select("id, model");
      if (assetFetchError) throw assetFetchError;
      if (assetsToDelete && Array.isArray(assetsToDelete)) {
        for (const asset of assetsToDelete) {
          let model = asset.model;
          if (typeof model === "string") {
            try {
              model = JSON.parse(model);
            } catch {}
          }
          if (model && model.inspection_id === inspectionId) {
            await supabase.from("assets").delete().eq("id", asset.id);
          }
        }
      }

      // Then delete the inspection
      const { error } = await supabase
        .from("job_inspections")
        .delete()
        .eq("id", inspectionId);

      if (error) throw error;

      // Update local state
      setLocalInspectionData((prev) =>
        prev.filter((item) => item.id !== inspectionId)
      );

      if (onInspectionUpdated) {
        onInspectionUpdated();
      }
    } catch (err) {
      console.error("Error deleting inspection:", err);
      setError("Failed to delete inspection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteInspections = async () => {
    if (!supabase || !jobId) return;

    try {
      setIsLoading(true);

      // Update all inspections to mark them as completed
      const { data: updatedInspections, error: updateError } = await supabase
        .from("job_inspections")
        .update({ completed: true })
        .eq("job_id", jobId)
        .select();

      if (updateError) throw updateError;

      // Update local state
      setLocalInspectionData((prev) =>
        prev.map((item) => ({ ...item, completed: true }))
      );

      // For each completed inspection, create an asset if not already present
      if (updatedInspections && Array.isArray(updatedInspections)) {
        for (const inspection of updatedInspections) {
          // Find the job_unit to get the unit_id
          let unit_id = null;
          if (inspection.job_unit_id && jobUnits) {
            const jobUnit = jobUnits.find(
              (u) => u.id === inspection.job_unit_id
            );
            if (jobUnit && jobUnit.unit_id) {
              unit_id = jobUnit.unit_id;
            }
          }
          // If still not found, skip
          if (!unit_id) continue;

          // Check if asset already exists for this inspection
          const { data: existingAssets, error: assetCheckError } =
            await supabase
              .from("assets")
              .select("id, model")
              .eq("unit_id", unit_id);

          if (assetCheckError) continue;
          const alreadyExists = (existingAssets || []).some((asset) => {
            try {
              const model =
                typeof asset.model === "string"
                  ? JSON.parse(asset.model)
                  : asset.model;
              return model && model.inspection_id === inspection.id;
            } catch {
              return false;
            }
          });
          if (alreadyExists) continue;

          // Insert asset in the format from your screenshot
          const model = {
            age: inspection.age,
            job_id: inspection.job_id,
            tonnage: inspection.tonnage,
            unit_type: inspection.unit_type,
            system_type: inspection.system_type,
            model_number: inspection.model_number,
            serial_number: inspection.serial_number,
            inspection_id: inspection.id,
            comment: inspection.comment,
          };
          await supabase.from("assets").insert({
            unit_id,
            model,
            inspection_date: new Date().toISOString(),
          });
        }
      }

      if (onInspectionUpdated) {
        onInspectionUpdated();
      }
    } catch (err) {
      console.error("Error completing inspections:", err);
      setError("Failed to complete inspections");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US");
  };

  return (
    <div className="space-y-4">
      {showInspectionForm ? (
        <InspectionForm
          jobId={jobId}
          initialData={inspectionToEdit}
          onSave={handleSaveInspection}
          onCancel={() => {
            setShowInspectionForm(false);
            setInspectionToEdit(null);
          }}
          jobUnits={jobUnits} // Pass jobUnits to InspectionForm
        />
      ) : (
        <>
          {error && (
            <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          {localInspectionData.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:justify-end items-start sm:items-center mb-4 gap-2 sm:gap-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={handleAddInspection}
                  className="btn btn-primary btn-sm w-full sm:w-auto"
                >
                  <Plus size={14} className="mr-1" /> Add Inspection
                </button>
                <button
                  onClick={() => setShowGenerateQuoteModal(true)}
                  className="btn btn-secondary btn-sm w-full sm:w-auto"
                >
                  <FileText size={14} className="mr-1" /> Generate Quote
                </button>
                <button
                  onClick={() => setShowSummaryCommentModal(true)}
                  className="btn btn-info btn-sm w-full sm:w-auto"
                >
                  <Clipboard size={14} className="mr-1" /> Summary Comment
                </button>
                {localInspectionData.length > 0 &&
                  !localInspectionData.every((insp) => insp.completed) && (
                    <button
                      onClick={handleCompleteInspections}
                      className="btn btn-success btn-sm w-full sm:w-auto"
                    >
                      <Clipboard size={14} className="mr-1" /> Complete All
                    </button>
                  )}
              </div>
            </div>
          ) : null}
          {localInspectionData.length > 0 ? (
            <div className="space-y-4">
              {localInspectionData.map((inspection) => (
                <div
                  key={inspection.id}
                  className={`p-3 rounded-lg border ${
                    inspection.completed
                      ? "border-success-200 bg-success-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEditInspection(inspection)}
                        className="text-primary-600 hover:text-primary-800 p-1 w-full sm:w-auto"
                        aria-label="Edit inspection"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteInspection(inspection.id)}
                        className="text-error-600 hover:text-error-800 p-1 w-full sm:w-auto"
                        aria-label="Delete inspection"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Model Number
                      </p>
                      <p className="text-sm">
                        {inspection.model_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Serial Number
                      </p>
                      <p className="text-sm">
                        {inspection.serial_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Age (Years)
                      </p>
                      <p className="text-sm">{inspection.age || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Tonnage
                      </p>
                      <p className="text-sm">{inspection.tonnage || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Unit Type
                      </p>
                      <p className="text-sm">{inspection.unit_type || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        System Type
                      </p>
                      <p className="text-sm">
                        {inspection.system_type || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Unit</p>
                      <p className="text-sm">
                        {jobUnits && inspection.job_unit_id
                          ? jobUnits.find(
                              (u) => u.id === inspection.job_unit_id
                            )?.unit_number || "N/A"
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Comment
                      </p>
                      <p className="text-sm">{inspection.comment || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Clipboard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No inspection data available</p>
              <button
                onClick={handleAddInspection}
                className="btn btn-primary mt-4 w-full sm:w-auto"
              >
                <Plus size={16} className="mr-2" /> Add Inspection
              </button>
            </div>
          )}

          {/* Summary Comment Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-blue-800 flex items-center">
                <Clipboard size={16} className="mr-2" />
                Summary Comment
              </h3>
              <button
                onClick={() => {
                  setSummaryComment(currentSummaryComment);
                  setShowSummaryCommentModal(true);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {currentSummaryComment ? <Edit size={14} /> : <Plus size={14} />}
              </button>
            </div>
            {currentSummaryComment ? (
              <p className="text-sm text-blue-700 whitespace-pre-wrap">
                {currentSummaryComment}
              </p>
            ) : (
              <p className="text-sm text-blue-600 italic">
                No summary comment added yet. Click the + button to add one.
              </p>
            )}
          </div>
        </>
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
                onQuoteSent={() => {
                  setShowGenerateQuoteModal(false);
                  // Refresh data
                  if (onInspectionUpdated) onInspectionUpdated();
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

      {/* Summary Comment Modal */}
      {showSummaryCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center">
                <Clipboard className="h-5 w-5 mr-2 text-primary-600" />
                Inspection Summary Comment
              </h2>
              <button
                onClick={() => setShowSummaryCommentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary Comment for All Inspections
                </label>
                <textarea
                  value={summaryComment}
                  onChange={(e) => setSummaryComment(e.target.value)}
                  placeholder="Enter a summary comment for all inspection results..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This comment will be saved to the job record and can be used
                  in quotes and reports.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSummaryCommentModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSummaryComment}
                  disabled={isLoading || !summaryComment.trim()}
                  className="btn btn-primary"
                >
                  {isLoading ? "Saving..." : "Save Summary Comment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionSection;
