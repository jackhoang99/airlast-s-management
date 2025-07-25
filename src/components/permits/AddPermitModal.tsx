import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { FileCheck, Upload, X } from "lucide-react";

interface AddPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedLocationId?: string;
  preSelectedCompanyId?: string;
}

const AddPermitModal: React.FC<AddPermitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedLocationId,
  preSelectedCompanyId,
}) => {
  const { supabase, session } = useSupabase();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newPermit, setNewPermit] = useState({
    permit_number: "",
    mobile: "",
    city: "",
    county: "",
    notes: "",
    company_id: preSelectedCompanyId || "",
    location_id: preSelectedLocationId || "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [companies, setCompanies] = useState<
    Array<{
      id: string;
      name: string;
      city: string;
      state: string;
    }>
  >([]);
  const [locations, setLocations] = useState<
    Array<{
      id: string;
      name: string;
      address: string;
      city: string;
      state: string;
      company_id: string;
    }>
  >([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (!supabase) return;

      try {
        setLoadingCompanies(true);
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, city, state")
          .order("name");

        if (error) throw error;
        setCompanies(data || []);
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoadingCompanies(false);
      }
    };

    if (isOpen) {
      fetchCompanies();
      // If we have pre-selected values, fetch locations for the company
      if (preSelectedCompanyId) {
        fetchLocationsForCompany(preSelectedCompanyId);
      }
    }
  }, [supabase, isOpen, preSelectedCompanyId]);

  const fetchLocationsForCompany = async (companyId: string) => {
    if (!supabase) return;

    try {
      setLoadingLocations(true);
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, address, city, state, company_id")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      if (!supabase || !newPermit.company_id) {
        setLocations([]);
        return;
      }

      fetchLocationsForCompany(newPermit.company_id);
    };

    fetchLocations();
  }, [supabase, newPermit.company_id]);

  const handleCompanyChange = (companyId: string) => {
    setNewPermit({
      ...newPermit,
      company_id: companyId,
      location_id: "",
      city: "",
    });
  };

  const handleLocationChange = (locationId: string) => {
    const selectedLocation = locations.find((loc) => loc.id === locationId);
    setNewPermit({
      ...newPermit,
      location_id: locationId,
      city: selectedLocation ? selectedLocation.city : "",
    });
  };

  // Auto-populate city when location is pre-selected
  useEffect(() => {
    if (preSelectedLocationId && locations.length > 0) {
      const selectedLocation = locations.find(
        (loc) => loc.id === preSelectedLocationId
      );
      if (selectedLocation) {
        setNewPermit((prev) => ({
          ...prev,
          city: selectedLocation.city,
        }));
      }
    }
  }, [preSelectedLocationId, locations]);

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

      // Since the bucket exists, proceed with upload
      console.log("Proceeding with file upload to permits bucket");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `permits/${fileName}`;

      console.log("Uploading file:", file.name, "to path:", filePath);

      const { data, error: uploadError } = await supabase.storage
        .from("permits")
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
        }
      }

      const { error } = await supabase.from("permits").insert({
        permit_number: newPermit.permit_number,
        mobile: newPermit.mobile || null,
        city: newPermit.city,
        county: newPermit.county,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        notes: newPermit.notes || null,
        location_id: newPermit.location_id || null,
        company_id: newPermit.company_id || null,
        status: "active",
      });

      if (error) throw error;

      // Reset form
      setNewPermit({
        permit_number: "",
        mobile: "",
        city: "",
        county: "",
        notes: "",
        company_id: "",
        location_id: "",
      });
      setSelectedFile(null);

      // Close modal and refresh
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating permit:", error);
      if (error instanceof Error) {
        if (error.message.includes("upload")) {
          setUploadError("File upload failed: " + error.message);
        } else {
          setUploadError("Failed to create permit: " + error.message);
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
              <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                Add New Permit
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                Create a new permit record with file attachment
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
                Company *
              </label>
              <select
                required
                value={newPermit.company_id}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
              >
                <option value="">Select a company</option>
                {loadingCompanies ? (
                  <option disabled>Loading companies...</option>
                ) : (
                  companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} ({company.city}, {company.state})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <select
                required
                value={newPermit.location_id}
                onChange={(e) => handleLocationChange(e.target.value)}
                disabled={!newPermit.company_id}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed text-base"
              >
                <option value="">
                  {!newPermit.company_id
                    ? "Select a company first"
                    : "Select a location"}
                </option>
                {loadingLocations ? (
                  <option disabled>Loading locations...</option>
                ) : (
                  locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.city}, {location.state})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permit Number *
              </label>
              <input
                type="text"
                required
                value={newPermit.permit_number}
                onChange={(e) =>
                  setNewPermit({ ...newPermit, permit_number: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                placeholder="Enter permit number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile
              </label>
              <input
                type="tel"
                value={newPermit.mobile}
                onChange={(e) =>
                  setNewPermit({ ...newPermit, mobile: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                placeholder="Enter mobile number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
                {preSelectedLocationId && (
                  <span className="text-xs text-gray-500 ml-1">
                    (pre-filled from location)
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                value={newPermit.city}
                onChange={(e) =>
                  setNewPermit({ ...newPermit, city: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                County *
              </label>
              <input
                type="text"
                required
                value={newPermit.county}
                onChange={(e) =>
                  setNewPermit({ ...newPermit, county: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                placeholder="Enter county"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permit File
            </label>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  id="file-upload"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors min-h-[120px] flex items-center justify-center">
                  <div className="px-4 sm:px-6 py-6 sm:py-8 text-center w-full">
                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                          <FileCheck className="w-6 h-6 text-green-600" />
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
                            Tap to upload permit file
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PDF, DOC, DOCX, JPG, PNG up to 10MB
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
              Notes
            </label>
            <textarea
              value={newPermit.notes}
              onChange={(e) =>
                setNewPermit({ ...newPermit, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
              placeholder="Enter any additional notes about this permit..."
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
                "Add Permit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPermitModal;
