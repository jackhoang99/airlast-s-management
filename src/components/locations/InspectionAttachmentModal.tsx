import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import InspectionAttachmentSection from "../jobs/InspectionAttachmentSection";

interface InspectionAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId: string;
  title?: string;
  onAttachmentChange?: () => void;
}

const InspectionAttachmentModal: React.FC<InspectionAttachmentModalProps> = ({
  isOpen,
  onClose,
  inspectionId,
  title = "Inspection Attachments",
  onAttachmentChange,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <InspectionAttachmentSection
            inspectionId={inspectionId}
            title=""
            onAttachmentChange={onAttachmentChange}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InspectionAttachmentModal;
