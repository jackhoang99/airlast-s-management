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
          {selectedAsset ? (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  <Info className="h-5 w-5 mr-2 text-primary-600" />
                  Asset Details
                </h2>
                <div className="text-sm text-gray-500">
                  Last updated: {formatDate(selectedAsset.updated_at)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Model Information
                  </h3>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-xs text-gray-500">
                        Model Number
                      </label>
                      <p className="font-medium">
                        {selectedAsset.model?.model_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Serial Number
                      </label>
                      <p className="font-medium">
                        {selectedAsset.model?.serial_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Age (Years)
                      </label>
                      <p className="font-medium">
                        {selectedAsset.model?.age || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Tonnage</label>
                      <p className="font-medium">
                        {selectedAsset.model?.tonnage || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    System Information
                  </h3>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-xs text-gray-500">Unit Type</label>
                      <p className="font-medium">
                        {selectedAsset.model?.unit_type || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        System Type
                      </label>
                      <p className="font-medium">
                        {selectedAsset.model?.system_type || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Inspection Date
                      </label>
                      <p className="font-medium">
                        {formatDate(selectedAsset.inspection_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAsset.model?.job_id && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Related Job Information
                  </h3>
                  <div>
                    <Link
                      to={`/jobs/${selectedAsset.model.job_id}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      View Job Details
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12">
                <Info className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select an asset to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitAssets;
