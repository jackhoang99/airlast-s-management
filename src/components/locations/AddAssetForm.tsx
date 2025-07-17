import { useEffect, useState } from "react";
import { useSupabase } from "../../lib/supabase-context";

interface CompanyOption {
  id: string;
  name: string;
}
interface LocationOption {
  id: string;
  name: string;
  company_id: string;
}
interface UnitOption {
  id: string;
  unit_number: string;
  location_id: string;
}

interface AddAssetFormProps {
  companyId?: string;
  locationId?: string;
  unitId?: string;
  units?: any[]; // new prop: restrict unit selection
  onSuccess?: () => void;
  onCancel?: () => void;
}

const defaultModel = {
  age: "",
  tonnage: "",
  unit_type: "",
  model_number: "",
  serial_number: "",
  comment: "",
  system_type: "",
};

const AddAssetForm = ({
  companyId,
  locationId,
  unitId,
  units: propUnits,
  onSuccess,
  onCancel,
}: AddAssetFormProps) => {
  const { supabase } = useSupabase();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>(propUnits || []);
  const [companyName, setCompanyName] = useState("");

  const [selectedCompany, setSelectedCompany] = useState<string>(
    companyId || ""
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(
    locationId || ""
  );
  const [selectedUnit, setSelectedUnit] = useState<string>(unitId || "");

  const [model, setModel] = useState<any>(defaultModel);
  const [inspectionDate, setInspectionDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies
  useEffect(() => {
    if (companyId) {
      // Fetch just the company name for display
      const fetchCompany = async () => {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name")
          .eq("id", companyId)
          .single();
        if (!error && data) setCompanyName(data.name);
      };
      fetchCompany();
      return;
    }
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (!error) setCompanies(data || []);
    };
    fetchCompanies();
  }, [supabase, companyId]);

  // Fetch locations for selected company
  useEffect(() => {
    if (!selectedCompany) return;
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, company_id")
        .eq("company_id", selectedCompany)
        .order("name");
      if (!error) setLocations(data || []);
    };
    fetchLocations();
  }, [supabase, selectedCompany]);

  // Fetch units for selected location, unless propUnits is provided
  useEffect(() => {
    if (propUnits) {
      setUnits(propUnits);
      return;
    }
    if (!selectedLocation) return;
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, location_id")
        .eq("location_id", selectedLocation)
        .order("unit_number");
      if (!error) setUnits(data || []);
    };
    fetchUnits();
  }, [supabase, selectedLocation, propUnits]);

  // Pre-populate location/unit if provided
  useEffect(() => {
    if (companyId) setSelectedCompany(companyId);
    if (locationId) setSelectedLocation(locationId);
    if (unitId) setSelectedUnit(unitId);
  }, [companyId, locationId, unitId]);

  const handleModelChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setModel((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (!selectedUnit) {
        setError("Please select a unit.");
        setIsLoading(false);
        return;
      }
      // Insert asset
      const { error: insertError } = await supabase.from("assets").insert({
        unit_id: selectedUnit,
        model: {
          ...model,
          age: model.age ? parseInt(model.age) : null,
        },
        inspection_date: inspectionDate || null,
      });
      if (insertError) throw insertError;
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to add asset");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-error-50 text-error-700 p-2 rounded">{error}</div>
      )}
      {/* Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company
        </label>
        {companyId ? (
          <input
            type="text"
            className="input w-full"
            value={companyName}
            readOnly
          />
        ) : (
          <select
            className="input w-full"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            required
          >
            <option value="">Select Company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        {locationId ? (
          <input
            type="text"
            className="input w-full"
            value={locations.find((l) => l.id === locationId)?.name || ""}
            readOnly
          />
        ) : (
          <select
            className="input w-full"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            required
            disabled={!selectedCompany}
          >
            <option value="">Select Location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {/* Unit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unit
        </label>
        {unitId ? (
          <input
            type="text"
            className="input w-full"
            value={units.find((u) => u.id === unitId)?.unit_number || ""}
            readOnly
          />
        ) : (
          <select
            className="input w-full"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            required
            disabled={!selectedLocation}
          >
            <option value="">Select Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_number}
              </option>
            ))}
          </select>
        )}
      </div>
      {/* Asset Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model Number
          </label>
          <input
            name="model_number"
            className="input w-full"
            value={model.model_number}
            onChange={handleModelChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Serial Number
          </label>
          <input
            name="serial_number"
            className="input w-full"
            value={model.serial_number}
            onChange={handleModelChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Age
          </label>
          <input
            name="age"
            type="number"
            className="input w-full"
            value={model.age}
            onChange={handleModelChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tonnage
          </label>
          <input
            name="tonnage"
            className="input w-full"
            value={model.tonnage}
            onChange={handleModelChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit Type
          </label>
          <input
            name="unit_type"
            className="input w-full"
            value={model.unit_type}
            onChange={handleModelChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Type
          </label>
          <input
            name="system_type"
            className="input w-full"
            value={model.system_type}
            onChange={handleModelChange}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comment
          </label>
          <input
            name="comment"
            className="input w-full"
            value={model.comment}
            onChange={handleModelChange}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inspection Date
          </label>
          <input
            type="date"
            className="input w-full"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};

export default AddAssetForm;
