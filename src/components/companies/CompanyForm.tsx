import { useState, FormEvent, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Database } from "../../types/supabase";
import { useSupabase } from "../../lib/supabase-context";
import { Search } from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";

type Company = Database["public"]["Tables"]["companies"]["Row"];

type CompanyFormProps = {
  initialData?: Company;
  onSuccess?: () => void;
};

const CompanyForm = ({ initialData, onSuccess }: CompanyFormProps) => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [existingCompany, setExistingCompany] = useState<Company | null>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [addressPredictions, setAddressPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [showAddressPredictions, setShowAddressPredictions] = useState(false);
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
    phone: initialData?.phone || "",
  });

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "routes", "marker"],
        });

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

  const searchCompanies = async (query: string) => {
    if (!supabase || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Error searching companies:", err);
    }
  };

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, name: value }));
    setExistingCompany(null);
    setShowResults(true);
    searchCompanies(value);
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

    if (!supabase) {
      setError("Supabase client not initialized");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Check for exact name match
      const { data: existingCompanies } = await supabase
        .from("companies")
        .select("*")
        .ilike("name", formData.name.trim())
        .limit(1);

      if (
        existingCompanies &&
        existingCompanies.length > 0 &&
        existingCompanies[0].id !== initialData?.id
      ) {
        setExistingCompany(existingCompanies[0]);
        setIsSubmitting(false);
        return;
      }

      if (initialData) {
        // Update existing company
        const { error } = await supabase
          .from("companies")
          .update(formData)
          .eq("id", initialData.id);

        if (error) throw error;
      } else {
        // Create new company
        const { error } = await supabase.from("companies").insert(formData);

        if (error) throw error;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/companies");
      }
    } catch (err) {
      console.error("Error saving company:", err);
      setError("Failed to save company. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error-50 text-error-700 p-3 rounded-md">{error}</div>
      )}

      {existingCompany && (
        <div className="bg-warning-50 border-l-4 border-warning-500 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-warning-800">
                Company Already Exists
              </h3>
              <div className="mt-2 text-sm text-warning-700">
                <p>
                  A company with the name "{formData.name}" already exists.
                  Would you like to{" "}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/companies/${existingCompany.id}/location/new`)
                    }
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company Name *
          </label>
          <div className="relative">
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              onFocus={() => setShowResults(true)}
              required
              className="input pr-10"
              placeholder="Enter company name..."
            />
            <Search
              className="absolute right-3 top-3 text-gray-400"
              size={16}
            />
          </div>

          {showResults && searchResults.length > 0 && !initialData && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
              <ul className="py-1">
                {searchResults.map((company) => (
                  <li
                    key={company.id}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, name: company.name }));
                      setExistingCompany(company);
                      setShowResults(false);
                    }}
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

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="input"
            placeholder="(123) 456-7890"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => navigate("/companies")}
          className="btn btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              Saving...
            </>
          ) : initialData ? (
            "Update Company"
          ) : (
            "Create Company"
          )}
        </button>
      </div>

      {/* Hidden div for PlacesService */}
      <div ref={dummyElement} style={{ display: "none" }}></div>


    </form>
  );
};

export default CompanyForm;
