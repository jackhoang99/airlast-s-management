import { Link } from "react-router-dom";
import { Package } from "lucide-react";

interface AssetSummaryProps {
  assets: any[];
  title?: string;
  viewAllLink: string;
}

const AssetSummary = ({
  assets,
  title = "Asset Summary",
  viewAllLink,
}: AssetSummaryProps) => {
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-400" />
          {title}
        </h2>
        <Link
          to={viewAllLink}
          className="text-sm text-primary-600 hover:text-primary-800"
        >
          View All
        </Link>
      </div>
      {assets.length > 0 ? (
        <div className="space-y-3">
          {assets.slice(0, 3).map((asset) => (
            <Link
              key={asset.id}
              to={viewAllLink}
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
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
            </Link>
          ))}
          {assets.length > 3 && (
            <p className="text-center text-sm text-gray-500">
              +{assets.length - 3} more assets
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
    </div>
  );
};

export default AssetSummary;
