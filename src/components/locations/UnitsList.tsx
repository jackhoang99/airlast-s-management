import { useState, useEffect } from "react";
import { Database } from "../../types/supabase";
import { useSupabase } from "../../lib/supabase-context";
import { Plus, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import QuickAssetViewModal from "./QuickAssetViewModal";

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];

type UnitsListProps = {
  location: Location;
  search?: string;
};

const UnitsList = ({ location, search }: UnitsListProps) => {
  const { supabase } = useSupabase();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetModalUnit, setAssetModalUnit] = useState<Unit | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from("units")
          .select("*")
          .eq("location_id", location.id)
          .order("unit_number");

        if (error) throw error;
        setUnits(data || []);
      } catch (err) {
        console.error("Error fetching units:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnits();
  }, [supabase, location.id]);

  // Flexible filter: match if any word in unit number starts with search, or if full unit number includes search
  const filteredUnits = search
    ? units.filter((unit) => {
        const unitNum = (unit.unit_number || "").toLowerCase();
        const searchLower = search.toLowerCase();
        return (
          unitNum.includes(searchLower) ||
          unitNum.split(/\s+/).some((word) => word.startsWith(searchLower))
        );
      })
    : units;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUnits.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/units/${unit.id}`}
                    className="text-primary-600 hover:text-primary-800 font-medium"
                  >
                    {unit.unit_number}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`badge ${
                      unit.status === "active"
                        ? "bg-success-100 text-success-800"
                        : "bg-error-100 text-error-800"
                    }`}
                  >
                    {unit.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setAssetModalUnit(unit)}
                    className="text-primary-600 hover:text-primary-800 focus:outline-none"
                    style={{ minWidth: 80 }}
                  >
                    Show Assets
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/units/${unit.id}/edit`}
                    className="text-primary-600 hover:text-primary-800 focus:outline-none"
                    style={{ minWidth: 40 }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {filteredUnits.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No units found. Click "Add Unit" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {assetModalUnit && (
        <QuickAssetViewModal
          open={!!assetModalUnit}
          onClose={() => setAssetModalUnit(null)}
          location={location}
          unit={assetModalUnit}
        />
      )}
    </div>
  );
};

export default UnitsList;
