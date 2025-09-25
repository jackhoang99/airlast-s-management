import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { FileText, Upload, X } from "lucide-react";

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locationId?: string;
  unitId?: string;
  companyId: string;
  documentType: "location" | "unit";
}

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  locationId,
  unitId,
  companyId,
  documentType,
}) => {
  const { supabase, session } = useSupabase();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newDocument, setNewDocument] = useState({
    document_name: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null); // Clear any previous errors
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!supabase) {
      console.error("Supabase client not available");
      return null;
    }

    try {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        console.error("File too large. Maximum size is 10MB");
        return null;
      }

      const fileExt = file.name.split(".").pop();
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_|_$/g, "");

      const fileName = `${Date.now()}-${sanitizedFileName}`;
      const bucketName =
        documentType === "location" ? "location-documents" : "unit-documents";
      const filePath = `${companyId}/${locationId || unitId}/${fileName}`;

      console.log("Uploading file:", file.name, "to path:", filePath);

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        if (uploadError.message?.includes("JWT")) {
          throw new Error("Authentication error. Please log in again.");
        } else if (uploadError.message?.includes("policy")) {
          throw new Error(
            "Permission denied. Storage policies may need to be updated."
          );
        } else {
          throw uploadError;
        }
      }

      console.log("File uploaded successfully:", data);
      return filePath;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !session) return;

    try {
      setUploading(true);

      let filePath = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      if (selectedFile) {
        console.log("Processing file upload for:", selectedFile.name);
        filePath = await uploadFile(selectedFile);
        if (filePath) {
          fileName = selectedFile.name;
          fileSize = selectedFile.size;
          fileType = selectedFile.type;
          console.log("File processed successfully:", {
            fileName,
            fileSize,
            fileType,
            filePath,
          });
        } else {
          console.error("File upload failed");
          setUploadError(
            "Failed to upload file. Please check your connection and try again."
          );
          return;
        }
      }

      const tableName =
        documentType === "location" ? "location_documents" : "unit_documents";
      const insertData: any = {
        document_name: newDocument.document_name,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        description: newDocument.description || null,
        company_id: companyId,
        status: "active",
      };

      if (documentType === "location") {
        insertData.location_id = locationId;
      } else {
        insertData.unit_id = unitId;
        insertData.location_id = locationId; // We'll need to get this from the unit
      }

      const { error } = await supabase.from(tableName).insert(insertData);

      if (error) throw error;

      // Reset form
      setNewDocument({
        document_name: "",
        description: "",
      });
      setSelectedFile(null);

      // Close modal and refresh
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating document:", error);
      if (error instanceof Error) {
        if (error.message.includes("upload")) {
          setUploadError("File upload failed: " + error.message);
        } else {
          setUploadError("Failed to create document: " + error.message);
        }
      } else {
        setUploadError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                Add New Document
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                Upload a document for this {documentType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 sm:space-y-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Name *
              </label>
              <input
                type="text"
                required
                value={newDocument.document_name}
                onChange={(e) =>
                  setNewDocument({
                    ...newDocument,
                    document_name: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                placeholder="Enter document name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document File
            </label>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  id="file-upload"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors min-h-[120px] flex items-center justify-center">
                  <div className="px-4 sm:px-6 py-6 sm:py-8 text-center w-full">
                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                          <FileText className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 break-words">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          Tap to change file
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Tap to upload document file
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, DOC, DOCX, JPG, PNG, TXT up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{uploadError}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newDocument.description}
              onChange={(e) =>
                setNewDocument({ ...newDocument, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
              placeholder="Enter any additional description about this document..."
            />
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base"
            >
              {uploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </div>
              ) : (
                "Add Document"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocumentModal;
