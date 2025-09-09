import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import {
  Paperclip,
  Plus,
  Edit,
  Trash2,
  Download,
  FileText,
  Eye,
} from "lucide-react";
import ViewAttachmentModal from "./ViewAttachmentModal";

type Attachment = Database["public"]["Tables"]["job_attachments"]["Row"] & {
  jobs?: {
    number: string;
    type: string;
  };
};

interface AttachmentSectionProps {
  jobId: string;
  title?: string;
}

const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  jobId,
  title = "Job Attachments",
}) => {
  const { supabase } = useSupabase();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] =
    useState<Attachment | null>(null);
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
  }, [jobId]);

  const fetchAttachments = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      if (!jobId) {
        setAttachments([]);
        return;
      }

      const { data, error } = await supabase
        .from("job_attachments")
        .select(
          `
          *,
          jobs (
            number,
            type
          )
        `
        )
        .eq("job_id", jobId)
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
    if (!supabase || !jobId) return;

    try {
      // Upload file to storage
      // Sanitize filename by removing/replacing invalid characters
      const sanitizedFileName = attachmentData.file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace invalid chars with underscore
        .replace(/_{2,}/g, "_") // Replace multiple underscores with single
        .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

      const fileName = `${Date.now()}-${sanitizedFileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(fileName, attachmentData.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("job-attachments")
        .getPublicUrl(fileName);

      // Create attachment record
      const { error: insertError } = await supabase
        .from("job_attachments")
        .insert({
          job_id: jobId,
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
    } catch (error) {
      console.error("Error adding attachment:", error);
      alert("Failed to add attachment. Please try again.");
    }
  };

  const handleEditAttachment = async (
    attachmentId: string,
    updates: {
      title: string;
      description?: string;
    }
  ) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("job_attachments")
        .update({
          title: updates.title,
          description: updates.description || null,
        })
        .eq("id", attachmentId);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedAttachment(null);
      await fetchAttachments();
    } catch (error) {
      console.error("Error updating attachment:", error);
      alert("Failed to update attachment. Please try again.");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (
      !supabase ||
      !confirm("Are you sure you want to delete this attachment?")
    )
      return;

    try {
      setDeletingAttachment(attachmentId);

      // Get attachment to delete file from storage
      const attachment = attachments.find((a) => a.id === attachmentId);
      if (attachment?.file_path) {
        const { error: storageError } = await supabase.storage
          .from("job-attachments")
          .remove([attachment.file_path]);

        if (storageError) {
          console.error("Error deleting file from storage:", storageError);
        }
      }

      // Delete attachment record
      const { error } = await supabase
        .from("job_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      await fetchAttachments();
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

  const handleViewAttachment = (attachment: Attachment) => {
    setPreviewAttachment({
      filePath: attachment.file_path,
      fileName: attachment.file_name,
      fileType: attachment.file_type,
    });
    setShowViewModal(true);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf"))
      return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType.includes("image"))
      return <FileText className="h-4 w-4 text-green-500" />;
    if (fileType.includes("word") || fileType.includes("document"))
      return <FileText className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium flex items-center">
          <Paperclip className="h-5 w-5 mr-2 text-primary-600" />
          {title}
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Attachment
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Paperclip className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No attachments uploaded yet</p>
          <p className="text-sm">Click "Add Attachment" to upload files</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(attachment.file_type)}
                <div>
                  <div className="font-medium text-sm">{attachment.title}</div>
                  <div className="text-xs text-gray-500">
                    {attachment.file_name} •{" "}
                    {formatFileSize(attachment.file_size)}
                  </div>
                  {attachment.description && (
                    <div className="text-xs text-gray-600 mt-1">
                      {attachment.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {attachment.file_name && (
                  <button
                    onClick={() => handleViewAttachment(attachment)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="View File"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => window.open(attachment.file_url, "_blank")}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedAttachment(attachment);
                    setShowEditModal(true);
                  }}
                  className="text-gray-600 hover:text-gray-800 p-1"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  disabled={deletingAttachment === attachment.id}
                  className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Attachment Modal */}
      {showAddModal && (
        <AddAttachmentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddAttachment}
        />
      )}

      {/* Edit Attachment Modal */}
      {showEditModal && selectedAttachment && (
        <EditAttachmentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAttachment(null);
          }}
          onSave={(updates) =>
            handleEditAttachment(selectedAttachment.id, updates)
          }
          attachment={selectedAttachment}
        />
      )}

      {/* View Attachment Modal */}
      {showViewModal && previewAttachment && (
        <ViewAttachmentModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setPreviewAttachment(null);
          }}
          filePath={previewAttachment.filePath}
          fileName={previewAttachment.fileName}
          fileType={previewAttachment.fileType}
        />
      )}
    </div>
  );
};

// Add Attachment Modal Component
interface AddAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description?: string; file: File }) => void;
}

const AddAttachmentModal: React.FC<AddAttachmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        file,
      });
      setTitle("");
      setDescription("");
      setFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Attachment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !file || isSubmitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Attachment Modal Component
interface EditAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { title: string; description?: string }) => void;
  attachment: Attachment;
}

const EditAttachmentModal: React.FC<EditAttachmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  attachment,
}) => {
  const [title, setTitle] = useState(attachment.title);
  const [description, setDescription] = useState(attachment.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Attachment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttachmentSection;
