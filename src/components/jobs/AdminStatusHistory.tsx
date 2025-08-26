import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Calendar,
} from "lucide-react";

interface AdminStatusHistoryProps {
  jobId: string;
  technicianId: string;
  technicianName: string;
  isPrimary?: boolean;
  onRefresh?: () => void;
}

interface StatusHistory {
  id: string;
  status: string;
  created_at: string;
  notes?: string;
}

interface CurrentStatus {
  id: string;
  status: string;
  updated_at: string;
}

const AdminStatusHistory = ({
  jobId,
  technicianId,
  technicianName,
  isPrimary = false,
  onRefresh,
}: AdminStatusHistoryProps) => {
  const { supabase } = useSupabase();
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin editing states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusHistory | null>(
    null
  );
  const [newStatus, setNewStatus] = useState<string>("working");
  const [newNotes, setNewNotes] = useState<string>("");
  const [newStatusTime, setNewStatusTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = [
    { value: "traveling", label: "Traveling", icon: Clock },
    { value: "working", label: "Working", icon: User },
    { value: "waiting on site", label: "Waiting on Site", icon: AlertCircle },
    { value: "tech completed", label: "Tech Completed", icon: CheckCircle },
  ];

  useEffect(() => {
    fetchStatusHistory();
  }, [jobId, technicianId]);

  const fetchStatusHistory = async () => {
    if (!supabase || !jobId || !technicianId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch current status
      const { data: currentData, error: currentError } = await supabase
        .from("job_technician_status")
        .select("*")
        .eq("job_id", jobId)
        .eq("technician_id", technicianId)
        .maybeSingle();

      if (currentError) {
        throw currentError;
      }

      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from("job_technician_status_history")
        .select("*")
        .eq("job_id", jobId)
        .eq("technician_id", technicianId)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      console.log("Fetched current status:", currentData);
      console.log("Fetched status history:", historyData);
      console.log("Setting status history in state:", historyData || []);
      setCurrentStatus(currentData);
      setStatusHistory(historyData || []);
    } catch (err) {
      console.error("Error fetching status history:", err);
      setError("Failed to load status history");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "traveling":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "working":
        return <User className="h-4 w-4 text-orange-500" />;
      case "waiting on site":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "tech completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "traveling":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "working":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "waiting on site":
        return "bg-red-50 text-red-700 border-red-200";
      case "tech completed":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleAddStatus = async () => {
    if (!supabase || !jobId || !technicianId || !newStatus) return;

    // Validate that a date/time is selected
    if (!newStatusTime) {
      setError("Please select a date and time for this status");
      return;
    }

    setIsSubmitting(true);
    setError(null); // Clear any previous errors
    try {
      const statusTime = new Date(newStatusTime).toISOString();
      console.log("Adding status:", {
        jobId,
        technicianId,
        newStatus,
        newNotes,
        statusTime,
      });

      // Add to status history
      const { error: historyError } = await supabase
        .from("job_technician_status_history")
        .insert({
          job_id: jobId,
          technician_id: technicianId,
          status: newStatus,
          notes: newNotes || null,
          created_at: statusTime,
        });

      if (historyError) throw historyError;

      console.log("History added successfully, updating current status...");

      // Update current status using upsert with conflict resolution
      const { error: currentError } = await supabase
        .from("job_technician_status")
        .upsert(
          {
            job_id: jobId,
            technician_id: technicianId,
            status: newStatus,
            updated_at: statusTime,
          },
          {
            onConflict: "job_id,technician_id",
          }
        );

      if (currentError) {
        console.error("Error updating current status:", currentError);
        throw currentError;
      }

      // Reset form
      setNewStatus("working");
      setNewNotes("");
      setNewStatusTime("");
      setShowAddModal(false);

      // Refresh data
      await fetchStatusHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error adding status:", err);
      setError("Failed to add status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStatus = async () => {
    if (!supabase || !editingStatus) return;

    setIsSubmitting(true);
    setError(null); // Clear any previous errors
    try {
      console.log("Saving edit with notes:", newNotes);

      // Convert datetime-local value to ISO string
      const statusTime = newStatusTime
        ? new Date(newStatusTime).toISOString()
        : editingStatus.created_at;

      console.log("Updating status with data:", {
        id: editingStatus.id,
        status: newStatus,
        notes: newNotes || null,
        created_at: statusTime,
      });
      console.log(
        "Current user context - supabase:",
        !!supabase,
        "editingStatus:",
        !!editingStatus
      );

      const { data: updateData, error } = await supabase
        .from("job_technician_status_history")
        .update({
          status: newStatus,
          notes: newNotes || null,
          created_at: statusTime,
        })
        .eq("id", editingStatus.id)
        .select();

      console.log("Update result:", { data: updateData, error });

      if (error) {
        console.error("Error updating status history:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log("Status history updated successfully");

      // If this is the most recent status, update current status too
      if (
        statusHistory.length > 0 &&
        statusHistory[0].id === editingStatus.id
      ) {
        const { error: currentError } = await supabase
          .from("job_technician_status")
          .upsert(
            {
              job_id: jobId,
              technician_id: technicianId,
              status: newStatus,
              updated_at: statusTime,
            },
            {
              onConflict: "job_id,technician_id",
            }
          );

        if (currentError) throw currentError;
      }

      setEditingStatus(null);
      setNewStatus("working");
      setNewNotes("");
      setNewStatusTime("");
      setShowEditModal(false);

      console.log("Refreshing data after edit...");
      await fetchStatusHistory();
      if (onRefresh) onRefresh();
      console.log("Data refresh completed");
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    console.log("handleDeleteStatus called with ID:", statusId);

    if (
      !supabase ||
      !confirm("Are you sure you want to delete this status entry?")
    )
      return;

    console.log("Delete confirmed, proceeding with deletion...");
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("job_technician_status_history")
        .delete()
        .eq("id", statusId);

      if (error) throw error;

      await fetchStatusHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error deleting status:", err);
      setError("Failed to delete status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (status: StatusHistory) => {
    console.log("Editing status:", status);
    setEditingStatus(status);
    setNewStatus(status.status);
    setNewNotes(status.notes || "");
    setNewStatusTime(status.created_at.slice(0, 16)); // Format for datetime-local input
    setShowEditModal(true);
    console.log("Edit modal should now be visible, showEditModal:", true);
  };

  const handleCancelEdit = () => {
    setEditingStatus(null);
    setNewStatus("working");
    setNewNotes("");
    setNewStatusTime("");
    setShowEditModal(false);
  };

  const handleCancelAdd = () => {
    setNewStatus("working");
    setNewNotes("");
    setNewStatusTime("");
    setShowAddModal(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-3 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {technicianName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
            <div>
              <div className="font-medium">
                {technicianName}
                {isPrimary && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                    Primary
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {currentStatus ? (
                  <>
                    Current Status:{" "}
                    <span className="capitalize">{currentStatus.status}</span>
                  </>
                ) : (
                  "No current status"
                )}
              </div>
            </div>
          </div>

          {currentStatus && (
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs ${getStatusColor(
                currentStatus.status
              )}`}
            >
              {getStatusIcon(currentStatus.status)}
              <span className="capitalize">{currentStatus.status}</span>
            </div>
          )}
        </div>

        {/* Status History */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-800">
              Status History
            </h4>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-2 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Status
            </button>
          </div>

          {statusHistory.length > 0 ? (
            <div className="space-y-2">
              {statusHistory
                .filter(
                  (status) =>
                    !status.notes || !status.notes.includes("Status ended")
                )
                .map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(status.status)}
                        <div>
                          <span className="text-sm font-medium capitalize">
                            {status.status}
                          </span>
                          {status.notes &&
                            !status.notes.includes("Status started") && (
                              <div className="text-xs text-gray-500 mt-1">
                                {status.notes}
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-500">
                          {formatDateTime(status.created_at)}
                        </div>
                        <button
                          onClick={() => {
                            console.log(
                              "Edit button clicked for status:",
                              status
                            );
                            handleEditClick(status);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit status"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            console.log(
                              "Delete button clicked for status ID:",
                              status.id
                            );
                            handleDeleteStatus(status.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete status"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No status history available
            </p>
          )}
        </div>
      </div>

      {/* Add Status Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Status</h3>
              <button
                onClick={handleCancelAdd}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newStatusTime}
                  onChange={(e) => setNewStatusTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Date and time are required
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStatus}
                disabled={isSubmitting || !newStatusTime}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSubmitting ? "Adding..." : "Add Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {console.log(
        "Rendering edit modal, showEditModal:",
        showEditModal,
        "editingStatus:",
        editingStatus
      )}
      {showEditModal && editingStatus && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Status</h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newStatusTime}
                  onChange={(e) => setNewStatusTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log("Save button clicked in edit modal");
                  handleEditStatus();
                }}
                disabled={isSubmitting}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminStatusHistory;
