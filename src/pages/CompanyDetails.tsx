import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import BackLink from "../components/ui/BackLink";
import ArrowBack from "../components/ui/ArrowBack";
import { Database } from "../types/supabase";
import {
  ArrowLeft,
  Plus,
  Edit,
  FileText,
  Tag,
  Building as Buildings,
  Phone,
  MapPin,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import UnitsList from "../components/locations/UnitsList";
import Map from "../components/ui/Map";
import QuickAssetViewModal from "../components/locations/QuickAssetViewModal";
import AssetSummary from "../components/locations/AssetSummary";
import { Dialog } from "@headlessui/react";
import AddAssetForm from "../components/locations/AddAssetForm";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CompanyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase, error: supabaseError } = useSupabase();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(
    null
  );
  const [locationSearch, setLocationSearch] = useState("");
  const [assetModalLocation, setAssetModalLocation] = useState<Location | null>(
    null
  );
  const [companyAssets, setCompanyAssets] = useState<any[]>([]);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!supabase || !id) {
        setError(supabaseError || "Supabase client not initialized");
        setIsLoading(false);
        return;
      }

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        setError("Invalid company ID format");
        setIsLoading(false);
        return;
      }

      try {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", id)
          .single();

        if (companyError) throw companyError;
        setCompany(companyData);

        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("*")
          .eq("company_id", id)
          .order("name");

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch company details";
        console.error("Error fetching company details:", errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [supabase, id, supabaseError]);

  useEffect(() => {
    const fetchCompanyAssets = async () => {
      if (!supabase || !company) return;
      try {
        setIsLoading(true);
        // Fetch all units for this company
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id")
          .eq("company_id", company.id);
        if (locationsError) throw locationsError;
        const locationIds = (locationsData || []).map((l: any) => l.id);
        if (locationIds.length === 0) {
          setCompanyAssets([]);
          setIsLoading(false);
          return;
        }
        // Fetch all units for these locations
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select("id")
          .in("location_id", locationIds);
        if (unitsError) throw unitsError;
        const unitIds = (unitsData || []).map((u: any) => u.id);
        if (unitIds.length === 0) {
          setCompanyAssets([]);
          setIsLoading(false);
          return;
        }
        // Fetch all assets for these units, joining units, locations, companies
        const { data: assetsData, error: assetsError } = await supabase
          .from("assets")
          .select(
            `*, units(id, unit_number, location_id, locations(id, name, company_id, companies(id, name)))`
          )
          .in("unit_id", unitIds);
        if (assetsError) throw assetsError;
        setCompanyAssets(assetsData || []);
      } catch (err) {
        setCompanyAssets([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyAssets();
  }, [supabase, company, assetsRefreshKey]);

  const handleDeleteCompany = async () => {
    if (!supabase || !company) return;

    setIsDeleting(true);
    setError(null);

    try {
      // First, delete all locations associated with the company
      // The cascade delete will handle the units automatically due to the ON DELETE CASCADE
      const { error: locationsDeleteError } = await supabase
        .from("locations")
        .delete()
        .eq("company_id", company.id);

      if (locationsDeleteError) throw locationsDeleteError;

      // Then delete the company
      const { error: companyDeleteError } = await supabase
        .from("companies")
        .delete()
        .eq("id", company.id);

      if (companyDeleteError) throw companyDeleteError;

      navigate("/companies");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete company";
      console.error("Error deleting company:", errorMessage);
      setError(errorMessage);
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    setExpandedLocationId(
      expandedLocationId === locationId ? null : locationId
    );
  };

  // Filtered locations based on search
  const filteredLocations = locationSearch
    ? locations.filter(
        (loc) =>
          (loc.name?.toLowerCase() || "").includes(
            locationSearch.toLowerCase()
          ) ||
          (loc.address?.toLowerCase() || "").includes(
            locationSearch.toLowerCase()
          ) ||
          (loc.city?.toLowerCase() || "").includes(
            locationSearch.toLowerCase()
          ) ||
          (loc.state?.toLowerCase() || "").includes(
            locationSearch.toLowerCase()
          )
      )
    : locations;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error}</p>
        <ArrowBack
          fallbackRoute="/companies"
          className="text-primary-600 hover:text-primary-800"
        />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Company not found.</p>
        <ArrowBack
          fallbackRoute="/companies"
          className="text-primary-600 hover:text-primary-800 mt-2 inline-block"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade">
      {/* Back link and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <ArrowBack
          fallbackRoute="/companies"
          className="text-gray-600 hover:text-gray-900"
        />
        <div className="flex space-x-2">
          <Link
            to={`/companies/${company.id}/edit`}
            className="btn btn-secondary"
          >
            <Edit size={16} className="mr-2" />
            Edit
          </Link>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="btn btn-error"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Company details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h1 className="text-2xl font-bold">{company.name}</h1>

            <div className="mt-4 space-y-3">
              <div className="flex items-start">
                <MapPin size={18} className="text-gray-500 mt-0.5 mr-2" />
                <div>
                  <p>{company.address}</p>
                  <p>
                    {company.city}, {company.state} {company.zip}
                  </p>
                </div>
              </div>

              {company.phone && (
                <div className="flex items-center">
                  <Phone size={18} className="text-gray-500 mr-2" />
                  <p>{company.phone}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Map
                address={company.address}
                city={company.city}
                state={company.state}
                zip={company.zip}
                className="mt-4"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <Link
                to={`/companies/${company.id}/location/new`}
                className="btn btn-primary w-full justify-start"
              >
                <Plus size={16} className="mr-2" />
                Add Location
              </Link>
              <Link
                to={`/companies/${company.id}/report`}
                className="btn btn-secondary w-full justify-start"
              >
                <FileText size={16} className="mr-2" />
                Generate Report
              </Link>
              <button className="btn btn-secondary w-full justify-start">
                <Tag size={16} className="mr-2" />
                Manage Tags
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Locations List Section */}
      <div className="card mt-6">
        <div className="mb-4">
          <input
            type="text"
            className="input w-full sm:w-96"
            placeholder="Search locations..."
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
          />
        </div>
        <h2 className="text-lg font-semibold mb-2">
          Locations ({filteredLocations.length})
        </h2>
        {filteredLocations.length === 0 ? (
          <div className="text-gray-500">No locations found.</div>
        ) : (
          filteredLocations.map((location) => (
            <div key={location.id} className="bg-white rounded-lg shadow">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      to={`/locations/${location.id}`}
                      className="text-lg font-medium text-primary-600 hover:text-primary-800"
                    >
                      {location.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {location.address}
                      <br />
                      {location.city}, {location.state} {location.zip}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLocation(location.id)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      {expandedLocationId === location.id
                        ? "Hide Units"
                        : "Show Units"}
                    </button>
                    <button
                      onClick={() => setAssetModalLocation(location)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Show Assets
                    </button>
                    <Link
                      to={`/companies/${company.id}/locations/${location.id}/edit`}
                      className="text-primary-600 hover:text-primary-800 text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>

              <div
                className={`
                overflow-hidden transition-all duration-200 ease-in-out
                ${
                  expandedLocationId === location.id
                    ? "max-h-[500px]"
                    : "max-h-0"
                }
              `}
              >
                <div className="border-t border-gray-100 p-4">
                  <UnitsList location={location} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Asset Summary Section */}
      <div className="card mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Company Asset Summary
          </h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddAssetModal(true)}
          >
            <Plus size={16} className="mr-1" /> Add Asset
          </button>
        </div>
        <AssetSummary
          assets={companyAssets}
          title="Company Asset Summary"
          viewAllLink={`/assets?company=${company.id}`}
        />
      </div>
      <Dialog
        open={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        className="fixed z-50 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-4">Add Asset</h3>
            <AddAssetForm
              companyId={id}
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
      <QuickAssetViewModal
        open={!!assetModalLocation}
        onClose={() => setAssetModalLocation(null)}
        location={assetModalLocation as Location}
      />

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Company
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete <strong>{company.name}</strong>?
              This will also delete all {locations.length} location
              {locations.length !== 1 ? "s" : ""} and their units. This action
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteCompany}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetails;
