import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import { FileText, X, Upload, Trash2 } from "lucide-react";

type LocationDocument =
  Database["public"]["Tables"]["location_documents"]["Row"];
type UnitDocument = Database["public"]["Tables"]["unit_documents"]["Row"];

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: LocationDocument | UnitDocument;
  documentType: "location" | "unit";
}

const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  document,
  documentType,
}) => {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    document_name: document.document_name || "",
    document_type: document.document_type || "",
    description: document.description || "",
    status: document.status || "active",
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      setLoading(true);
      setUploadError(null);

      let filePath = document.file_path;
      let fileName = document.file_name;
      let fileType = document.file_type;

      // Upload new file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const sanitizedFileName = selectedFile.name
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .replace(/_{2,}/g, "_")
          .replace(/^_|_$/g, "");

        const fileNameWithExt = `${Date.now()}-${sanitizedFileName}`;
        const bucketName =
          documentType === "location" ? "location-documents" : "unit-documents";
        const companyId = document.company_id;
        const locationId =
          documentType === "location"
            ? document.location_id
            : (document as UnitDocument).location_id;
        const unitId =
          documentType === "unit" ? (document as UnitDocument).unit_id : null;
        const fullPath = `${companyId}/${locationId}/${
          unitId || locationId
        }/${fileNameWithExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fullPath, selectedFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setUploadError("Failed to upload file. Please try again.");
          return;
        }

        filePath = fullPath;
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      // Update document
      const tableName =
        documentType === "location" ? "location_documents" : "unit_documents";
      const { error } = await supabase
        .from(tableName)
        .update({
          document_name: formData.document_name,
          document_type: formData.document_type,
          description: formData.description,
          status: formData.status,
          file_path: filePath,
          file_name: fileName,
          file_type: fileType,
        })
        .eq("id", document.id);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error("Error updating document:", error);
      setUploadError("Failed to update document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Document
              </h2>
              <p className="text-sm text-gray-500">
                Update document information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 sm:space-y-6"
        >
          {/* Document Details */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Name *
              </label>
              <input
                type="text"
                value={formData.document_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    document_name: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={formData.document_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    document_type: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select document type</option>
                <option value="contract">Contract</option>
                <option value="warranty">Warranty</option>
                <option value="manual">Manual</option>
                <option value="certificate">Certificate</option>
                <option value="permit">Permit</option>
                <option value="inspection">Inspection Report</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm text-gray-900">
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : document.file_name ? (
                <div className="flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">
                    Current file: {document.file_name}
                  </span>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX, JPG, PNG (max 10MB)
                  </p>
                </div>
              )}
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                Choose File
              </label>
            </div>
            {uploadError && (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional description..."
            />
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDocumentModal;
