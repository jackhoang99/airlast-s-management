import { X } from "lucide-react";

interface ViewAssetModalProps {
  asset: any;
  onClose: () => void;
}

const ViewAssetModal = ({ asset, onClose }: ViewAssetModalProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Assets for {asset.units?.unit_number} -{" "}
            {asset.units?.locations?.name}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Asset Card */}
          <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
            {/* Asset Identifier */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-primary-600">
                {asset.model?.manufacture_name && (
                  <span className="text-gray-600">
                    {asset.model.manufacture_name} -{" "}
                  </span>
                )}
                {asset.model?.model_number} - {asset.model?.serial_number}
              </h3>
            </div>

            {/* Asset Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Manufacture Name:
                  </label>
                  <p className="text-gray-900">
                    {asset.model?.manufacture_name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Unit:
                  </label>
                  <p className="text-primary-600 font-medium">
                    {asset.units?.unit_number} - {asset.units?.locations?.name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Location:
                  </label>
                  <p className="text-gray-900">
                    {asset.units?.locations?.name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Company:
                  </label>
                  <p className="text-gray-900">
                    {asset.units?.locations?.companies?.name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Age:
                  </label>
                  <p className="text-gray-900">{asset.model?.age || "N/A"}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Unit Type:
                  </label>
                  <p className="text-gray-900">
                    {asset.model?.unit_type || "N/A"}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tonnage:
                  </label>
                  <p className="text-gray-900">
                    {asset.model?.tonnage || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Model #:
                  </label>
                  <p className="text-gray-900">
                    {asset.model?.model_number || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Serial #:
                  </label>
                  <p className="text-gray-900">
                    {asset.model?.serial_number || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    System:
                  </label>
                  <p className="text-gray-900">
                    {asset.model?.system_type || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Inspection Date:
                  </label>
                  <p className="text-gray-900">
                    {formatDate(asset.inspection_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Comment Section */}
            {asset.model?.comment && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-500">
                  Comment:
                </label>
                <p className="text-gray-900 mt-1 whitespace-pre-line">
                  {asset.model.comment}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAssetModal;
