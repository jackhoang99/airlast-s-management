import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building, MapPin, Plus, Building2 } from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import Map from "../components/ui/Map";
import UnitsList from "../components/locations/UnitsList";

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
            <UnitsList location={location} />
          </div>
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
