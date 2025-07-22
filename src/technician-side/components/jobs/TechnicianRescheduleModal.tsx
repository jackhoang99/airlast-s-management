import { useState } from "react";
import { X } from "lucide-react";

interface TechnicianRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newDate: string) => void;
  initialDate?: string;
}

const TechnicianRescheduleModal = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
}: TechnicianRescheduleModalProps) => {
  const [date, setDate] = useState(
    initialDate ? initialDate.split("T")[0] : ""
  );
  const [time, setTime] = useState(
    initialDate ? initialDate.split("T")[1]?.slice(0, 5) : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!date || !time) return;
    setSaving(true);
    const isoString = new Date(`${date}T${time}`).toISOString();
    onSave(isoString);
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Reschedule Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!date || !time || saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicianRescheduleModal;
