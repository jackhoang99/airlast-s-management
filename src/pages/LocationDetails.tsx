import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building, MapPin, Plus, Building2 } from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import Map from "../components/ui/Map";
import UnitsList from "../components/locations/UnitsList";
import AssetSummary from "../components/locations/AssetSummary";
import { Dialog } from "@headlessui/react";
import AddAssetForm from "../components/locations/AddAssetForm";

type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
};

const LocationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [locationAssets, setLocationAssets] = useState<any[]>([]);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!supabase || !id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("locations")
          .select(
            `
            *,
            companies (
              name,
              address,
              city,
              state,
              zip,
              phone
            )
          `
          )
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        setLocation(data);
      } catch (err) {
        console.error("Error fetching location:", err);
        setError("Failed to fetch location details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocation();
  }, [supabase, id]);

  useEffect(() => {
    const fetchLocationAssets = async () => {
      if (!supabase || !location) return;
      // Fetch all units for this location
      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("id, unit_number")
        .eq("location_id", location.id);
      if (unitsError) return;
      setUnits(unitsData || []);
      const unitIds = (unitsData || []).map((u: any) => u.id);
      if (unitIds.length === 0) {
        setLocationAssets([]);
        return;
      }
      // Fetch all assets for these units
      const { data: assets, error: assetsError } = await supabase
        .from("assets")
        .select("*")
        .in("unit_id", unitIds);
      if (assetsError) return;
      setLocationAssets(assets || []);
    };
    fetchLocationAssets();
  }, [supabase, location]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || "Location not found"}</p>
        <Link
          to="/locations"
          className="text-primary-600 hover:text-primary-800"
        >
          Back to Locations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              location && navigate(`/companies/${location.company_id}`)
            }
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex items-center gap-2">
            <Building className="h-6 w-6" />
            {location.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/locations/${location.id}/units/add`}
            className="btn btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Add Unit
          </Link>
          <Link
            to={`/locations/${location.id}/edit`}
            className="btn btn-secondary"
          >
            Edit Location
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Location Details Card */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-4">Location Details</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p>{location.address}</p>
                      <p>
                        {location.city}, {location.state} {location.zip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Company Information</h3>
              <div className="space-y-4">
                <div>
                  <Link
                    to={`/companies/${location.company_id}`}
                    className="text-lg font-medium text-primary-600 hover:text-primary-800"
                  >
                    {location.companies.name}
                  </Link>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p>{location.companies.address}</p>
                    <p>
                      {location.companies.city}, {location.companies.state}{" "}
                      {location.companies.zip}
                    </p>
                    {location.companies.phone && (
                      <p className="text-gray-600">
                        {location.companies.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Map
                address={location.address}
                city={location.city}
                state={location.state}
                zip={location.zip}
                className="mt-4"
              />
            </div>
          </div>

          {/* Units Section */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold">Units</h2>
              </div>
              <Link
                to={`/locations/${location.id}/units/add`}
                className="btn btn-primary"
              >
                <Plus size={16} className="mr-2" />
                Add Unit
              </Link>
            </div>
            <div className="mb-4">
              <input
                type="text"
                className="input w-full sm:w-96"
                placeholder="Search units..."
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
              />
            </div>
            <UnitsList location={location} search={unitSearch} />
          </div>

          {/* Asset Summary Section */}
          <div className="card mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Asset Summary
              </h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddAssetModal(true)}
              >
                <Plus size={16} className="mr-1" /> Add Asset
              </button>
            </div>
            <AssetSummary
              assets={locationAssets}
              title="Location Asset Summary"
              viewAllLink={`/assets?location=${location.id}`}
            />
          </div>
          {/* Add Asset Modal (stub) */}
          <Dialog
            open={showAddAssetModal}
            onClose={() => setShowAddAssetModal(false)}
            className="fixed z-50 inset-0 overflow-y-auto"
          >
            <div className="flex items-center justify-center min-h-screen px-4">
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative z-10">
                <h3 className="text-lg font-semibold mb-4">Add Asset</h3>
                <AddAssetForm
                  locationId={id}
                  companyId={location?.company_id}
                  onSuccess={() => {
                    setShowAddAssetModal(false);
                    // Optionally refresh assets here
                  }}
                  onCancel={() => setShowAddAssetModal(false)}
                />
              </div>
            </div>
          </Dialog>
        </div>

        <div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to={`/locations/${location.id}/units/add`}
                className="btn btn-primary w-full justify-start"
              >
                <Plus size={16} className="mr-2" />
                Add Unit
              </Link>
              <Link
                to={`/locations/${location.id}/edit`}
                className="btn btn-secondary w-full justify-start"
              >
                Edit Location
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetails;
