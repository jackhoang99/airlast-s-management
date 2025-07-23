import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import { FileCheck, Plus, Edit, Trash2, Download } from "lucide-react";
import AddPermitModal from "./AddPermitModal";
import EditPermitModal from "./EditPermitModal";
import ViewPermitFileModal from "./ViewPermitFileModal";

type Permit = Database["public"]["Tables"]["permits"]["Row"] & {
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    companies?: {
      name: string;
    };
  };
};

interface PermitSectionProps {
  locationId: string;
  companyId: string;
  title?: string;
}

const PermitSection: React.FC<PermitSectionProps> = ({
  locationId,
  companyId,
  title = "Permits",
}) => {
  const { supabase } = useSupabase();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [deletingPermit, setDeletingPermit] = useState<string | null>(null);

  useEffect(() => {
    fetchPermits();
  }, [locationId, companyId]);

  const fetchPermits = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      if (!locationId) {
        setPermits([]);
        return;
      }

      const { data, error } = await supabase
        .from("permits")
        .select(
          `
          *,
          locations (
            name,
            address,
            city,
            state,
            companies (
              name
            )
          )
        `
        )
        .eq("location_id", locationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (error) {
      console.error("Error fetching permits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermit = () => {
    setShowAddModal(true);
  };

  const handleEditPermit = (permit: Permit) => {
    setSelectedPermit(permit);
    setShowEditModal(true);
  };

  const handleViewPermit = (permit: Permit) => {
    setSelectedPermit(permit);
    setShowViewModal(true);
  };

  const handleDeletePermit = async (permitId: string) => {
    if (!supabase || !confirm("Are you sure you want to delete this permit?"))
      return;

    try {
      setDeletingPermit(permitId);

      // First get the permit to check if it has a file
      const { data: permit } = await supabase
        .from("permits")
        .select("file_path")
        .eq("id", permitId)
        .single();

      // Delete the file from storage if it exists
      if (permit?.file_path) {
        await supabase.storage.from("permits").remove([permit.file_path]);
      }

      // Delete the permit record
      const { error } = await supabase
        .from("permits")
        .delete()
        .eq("id", permitId);

      if (error) throw error;

      // Refresh the permits list
      fetchPermits();
    } catch (error) {
      console.error("Error deleting permit:", error);
      alert("Failed to delete permit. Please try again.");
    } finally {
      setDeletingPermit(null);
    }
  };

  const handlePermitSuccess = () => {
    fetchPermits();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary-600" />
            {title}
          </h2>
          <button
            onClick={handleAddPermit}
            className="btn btn-primary btn-xs"
            disabled
          >
            <Plus size={14} className="mr-1" /> Add Permit
          </button>
        </div>
        <div className="flex justify-center items-center h-16">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-medium flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-primary-600" />
          {title} ({permits.length})
        </h2>
        <button
          onClick={handleAddPermit}
          className="btn btn-primary btn-xs"
          disabled={!locationId}
        >
          <Plus size={14} className="mr-1" /> Add Permit
        </button>
      </div>

      {permits.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileCheck className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">
            No permits found
          </h3>
          <p className="text-gray-500 mb-3 text-sm">
            {locationId
              ? "Get started by adding your first permit for this location"
              : "No location selected"}
          </p>
          <button
            onClick={handleAddPermit}
            className="btn btn-primary btn-sm"
            disabled={!locationId}
          >
            <Plus size={14} className="mr-1" />
            Add Permit
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permit Number
                </th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  City
                </th>
                <th className="hidden lg:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  County
                </th>
                <th className="hidden xl:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="hidden lg:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="hidden xl:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permits.map((permit) => (
                <tr key={permit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {permit.locations?.companies?.name || "Unknown Company"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {permit.locations?.name} • {permit.locations?.city},{" "}
                        {permit.locations?.state}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {permit.permit_number}
                  </td>
                  <td className="hidden md:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {permit.city}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {permit.county}
                  </td>
                  <td className="hidden xl:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {permit.mobile || "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        permit.status || "pending"
                      )}`}
                    >
                      {permit.status || "pending"}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {permit.file_name ? (
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-green-600" />
                        <button
                          onClick={() => handleViewPermit(permit)}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          View File
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">No file</span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {permit.notes ? (
                      <button
                        onClick={() => {
                          setSelectedPermit(permit);
                          setShowNotesModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        View Notes
                      </button>
                    ) : (
                      <span className="text-gray-400">No notes</span>
                    )}
                  </td>
                  <td className="hidden xl:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {permit.created_at ? formatDate(permit.created_at) : "-"}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditPermit(permit)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit permit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePermit(permit.id)}
                        disabled={deletingPermit === permit.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete permit"
                      >
                        {deletingPermit === permit.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Permit Modal */}
      <AddPermitModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handlePermitSuccess}
        preSelectedLocationId={locationId || undefined}
        preSelectedCompanyId={companyId || undefined}
      />

      {/* Edit Permit Modal */}
      {selectedPermit && (
        <EditPermitModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPermit(null);
          }}
          onSuccess={handlePermitSuccess}
          permit={selectedPermit}
        />
      )}

      {/* View Permit File Modal */}
      {selectedPermit &&
        selectedPermit.file_path &&
        selectedPermit.file_name &&
        selectedPermit.file_type && (
          <ViewPermitFileModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setSelectedPermit(null);
            }}
            filePath={selectedPermit.file_path}
            fileName={selectedPermit.file_name}
            fileType={selectedPermit.file_type}
          />
        )}

      {/* Notes Modal */}
      {showNotesModal && selectedPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Permit Notes
                </h3>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedPermit(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permit Number
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedPermit.permit_number}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedPermit.notes || "No notes available"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermitSection;
