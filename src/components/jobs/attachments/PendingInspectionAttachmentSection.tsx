import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Clipboard, Plus, X } from "lucide-react";
import { PendingInspectionAttachmentSectionProps } from "./types";
import AddPendingInspectionAttachmentModal from "./AddPendingInspectionAttachmentModal";

const PendingInspectionAttachmentSection: React.FC<
  PendingInspectionAttachmentSectionProps
> = ({ attachments, onAdd, onRemove }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-900 flex items-center">
          Inspection Attachments
        </h3>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary btn-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Attachment
        </button>
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <Clipboard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No attachments yet</p>
          <p className="text-xs">Click "Add Attachment" to upload files</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {attachment.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => onRemove(attachment.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Attachment Modal */}
      {showAddModal &&
        createPortal(
          <AddPendingInspectionAttachmentModal
            onSave={(data) => {
              onAdd(data);
              setShowAddModal(false);
            }}
            onCancel={() => setShowAddModal(false)}
          />,
          document.body
        )}
    </div>
  );
};

export default PendingInspectionAttachmentSection;
