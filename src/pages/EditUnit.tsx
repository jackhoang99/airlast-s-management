import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Plus, X } from "lucide-react";
import ArrowBack from "../components/ui/ArrowBack";
import { useSupabase } from "../lib/supabase-context";
import type { Database } from "../types/supabase";

type UnitContact = {
  id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  type: string;
};

type Unit = Database["public"]["Tables"]["units"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies: {
    name: string;
  };
};

const EditUnit = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [additionalContacts, setAdditionalContacts] = useState<UnitContact[]>(
    []
  );

  const [formData, setFormData] = useState({
    unitNumber: "",
    status: "active" as "active" | "inactive",
    primary_contact_email: "",
    primary_contact_phone: "",
    primary_contact_type: "",
    // Billing fields
    billing_entity: "",
    billing_email: "",
    billing_city: "",
    billing_state: "",
    billing_zip: "",
  });

  useEffect(() => {
    const fetchUnitAndLocation = async () => {
      if (!supabase || !id) return;

      try {
        // Fetch unit
        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select("*")
          .eq("id", id)
          .single();

        if (unitError) throw unitError;
        setUnit(unitData);
        setFormData({
          unitNumber: unitData.unit_number,
          status: unitData.status.toLowerCase() as "active" | "inactive",
          primary_contact_email: unitData.primary_contact_email || "",
          primary_contact_phone: unitData.primary_contact_phone || "",
          primary_contact_type: unitData.primary_contact_type || "Management",
          // Billing fields
          billing_entity: unitData.billing_entity || "",
          billing_email: unitData.billing_email || "",
          billing_city: unitData.billing_city || "",
          billing_state: unitData.billing_state || "",
          billing_zip: unitData.billing_zip || "",
        });

        // Fetch location
        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .select(
            `
            *,
            companies:company_id(name)
          `
          )
          .eq("id", unitData.location_id)
          .single();

        if (locationError) throw locationError;
        setLocation(locationData);

        // Load additional contacts
        const { data: contactsData, error: contactsError } = await supabase
          .from("unit_contacts")
          .select("*")
          .eq("unit_id", id)
          .order("created_at", { ascending: true });

        if (contactsError) {
          console.error("Error loading additional contacts:", contactsError);
        } else {
          setAdditionalContacts(contactsData || []);
        }
      } catch (err) {
        console.error("Error fetching unit details:", err);
        setError("Failed to fetch unit details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnitAndLocation();
  }, [supabase, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !unit) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("units")
        .update({
          unit_number: formData.unitNumber,
          status: formData.status,
          primary_contact_email: formData.primary_contact_email || null,
          primary_contact_phone: formData.primary_contact_phone || null,
          primary_contact_type: formData.primary_contact_type || null,
          // Billing fields
          billing_entity: formData.billing_entity || null,
          billing_email: formData.billing_email || null,
          billing_city: formData.billing_city || null,
          billing_state: formData.billing_state || null,
          billing_zip: formData.billing_zip || null,
        })
        .eq("id", unit.id);

      if (updateError) throw updateError;

      // Handle additional contacts
      // Delete existing contacts
      await supabase.from("unit_contacts").delete().eq("unit_id", unit.id);

      // Insert new contacts
      const contactsToInsert = additionalContacts.filter(
        (contact) => contact.first_name.trim() || contact.last_name.trim()
      );

      if (contactsToInsert.length > 0) {
        const { error: contactsError } = await supabase
          .from("unit_contacts")
          .insert(
            contactsToInsert.map((contact) => ({
              ...contact,
              unit_id: unit.id,
            }))
          );

        if (contactsError) throw contactsError;
      }

      navigate(`/units/${unit.id}`);
    } catch (err) {
      console.error("Error updating unit:", err);
      setError("Failed to update unit. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const addContact = () => {
    setAdditionalContacts([
      ...additionalContacts,
      {
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        type: "",
      },
    ]);
  };

  const removeContact = (index: number) => {
    setAdditionalContacts(additionalContacts.filter((_, i) => i !== index));
  };

  const updateContact = (
    index: number,
    field: keyof UnitContact,
    value: string
  ) => {
    setAdditionalContacts(
      additionalContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    );
  };

  const handleDelete = async () => {
    if (!supabase || !unit) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from("units")
        .delete()
        .eq("id", unit.id);

      if (deleteError) throw deleteError;
      navigate(`/locations/${unit.location_id}`);
    } catch (err) {
      console.error("Error deleting unit:", err);
      setError("Failed to delete unit. Please try again.");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !unit || !location) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || "Unit not found"}</p>
        <Link to="/units" className="text-primary-600 hover:text-primary-800">
          Back to Units
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowBack
            fallbackRoute={`/locations/${unit.location_id}`}
            className="text-gray-500 hover:text-gray-700"
          />
          <h1>Edit Unit</h1>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
        >
          Delete Unit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-50 text-error-700 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Unit Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-6">Unit Information</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="text-gray-900 p-3 bg-gray-50 rounded-md">
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-gray-500">
                    {location.address}, {location.city}, {location.state}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {location.companies?.name}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="unitNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unit Number *
                </label>
                <input
                  type="text"
                  id="unitNumber"
                  value={formData.unitNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      unitNumber: e.target.value,
                    }))
                  }
                  className="input"
                  required
                />
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
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as "active" | "inactive",
                    }))
                  }
                  className="select"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Primary Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-6">Primary Contact</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="primary_contact_type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Contact Type
                </label>
                <select
                  id="primary_contact_type"
                  value={formData.primary_contact_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primary_contact_type: e.target.value,
                    }))
                  }
                  className="select"
                >
                  <option value="Management">Management</option>
                  <option value="Owner">Owner</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Tenant">Tenant</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="primary_contact_phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="primary_contact_phone"
                  value={formData.primary_contact_phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primary_contact_phone: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="(123) 456-7890"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="primary_contact_email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="primary_contact_email"
                  value={formData.primary_contact_email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      primary_contact_email: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="contact@example.com"
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-6">Billing Information</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="billing_entity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Billing Entity
                </label>
                <input
                  type="text"
                  id="billing_entity"
                  value={formData.billing_entity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billing_entity: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Billing Entity Name"
                />
              </div>

              <div>
                <label
                  htmlFor="billing_email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Billing Email
                </label>
                <input
                  type="email"
                  id="billing_email"
                  value={formData.billing_email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billing_email: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="billing@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="billing_city"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Billing City
                </label>
                <input
                  type="text"
                  id="billing_city"
                  value={formData.billing_city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billing_city: e.target.value,
                    }))
                  }
                  className="input"
                />
              </div>

              <div>
                <label
                  htmlFor="billing_state"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Billing State
                </label>
                <input
                  type="text"
                  id="billing_state"
                  value={formData.billing_state}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billing_state: e.target.value,
                    }))
                  }
                  className="input"
                  maxLength={2}
                />
              </div>

              <div>
                <label
                  htmlFor="billing_zip"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Billing Zip
                </label>
                <input
                  type="text"
                  id="billing_zip"
                  value={formData.billing_zip}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billing_zip: e.target.value,
                    }))
                  }
                  className="input"
                />
              </div>

              <div>
                <label
                  htmlFor="office"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Office
                </label>
                <input
                  type="text"
                  id="office"
                  value={formData.office}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, office: e.target.value }))
                  }
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Additional Contacts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-6 flex items-center justify-between">
              Additional Contacts
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={addContact}
              >
                <Plus size={16} className="mr-1" /> Add Contact
              </button>
            </h2>

            {additionalContacts.length === 0 && (
              <p className="text-gray-500">No additional contacts added.</p>
            )}

            {additionalContacts.map((contact, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 mb-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium">Contact {idx + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={contact.first_name}
                      onChange={(e) =>
                        updateContact(idx, "first_name", e.target.value)
                      }
                      placeholder="First name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={contact.last_name}
                      onChange={(e) =>
                        updateContact(idx, "last_name", e.target.value)
                      }
                      placeholder="Last name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={contact.type}
                      onChange={(e) =>
                        updateContact(idx, "type", e.target.value)
                      }
                      placeholder="Contact Type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="input"
                      value={contact.phone}
                      onChange={(e) =>
                        updateContact(idx, "phone", e.target.value)
                      }
                      placeholder="(123) 456-7890"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="input"
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(idx, "email", e.target.value)
                      }
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Link
              to={`/locations/${unit.location_id}`}
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Unit
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete unit{" "}
              <strong>{unit.unit_number}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
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

export default EditUnit;
