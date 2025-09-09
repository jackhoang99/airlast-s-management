import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import { FileCheck, X, Upload, Trash2 } from "lucide-react";

type Permit = Database["public"]["Tables"]["permits"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];

interface EditPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  permit: Permit;
}

const EditPermitModal: React.FC<EditPermitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  permit,
}) => {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_id: permit.company_id || "",
    location_id: permit.location_id || "",
    permit_number: permit.permit_number || "",
    city: permit.city || "",
    county: permit.county || "",
    mobile: permit.mobile || "",
    status: permit.status || "pending",
    notes: permit.notes || "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      if (formData.company_id) {
        fetchLocations(formData.company_id);
      }
    }
  }, [isOpen, formData.company_id]);

  const fetchCompanies = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchLocations = async (companyId: string) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setFormData((prev) => ({
      ...prev,
      company_id: companyId,
      location_id: "",
      city: "",
    }));
    setLocations([]);
    if (companyId) {
      fetchLocations(companyId);
    }
  };

  const handleLocationChange = (locationId: string) => {
    const selectedLocation = locations.find((loc) => loc.id === locationId);
    setFormData((prev) => ({
      ...prev,
      location_id: locationId,
      city: selectedLocation ? selectedLocation.city : prev.city,
    }));
  };

  // Auto-populate city when location changes
  useEffect(() => {
    if (formData.location_id && locations.length > 0) {
      const selectedLocation = locations.find(
        (loc) => loc.id === formData.location_id
      );
      if (selectedLocation) {
        setFormData((prev) => ({
          ...prev,
          city: selectedLocation.city,
        }));
      }
    }
  }, [formData.location_id, locations]);

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

      let filePath = permit.file_path;
      let fileName = permit.file_name;
      let fileType = permit.file_type;

      // Upload new file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();

        // Sanitize filename by removing/replacing invalid characters
        const sanitizedFileName = selectedFile.name
          .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace invalid chars with underscore
          .replace(/_{2,}/g, "_") // Replace multiple underscores with single
          .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

        const fileNameWithExt = `${Date.now()}-${sanitizedFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("permits")
          .upload(fileNameWithExt, selectedFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setUploadError("Failed to upload file. Please try again.");
          return;
        }

        filePath = fileNameWithExt;
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      }

      // Update permit
      const { error } = await supabase
        .from("permits")
        .update({
          company_id: formData.company_id || null,
          location_id: formData.location_id || null,
          permit_number: formData.permit_number,
          city: formData.city,
          county: formData.county,
          mobile: formData.mobile,
          status: formData.status,
          notes: formData.notes,
          file_path: filePath,
          file_name: fileName,
          file_type: fileType,
        })
        .eq("id", permit.id);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error("Error updating permit:", error);
      setUploadError("Failed to update permit. Please try again.");
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
              <FileCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Permit
              </h2>
              <p className="text-sm text-gray-500">Update permit information</p>
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
          {/* Company and Location Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company *
              </label>
              <select
                value={formData.company_id}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={formData.location_id}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.company_id}
              >
                <option value="">Select a location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} • {location.city}, {location.state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Permit Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permit Number *
              </label>
              <input
                type="text"
                value={formData.permit_number}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    permit_number: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
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
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
                {formData.location_id && (
                  <span className="text-xs text-gray-500 ml-1">
                    (pre-filled from location)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, city: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                County
              </label>
              <input
                type="text"
                value={formData.county}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, county: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile
              </label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mobile: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permit File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileCheck className="w-5 h-5 text-green-600 mr-2" />
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
              ) : permit.file_name ? (
                <div className="flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">
                    Current file: {permit.file_name}
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
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional notes..."
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
              {loading ? "Updating..." : "Update Permit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPermitModal;
