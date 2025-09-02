import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  ArrowLeft,
  FileText,
  Calendar,
  AlertTriangle,
  Package,
  Info,
  Tag,
} from "lucide-react";

const UnitAssets = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  useEffect(() => {
    const fetchUnitAndAssets = async () => {
      if (!supabase || !id) return;

      try {
        setIsLoading(true);

        // Fetch unit details
        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select(
            `
            *,
            locations (
              name,
              address,
              city,
              state,
              zip,
              company_id,
              companies (
                name
              )
            )
          `
          )
          .eq("id", id)
          .single();

        if (unitError) throw unitError;
        setUnit(unitData);

        // Fetch assets for this unit
        const { data: assetsData, error: assetsError } = await supabase
          .from("assets")
          .select("*")
          .eq("unit_id", id)
          .order("inspection_date", { ascending: false });

        if (assetsError) throw assetsError;
        setAssets(assetsData || []);

        // Set the first asset as selected by default
        if (assetsData && assetsData.length > 0) {
          setSelectedAsset(assetsData[0]);
        }
      } catch (err) {
        console.error("Error fetching unit assets:", err);
        setError("Failed to fetch unit assets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnitAndAssets();
  }, [supabase, id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || "Unit not found"}</p>
        <Link to="/units" className="text-primary-600 hover:text-primary-800">
          Back to Units
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/units/${id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Unit {unit.unit_number} Assets
          </h1>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Asset History</h2>

            {assets.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No asset records found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Complete an inspection to create asset records
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`p-3 rounded-lg cursor-pointer ${
                      selectedAsset?.id === asset.id
                        ? "bg-primary-50 border border-primary-200"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="font-medium">
                          {formatDate(asset.inspection_date)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {asset.model?.manufacture_name && (
                          <span className="font-medium">
                            {asset.model.manufacture_name} -{" "}
                          </span>
                        )}
                        {asset.model?.model_number || "No model"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {assets.length === 0 ? (
            <div className="card">
              <div className="text-center py-12">
                <Info className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No asset records found</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-gray-50 rounded p-4 border">
                  <div className="font-medium text-primary-700 mb-1 text-base">
                    {asset.model?.manufacture_name && (
                      <span className="text-gray-600">
                        {asset.model.manufacture_name} -{" "}
                      </span>
                    )}
                    {asset.model?.model_number || "(No Model #)"} -{" "}
                    {asset.model?.serial_number || "(No Serial #)"}
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    Unit: {unit.unit_number}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    Location: {unit.locations?.name || "-"}
                    {unit.locations?.companies?.name && (
                      <>
                        {" | Company: "}
                        {unit.locations.companies.name}
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
            </div>
          )}
        </div>
      </div>{" "}
      {/* <-- Add this to close the top-level container */}
    </div>
  );
};

export default UnitAssets;
