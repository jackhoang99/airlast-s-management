import { useState, FormEvent, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Database } from "../../types/supabase";
import { useSupabase } from "../../lib/supabase-context";
import { Search, Plus, X } from "lucide-react";
import loader from "../../utils/loadGoogleMaps";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];

type LocationContact = {
  id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  type: string;
};

type LocationFormProps = {
  companyId?: string;
  initialData?: Location;
  onSuccess?: () => void;
};

const LocationForm = ({
  companyId: initialCompanyId,
  initialData,
  onSuccess,
}: LocationFormProps) => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyResults, setShowCompanyResults] = useState(false);
  const [existingCompanyError, setExistingCompanyError] =
    useState<Company | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [addressPredictions, setAddressPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [showAddressPredictions, setShowAddressPredictions] = useState(false);
  const [additionalContacts, setAdditionalContacts] = useState<
    LocationContact[]
  >([]);
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const dummyElement = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zip: initialData?.zip || "",
    contact_name: initialData?.contact_name || "",
    contact_phone: initialData?.contact_phone || "",
    contact_email: initialData?.contact_email || "",
    contact_type: initialData?.contact_type || "",
  });

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = async () => {
      try {
        // Use centralized loader

        const google = await loader.load();
        setGoogleMapsLoaded(true);

        // Initialize autocomplete service
        autocompleteService.current =
          new google.maps.places.AutocompleteService();

        // Initialize places service (requires a DOM element)
        if (dummyElement.current) {
          placesService.current = new google.maps.places.PlacesService(
            dummyElement.current
          );
        }
      } catch (error) {
        console.error("Error loading Google Maps API:", error);
      }
    };

    loadGoogleMapsAPI();
  }, []);

  useEffect(() => {
    if (initialCompanyId) {
      fetchCompany(initialCompanyId);
    } else if (initialData?.company_id) {
      fetchCompany(initialData.company_id);
    }
  }, [initialCompanyId, initialData]);

  // Load additional contacts if editing
  useEffect(() => {
    if (initialData?.id) {
      loadAdditionalContacts(initialData.id);
    }
  }, [initialData]);

  const loadAdditionalContacts = async (locationId: string) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("location_contacts")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading additional contacts:", error);
      return;
    }

    if (data) {
      setAdditionalContacts(data);
    }
  };

  const fetchCompany = async (id: string) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching company:", error);
      return;
    }

    if (data) {
      setSelectedCompany(data);
      setCompanySearch(data.name);
    }
  };

  const searchCompanies = async (query: string) => {
    if (!supabase || query.length < 2) {
      setCompanies([]);
      return;
    }

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(5);

    if (error) {
      console.error("Error searching companies:", error);
      return;
    }

    setCompanies(data || []);
  };

  const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanySearch(value);
    setShowCompanyResults(true);
    setExistingCompanyError(null);
    searchCompanies(value);

    if (!value) {
      setSelectedCompany(null);
    }
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setCompanySearch(company.name);
    setShowCompanyResults(false);
    setExistingCompanyError(null);
  };

  const handleAddressChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, address: value }));

    if (googleMapsLoaded && autocompleteService.current && value.length > 3) {
      try {
        // Prioritize Atlanta in the results
        const request = {
          input: value,
          componentRestrictions: { country: "us" },
          location: new google.maps.LatLng(33.7489954, -84.3902397), // Atlanta coordinates
          radius: 50000, // 50km radius around Atlanta
        };

        autocompleteService.current.getPlacePredictions(
          request,
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              // Sort predictions to prioritize Atlanta addresses
              const sortedPredictions = [...predictions].sort((a, b) => {
                const aHasAtlanta = a.description
                  .toLowerCase()
                  .includes("atlanta");
                const bHasAtlanta = b.description
                  .toLowerCase()
                  .includes("atlanta");

                if (aHasAtlanta && !bHasAtlanta) return -1;
                if (!aHasAtlanta && bHasAtlanta) return 1;
                return 0;
              });

              setAddressPredictions(sortedPredictions);
              setShowAddressPredictions(true);
            } else {
              setAddressPredictions([]);
              setShowAddressPredictions(false);
            }
          }
        );
      } catch (error) {
        console.error("Error getting address predictions:", error);
      }
    } else {
      setAddressPredictions([]);
      setShowAddressPredictions(false);
    }
  };

  const handleAddressSelect = (placeId: string) => {
    if (googleMapsLoaded && placesService.current) {
      placesService.current.getDetails(
        {
          placeId: placeId,
          fields: ["address_component", "formatted_address"],
        },
        (place, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            place &&
            place.address_components
          ) {
            let streetNumber = "";
            let route = "";
            let city = "";
            let state = "";
            let zip = "";

            // Extract address components
            place.address_components.forEach((component) => {
              const types = component.types;

              if (types.includes("street_number")) {
                streetNumber = component.long_name;
              } else if (types.includes("route")) {
                route = component.long_name;
              } else if (types.includes("locality")) {
                city = component.long_name;
              } else if (types.includes("administrative_area_level_1")) {
                state = component.short_name;
              } else if (types.includes("postal_code")) {
                zip = component.long_name;
              }
            });

            // Update form data
            setFormData((prev) => ({
              ...prev,
              address:
                streetNumber && route
                  ? `${streetNumber} ${route}`
                  : place.formatted_address || prev.address,
              city: city || prev.city,
              state: state || prev.state,
              zip: zip || prev.zip,
            }));

            setShowAddressPredictions(false);
          }
        }
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!supabase || !selectedCompany) {
      setError("Please select a company first");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setExistingCompanyError(null);

    try {
      // Check if company with same name exists
      const { data: existingCompanies } = await supabase
        .from("companies")
        .select("*")
        .eq("name", companySearch.trim())
        .neq("id", selectedCompany.id)
        .limit(1);

      if (existingCompanies && existingCompanies.length > 0) {
        setExistingCompanyError(existingCompanies[0]);
        return;
      }

      let locationId: string;

      if (initialData) {
        // Update existing location
        const { data, error } = await supabase
          .from("locations")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)
          .select()
          .single();

        if (error) throw error;
        locationId = initialData.id;
      } else {
        // Create new location
        const { data, error } = await supabase
          .from("locations")
          .insert({
            ...formData,
            company_id: selectedCompany.id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        locationId = data.id;
      }

      // Handle additional contacts
      if (locationId) {
        // Delete existing contacts if editing
        if (initialData) {
          await supabase
            .from("location_contacts")
            .delete()
            .eq("location_id", locationId);
        }

        // Insert new contacts
        const contactsToInsert = additionalContacts.filter(
          (contact) => contact.first_name.trim() || contact.last_name.trim()
        );

        if (contactsToInsert.length > 0) {
          const { error: contactsError } = await supabase
            .from("location_contacts")
            .insert(
              contactsToInsert.map((contact) => ({
                ...contact,
                location_id: locationId,
              }))
            );

          if (contactsError) throw contactsError;
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to the location details page instead of company page
        navigate(`/locations/${locationId}`);
      }
    } catch (err) {
      console.error("Error saving location:", err);
      setError("Failed to save location. Please try again.");
    } finally {
      setIsSubmitting(false);
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
    field: keyof LocationContact,
    value: string
  ) => {
    setAdditionalContacts(
      additionalContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error-50 text-error-700 p-3 rounded-md">{error}</div>
      )}

      {existingCompanyError && (
        <div className="bg-warning-50 border-l-4 border-warning-500 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-warning-800">
                Company Already Exists
              </h3>
              <div className="mt-2 text-sm text-warning-700">
                <p>
                  A company with the name "{companySearch}" already exists.
                  Would you like to{" "}
                  <button
                    type="button"
                    onClick={() => {
                      selectCompany(existingCompanyError);
                      setExistingCompanyError(null);
                    }}
                    className="text-warning-800 font-medium underline hover:text-warning-900"
                  >
                    add a location to the existing company
                  </button>
                  ?
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-6">Location Information</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="relative">
            <label
              htmlFor="company"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Company *
            </label>
            <div className="relative">
              <input
                type="text"
                id="company"
                value={companySearch}
                onChange={handleCompanySearch}
                onFocus={() => setShowCompanyResults(true)}
                className="input pr-10"
                placeholder="Search for a company..."
                required
                disabled={!!initialCompanyId || !!initialData}
              />
              <Search
                className="absolute right-3 top-3 text-gray-400"
                size={16}
              />
            </div>

            {showCompanyResults &&
              companies.length > 0 &&
              !initialCompanyId &&
              !initialData && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                  <ul className="py-1">
                    {companies.map((company) => (
                      <li
                        key={company.id}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectCompany(company)}
                      >
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-gray-500">
                          {company.city}, {company.state}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Address *
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleAddressChange}
              onFocus={() => setShowAddressPredictions(true)}
              required
              className="input"
            />

            {showAddressPredictions && addressPredictions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                <ul className="py-1">
                  {addressPredictions.map((prediction) => (
                    <li
                      key={prediction.place_id}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddressSelect(prediction.place_id)}
                    >
                      <div className="text-sm">{prediction.description}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              City *
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="input"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              State *
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              className="input"
              maxLength={2}
            />
          </div>

          <div>
            <label
              htmlFor="zip"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Zip Code *
            </label>
            <input
              type="text"
              id="zip"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              required
              className="input"
              maxLength={10}
            />
          </div>
        </div>
      </div>

      {/* Primary Contact Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-6">Primary Contact</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="contact_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contact Name
            </label>
            <input
              type="text"
              id="contact_name"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              className="input"
              placeholder="Full name"
            />
          </div>

          <div>
            <label
              htmlFor="contact_type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contact Type
            </label>
            <input
              type="text"
              id="contact_type"
              name="contact_type"
              value={formData.contact_type}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Property Manager, Maintenance"
            />
          </div>

          <div>
            <label
              htmlFor="contact_phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="contact_phone"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              className="input"
              placeholder="(123) 456-7890"
            />
          </div>

          <div>
            <label
              htmlFor="contact_email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="contact_email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              className="input"
              placeholder="contact@example.com"
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
          <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-4">
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
                  onChange={(e) => updateContact(idx, "type", e.target.value)}
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
                  onChange={(e) => updateContact(idx, "phone", e.target.value)}
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
                  onChange={(e) => updateContact(idx, "email", e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() =>
            navigate(
              selectedCompany
                ? `/companies/${selectedCompany.id}`
                : "/companies"
            )
          }
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || !selectedCompany}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              Saving...
            </>
          ) : initialData ? (
            "Update Location"
          ) : (
            "Add Location"
          )}
        </button>
      </div>

      {/* Hidden div for PlacesService */}
      <div ref={dummyElement} style={{ display: "none" }}></div>
    </form>
  );
};

export default LocationForm;
