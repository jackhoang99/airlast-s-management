import { useState } from "react";
import { Package, X, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import EditAssetForm from "./EditAssetForm";

interface AssetSummaryProps {
  assets: any[];
  title?: string;
  viewAllLink: string;
}

const AssetSummary = ({
  assets,
  title = "Asset Summary",
}: AssetSummaryProps) => {
  const { supabase } = useSupabase();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [modalAsset, setModalAsset] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter assets by search
  const filteredAssets = assets.filter((asset) => {
    const model = asset.model || {};
    const searchStr =
      (model.model_number || "") +
      (model.serial_number || "") +
      (model.unit_type || "") +
      (model.system_type || "") +
      (model.comment || "");
    return searchStr.toLowerCase().includes(search.toLowerCase());
  });

  const shownAssets = expanded ? filteredAssets : filteredAssets.slice(0, 3);

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setShowEditModal(true);
  };

  const handleDelete = async (asset: any) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      if (!supabase) return;
      setIsLoading(true);
      try {
        await supabase.from("assets").delete().eq("id", asset.id);
        // Refresh the page or trigger a callback to refresh assets
        window.location.reload();
      } catch (error) {
        console.error("Error deleting asset:", error);
        alert("Failed to delete asset");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-400" />
          {title}
        </h2>
        <button
          className="text-sm text-primary-600 hover:text-primary-800"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Collapse" : "View All"}
        </button>
      </div>
      <input
        className="input w-full mb-3"
        placeholder="Search assets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filteredAssets.length > 0 ? (
        <div className="space-y-4">
          {shownAssets.map((asset) => (
            <div key={asset.id} className="bg-gray-50 rounded p-4 border">
              <div className="font-medium text-primary-700 mb-1 text-base">
                {asset.model?.model_number || "(No Model #)"} -{" "}
                {asset.model?.serial_number || "(No Serial #)"}
              </div>
              <div className="text-sm text-gray-700 mb-1">
                Unit:{" "}
                {asset.units?.id ? (
                  <Link
                    to={`/units/${asset.units.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {asset.units.unit_number || asset.units.id}
                  </Link>
                ) : (
                  asset.units?.unit_number || "-"
                )}
              </div>
              <div className="text-xs text-gray-500 mb-1">
                Location:{" "}
                {asset.units?.locations?.id ? (
                  <Link
                    to={`/locations/${asset.units.locations.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {asset.units.locations.name}
                  </Link>
                ) : (
                  asset.units?.locations?.name || "-"
                )}
                {asset.units?.locations?.companies?.id && (
                  <>
                    {" | Company: "}
                    <Link
                      to={`/companies/${asset.units.locations.companies.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {asset.units.locations.companies.name}
                    </Link>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 mt-2">
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
                <div className="col-span-2">
                  <span className="font-semibold">System:</span>{" "}
                  {asset.model?.system_type ?? "-"}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Comment: {asset.model?.comment || "-"}
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(asset)}
                  className="text-primary-600 hover:text-primary-800 p-1"
                  title="Edit Asset"
                  disabled={isLoading}
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(asset)}
                  className="text-error-600 hover:text-error-800 p-1"
                  title="Delete Asset"
                  disabled={isLoading}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {!expanded && filteredAssets.length > 3 && (
            <p className="text-center text-sm text-gray-500">
              +{filteredAssets.length - 3} more assets
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No assets found</p>
          <p className="text-xs text-gray-500 mt-1">
            Complete an inspection to create assets
          </p>
        </div>
      )}
      {/* Asset Modal */}
      {modalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setModalAsset(null)}
            >
              <X size={24} />
            </button>
            <h3 className="text-lg font-semibold mb-2">Asset Details</h3>
            <div className="space-y-2">
              <div>
                <b>Model Number:</b> {modalAsset.model?.model_number || "N/A"}
              </div>
              <div>
                <b>Serial Number:</b> {modalAsset.model?.serial_number || "N/A"}
              </div>
              <div>
                <b>Age:</b> {modalAsset.model?.age || "N/A"}
              </div>
              <div>
                <b>Tonnage:</b> {modalAsset.model?.tonnage || "N/A"}
              </div>
              <div>
                <b>Unit Type:</b> {modalAsset.model?.unit_type || "N/A"}
              </div>
              <div>
                <b>System Type:</b> {modalAsset.model?.system_type || "N/A"}
              </div>
              <div>
                <b>Comment:</b> {modalAsset.model?.comment || ""}
              </div>
              <div>
                <b>Inspection Date:</b>{" "}
                {modalAsset.inspection_date
                  ? new Date(modalAsset.inspection_date).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}

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
                // Refresh the page to show updated data
                window.location.reload();
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

export default AssetSummary;
