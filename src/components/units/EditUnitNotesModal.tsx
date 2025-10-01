import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { useSupabase } from "../../lib/supabase-context";

interface EditUnitNotesModalProps {
  unit: {
    id: string;
    unit_number: string;
    notes?: string | null;
  };
  onClose: () => void;
  onSave: (notes: string) => void;
}

const EditUnitNotesModal: React.FC<EditUnitNotesModalProps> = ({
  unit,
  onClose,
  onSave,
}) => {
  const { supabase } = useSupabase();
  const [notes, setNotes] = useState(unit.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!supabase) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("units")
        .update({ notes: notes.trim() || null })
        .eq("id", unit.id);

      if (error) {
        console.error("Error updating unit notes:", error);
        alert("Failed to save notes. Please try again.");
        return;
      }

      onSave(notes.trim() || "");
    } catch (err) {
      console.error("Error updating unit notes:", err);
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            Edit Notes for Unit {unit.unit_number}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes about this unit..."
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              maxLength={1000}
            />
            <div className="text-sm text-gray-500 mt-1">
              {notes.length}/1000 characters
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn btn-outline"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUnitNotesModal;

