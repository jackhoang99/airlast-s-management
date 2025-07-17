import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  ArrowLeft,
  Search,
  Filter,
  Phone,
  Mail,
  Building,
  MapPin,
  Building2,
} from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  company?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  unit?: {
    id: string;
    unit_number: string;
  };
};

const Contacts = () => {
  const { supabase } = useSupabase();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    location: "",
    unit: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!supabase) return;

      try {
        setIsLoading(true);

        // First, get all units with their contact information
        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select(
            `
            id,
            unit_number,
            primary_contact_type,
            primary_contact_email,
            primary_contact_phone,
            location_id,
            locations (
              id,
              name,
              address,
              city,
              state,
              zip,
              company_id,
              companies (
                id,
                name
              )
            )
          `
          )
          .order("unit_number");

        if (unitError) throw unitError;

        // Format unit data into contacts
        const unitContacts = (unitData || [])
          .map((unit) => ({
            id: `unit-${unit.id}`,
            name: `Unit ${unit.unit_number} Contact`,
            email: unit.primary_contact_email || "",
            phone: unit.primary_contact_phone || "",
            type: unit.primary_contact_type || "Primary",
            company: unit.locations?.companies,
            location: {
              id: unit.locations?.id || "",
              name: unit.locations?.name || "",
              address: unit.locations?.address || "",
              city: unit.locations?.city || "",
              state: unit.locations?.state || "",
              zip: unit.locations?.zip || "",
            },
            unit: {
              id: unit.id,
              unit_number: unit.unit_number,
            },
          }))
          .filter((contact) => contact.email || contact.phone);

        // Next, get all jobs with contact information
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(
            `
            id,
            number,
            name,
            contact_name,
            contact_email,
            contact_phone,
            contact_type,
            location_id,
            job_units:job_units!inner (
              unit_id,
              units:unit_id (
                id,
                unit_number
              )
            ),
            locations (
              id,
              name,
              address,
              city,
              state,
              zip,
              company_id,
              companies (
                id,
                name
              )
            )
          `
          )
          .order("created_at", { ascending: false });

        if (jobError) throw jobError;

        // Format job data into contacts
        const jobContacts = (jobData || [])
          .map((job) => ({
            id: `job-${job.id}`,
            name: job.contact_name || `Job #${job.number} Contact`,
            email: job.contact_email || "",
            phone: job.contact_phone || "",
            type: job.contact_type || "Job Contact",
            company: job.locations?.companies,
            location: job.locations
              ? {
                  id: job.locations.id,
                  name: job.locations.name,
                  address: job.locations.address,
                  city: job.locations.city,
                  state: job.locations.state,
                  zip: job.locations.zip,
                }
              : undefined,
            unit: job.job_units?.map((ju) => ju.units),
          }))
          .filter((contact) => contact.email || contact.phone);

        // Combine and deduplicate contacts
        const allContacts = [...unitContacts, ...jobContacts];

        // Simple deduplication by email
        const emailMap = new Map();
        const uniqueContacts = allContacts.filter((contact) => {
          if (!contact.email) return true; // Keep contacts without email

          if (!emailMap.has(contact.email)) {
            emailMap.set(contact.email, true);
            return true;
          }

          return false;
        });

        setContacts(uniqueContacts);
      } catch (err) {
        console.error("Error fetching contacts:", err);
        setError("Failed to load contacts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [supabase]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      name: "",
      email: "",
      phone: "",
      company: "",
      location: "",
      unit: "",
    });
    setSearchTerm("");
  };

  const filteredContacts = contacts.filter((contact) => {
    // Apply search term across all fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (contact.name && contact.name.toLowerCase().includes(searchLower)) ||
        (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchLower)) ||
        (contact.company?.name &&
          contact.company.name.toLowerCase().includes(searchLower)) ||
        (contact.location?.name &&
          contact.location.name.toLowerCase().includes(searchLower)) ||
        (contact.unit &&
          contact.unit.some((unit) =>
            unit.unit_number.toLowerCase().includes(searchLower)
          ));

      if (!matchesSearch) return false;
    }

    // Apply specific filters
    if (
      filters.name &&
      contact.name &&
      !contact.name.toLowerCase().includes(filters.name.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.email &&
      contact.email &&
      !contact.email.toLowerCase().includes(filters.email.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.phone &&
      contact.phone &&
      !contact.phone.includes(filters.phone)
    ) {
      return false;
    }

    if (
      filters.company &&
      contact.company?.name &&
      !contact.company.name
        .toLowerCase()
        .includes(filters.company.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.location &&
      contact.location?.name &&
      !contact.location.name
        .toLowerCase()
        .includes(filters.location.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.unit &&
      contact.unit &&
      !contact.unit.some((unit) =>
        unit.unit_number.toLowerCase().includes(filters.unit.toLowerCase())
      )
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Contacts</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={filters.email}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={filters.phone}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={filters.company}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="unit"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Unit
              </label>
              <input
                type="text"
                id="unit"
                name="unit"
                value={filters.unit}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end mb-6">
            <button
              onClick={resetFilters}
              className="text-primary-600 hover:text-primary-800"
            >
              Reset Filters
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No contacts found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white border rounded-lg shadow-sm p-4"
              >
                <div className="flex flex-col md:flex-row justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{contact.name}</h3>

                    <div className="flex flex-col sm:flex-row gap-4">
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-500">
                      Contact Type:{" "}
                      <span className="capitalize">{contact.type}</span>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 md:text-right">
                    {contact.company && (
                      <div className="mb-1">
                        <Link
                          to={`/companies/${contact.company.id}`}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-800 md:justify-end"
                        >
                          <Building size={14} />
                          <span>{contact.company.name}</span>
                        </Link>
                      </div>
                    )}

                    {contact.location && (
                      <div className="mb-1">
                        <Link
                          to={`/locations/${contact.location.id}`}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-800 md:justify-end"
                        >
                          <MapPin size={14} />
                          <span>{contact.location.name}</span>
                        </Link>
                      </div>
                    )}

                    {contact.unit && contact.unit.length > 0 && (
                      <div>
                        <Link
                          to={`/units/${contact.unit[0].id}`}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-800 md:justify-end"
                        >
                          <Building2 size={14} />
                          <span>Unit {contact.unit[0].unit_number}</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {contact.location && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-500">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                      <div>
                        {contact.location.address}, {contact.location.city},{" "}
                        {contact.location.state} {contact.location.zip}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts;
