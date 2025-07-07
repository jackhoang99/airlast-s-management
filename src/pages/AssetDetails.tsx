import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  ArrowLeft,
  Package,
  Calendar,
  Info,
  Building2,
  MapPin,
  Building,
  AlertTriangle,
} from "lucide-react";

const AssetDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<any | null>(null);
  const [relatedAssets, setRelatedAssets] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!supabase || !id) return;

      try {
        setIsLoading(true);

        // Fetch asset details
        const { data, error: assetError } = await supabase
          .from("assets")
          .select(
            `
            *,
            units (
              id,
              unit_number,
              status,
              location_id,
              locations (
                id,
                name,
                address,
                city,
                state,
                zip,
                company_id,
                companies (
                  id,
                  name
                )
              )
            )
          `
          )
          .eq("id", id)
          .single();

        if (assetError) throw assetError;
        setAsset(data);

        // Fetch related assets for the same unit
        if (data?.unit_id) {
          const { data: relatedData, error: relatedError } = await supabase
            .from("assets")
            .select("*")
            .eq("unit_id", data.unit_id)
            .neq("id", id)
            .order("inspection_date", { ascending: false })
            .limit(5);

          if (relatedError) throw relatedError;
          setRelatedAssets(relatedData || []);
        }
      } catch (err) {
        console.error("Error fetching asset details:", err);
        setError("Failed to load asset details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetDetails();
  }, [supabase, id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
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

  if (error || !asset) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <p className="text-error-600 mb-4">{error || "Asset not found"}</p>
        <Link to="/assets" className="text-primary-600 hover:text-primary-800">
          Back to Assets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/assets" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Asset Details</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Asset Information</h2>
              <div className="text-sm text-gray-500">
                Inspection Date: {formatDate(asset.inspection_date)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-md font-medium mb-3">Model Information</h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-xs text-gray-500">
                      Model Number
                    </label>
                    <p className="font-medium">
                      {asset.model?.model_number || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">
                      Serial Number
                    </label>
                    <p className="font-medium">
                      {asset.model?.serial_number || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Age (Years)</label>
                    <p className="font-medium">{asset.model?.age || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Tonnage</label>
                    <p className="font-medium">
                      {asset.model?.tonnage || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium mb-3">System Information</h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="text-xs text-gray-500">Unit Type</label>
                    <p className="font-medium">
                      {asset.model?.unit_type || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">System Type</label>
                    <p className="font-medium">
                      {asset.model?.system_type || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Created At</label>
                    <p className="font-medium">
                      {formatDate(asset.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Updated At</label>
                    <p className="font-medium">
                      {formatDate(asset.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-medium mb-3">Unit Information</h3>
              {asset.units ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <Link
                        to={`/units/${asset.units.id}`}
                        className="text-lg font-medium text-primary-600 hover:text-primary-800"
                      >
                       {asset.units.unit_number}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Status:{" "}
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            asset.units.status === "active"
                              ? "bg-success-100 text-success-800"
                              : "bg-error-100 text-error-800"
                          }`}
                        >
                          {asset.units.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Unit Type</label>
                      <p className="font-medium">
                        {asset.model?.unit_type || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        System Type
                      </label>
                      <p className="font-medium">
                        {asset.model?.system_type || "N/A"}
                      </p>
                    </div>
                  </div>

                  {asset.units.locations && (
                    <>
                      <div className="flex items-start gap-2">
                        <Building className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                          <Link
                            to={`/locations/${asset.units.locations.id}`}
                            className="font-medium text-primary-600 hover:text-primary-800"
                          >
                            {asset.units.locations.name}
                          </Link>
                          {asset.units.locations.companies && (
                            <p className="text-sm text-gray-500">
                              <Link
                                to={`/companies/${asset.units.locations.companies.id}`}
                                className="text-primary-600 hover:text-primary-800"
                              >
                                {asset.units.locations.companies.name}
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                        <div>
                          <p>{asset.units.locations.address}</p>
                          <p>
                            {asset.units.locations.city},{" "}
                            {asset.units.locations.state}{" "}
                            {asset.units.locations.zip}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No unit information available</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {asset.units && (
                <Link
                  to={`/units/${asset.units.id}`}
                  className="btn btn-primary w-full justify-start"
                >
                  <Building2 size={16} className="mr-2" />
                  View Unit
                </Link>
              )}
              {asset.units && (
                <Link
                  to={`/units/${asset.units.id}/assets`}
                  className="btn btn-secondary w-full justify-start"
                >
                  <Package size={16} className="mr-2" />
                  View All Unit Assets
                </Link>
              )}
              {asset.model?.job_id && (
                <Link
                  to={`/jobs/${asset.model.job_id}`}
                  className="btn btn-secondary w-full justify-start"
                >
                  <Calendar size={16} className="mr-2" />
                  View Related Job
                </Link>
              )}
            </div>
          </div>

          {/* Related Assets */}
          {relatedAssets.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Related Assets</h2>
              <div className="space-y-3">
                {relatedAssets.map((relatedAsset) => (
                  <Link
                    key={relatedAsset.id}
                    to={`/assets/${relatedAsset.id}`}
                    className="block p-4 rounded-lg border hover:border-primary-500 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {relatedAsset.model?.model_number || "N/A"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {relatedAsset.model?.serial_number || "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600"></p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
