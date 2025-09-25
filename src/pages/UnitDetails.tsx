import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  Building,
  Plus,
  Package,
  Users,
  Mail,
  Phone,
  Edit,
  FileInput as FileInvoice,
} from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import BackLink from "../components/ui/BackLink";
import BackButton from "../components/ui/BackButton";
import ArrowBack from "../components/ui/ArrowBack";
import { Database } from "../types/supabase";
import Map from "../components/ui/Map";
import UnitQRCode from "../components/units/UnitQRCode";
import AssetSummary from "../components/locations/AssetSummary";
import QuickAssetViewModal from "../components/locations/QuickAssetViewModal";
import JobsSection from "../components/jobs/JobsSection";
import { UnitDocumentsSection } from "../components/documents";
import { Dialog } from "@headlessui/react";
import AddAssetForm from "../components/locations/AddAssetForm";

type Unit = Database["public"]["Tables"]["units"]["Row"] & {
  locations: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    company_id: string;
    companies: {
      name: string;
    };
  };
  unit_contacts?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    type: string | null;
  }[];
};

type Asset = {
  id: string;
  unit_id: string;
  model: {
    model_number: string;
    serial_number: string;
    age: number;
    tonnage: string;
    unit_type: string;
    system_type: string;
    job_id: string;
    inspection_id: string;
  };
  inspection_date: string;
  created_at: string;
  updated_at: string;
};

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UnitDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showUnitAssetsModal, setShowUnitAssetsModal] = useState(false);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);

  useEffect(() => {
    const fetchUnit = async () => {
      if (!supabase || !id) return;

      // Validate UUID format
      if (!UUID_REGEX.test(id)) {
        setError("Invalid unit ID format");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("units")
          .select(
            `
            *,
            locations (
              name,
              address,
              city,
              state,
              zip,
              company_id,
              companies (
                name
              )
            ),
            unit_contacts (
              id,
              first_name,
              last_name,
              phone,
              email,
              type
            )
          `
          )
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        setUnit(data);
      } catch (err) {
        console.error("Error fetching unit:", err);
        setError("Failed to fetch unit details");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAssets = async () => {
      if (!supabase || !id) return;

      // Don't fetch assets if UUID is invalid
      if (!UUID_REGEX.test(id)) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("assets")
          .select(
            `*, units(id, unit_number, location_id, locations(id, name, company_id, companies(id, name)))`
          )
          .eq("unit_id", id)
          .order("inspection_date", { ascending: false });

        if (fetchError) throw fetchError;
        setAssets(data || []);
      } catch (err) {
        console.error("Error fetching assets for unit:", err);
      }
    };

    fetchUnit();
    fetchAssets();
  }, [supabase, id, assetsRefreshKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || "Unit not found"}</p>
        <BackLink
          fallbackRoute="/units"
          className="text-primary-600 hover:text-primary-800"
        >
          Back to Units
        </BackLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowBack
            fallbackRoute={`/locations/${unit?.location_id || ""}`}
            className="text-gray-500 hover:text-gray-700"
          />
          <h1 className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {unit.unit_number}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/jobs/create?unitId=${unit.id}`}
            className="btn btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Create Job
          </Link>
          <Link
            to={`/create-invoice/unit/${unit.id}`}
            className="btn btn-secondary"
          >
            <FileInvoice size={16} className="mr-2" />
            Create Invoice
          </Link>
          <Link to={`/units/${unit.id}/edit`} className="btn btn-secondary">
            <Edit size={16} className="mr-2" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Unit Details Card */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-4">Unit Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Unit Number
                    </label>
                    <p className="text-lg font-medium">{unit.unit_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <p>
                      <span
                        className={`badge ${
                          unit.status.toLowerCase() === "active"
                            ? "bg-success-100 text-success-800"
                            : "bg-error-100 text-error-800"
                        }`}
                      >
                        {unit.status.toLowerCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            {(unit.primary_contact_type ||
              unit.primary_contact_email ||
              unit.primary_contact_phone ||
              (unit.unit_contacts && unit.unit_contacts.length > 0)) && (
              <>
                <hr className="my-6" />
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-4">
                    {/* Primary Contact */}
                    {(unit.primary_contact_type ||
                      unit.primary_contact_email ||
                      unit.primary_contact_phone) && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Primary Contact
                        </h4>
                        <div className="space-y-2">
                          {unit.primary_contact_type && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                Type:
                              </span>
                              <span>{unit.primary_contact_type}</span>
                            </div>
                          )}
                          {unit.primary_contact_phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                Phone:
                              </span>
                              <a
                                href={`tel:${unit.primary_contact_phone}`}
                                className="text-primary-600 hover:text-primary-800"
                              >
                                {unit.primary_contact_phone}
                              </a>
                            </div>
                          )}
                          {unit.primary_contact_email && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                Email:
                              </span>
                              <a
                                href={`mailto:${unit.primary_contact_email}`}
                                className="text-primary-600 hover:text-primary-800"
                              >
                                {unit.primary_contact_email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Additional Contacts */}
                    {unit.unit_contacts && unit.unit_contacts.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Additional Contacts
                        </h4>
                        <div className="space-y-3">
                          {unit.unit_contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="bg-gray-50 rounded-lg p-4"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Name:
                                  </span>
                                  <span>
                                    {contact.first_name} {contact.last_name}
                                  </span>
                                </div>
                                {contact.type && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      Type:
                                    </span>
                                    <span>{contact.type}</span>
                                  </div>
                                )}
                                {contact.phone && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      Phone:
                                    </span>
                                    <a
                                      href={`tel:${contact.phone}`}
                                      className="text-primary-600 hover:text-primary-800"
                                    >
                                      {contact.phone}
                                    </a>
                                  </div>
                                )}
                                {contact.email && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      Email:
                                    </span>
                                    <a
                                      href={`mailto:${contact.email}`}
                                      className="text-primary-600 hover:text-primary-800"
                                    >
                                      {contact.email}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <hr className="my-6" />

            {/* Billing Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Billing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing Entity
                  </label>
                  <p>{unit.billing_entity || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing Email
                  </label>
                  <p>{unit.billing_email || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing City
                  </label>
                  <p>{unit.billing_city || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing State
                  </label>
                  <p>{unit.billing_state || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Billing Zip
                  </label>
                  <p>{unit.billing_zip || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Office
                  </label>
                  <p>{unit.office || "Main Office"}</p>
                </div>
              </div>
            </div>

            <hr className="my-6" />

            <div>
              <h3 className="text-lg font-medium mb-4">Location Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <div>
                    <Link
                      to={`/locations/${unit.location_id}`}
                      className="text-lg font-medium text-primary-600 hover:text-primary-800"
                    >
                      {unit.locations.name}
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p>{unit.locations.address}</p>
                    <p>
                      {unit.locations.city}, {unit.locations.state}{" "}
                      {unit.locations.zip}
                    </p>
                  </div>
                </div>
                <div>
                  <Link
                    to={`/companies/${unit.locations.company_id}`}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    {unit.locations.companies.name}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Map
                address={unit.locations.address}
                city={unit.locations.city}
                state={unit.locations.state}
                zip={unit.locations.zip}
                className="mt-4"
              />
            </div>
          </div>

          {/* Documents Section */}
          <UnitDocumentsSection
            unitId={unit.id}
            locationId={unit.location_id}
            companyId={unit.locations.company_id}
            title="Unit Documents"
          />

          {/* Jobs Section */}
          <JobsSection
            unitId={unit.id}
            title="Jobs"
            createJobLink={`/jobs/create?unitId=${unit.id}`}
          />

          {/* Asset Summary Section */}
          <div className="card mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Unit Asset Summary
              </h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddAssetModal(true)}
              >
                <Plus size={16} className="mr-1" /> Add Asset
              </button>
            </div>
            <AssetSummary
              assets={assets}
              title="Unit Asset Summary"
              viewAllLink={`/units/${unit.id}/assets`}
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
                  unitId={id}
                  locationId={unit?.location_id}
                  companyId={unit?.locations?.company_id}
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

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to={`/jobs/create?unitId=${unit.id}`}
                className="btn btn-primary w-full justify-start"
              >
                <Plus size={16} className="mr-2" />
                Create Job
              </Link>
              <Link
                to={`/create-invoice/unit/${unit.id}`}
                className="btn btn-secondary w-full justify-start"
              >
                <FileInvoice size={16} className="mr-2" />
                Create Invoice
              </Link>
              <button
                onClick={() => setShowUnitAssetsModal(true)}
                className="btn btn-secondary w-full justify-start"
              >
                <Package size={16} className="mr-2" />
                View Assets
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <UnitQRCode unitId={unit.id} unitNumber={unit.unit_number} />
        </div>
      </div>

      {/* Unit Assets Modal */}
      {showUnitAssetsModal && unit && (
        <QuickAssetViewModal
          open={showUnitAssetsModal}
          onClose={() => setShowUnitAssetsModal(false)}
          location={unit.locations as any}
          unit={unit}
        />
      )}
    </div>
  );
};

export default UnitDetails;
