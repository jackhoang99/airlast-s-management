import React, { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import { FileCheck, Upload } from "lucide-react";

type Permit = Database["public"]["Tables"]["permits"]["Row"];

const Permits: React.FC = () => {
  const { supabase, session } = useSupabase();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newPermit, setNewPermit] = useState({
    permit_number: "",
    mobile: "",
    city: "",
    county: "",
    notes: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("permits")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (error) {
      console.error("Error fetching permits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!supabase) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `permits/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("permits")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

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
        filePath = await uploadFile(selectedFile);
        if (filePath) {
          fileName = selectedFile.name;
          fileSize = selectedFile.size;
          fileType = selectedFile.type;
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
        created_by: session.user.id,
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
      });
      setSelectedFile(null);

      // Refresh permits list
      fetchPermits();
    } catch (error) {
      console.error("Error creating permit:", error);
    } finally {
      setUploading(false);
    }
  };

  const getFileUrl = (filePath: string) => {
    if (!supabase) return null;
    const { data } = supabase.storage.from("permits").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Permits Management
        </h1>
        <p className="text-gray-600">
          Manage and track all your permits in one place
        </p>
      </div>

      {/* Add New Permit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <FileCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Add New Permit
            </h2>
            <p className="text-sm text-gray-500">
              Create a new permit record with file attachment
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter mobile number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                required
                value={newPermit.city}
                onChange={(e) =>
                  setNewPermit({ ...newPermit, city: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="px-6 py-8 text-center">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                          <FileCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          Click to change file
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Click to upload permit file
                          </p>
                          <p className="text-xs text-gray-500">
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter any additional notes about this permit..."
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {uploading ? (
                <div className="flex items-center">
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

      {/* Permits List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Permits</h2>
              <p className="text-sm text-gray-500 mt-1">
                {permits.length} permit{permits.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permit Number
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permits.map((permit) => (
                <tr
                  key={permit.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-8 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {permit.permit_number}
                    </div>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{permit.city}</div>
                    <div className="text-sm text-gray-500">{permit.county}</div>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500">
                    {permit.mobile || "-"}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        permit.status === "active"
                          ? "bg-green-100 text-green-800"
                          : permit.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : permit.status === "expired"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {permit.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500">
                    {permit.file_path ? (
                      <a
                        href={getFileUrl(permit.file_path) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <FileCheck className="w-4 h-4 mr-1" />
                        {permit.file_name}
                      </a>
                    ) : (
                      <span className="text-gray-400">No file</span>
                    )}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(permit.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {permits.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No permits found
              </h3>
              <p className="text-gray-500">
                Get started by adding your first permit above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Permits;
