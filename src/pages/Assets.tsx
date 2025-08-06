import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  Package,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  X,
  Eye,
} from "lucide-react";
import InspectionForm from "../components/jobs/inspection/InspectionForm";
import AddAssetForm from "../components/locations/AddAssetForm";
import EditAssetForm from "../components/locations/EditAssetForm";
import ViewAssetModal from "../components/locations/ViewAssetModal";

const Assets = () => {
  const { supabase } = useSupabase();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [columnSearches, setColumnSearches] = useState({
    modelNumber: "",
    serialNumber: "",
    age: "",
    tonnage: "",
    unitType: "",
    systemType: "",
    unit: "",
    location: "",
    company: "",
    inspectionDate: "",
    comments: "",
  });
  const [filters, setFilters] = useState({
    modelNumber: "",
    serialNumber: "",
    unitType: "",
    systemType: "",
    location: "",
    unit: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnSearch, setShowColumnSearch] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);
  const [showEditAssetForm, setShowEditAssetForm] = useState(false);
  const [showViewAssetModal, setShowViewAssetModal] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<any | null>(null);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [commentModal, setCommentModal] = useState<{
    open: boolean;
    comment: string | null;
  }>({ open: false, comment: null });

  const fetchAssets = async () => {
    if (!supabase) return;
    try {
      setIsLoading(true);

      const { data: locationsData, error: locationsError } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");
      if (locationsError) throw locationsError;
      setLocations(locationsData || []);

      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("id, unit_number, location_id")
        .order("unit_number");
      if (unitsError) throw unitsError;
      setUnits(unitsData || []);

      let query = supabase.from("assets").select(`
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
              id,
              name
            )
          )
        )
      `);

      if (filters.modelNumber) {
        query = query.ilike("model->>model_number", `%${filters.modelNumber}%`);
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
      if (filters.systemType) {
        query = query.eq("model->>system_type", filters.systemType);
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

      // Apply company filter if company parameter is provided
      if (selectedCompany) {
        query = query.eq("units.locations.company_id", selectedCompany);
      }

      const { data, error } = await query.order("inspection_date", {
        ascending: false,
      });
      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError("Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle company URL parameter
  useEffect(() => {
    const companyParam = searchParams.get("company");
    setSelectedCompany(companyParam);
  }, [searchParams]);

  useEffect(() => {
    fetchAssets();
  }, [supabase, filters, selectedCompany]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleColumnSearchChange = (column: string, value: string) => {
    setColumnSearches((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      modelNumber: "",
      serialNumber: "",
      unitType: "",
      systemType: "",
      location: "",
      unit: "",
      dateFrom: "",
      dateTo: "",
    });
    setColumnSearches({
      modelNumber: "",
      serialNumber: "",
      age: "",
      tonnage: "",
      unitType: "",
      systemType: "",
      unit: "",
      location: "",
      company: "",
      inspectionDate: "",
      comments: "",
    });
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
    // Check if any column search has a value
    const hasColumnSearches = Object.values(columnSearches).some(
      (value) => value.trim() !== ""
    );

    if (!hasColumnSearches) return true;

    // Column-specific searches
    const modelNumber = asset.model?.model_number?.toLowerCase() || "";
    const serialNumber = asset.model?.serial_number?.toLowerCase() || "";
    const age = asset.model?.age?.toString() || "";
    const tonnage = asset.model?.tonnage?.toLowerCase() || "";
    const unitType = asset.model?.unit_type?.toLowerCase() || "";
    const systemType = asset.model?.system_type?.toLowerCase() || "";
    const unitNumber = asset.units?.unit_number?.toLowerCase() || "";
    const locationName = asset.units?.locations?.name?.toLowerCase() || "";
    const companyName =
      asset.units?.locations?.companies?.name?.toLowerCase() || "";
    const inspectionDate = asset.inspection_date
      ? formatDate(asset.inspection_date).toLowerCase()
      : "";
    const comments = asset.model?.comment?.toLowerCase() || "";

    return (
      (columnSearches.modelNumber === "" ||
        modelNumber.includes(columnSearches.modelNumber.toLowerCase())) &&
      (columnSearches.serialNumber === "" ||
        serialNumber.includes(columnSearches.serialNumber.toLowerCase())) &&
      (columnSearches.age === "" ||
        age.includes(columnSearches.age.toLowerCase())) &&
      (columnSearches.tonnage === "" ||
        tonnage.includes(columnSearches.tonnage.toLowerCase())) &&
      (columnSearches.unitType === "" ||
        unitType.includes(columnSearches.unitType.toLowerCase())) &&
      (columnSearches.systemType === "" ||
        systemType.includes(columnSearches.systemType.toLowerCase())) &&
      (columnSearches.unit === "" ||
        unitNumber.includes(columnSearches.unit.toLowerCase())) &&
      (columnSearches.location === "" ||
        locationName.includes(columnSearches.location.toLowerCase())) &&
      (columnSearches.company === "" ||
        companyName.includes(columnSearches.company.toLowerCase())) &&
      (columnSearches.inspectionDate === "" ||
        inspectionDate.includes(columnSearches.inspectionDate.toLowerCase())) &&
      (columnSearches.comments === "" ||
        comments.includes(columnSearches.comments.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Inspection Assets</h1>
            {selectedCompany && (
              <p className="text-sm text-gray-600 mt-1">
                Filtered by company: {selectedCompany}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCompany && (
            <Link
              to="/assets"
              className="btn btn-secondary flex items-center gap-2"
            >
              <X size={16} /> Clear Company Filter
            </Link>
          )}
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={() => {
              setEditingAsset(null);
              setShowAddAssetForm(true);
            }}
          >
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Search Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setShowColumnSearch(!showColumnSearch)}
              className="btn btn-secondary"
            >
              <Search size={16} className="mr-2" />
              {showColumnSearch ? "Hide Search" : "Show Search"}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary"
            >
              <Filter size={16} className="mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {/* Column Search Headers */}
        {showColumnSearch && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Search Assets:
            </div>
            <div className="grid grid-cols-11 gap-2 text-xs bg-gray-50 p-2 rounded">
              <input
                type="text"
                placeholder="Model #"
                value={columnSearches.modelNumber}
                onChange={(e) =>
                  handleColumnSearchChange("modelNumber", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Serial #"
                value={columnSearches.serialNumber}
                onChange={(e) =>
                  handleColumnSearchChange("serialNumber", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Age"
                value={columnSearches.age}
                onChange={(e) =>
                  handleColumnSearchChange("age", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Tonnage"
                value={columnSearches.tonnage}
                onChange={(e) =>
                  handleColumnSearchChange("tonnage", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Type"
                value={columnSearches.unitType}
                onChange={(e) =>
                  handleColumnSearchChange("unitType", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Unit"
                value={columnSearches.unit}
                onChange={(e) =>
                  handleColumnSearchChange("unit", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Location"
                value={columnSearches.location}
                onChange={(e) =>
                  handleColumnSearchChange("location", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Company"
                value={columnSearches.company}
                onChange={(e) =>
                  handleColumnSearchChange("company", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Date"
                value={columnSearches.inspectionDate}
                onChange={(e) =>
                  handleColumnSearchChange("inspectionDate", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <input
                type="text"
                placeholder="Comments"
                value={columnSearches.comments}
                onChange={(e) =>
                  handleColumnSearchChange("comments", e.target.value)
                }
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              />
              <div className="flex items-center justify-center">
                <button
                  onClick={resetFilters}
                  className="text-xs text-primary-600 hover:text-primary-800 px-2 py-1"
                  title="Clear all searches"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* filters... */}
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end mb-6">
            <button
              onClick={resetFilters}
              className="text-sm text-primary-600 hover:text-primary-800"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    MODEL NUMBER
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    SERIAL NUMBER
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    AGE
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    TONNAGE
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    TYPE
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    UNIT
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    LOCATION
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    COMPANY
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    INSPECTION DATE
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    COMMENTS
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">
                    DETAILS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {asset.model?.model_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.model?.serial_number || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.model?.age != null ? asset.model.age : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.model?.tonnage || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.model?.unit_type ||
                        asset.model?.system_type ||
                        "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.units ? (
                        <Link
                          to={`/units/${asset.units.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {asset.units.unit_number}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.units?.locations ? (
                        <Link
                          to={`/locations/${asset.units.locations.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {asset.units.locations.name}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.units?.locations?.companies ? (
                        <Link
                          to={`/companies/${asset.units.locations.companies.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {asset.units.locations.companies.name}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(asset.inspection_date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {asset.model?.comment ? (
                        <button
                          className="text-primary-600 hover:text-primary-800 underline"
                          onClick={() =>
                            setCommentModal({
                              open: true,
                              comment: asset.model.comment,
                            })
                          }
                        >
                          View Comment
                        </button>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          setViewingAsset(asset);
                          setShowViewAssetModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="ml-2 text-primary-600 hover:text-primary-800"
                        onClick={() => {
                          setEditingAsset(asset);
                          setShowEditAssetForm(true);
                        }}
                        title="Edit Asset"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="ml-2 text-error-600 hover:text-error-800"
                        onClick={async () => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this asset?"
                            )
                          ) {
                            if (!supabase) return;
                            setIsLoading(true);
                            await supabase
                              .from("assets")
                              .delete()
                              .eq("id", asset.id);
                            // Refresh asset list
                            const { data, error } = await supabase
                              .from("assets")
                              .select("*");
                            if (!error) setAssets(data || []);
                            setIsLoading(false);
                          }
                        }}
                        title="Delete Asset"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Comment Modal */}
        {commentModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => setCommentModal({ open: false, comment: null })}
              >
                <X size={24} />
              </button>
              <h3 className="text-lg font-semibold mb-2">Asset Comment</h3>
              <div className="text-gray-700 whitespace-pre-line">
                {commentModal.comment}
              </div>
            </div>
          </div>
        )}
      </div>

      {showInspectionForm && (
        <InspectionForm
          asset={editingAsset}
          locations={locations}
          units={units}
          onClose={() => setShowInspectionForm(false)}
          onSuccess={() => {
            setShowInspectionForm(false);
            fetchAssets();
          }}
        />
      )}

      {showAddAssetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowAddAssetForm(false)}
            >
              <X size={24} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Add Asset</h2>
            <AddAssetForm
              onSuccess={() => {
                setShowAddAssetForm(false);
                fetchAssets();
              }}
              onCancel={() => setShowAddAssetForm(false)}
            />
          </div>
        </div>
      )}

      {showEditAssetForm && editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowEditAssetForm(false)}
            >
              <X size={24} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Edit Asset</h2>
            <EditAssetForm
              asset={editingAsset}
              onSuccess={() => {
                setShowEditAssetForm(false);
                setEditingAsset(null);
                fetchAssets();
              }}
              onCancel={() => {
                setShowEditAssetForm(false);
                setEditingAsset(null);
              }}
            />
          </div>
        </div>
      )}

      {showViewAssetModal && viewingAsset && (
        <ViewAssetModal
          asset={viewingAsset}
          onClose={() => {
            setShowViewAssetModal(false);
            setViewingAsset(null);
          }}
        />
      )}
    </div>
  );
};

export default Assets;
