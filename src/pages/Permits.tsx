import React, { useState, useEffect } from "react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import { FileCheck, Plus, Search, X, Edit, Trash2 } from "lucide-react";
import AddPermitModal from "../components/permits/AddPermitModal";
import ViewPermitFileModal from "../components/permits/ViewPermitFileModal";
import EditPermitModal from "../components/permits/EditPermitModal";

type Permit = Database["public"]["Tables"]["permits"]["Row"];

const Permits: React.FC = () => {
  const { supabase } = useSupabase();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    filePath: string;
    fileName: string;
    fileType: string;
  } | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    permit_number: "",
    mobile: "",
    city: "",
    county: "",
    status: "",
    notes: "",
    location: "",
  });

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("permits")
        .select(
          `
          *,
          locations (
            id,
            name,
            address,
            city,
            state,
            companies (
              name
            )
          ),
          companies (
            id,
            name,
            city,
            state
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (error) {
      console.error("Error fetching permits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermitAdded = () => {
    fetchPermits();
  };

  const handleEditPermit = (permit: Permit) => {
    setSelectedPermit(permit);
    setShowEditModal(true);
  };

  const handleDeletePermit = async (permitId: string) => {
    if (!supabase) return;

    if (window.confirm("Are you sure you want to delete this permit?")) {
      try {
        const { error } = await supabase
          .from("permits")
          .delete()
          .eq("id", permitId);

        if (error) throw error;

        // Refresh the permits list
        fetchPermits();
      } catch (error) {
        console.error("Error deleting permit:", error);
        alert("Failed to delete permit");
      }
    }
  };

  const handlePermitEdited = () => {
    fetchPermits();
    setShowEditModal(false);
    setSelectedPermit(null);
  };

  const clearSearch = () => {
    setSearchFilters({
      permit_number: "",
      mobile: "",
      city: "",
      county: "",
      status: "",
      notes: "",
      location: "",
    });
  };

  const filteredPermits = permits.filter((permit) => {
    // Check if any search filter is active
    const hasActiveFilters = Object.values(searchFilters).some(
      (filter) => filter.trim() !== ""
    );

    if (!hasActiveFilters) return true;

    return (
      (searchFilters.permit_number === "" ||
        permit.permit_number
          .toLowerCase()
          .includes(searchFilters.permit_number.toLowerCase())) &&
      (searchFilters.mobile === "" ||
        (permit.mobile &&
          permit.mobile
            .toLowerCase()
            .includes(searchFilters.mobile.toLowerCase()))) &&
      (searchFilters.city === "" ||
        permit.city.toLowerCase().includes(searchFilters.city.toLowerCase())) &&
      (searchFilters.county === "" ||
        permit.county
          .toLowerCase()
          .includes(searchFilters.county.toLowerCase())) &&
      (searchFilters.location === "" ||
        (permit.locations &&
          (permit.locations.name
            .toLowerCase()
            .includes(searchFilters.location.toLowerCase()) ||
            permit.locations.companies.name
              .toLowerCase()
              .includes(searchFilters.location.toLowerCase()) ||
            permit.locations.city
              .toLowerCase()
              .includes(searchFilters.location.toLowerCase())))) &&
      (searchFilters.status === "" ||
        permit.status
          .toLowerCase()
          .includes(searchFilters.status.toLowerCase())) &&
      (searchFilters.notes === "" ||
        (permit.notes &&
          permit.notes
            .toLowerCase()
            .includes(searchFilters.notes.toLowerCase())))
    );
  });

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
    <div className="w-full px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Permits Management</h1>
      </div>

      {/* Permits List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Permits</h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredPermits.length} permit
                {filteredPermits.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Permit
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Search Permits:
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <input
                type="text"
                placeholder="Location"
                value={searchFilters.location}
                onChange={(e) =>
                  setSearchFilters({
                    ...searchFilters,
                    location: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Permit #"
                value={searchFilters.permit_number}
                onChange={(e) =>
                  setSearchFilters({
                    ...searchFilters,
                    permit_number: e.target.value,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="City"
                value={searchFilters.city}
                onChange={(e) =>
                  setSearchFilters({ ...searchFilters, city: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="County"
                value={searchFilters.county}
                onChange={(e) =>
                  setSearchFilters({ ...searchFilters, county: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Mobile"
                value={searchFilters.mobile}
                onChange={(e) =>
                  setSearchFilters({ ...searchFilters, mobile: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Status"
                value={searchFilters.status}
                onChange={(e) =>
                  setSearchFilters({ ...searchFilters, status: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="text"
                placeholder="Notes"
                value={searchFilters.notes}
                onChange={(e) =>
                  setSearchFilters({ ...searchFilters, notes: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-2"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permit Number
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  County
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
                  Notes
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermits.map((permit) => (
                <tr
                  key={permit.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-8 py-4 whitespace-nowrap">
                    {permit.locations ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {permit.locations.companies.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {permit.locations.name} • {permit.locations.city},{" "}
                          {permit.locations.state}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-gray-900">
                          {permit.city}
                        </div>
                        <div className="text-sm text-gray-500">
                          {permit.county}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {permit.permit_number}
                    </div>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-900">
                    {permit.city}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-900">
                    {permit.county}
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
                    {permit.file_path && permit.file_path.trim() !== "" ? (
                      <button
                        onClick={() => {
                          try {
                            setSelectedFile({
                              filePath: permit.file_path!,
                              fileName: permit.file_name || "Unknown file",
                              fileType:
                                permit.file_type || "application/octet-stream",
                            });
                            setShowFileModal(true);
                          } catch (error) {
                            console.error(
                              "Error setting selected file:",
                              error
                            );
                          }
                        }}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors underline"
                      >
                        <FileCheck className="w-4 h-4 mr-1" />
                        View File
                      </button>
                    ) : (
                      <span className="text-gray-400">No file</span>
                    )}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500">
                    {permit.notes ? (
                      <button
                        onClick={() => {
                          setSelectedNotes(permit.notes);
                          setShowNotesModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors underline"
                      >
                        View Notes
                      </button>
                    ) : (
                      <span className="text-gray-400">No notes</span>
                    )}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(permit.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditPermit(permit)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit permit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePermit(permit.id)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        title="Delete permit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPermits.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {Object.values(searchFilters).some(
                  (filter) => filter.trim() !== ""
                )
                  ? "No permits found matching your search"
                  : "No permits found"}
              </h3>
              <p className="text-gray-500">
                {Object.values(searchFilters).some(
                  (filter) => filter.trim() !== ""
                )
                  ? "Try adjusting your search criteria"
                  : "Get started by adding your first permit"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Permit Modal */}
      <AddPermitModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handlePermitAdded}
      />

      {/* Edit Permit Modal */}
      {showEditModal && selectedPermit && (
        <EditPermitModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPermit(null);
          }}
          onSuccess={handlePermitEdited}
          permit={selectedPermit}
        />
      )}

      {/* View File Modal */}
      {showFileModal && selectedFile && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading file viewer...</p>
                </div>
              </div>
            </div>
          }
        >
          <ViewPermitFileModal
            isOpen={showFileModal}
            onClose={() => {
              setShowFileModal(false);
              setSelectedFile(null);
            }}
            filePath={selectedFile.filePath}
            fileName={selectedFile.fileName}
            fileType={selectedFile.fileType}
          />
        </React.Suspense>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Permit Notes
                  </h2>
                  <p className="text-sm text-gray-500">
                    View permit details and notes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Notes:
                </h3>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {selectedNotes}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowNotesModal(false)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Permits;
