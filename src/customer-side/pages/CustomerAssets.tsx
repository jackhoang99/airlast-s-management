import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import {
  Package,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Building2,
  MapPin,
  Paperclip,
} from "lucide-react";
import CustomerInspectionAttachmentPreview from "../components/CustomerInspectionAttachmentPreview";

const CustomerAssets = () => {
  const { supabase } = useSupabase();
  const { company, searchTerm: globalSearchTerm } = useOutletContext<{
    company: any;
    searchTerm: string;
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    modelNumber: "",
    serialNumber: "",
    unitType: "",
    location: "",
    unit: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [assetJobInspections, setAssetJobInspections] = useState<any[]>([]);

  useEffect(() => {
    // Set local search term from global search if provided
    if (globalSearchTerm) {
      setSearchTerm(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!supabase || !company) return;

      try {
        setIsLoading(true);

        // Get locations and units for filters (but don't use them for asset filtering)
        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .select("id, name")
          .eq("company_id", company.id)
          .order("name");

        if (locationError) throw locationError;
        setLocations(locationData || []);

        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select("id, unit_number, location_id")
          .in("location_id", locationData?.map((loc) => loc.id) || [])
          .order("unit_number");

        if (unitError) throw unitError;
        setUnits(unitData || []);

        // Fetch all assets first, then filter by company in the application
        // This ensures we get all assets and can properly filter by company
        let query = supabase.from("assets").select(
          `
            *,
            units (
              id,
              unit_number,
              location_id,
              locations (
                id,
                name,
                company_id,
                companies (
                  name
                )
              )
            )
          `
        );

        // Apply filters
        if (filters.modelNumber) {
          query = query.ilike(
            "model->>model_number",
            `%${filters.modelNumber}%`
          );
        }
        if (filters.serialNumber) {
          query = query.ilike(
            "model->>serial_number",
            `%${filters.serialNumber}%`
          );
        }
        if (filters.unitType) {
          query = query.eq("model->>unit_type", filters.unitType);
        }
        if (filters.location) {
          query = query.eq("units.location_id", filters.location);
        }
        if (filters.unit) {
          query = query.eq("unit_id", filters.unit);
        }
        if (filters.dateFrom) {
          query = query.gte("inspection_date", filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte("inspection_date", filters.dateTo);
        }

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) throw error;

        // Filter assets by company in the application
        const companyAssets =
          data?.filter((asset) => {
            // Check if asset has unit and location data
            if (!asset.units || !asset.units.locations) {
              console.log(
                "🔍 Debug - Asset missing unit/location data:",
                asset.id
              );
              return false;
            }

            // Check if the location belongs to the logged-in company
            const belongsToCompany =
              asset.units.locations.company_id === company.id;

            if (!belongsToCompany) {
              console.log("🔍 Debug - Asset belongs to different company:", {
                assetId: asset.id,
                assetCompanyId: asset.units.locations.company_id,
                loggedInCompanyId: company.id,
                locationName: asset.units.locations.name,
              });
            }

            return belongsToCompany;
          }) || [];

        console.log("🔍 Debug - Total assets fetched:", data?.length);
        console.log("🔍 Debug - Assets for company:", companyAssets.length);
        console.log("🔍 Debug - Company ID:", company.id);
        console.log("🔍 Debug - Company name:", company.name);

        // Debug: Show sample of filtered assets
        if (companyAssets.length > 0) {
          console.log("🔍 Debug - Sample filtered asset:", {
            assetId: companyAssets[0].id,
            unitNumber: companyAssets[0].units?.unit_number,
            locationName: companyAssets[0].units?.locations?.name,
            companyName: companyAssets[0].units?.locations?.companies?.name,
            companyId: companyAssets[0].units?.locations?.company_id,
          });
        }

        // Debug: Check if assets have proper company relationships
        if (companyAssets && companyAssets.length > 0) {
          console.log("🔍 Debug - Asset company relationships:");
          companyAssets.slice(0, 3).forEach((asset, index) => {
            console.log(`Asset ${index + 1}:`, {
              assetId: asset.id,
              unitId: asset.unit_id,
              unitNumber: asset.units?.unit_number,
              locationId: asset.units?.location_id,
              locationName: asset.units?.locations?.name,
              companyId: asset.units?.locations?.company_id,
              companyName: asset.units?.locations?.companies?.name,
              matchesCompany: asset.units?.locations?.company_id === company.id,
            });
          });

          // Debug: Check for assets missing location data
          const assetsWithoutLocation = companyAssets.filter(
            (asset) => asset.unit_id && (!asset.units || !asset.units.locations)
          );

          console.log("🔍 Debug - Assets missing location data:", {
            count: assetsWithoutLocation.length,
            sample: assetsWithoutLocation[0]
              ? {
                  assetId: assetsWithoutLocation[0].id,
                  unitId: assetsWithoutLocation[0].unit_id,
                  hasUnit: !!assetsWithoutLocation[0].units,
                  hasLocation: !!assetsWithoutLocation[0].units?.locations,
                }
              : null,
          });
        }

        // Debug: Check if there are assets that might be missing due to filtering
        const { data: allAssetsForCompany, error: allAssetsError } =
          await supabase
            .from("assets")
            .select(
              `
            *,
            units (
              id,
              unit_number,
              location_id,
              locations (
                id,
                name,
                company_id
              )
            )
          `
            )
            .eq("units.locations.company_id", company.id);

        console.log("🔍 Debug - Direct company assets query:", {
          count: allAssetsForCompany?.length,
          error: allAssetsError,
          sample: allAssetsForCompany?.[0],
        });

        // Debug: Check for assets without proper relationships
        const { data: orphanedAssets, error: orphanedError } = await supabase
          .from("assets")
          .select(
            `
            id,
            unit_id,
            model,
            created_at
          `
          )
          .is("unit_id", null)
          .limit(5);

        console.log("🔍 Debug - Assets without unit relationships:", {
          count: orphanedAssets?.length,
          error: orphanedError,
          sample: orphanedAssets?.[0],
        });

        // Debug: Check if there are assets linked through job_units that we're missing
        const { data: jobUnitsAssets, error: jobUnitsError } = await supabase
          .from("job_units")
          .select(
            `
            unit_id,
            jobs!inner (
              id,
              location_id,
              locations!inner (
                company_id
              )
            )
          `
          )
          .eq("jobs.locations.company_id", company.id);

        if (jobUnitsError) {
          console.log("🔍 Debug - Job units query error:", jobUnitsError);
        } else {
          console.log("🔍 Debug - Job units found:", jobUnitsAssets?.length);
          const jobUnitIds = jobUnitsAssets?.map((ju) => ju.unit_id) || [];

          if (jobUnitIds.length > 0) {
            // Check if we have assets for these job units that might be missing
            const { data: jobUnitsAssetsData, error: jobUnitsAssetsError } =
              await supabase
                .from("assets")
                .select(
                  `
                *,
                units (
                  id,
                  unit_number,
                  location_id,
                  locations (
                    id,
                    name,
                    company_id,
                    companies (
                      name
                    )
                  )
                )
              `
                )
                .in("unit_id", jobUnitIds);

            console.log("🔍 Debug - Assets through job_units:", {
              count: jobUnitsAssetsData?.length,
              error: jobUnitsAssetsError,
              sample: jobUnitsAssetsData?.[0],
            });
          }
        }

        // Debug: Compare with admin approach (no company filtering)
        const { data: allAssetsAdmin, error: allAssetsAdminError } =
          await supabase
            .from("assets")
            .select(
              `
            *,
            units (
              id,
              unit_number,
              location_id,
              locations (
                id,
                name,
                company_id,
                companies (
                  name
                )
              )
            )
          `
            )
            .limit(10);

        console.log("🔍 Debug - Admin-style query (no company filter):", {
          count: allAssetsAdmin?.length,
          error: allAssetsAdminError,
          companies: allAssetsAdmin
            ?.map((asset) => asset.units?.locations?.companies?.name)
            .filter(Boolean),
        });

        setAssets(companyAssets);
      } catch (err) {
        console.error("Error fetching assets:", err);
        setError("Failed to load assets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [supabase, company, filters]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const fetchAssetJobInspections = async (asset: any) => {
    if (!supabase) {
      setAssetJobInspections([]);
      return;
    }

    try {
      // Use the same approach as admin side: asset.model.inspection_id
      const inspectionId = asset.model?.inspection_id;

      console.log("🔍 Debug - Asset data for attachments:", {
        assetId: asset.id,
        model: asset.model,
        inspectionId: inspectionId,
        inspectionDate: asset.inspection_date,
      });

      if (inspectionId) {
        console.log(
          "🔍 Debug - Fetching attachments for inspection_id:",
          inspectionId
        );

        // Direct approach: fetch attachments using inspection_id (same as admin)
        const { data, error } = await supabase
          .from("inspection_attachments")
          .select("*")
          .eq("inspection_id", inspectionId)
          .order("created_at", { ascending: true });

        console.log("🔍 Debug - Attachments query result:", { data, error });

        if (error) {
          console.error("Error fetching inspection attachments:", error);
          throw error;
        }

        // Format as inspection objects for consistency
        const inspectionData =
          data && data.length > 0
            ? [
                {
                  id: inspectionId,
                  created_at: asset.inspection_date || asset.created_at,
                  inspection_attachments: data,
                },
              ]
            : [];

        console.log("🔍 Debug - Formatted inspection data:", inspectionData);
        setAssetJobInspections(inspectionData);
        return;
      }

      // Fallback: Find job inspections for jobs associated with this asset's unit
      if (!asset.unit_id) {
        setAssetJobInspections([]);
        return;
      }

      const { data, error } = await supabase
        .from("job_inspections")
        .select(
          `
          *,
          jobs!inner (
            id,
            job_units!inner (
              unit_id
            )
          ),
          inspection_attachments (
            id,
            title,
            description,
            file_name,
            file_path,
            file_url,
            file_size,
            file_type,
            created_at
          )
        `
        )
        .eq("jobs.job_units.unit_id", asset.unit_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching job inspections:", error);
        throw error;
      }

      setAssetJobInspections(data || []);
    } catch (error) {
      console.error("Error fetching asset job inspections:", error);
      setAssetJobInspections([]);
    }
  };

  const resetFilters = () => {
    setFilters({
      modelNumber: "",
      serialNumber: "",
      unitType: "",
      location: "",
      unit: "",
      dateFrom: "",
      dateTo: "",
    });
    setSearchTerm("");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredAssets = assets.filter((asset) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const modelNumber = asset.model?.model_number?.toLowerCase() || "";
    const serialNumber = asset.model?.serial_number?.toLowerCase() || "";
    const unitType = asset.model?.unit_type?.toLowerCase() || "";
    const systemType = asset.model?.system_type?.toLowerCase() || "";
    const unitNumber = asset.units?.unit_number?.toLowerCase() || "";
    const locationName = asset.units?.locations?.name?.toLowerCase() || "";

    return (
      modelNumber.includes(searchLower) ||
      serialNumber.includes(searchLower) ||
      unitType.includes(searchLower) ||
      systemType.includes(searchLower) ||
      unitNumber.includes(searchLower) ||
      locationName.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Assets</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label
                htmlFor="modelNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Model Number
              </label>
              <input
                type="text"
                id="modelNumber"
                name="modelNumber"
                value={filters.modelNumber}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="serialNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Serial Number
              </label>
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                value={filters.serialNumber}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="unitType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Unit Type
              </label>
              <select
                id="unitType"
                name="unitType"
                value={filters.unitType}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Types</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location
              </label>
              <select
                id="location"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Unit
              </label>
              <select
                id="unit"
                name="unit"
                value={filters.unit}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Units</option>
                {units
                  .filter(
                    (unit) =>
                      !filters.location || unit.location_id === filters.location
                  )
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="dateFrom"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date From
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="dateTo"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date To
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end mb-4">
            <button
              onClick={resetFilters}
              className="text-primary-600 hover:text-primary-800"
            >
              Reset Filters
            </button>
          </div>
        )}

        {error && (
          <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-error-500" />
              <div className="ml-3">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No assets found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white border rounded-lg shadow-sm p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedAsset(asset);
                  fetchAssetJobInspections(asset);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <Package size={16} className="text-primary-600 mr-2" />
                    <h3 className="font-medium">
                      {asset.model?.manufacture_name && (
                        <span className="text-gray-600 mr-1">
                          {asset.model.manufacture_name} -{" "}
                        </span>
                      )}
                      {asset.model?.model_number || "No model number"}
                    </h3>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(asset.inspection_date)}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <div>S/N: {asset.model?.serial_number || "N/A"}</div>
                  <div>Age: {asset.model?.age || "N/A"} years</div>
                  <div>Type: {asset.model?.unit_type || "N/A"}</div>
                  <div>Tonnage: {asset.model?.tonnage || "N/A"}</div>
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-3">
                  <Building2 size={14} className="mr-1" />
                  <span>Unit {asset.units?.unit_number || "N/A"}</span>
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <MapPin size={14} className="mr-1" />
                  <span>{asset.units?.locations?.name || "No Location"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedAsset(null)}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-2">Asset Details</h3>
            <div className="space-y-2">
              <div>
                <b>Manufacture Name:</b>{" "}
                {selectedAsset.model?.manufacture_name || "N/A"}
              </div>
              <div>
                <b>Model Number:</b>{" "}
                {selectedAsset.model?.model_number || "N/A"}
              </div>
              <div>
                <b>Serial Number:</b>{" "}
                {selectedAsset.model?.serial_number || "N/A"}
              </div>
              <div>
                <b>Age:</b> {selectedAsset.model?.age || "N/A"}
              </div>
              <div>
                <b>Tonnage:</b> {selectedAsset.model?.tonnage || "N/A"}
              </div>
              <div>
                <b>Unit Type:</b> {selectedAsset.model?.unit_type || "N/A"}
              </div>
              <div>
                <b>System Type:</b> {selectedAsset.model?.system_type || "N/A"}
              </div>
              <div>
                <b>Belt Size:</b> {selectedAsset.model?.belt_size || "N/A"}
              </div>
              <div>
                <b>Filter Size:</b> {selectedAsset.model?.filter_size || "N/A"}
              </div>
              <div>
                <b>Comment:</b> {selectedAsset.model?.comment || ""}
              </div>
              <div>
                <b>Inspection Date:</b>{" "}
                {selectedAsset.inspection_date
                  ? formatDate(selectedAsset.inspection_date)
                  : "N/A"}
              </div>
            </div>

            {/* Inspection Attachments Section */}
            <div className="mt-6 border-t pt-4">
              <h4 className="text-md font-medium mb-3 flex items-center">
                <Paperclip className="h-4 w-4 mr-2" />
                Inspection Attachments
              </h4>
              {assetJobInspections.length > 0 ? (
                <div className="space-y-4">
                  {assetJobInspections.map((inspection) => (
                    <div
                      key={inspection.id}
                      className="bg-gray-50 p-3 rounded-lg"
                    >
                      <div className="text-sm text-gray-600 mb-2">
                        Inspection from {formatDate(inspection.created_at)}
                      </div>
                      <CustomerInspectionAttachmentPreview
                        inspectionId={inspection.id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  {selectedAsset.model?.inspection_id
                    ? "No inspection attachments found for this asset."
                    : "This asset is not associated with any inspection."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAssets;
