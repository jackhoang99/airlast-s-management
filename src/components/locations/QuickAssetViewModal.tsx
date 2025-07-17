import { useEffect, useState } from "react";
import { Database } from "../../types/supabase";
import { useSupabase } from "../../lib/supabase-context";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

interface QuickAssetViewModalProps {
  open: boolean;
  onClose: () => void;
  location: Database["public"]["Tables"]["locations"]["Row"];
  unit?: Database["public"]["Tables"]["units"]["Row"];
}

const QuickAssetViewModal = ({
  open,
  onClose,
  location,
  unit,
}: QuickAssetViewModalProps) => {
  const { supabase } = useSupabase();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !location) return;
    const fetchAssets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (unit) {
          // Fetch only assets for the selected unit
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select(
              `*, units(id, unit_number, locations(id, name, companies(name)))`
            )
            .eq("unit_id", unit.id);
          if (assetsError) throw assetsError;
          setAssets(assetsData || []);
        } else {
          // Fallback: fetch all units for this location (legacy behavior)
          const { data: units, error: unitsError } = await supabase
            .from("units")
            .select("id")
            .eq("location_id", location.id);
          if (unitsError) throw unitsError;
          const unitIds = (units || []).map((u: any) => u.id);
          if (unitIds.length === 0) {
            setAssets([]);
            setIsLoading(false);
            return;
          }
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select(
              `*, units(id, unit_number, locations(id, name, companies(name)))`
            )
            .in("unit_id", unitIds);
          if (assetsError) throw assetsError;
          setAssets(assetsData || []);
        }
      } catch (err) {
        setError("Failed to load assets");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, [open, location, supabase, unit]);

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
            No assets found for this location.
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-gray-50 rounded p-4 border">
                <div className="font-medium text-primary-700 mb-1">
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
                  <div className="text-xs text-gray-500">
                    System: {asset.model.system_type}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAssetViewModal;
