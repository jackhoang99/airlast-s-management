import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  Package,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const Assets = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
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

    fetchAssets();
  }, [supabase, filters]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
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
    const companyName =
      asset.units?.locations?.companies?.name?.toLowerCase() || "";

    return (
      modelNumber.includes(searchLower) ||
      serialNumber.includes(searchLower) ||
      unitType.includes(searchLower) ||
      systemType.includes(searchLower) ||
      unitNumber.includes(searchLower) ||
      locationName.includes(searchLower) ||
      companyName.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Inspection Assets</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
                      <Link
                        to={`/assets/${asset.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;
