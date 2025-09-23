import { useEffect, useState } from "react";
import { Database } from "../../types/supabase";
import { useSupabase } from "../../lib/supabase-context";
import { X, Edit, Trash2, Paperclip } from "lucide-react";
import { Link } from "react-router-dom";
import EditAssetForm from "./EditAssetForm";
import InspectionAttachmentPreview from "../jobs/InspectionAttachmentPreview";

// Wrapper component that shows N/A when no attachments
const InspectionAttachmentPreviewWithFallback = ({
  inspectionId,
}: {
  inspectionId: string;
}) => {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchAttachments = async () => {
      if (!supabase || !inspectionId) {
        setAttachments([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("inspection_attachments")
          .select("*")
          .eq("inspection_id", inspectionId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAttachments(data || []);
      } catch (error) {
        console.error("Error fetching attachments:", error);
        setAttachments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [supabase, inspectionId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (attachments.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No inspection attachments found for this asset.
      </div>
    );
  }

  // Render attachments directly without using InspectionAttachmentPreview
  const isImageFile = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative group cursor-pointer"
          onClick={() => {
            if (isImageFile(attachment.file_type)) {
              window.open(attachment.file_url, "_blank");
            } else {
              const link = document.createElement("a");
              link.href = attachment.file_url;
              link.download = attachment.file_name;
              link.target = "_blank";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
        >
          <div className="w-16 h-16 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
            {isImageFile(attachment.file_type) ? (
              <img
                src={attachment.file_url}
                alt={attachment.title || attachment.file_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-xs text-gray-500 text-center p-1">
                <div className="font-medium">
                  {attachment.file_name.split(".")[0]}
                </div>
                <div className="text-gray-400">
                  {attachment.file_name.split(".").pop()?.toUpperCase()}
                </div>
              </div>
            )}
          </div>
          <div className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span>+</span>
          </div>
        </div>
      ))}
    </div>
  );
};

interface QuickAssetViewModalProps {
  open: boolean;
  onClose: () => void;
  location: Database["public"]["Tables"]["locations"]["Row"] | any; // Allow company objects too
  unit?: Database["public"]["Tables"]["units"]["Row"];
  units?: Database["public"]["Tables"]["units"]["Row"][] | null;
}

const QuickAssetViewModal = ({
  open,
  onClose,
  location,
  unit,
  units,
}: QuickAssetViewModalProps) => {
  const { supabase } = useSupabase();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open || !location) return;
    const fetchAssets = async () => {
      setIsLoading(true);
      setError(null);
      console.log("QuickAssetViewModal - location object:", location);
      console.log(
        "QuickAssetViewModal - location.company_id:",
        location?.company_id
      );
      console.log("QuickAssetViewModal - location.id:", location?.id);
      try {
        if (unit) {
          // Fetch only assets for the selected unit
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select(
              `*, units(id, unit_number, locations(id, name, companies(id, name)))`
            )
            .eq("unit_id", unit.id);
          if (assetsError) throw assetsError;
          setAssets(assetsData || []);
        } else if (units && Array.isArray(units) && units.length > 0) {
          // Fetch only assets for the provided units (job's units)
          const unitIds = units.map((u: any) => u.id);
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select(
              `*, units(id, unit_number, locations(id, name, companies(id, name)))`
            )
            .in("unit_id", unitIds);
          if (assetsError) throw assetsError;
          setAssets(assetsData || []);
        } else {
          // Check if this is a company (has id but no company_id field) or location
          if (location.company_id === undefined && location.id) {
            console.log("QuickAssetViewModal - Using COMPANY logic");
            // This is a company - fetch all units across all locations for this company
            const { data: locationsData, error: locationsError } =
              await supabase
                .from("locations")
                .select("id")
                .eq("company_id", location.id);
            if (locationsError) throw locationsError;
            const locationIds = (locationsData || []).map((l: any) => l.id);
            if (locationIds.length === 0) {
              setAssets([]);
              setIsLoading(false);
              return;
            }
            const { data: unitsData, error: unitsError } = await supabase
              .from("units")
              .select("id")
              .in("location_id", locationIds);
            if (unitsError) throw unitsError;
            const unitIds = (unitsData || []).map((u: any) => u.id);
            if (unitIds.length === 0) {
              setAssets([]);
              setIsLoading(false);
              return;
            }
            const { data: assetsData, error: assetsError } = await supabase
              .from("assets")
              .select(
                `*, units(id, unit_number, location_id, locations(id, name, company_id, companies(id, name)))`
              )
              .in("unit_id", unitIds);
            if (assetsError) throw assetsError;
            setAssets(assetsData || []);
          } else {
            console.log("QuickAssetViewModal - Using LOCATION logic");
            // This is a location - fetch all units for this location
            const { data: unitsData, error: unitsError } = await supabase
              .from("units")
              .select("id")
              .eq("location_id", location.id);
            if (unitsError) throw unitsError;
            const unitIds = (unitsData || []).map((u: any) => u.id);
            if (unitIds.length === 0) {
              setAssets([]);
              setIsLoading(false);
              return;
            }
            const { data: assetsData, error: assetsError } = await supabase
              .from("assets")
              .select(
                `*, units(id, unit_number, location_id, locations(id, name, company_id, companies(id, name)))`
              )
              .in("unit_id", unitIds);
            if (assetsError) throw assetsError;
            setAssets(assetsData || []);
          }
        }
      } catch (err) {
        setError("Failed to load assets");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, [open, location, supabase, unit, units]);

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setShowEditModal(true);
  };

  const handleDelete = async (asset: any) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      if (!supabase) return;
      setIsDeleting(true);
      try {
        await supabase.from("assets").delete().eq("id", asset.id);
        // Remove the asset from the local state
        setAssets(assets.filter((a) => a.id !== asset.id));
      } catch (error) {
        console.error("Error deleting asset:", error);
        alert("Failed to delete asset");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4">
          {unit
            ? `Assets for ${unit.unit_number}`
            : location.company_id
            ? `Assets for ${location.name}`
            : `Assets for ${location.name}`}
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-error-600 text-center py-4">{error}</div>
        ) : assets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {location.company_id
              ? `No assets found for ${location.name}.`
              : `No assets found for this location.`}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-gray-50 rounded p-4 border">
                <div className="font-medium text-primary-700 mb-1">
                  {asset.model?.manufacture_name && (
                    <span className="text-gray-600">
                      {asset.model.manufacture_name} -{" "}
                    </span>
                  )}
                  {asset.model?.model_number || "(No Model #)"} -{" "}
                  {asset.model?.serial_number || "(No Serial #)"}
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  Unit:{" "}
                  {asset.units?.id ? (
                    <Link
                      to={`/units/${asset.units.id}`}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {asset.units.unit_number}
                    </Link>
                  ) : (
                    asset.units?.unit_number || "-"
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Location: {asset.units?.locations?.name || location.name}
                  {asset.units?.locations?.companies?.name && (
                    <>
                      {" | Company: "}
                      {asset.units.locations.companies.name}
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 mt-2">
                  <div>
                    <span className="font-semibold">Manufacture:</span>{" "}
                    {asset.model?.manufacture_name ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Age:</span>{" "}
                    {asset.model?.age ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Tonnage:</span>{" "}
                    {asset.model?.tonnage ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Unit Type:</span>{" "}
                    {asset.model?.unit_type ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Model #:</span>{" "}
                    {asset.model?.model_number ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Serial #:</span>{" "}
                    {asset.model?.serial_number ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">System:</span>{" "}
                    {asset.model?.system_type ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Belt Size:</span>{" "}
                    {asset.model?.belt_size ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Filter Size:</span>{" "}
                    {asset.model?.filter_size ?? "-"}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Comment: {asset.model?.comment || "-"}
                </div>

                {/* Inspection Attachments Section */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <Paperclip className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Inspection Attachments
                    </span>
                  </div>
                  {asset.model?.inspection_id ? (
                    <InspectionAttachmentPreviewWithFallback
                      inspectionId={asset.model.inspection_id}
                    />
                  ) : (
                    <div className="text-sm text-gray-500">
                      No inspection attachments found for this asset.
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(asset)}
                    className="text-primary-600 hover:text-primary-800 p-1"
                    title="Edit Asset"
                    disabled={isDeleting}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(asset)}
                    className="text-error-600 hover:text-error-800 p-1"
                    title="Delete Asset"
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Asset Modal */}
      {showEditModal && editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowEditModal(false)}
            >
              <X size={24} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Edit Asset</h2>
            <EditAssetForm
              asset={editingAsset}
              onSuccess={() => {
                setShowEditModal(false);
                setEditingAsset(null);
                // Refresh the assets list to show updated data
                // We'll need to refetch the assets
                const fetchAssets = async () => {
                  if (!supabase || !location) return;
                  setIsLoading(true);
                  try {
                    if (unit) {
                      const { data: assetsData, error: assetsError } =
                        await supabase
                          .from("assets")
                          .select(
                            `*, units(id, unit_number, locations(id, name, companies(id, name)))`
                          )
                          .eq("unit_id", unit.id);
                      if (assetsError) throw assetsError;
                      setAssets(assetsData || []);
                    } else if (
                      units &&
                      Array.isArray(units) &&
                      units.length > 0
                    ) {
                      const unitIds = units.map((u: any) => u.id);
                      const { data: assetsData, error: assetsError } =
                        await supabase
                          .from("assets")
                          .select(
                            `*, units(id, unit_number, locations(id, name, companies(id, name)))`
                          )
                          .in("unit_id", unitIds);
                      if (assetsError) throw assetsError;
                      setAssets(assetsData || []);
                    } else {
                      const { data: unitsData, error: unitsError } =
                        await supabase
                          .from("units")
                          .select("id")
                          .eq("location_id", location.id);
                      if (unitsError) throw unitsError;
                      const unitIds = (unitsData || []).map((u: any) => u.id);
                      if (unitIds.length === 0) {
                        setAssets([]);
                        setIsLoading(false);
                        return;
                      }
                      const { data: assetsData, error: assetsError } =
                        await supabase
                          .from("assets")
                          .select(
                            `*, units(id, unit_number, locations(id, name, companies(id, name)))`
                          )
                          .in("unit_id", unitIds);
                      if (assetsError) throw assetsError;
                      setAssets(assetsData || []);
                    }
                  } catch (err) {
                    setError("Failed to refresh assets");
                  } finally {
                    setIsLoading(false);
                  }
                };
                fetchAssets();
              }}
              onCancel={() => {
                setShowEditModal(false);
                setEditingAsset(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAssetViewModal;
