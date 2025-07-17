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
        <div className="space-y-4">
          {shownAssets.map((asset) => (
            <div key={asset.id} className="bg-gray-50 rounded p-4 border">
              <div className="font-medium text-primary-700 mb-1 text-base">
                {asset.model?.model_number || "(No Model #)"} -{" "}
                {asset.model?.serial_number || "(No Serial #)"}
              </div>
              <div className="text-sm text-gray-700 mb-1">
                Unit: {asset.units?.unit_number || "-"}
              </div>
              <div className="text-xs text-gray-500 mb-1">
                Location: {asset.units?.locations?.name || "-"}
                {asset.units?.locations?.companies?.name && (
                  <>
                    {" | Company: "}
                    {asset.units.locations.companies.name}
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
                  <span className="font-semibold">Comment:</span>{" "}
                  {asset.model?.comment ?? "-"}
                </div>
              </div>
              {asset.model?.system_type && (
                <div className="text-xs text-gray-500 mt-1">
                  System: {asset.model.system_type}
                </div>
              )}
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
    </div>
  );
};

export default AssetSummary;
