import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building,
  MapPin,
  Plus,
  Building2,
  FileInput as FileInvoice,
  Package,
  Edit,
} from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import BackLink from "../components/ui/BackLink";
import BackButton from "../components/ui/BackButton";
import ArrowBack from "../components/ui/ArrowBack";
import { Database } from "../types/supabase";
import Map from "../components/ui/Map";
import UnitsList from "../components/locations/UnitsList";
import AssetSummary from "../components/locations/AssetSummary";
import QuickAssetViewModal from "../components/locations/QuickAssetViewModal";
import { Dialog } from "@headlessui/react";
import AddAssetForm from "../components/locations/AddAssetForm";
import PermitSection from "../components/permits/PermitSection";
import JobsSection from "../components/jobs/JobsSection";

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

  // Debug logging
  console.log("LocationDetails: Current URL =", window.location.href);
  console.log("LocationDetails: Pathname =", window.location.pathname);
  console.log("LocationDetails: useParams id =", id);
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [locationAssets, setLocationAssets] = useState<any[]>([]);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showLocationAssetsModal, setShowLocationAssetsModal] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);

  useEffect(() => {
    const fetchLocation = async () => {
      console.log("LocationDetails: id parameter =", id);
      console.log("LocationDetails: supabase available =", !!supabase);

      if (!supabase) {
        console.error("LocationDetails: Supabase client not available");
        setError("Database connection not available");
        setIsLoading(false);
        return;
      }

      if (!id) {
        console.error("LocationDetails: No location ID provided");
        setError("No location ID provided. Please check the URL.");
        setIsLoading(false);
        return;
      }

      // Validate UUID format
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(id)) {
        console.error("LocationDetails: Invalid UUID format:", id);
        setError("Invalid location ID format");
        setIsLoading(false);
        return;
      }

      try {
        console.log("LocationDetails: Fetching location with ID:", id);
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
        console.log("LocationDetails: Successfully fetched location:", data);
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
        .select("id")
        .eq("location_id", location.id);
      if (unitsError) return;
      setUnits(unitsData || []);
      const unitIds = (unitsData || []).map((u: any) => u.id);
      if (unitIds.length === 0) {
        setLocationAssets([]);
        return;
      }
      // Fetch all assets for these units, joining units, locations, companies
      const { data: assets, error: assetsError } = await supabase
        .from("assets")
        .select(
          `*, units(id, unit_number, location_id, locations(id, name, company_id, companies(id, name)))`
        )
        .in("unit_id", unitIds);
      if (assetsError) return;
      setLocationAssets(assets || []);
    };
    fetchLocationAssets();
  }, [supabase, location, assetsRefreshKey]);

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
        <ArrowBack
          fallbackRoute="/locations"
          className="text-primary-600 hover:text-primary-800"
        />
      </div>
    );
  }

  const unitIdsParam = units.length > 0 ? units.map((u) => u.id).join(",") : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowBack
            fallbackRoute={`/companies/${location?.company_id || ""}`}
            className="text-gray-500 hover:text-gray-700"
          />
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
            to={`/jobs/create?locationId=${location.id}${
              unitIdsParam ? `&unitIds=${unitIdsParam}` : ""
            }`}
            className="btn btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Create Job
          </Link>
          <Link
            to={`/create-invoice/location/${location.id}`}
            className="btn btn-secondary"
          >
            <FileInvoice size={16} className="mr-2" />
            Create Invoice
          </Link>
          <Link
            to={`/locations/${location.id}/edit`}
            className="btn btn-secondary"
          >
            <Edit size={16} className="mr-2" />
            Edit
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

          {/* Permits and Comments Section */}
          <PermitSection
            locationId={location.id}
            companyId={location.company_id}
            title="Location Permits and Comments"
          />

          {/* Jobs Section */}
          <JobsSection
            locationId={location.id}
            title="Jobs"
            createJobLink={`/jobs/create?locationId=${location.id}`}
          />

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
                    // Refresh assets after adding new asset
                    setAssetsRefreshKey((prev) => prev + 1);
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
                to={`/jobs/create?locationId=${location.id}${
                  unitIdsParam ? `&unitIds=${unitIdsParam}` : ""
                }`}
                className="btn btn-primary w-full justify-start"
              >
                <Plus size={16} className="mr-2" />
                Create Job
              </Link>
              <Link
                to={`/create-invoice/location/${location.id}`}
                className="btn btn-secondary w-full justify-start"
              >
                <FileInvoice size={16} className="mr-2" />
                Create Invoice
              </Link>
              <button
                onClick={() => setShowLocationAssetsModal(true)}
                className="btn btn-secondary w-full justify-start"
              >
                <Package size={16} className="mr-2" />
                View Assets
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Location Assets Modal */}
      {showLocationAssetsModal && location && (
        <QuickAssetViewModal
          open={showLocationAssetsModal}
          onClose={() => setShowLocationAssetsModal(false)}
          location={location}
        />
      )}
    </div>
  );
};

export default LocationDetails;
