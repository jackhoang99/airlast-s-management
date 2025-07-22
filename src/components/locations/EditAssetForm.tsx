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

interface EditAssetFormProps {
  asset: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EditAssetForm = ({ asset, onSuccess, onCancel }: EditAssetFormProps) => {
  const { supabase } = useSupabase();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [companyName, setCompanyName] = useState("");

  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");

  const [model, setModel] = useState<any>({
    age: "",
    tonnage: "",
    unit_type: "Gas",
    model_number: "",
    serial_number: "",
    comment: "",
    system_type: "RTU",
  });
  const [inspectionDate, setInspectionDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with asset data
  useEffect(() => {
    if (asset) {
      setModel({
        age: asset.model?.age?.toString() || "",
        tonnage: asset.model?.tonnage || "",
        unit_type: asset.model?.unit_type || "Gas",
        model_number: asset.model?.model_number || "",
        serial_number: asset.model?.serial_number || "",
        comment: asset.model?.comment || "",
        system_type: asset.model?.system_type || "RTU",
      });
      setInspectionDate(
        asset.inspection_date ? asset.inspection_date.split("T")[0] : ""
      );
      setSelectedUnit(asset.unit_id || "");
    }
  }, [asset]);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (!error) setCompanies(data || []);
    };
    fetchCompanies();
  }, [supabase]);

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

  // Fetch units for selected location
  useEffect(() => {
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
  }, [supabase, selectedLocation]);

  // Set company and location based on asset's unit
  useEffect(() => {
    if (asset?.units?.locations?.company_id) {
      setSelectedCompany(asset.units.locations.company_id);
      setCompanyName(asset.units.locations.companies?.name || "");
    }
    if (asset?.units?.location_id) {
      setSelectedLocation(asset.units.location_id);
    }
  }, [asset]);

  // Load locations and units when company/location are set
  useEffect(() => {
    if (selectedCompany) {
      // Fetch locations for the company
      const fetchLocations = async () => {
        const { data, error } = await supabase
          .from("locations")
          .select("id, name, company_id")
          .eq("company_id", selectedCompany)
          .order("name");
        if (!error) setLocations(data || []);
      };
      fetchLocations();
    }
  }, [selectedCompany, supabase]);

  useEffect(() => {
    if (selectedLocation) {
      // Fetch units for the location
      const fetchUnits = async () => {
        const { data, error } = await supabase
          .from("units")
          .select("id, unit_number, location_id")
          .eq("location_id", selectedLocation)
          .order("unit_number");
        if (!error) setUnits(data || []);
      };
      fetchUnits();
    }
  }, [selectedLocation, supabase]);

  const handleModelChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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

      // Update asset
      const { error: updateError } = await supabase
        .from("assets")
        .update({
          unit_id: selectedUnit,
          model: {
            ...model,
            age: model.age ? parseInt(model.age) : null,
          },
          inspection_date: inspectionDate || null,
        })
        .eq("id", asset.id);

      if (updateError) throw updateError;
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update asset");
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
        <input
          type="text"
          className="input w-full"
          value={companyName}
          readOnly
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          type="text"
          className="input w-full"
          value={asset?.units?.locations?.name || ""}
          readOnly
        />
      </div>

      {/* Unit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unit
        </label>
        <input
          type="text"
          className="input w-full"
          value={asset?.units?.unit_number || ""}
          readOnly
        />
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
          <select
            name="unit_type"
            className="input w-full"
            value={model.unit_type}
            onChange={handleModelChange}
            required
          >
            <option value="Gas">Gas</option>
            <option value="Electric">Electric</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Type
          </label>
          <select
            name="system_type"
            className="input w-full"
            value={model.system_type}
            onChange={handleModelChange}
          >
            <option value="RTU">RTU</option>
            <option value="Split System">Split System</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comment
          </label>
          <textarea
            name="comment"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
            value={model.comment}
            onChange={handleModelChange}
            rows={3}
            placeholder="Enter any comments or notes"
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
          {isLoading ? "Updating..." : "Update Asset"}
        </button>
      </div>
    </form>
  );
};

export default EditAssetForm;
