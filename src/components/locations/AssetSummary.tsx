import { useState } from "react";
import { Package, X } from "lucide-react";

interface AssetSummaryProps {
  assets: any[];
  title?: string;
  viewAllLink: string;
}

const AssetSummary = ({
  assets,
  title = "Asset Summary",
}: AssetSummaryProps) => {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [modalAsset, setModalAsset] = useState<any | null>(null);

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
        <div className="space-y-3">
          {shownAssets.map((asset) => (
            <button
              key={asset.id}
              className="block w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              onClick={() => setModalAsset(asset)}
              type="button"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {asset.model?.model_number || "No model number"}
                  </p>
                  <p className="text-xs text-gray-500">
                    S/N: {asset.model?.serial_number || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Age: {asset.model?.age || "N/A"} • Tonnage:{" "}
                    {asset.model?.tonnage || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Unit Type: {asset.model?.unit_type || "N/A"} • System:{" "}
                    {asset.model?.system_type || "N/A"}
                  </p>
                  {asset.model?.comment && (
                    <p className="text-xs text-gray-500">
                      Comment: {asset.model.comment}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {asset.inspection_date
                      ? new Date(asset.inspection_date).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
            </button>
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
    </div>
  );
};

export default AssetSummary;
