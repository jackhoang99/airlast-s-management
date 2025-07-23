import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import {
  FileCheck,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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

interface PermitSectionMobileProps {
  locationId: string;
  companyId: string;
  title?: string;
}

const PermitSectionMobile: React.FC<PermitSectionMobileProps> = ({
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
  const [isExpanded, setIsExpanded] = useState(false);

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
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center">
            <FileCheck className="h-4 w-4 text-blue-500 mr-2" />
            {title} ({permits.length})
          </h3>
          <button
            onClick={handleAddPermit}
            className="btn btn-primary btn-xs"
            disabled={!locationId}
          >
            <Plus size={12} className="mr-1" /> Add
          </button>
        </div>
        <div className="flex justify-center items-center h-12">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center">
          <FileCheck className="h-4 w-4 text-blue-500 mr-2" />
          {title} ({permits.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddPermit}
            className="btn btn-primary btn-xs"
            disabled={!locationId}
          >
            <Plus size={12} className="mr-1" /> Add
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {permits.length === 0 ? (
            <div className="text-center py-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileCheck className="w-5 h-5 text-gray-400" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                No permits found
              </h4>
              <p className="text-xs text-gray-500 mb-2">
                {locationId
                  ? "Add your first permit for this location"
                  : "No location selected"}
              </p>
              <button
                onClick={handleAddPermit}
                className="btn btn-primary btn-xs"
                disabled={!locationId}
              >
                <Plus size={12} className="mr-1" />
                Add Permit
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {permits.map((permit) => (
                <div
                  key={permit.id}
                  className="border border-gray-200 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {permit.permit_number}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            permit.status || "pending"
                          )}`}
                        >
                          {permit.status || "pending"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <span>🏢</span>
                          <span className="font-medium">
                            {permit.locations?.companies?.name ||
                              "Unknown Company"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          <span>
                            {permit.locations?.name} • {permit.locations?.city},{" "}
                            {permit.locations?.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🏙️</span>
                          <span>
                            {permit.city}, {permit.county}
                          </span>
                        </div>
                        {permit.mobile && (
                          <div className="flex items-center gap-1">
                            <span>📱</span>
                            <span>{permit.mobile}</span>
                          </div>
                        )}
                        {permit.created_at && (
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>{formatDate(permit.created_at)}</span>
                          </div>
                        )}
                        {permit.file_name && (
                          <div className="flex items-center gap-1">
                            <FileCheck className="w-3 h-3 text-green-600" />
                            <button
                              onClick={() => handleViewPermit(permit)}
                              className="text-blue-600"
                            >
                              View File
                            </button>
                          </div>
                        )}
                        {permit.notes && (
                          <div className="flex items-center gap-1">
                            <span>📝</span>
                            <button
                              onClick={() => {
                                setSelectedPermit(permit);
                                setShowNotesModal(true);
                              }}
                              className="text-blue-600"
                            >
                              View Notes
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleEditPermit(permit)}
                        className="p-1 text-indigo-600 hover:text-indigo-800"
                        title="Edit permit"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeletePermit(permit.id)}
                        disabled={deletingPermit === permit.id}
                        className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Delete permit"
                      >
                        {deletingPermit === permit.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

export default PermitSectionMobile;
