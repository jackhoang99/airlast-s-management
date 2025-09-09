import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  Paperclip,
  Plus,
  Edit,
  Trash2,
  Download,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import ViewAttachmentModal from "./ViewAttachmentModal";

type Attachment = Database["public"]["Tables"]["job_attachments"]["Row"] & {
  created_at: string;
  updated_at: string;
};

interface AttachmentSectionMobileProps {
  jobId: string;
  title?: string;
}

const AttachmentSectionMobile: React.FC<AttachmentSectionMobileProps> = ({
  jobId,
  title = "Attachments",
}) => {
  const { supabase } = useSupabase();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
  const [showAttachments, setShowAttachments] = useState(true);

  useEffect(() => {
    if (jobId) {
      fetchAttachments();
    }
  }, [jobId]);

  const fetchAttachments = async () => {
    if (!supabase || !jobId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("job_attachments")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttachment = async (formData: {
    title: string;
    description: string;
    file: File;
  }) => {
    if (!supabase || !jobId) return;

    try {
      const file = formData.file;
      const fileExt = file.name.split(".").pop();

      // Sanitize filename by removing/replacing invalid characters
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace invalid chars with underscore
        .replace(/_{2,}/g, "_") // Replace multiple underscores with single
        .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

      const fileName = `${Date.now()}-${sanitizedFileName}`;
      const filePath = `${jobId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("job-attachments")
        .getPublicUrl(filePath);

      // Insert into database
      const { error: insertError } = await supabase
        .from("job_attachments")
        .insert({
          job_id: jobId,
          title: formData.title,
          description: formData.description,
          file_name: file.name,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      fetchAttachments();
    } catch (error) {
      console.error("Error adding attachment:", error);
    }
  };

  const handleEditAttachment = async (
    attachmentId: string,
    updates: { title: string; description: string }
  ) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("job_attachments")
        .update({
          title: updates.title,
          description: updates.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attachmentId);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedAttachment(null);
      fetchAttachments();
    } catch (error) {
      console.error("Error updating attachment:", error);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!supabase) return;

    try {
      setDeletingAttachment(attachmentId);

      // Get attachment to delete file from storage
      const attachment = attachments.find((a) => a.id === attachmentId);
      if (attachment) {
        // Delete from storage
        await supabase.storage
          .from("job-attachments")
          .remove([attachment.file_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from("job_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      fetchAttachments();
    } catch (error) {
      console.error("Error deleting attachment:", error);
    } finally {
      setDeletingAttachment(null);
    }
  };

  const handleViewAttachment = (attachment: Attachment) => {
    setPreviewAttachment({
      filePath: attachment.file_path,
      fileName: attachment.file_name,
      fileType: attachment.file_type,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
        <div className="flex justify-center items-center h-16">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-2 sm:p-4 mb-4">
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          className="w-full flex justify-between items-center p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <h3 className="text-md font-medium flex items-center">
            <Paperclip size={16} className="mr-2 text-blue-500" />
            {title} ({attachments.length})
          </h3>
          {showAttachments ? (
            <ChevronUp className="h-5 w-5 text-blue-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-blue-500" />
          )}
        </button>
        {showAttachments && (
          <div className="p-3">
            <div className="text-sm text-gray-500 mb-3">
              <p>View and manage job attachments</p>
            </div>

            {attachments.length === 0 ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Paperclip className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  No attachments found
                </h3>
                <p className="text-gray-500 mb-3 text-sm">
                  Get started by adding your first attachment for this job
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} className="mr-1" />
                  Add Attachment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="border rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(attachment.file_type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {attachment.title}
                          </h4>
                          <p className="text-xs text-gray-500 truncate">
                            {attachment.file_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
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
                          onClick={() =>
                            window.open(attachment.file_url, "_blank")
                          }
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {attachment.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {attachment.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary btn-sm w-full"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Attachment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
      {previewAttachment && (
        <ViewAttachmentModal
          isOpen={!!previewAttachment}
          onClose={() => setPreviewAttachment(null)}
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
  onSave: (data: { title: string; description: string; file: File }) => void;
}

const AddAttachmentModal: React.FC<AddAttachmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      await onSave({ title, description, file });
      setTitle("");
      setDescription("");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Add Attachment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Attachment"}
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
  onSave: (data: { title: string; description: string }) => void;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(attachment.title);
    setDescription(attachment.description || "");
  }, [attachment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ title, description });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Attachment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttachmentSectionMobile;
