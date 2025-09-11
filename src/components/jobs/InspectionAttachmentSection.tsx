import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  Paperclip,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  X,
  Save,
} from "lucide-react";

interface InspectionAttachment {
  id: string;
  inspection_id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
}

interface InspectionAttachmentSectionProps {
  inspectionId: string;
  title?: string;
  onAttachmentChange?: () => void;
}

const InspectionAttachmentSection: React.FC<
  InspectionAttachmentSectionProps
> = ({
  inspectionId,
  title = "Inspection Attachments",
  onAttachmentChange,
}) => {
  const { supabase } = useSupabase();
  const [attachments, setAttachments] = useState<InspectionAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] =
    useState<InspectionAttachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(
    null
  );
  const [previewAttachment, setPreviewAttachment] = useState<{
    filePath: string;
    fileName: string;
    fileType: string;
  } | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, [inspectionId]);

  const fetchAttachments = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      if (!inspectionId) {
        setAttachments([]);
        return;
      }

      const { data, error } = await supabase
        .from("inspection_attachments")
        .select("*")
        .eq("inspection_id", inspectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttachment = async (attachmentData: {
    title: string;
    description?: string;
    file: File;
  }) => {
    if (!supabase || !inspectionId) return;

    try {
      // Upload file to storage
      // Sanitize filename by removing/replacing invalid characters
      const sanitizedFileName = attachmentData.file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace invalid chars with underscore
        .replace(/_{2,}/g, "_") // Replace multiple underscores with single
        .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

      const fileName = `${Date.now()}-${sanitizedFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("inspection-attachments")
        .upload(fileName, attachmentData.file);

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
          title: attachmentData.title,
          description: attachmentData.description || null,
          file_name: attachmentData.file.name,
          file_path: fileName,
          file_url: urlData.publicUrl,
          file_size: attachmentData.file.size,
          file_type: attachmentData.file.type,
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      await fetchAttachments();
      if (onAttachmentChange) {
        onAttachmentChange();
      }
    } catch (error) {
      console.error("Error adding attachment:", error);
      alert("Failed to add attachment. Please try again.");
    }
  };

  const handleEditAttachment = async (
    attachmentId: string,
    updates: { title: string; description: string }
  ) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("inspection_attachments")
        .update({
          title: updates.title,
          description: updates.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attachmentId);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedAttachment(null);
      await fetchAttachments();
      if (onAttachmentChange) {
        onAttachmentChange();
      }
    } catch (error) {
      console.error("Error updating attachment:", error);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!supabase) return;

    try {
      setDeletingAttachment(attachmentId);

      // Get attachment to delete file from storage
      const attachment = attachments.find((att) => att.id === attachmentId);
      if (attachment) {
        // Delete file from storage
        const { error: storageError } = await supabase.storage
          .from("inspection-attachments")
          .remove([attachment.file_path]);

        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
        }
      }

      // Delete attachment record
      const { error } = await supabase
        .from("inspection_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      await fetchAttachments();
      if (onAttachmentChange) {
        onAttachmentChange();
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      alert("Failed to delete attachment. Please try again.");
    } finally {
      setDeletingAttachment(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isImageFile = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  const handlePreview = (attachment: InspectionAttachment) => {
    if (isImageFile(attachment.file_type)) {
      setPreviewAttachment({
        filePath: attachment.file_url,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
      });
      setShowViewModal(true);
    } else {
      // For non-image files, open in new tab
      window.open(attachment.file_url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-900 flex items-center">
          {title}
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
          <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-300" />
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
                    {formatFileSize(attachment.file_size)} •{" "}
                    {formatDate(attachment.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handlePreview(attachment)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="View/Download"
                >
                  {isImageFile(attachment.file_type) ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttachment(attachment);
                    setShowEditModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="Edit"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  disabled={deletingAttachment === attachment.id}
                  className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  title="Delete"
                >
                  {deletingAttachment === attachment.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Attachment Modal */}
      {showAddModal &&
        createPortal(
          <AddInspectionAttachmentModal
            onSave={handleAddAttachment}
            onCancel={() => setShowAddModal(false)}
          />,
          document.body
        )}

      {/* Edit Attachment Modal */}
      {showEditModal &&
        selectedAttachment &&
        createPortal(
          <EditInspectionAttachmentModal
            attachment={selectedAttachment}
            onSave={(updates) =>
              handleEditAttachment(selectedAttachment.id, updates)
            }
            onCancel={() => {
              setShowEditModal(false);
              setSelectedAttachment(null);
            }}
          />,
          document.body
        )}

      {/* View/Preview Modal */}
      {showViewModal &&
        previewAttachment &&
        createPortal(
          <ViewInspectionAttachmentModal
            attachment={previewAttachment}
            onClose={() => {
              setShowViewModal(false);
              setPreviewAttachment(null);
            }}
          />,
          document.body
        )}
    </div>
  );
};

// Add Attachment Modal Component
const AddInspectionAttachmentModal: React.FC<{
  onSave: (data: { title: string; description?: string; file: File }) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setIsUploading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        file,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add Attachment
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              placeholder="Enter attachment title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              placeholder="Enter description (optional)"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File *
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input w-full"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title.trim() || isUploading}
              className="btn btn-primary"
            >
              {isUploading ? "Uploading..." : "Add Attachment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Attachment Modal Component
const EditInspectionAttachmentModal: React.FC<{
  attachment: InspectionAttachment;
  onSave: (updates: { title: string; description: string }) => void;
  onCancel: () => void;
}> = ({ attachment, onSave, onCancel }) => {
  const [title, setTitle] = useState(attachment.title);
  const [description, setDescription] = useState(attachment.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Edit Attachment
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              placeholder="Enter attachment title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              placeholder="Enter description (optional)"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSaving}
              className="btn btn-primary"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View/Preview Modal Component
const ViewInspectionAttachmentModal: React.FC<{
  attachment: { filePath: string; fileName: string; fileType: string };
  onClose: () => void;
}> = ({ attachment, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {attachment.fileName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4">
          {attachment.fileType.startsWith("image/") ? (
            <img
              src={attachment.filePath}
              alt={attachment.fileName}
              className="max-w-full max-h-[70vh] object-contain mx-auto"
            />
          ) : (
            <div className="text-center py-8">
              <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">
                Preview not available for this file type
              </p>
              <a
                href={attachment.filePath}
                download={attachment.fileName}
                className="btn btn-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionAttachmentSection;
