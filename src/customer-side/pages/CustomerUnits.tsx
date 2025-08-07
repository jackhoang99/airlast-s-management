import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useSupabase } from "../../lib/supabase-context";
import { Building2, Search, Filter, AlertTriangle } from "lucide-react";

const CustomerUnits = () => {
  const { supabase } = useSupabase();
  const { company, searchTerm: globalSearchTerm } = useOutletContext<{
    company: any;
    searchTerm: string;
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    unitNumber: "",
    location: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    // Set local search term from global search if provided
    if (globalSearchTerm) {
      setSearchTerm(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!supabase || !company) return;

      try {
        setIsLoading(true);

        // First get all locations for this company
        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .select("id, name")
          .eq("company_id", company.id)
          .order("name");

        if (locationError) throw locationError;
        setLocations(locationData || []);

        const locationIds = locationData?.map((loc) => loc.id) || [];

        if (locationIds.length === 0) {
          setUnits([]);
          setIsLoading(false);
          return;
        }

        // Then fetch all units for these locations
        let query = supabase
          .from("units")
          .select(
            `
            *,
            locations (
              id,
              name,
              address,
              city,
              state,
              zip
            )
          `
          )
          .in("location_id", locationIds);

        // Apply filters
        if (filters.unitNumber) {
          query = query.ilike("unit_number", `%${filters.unitNumber}%`);
        }
        if (filters.location) {
          query = query.eq("location_id", filters.location);
        }
        if (filters.status) {
          query = query.eq("status", filters.status);
        }

        const { data, error: unitsError } = await query.order("unit_number");

        if (unitsError) throw unitsError;
        setUnits(data || []);
      } catch (err) {
        console.error("Error fetching units:", err);
        setError("Failed to load units");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnits();
  }, [supabase, company, filters]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      unitNumber: "",
      location: "",
      status: "",
    });
    setSearchTerm("");
  };

  const filteredUnits = units.filter((unit) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      unit.unit_number.toLowerCase().includes(searchLower) ||
      unit.locations?.name.toLowerCase().includes(searchLower) ||
      unit.locations?.address.toLowerCase().includes(searchLower) ||
      unit.locations?.city.toLowerCase().includes(searchLower) ||
      unit.locations?.state.toLowerCase().includes(searchLower) ||
      unit.locations?.zip.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Units</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search units..."
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
                htmlFor="unitNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Unit Number
              </label>
              <input
                type="text"
                id="unitNumber"
                name="unitNumber"
                value={filters.unitNumber}
                onChange={handleFilterChange}
                className="input"
              />
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
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
        ) : filteredUnits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No units found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUnits.map((unit) => (
              <Link
                key={unit.id}
                to={`/customer/units/${unit.id}`}
                className="bg-white border rounded-lg shadow-sm p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Building2 size={16} className="text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">
                      Unit {unit.unit_number}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      unit.status === "active"
                        ? "bg-success-100 text-success-800"
                        : "bg-error-100 text-error-800"
                    }`}
                  >
                    {unit.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  {unit.locations?.name}
                </div>

                <div className="text-xs text-gray-500">
                  {unit.locations?.address}
                  <br />
                  {unit.locations?.city}, {unit.locations?.state}{" "}
                  {unit.locations?.zip}
                </div>

                {unit.primary_contact_type && (
                  <div className="mt-2 text-xs text-gray-500">
                    Contact Type: {unit.primary_contact_type}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerUnits;
