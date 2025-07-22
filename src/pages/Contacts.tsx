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
  Users,
} from "lucide-react";

type Contact = {
  id: string;
  email: string;
  phone: string;
  type: string;
  units: Array<{
    id: string;
    unit_number: string;
    location: {
      id: string;
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      company: {
        id: string;
        name: string;
      };
    };
  }>;
  // Grouped contact info
  contactTypes: string[];
  companies: Array<{
    id: string;
    name: string;
  }>;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  }>;
};

const Contacts = () => {
  const { supabase } = useSupabase();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
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

        // Fetch all units with their contact information and related data
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

        // Group units by shared contact information
        const contactGroups = new Map<string, Contact>();

        (unitData || []).forEach((unit) => {
          const email = unit.primary_contact_email?.toLowerCase().trim() || "";
          const phone = unit.primary_contact_phone?.trim() || "";

          // Skip units without any contact information
          if (!email && !phone) return;

          // Create a unique key for grouping
          const groupKey = email || phone;

          if (!contactGroups.has(groupKey)) {
            // Create new contact group
            contactGroups.set(groupKey, {
              id: groupKey,
              email: unit.primary_contact_email || "",
              phone: unit.primary_contact_phone || "",
              type: unit.primary_contact_type || "Primary",
              units: [],
              contactTypes: [],
              companies: [],
              locations: [],
            });
          }

          const contact = contactGroups.get(groupKey)!;

          // Add unit to this contact group
          contact.units.push({
            id: unit.id,
            unit_number: unit.unit_number,
            location: {
              id: unit.locations?.id || "",
              name: unit.locations?.name || "",
              address: unit.locations?.address || "",
              city: unit.locations?.city || "",
              state: unit.locations?.state || "",
              zip: unit.locations?.zip || "",
              company: unit.locations?.companies || { id: "", name: "" },
            },
          });

          // Add contact type if not already present
          if (
            unit.primary_contact_type &&
            !contact.contactTypes.includes(unit.primary_contact_type)
          ) {
            contact.contactTypes.push(unit.primary_contact_type);
          }

          // Add company if not already present
          if (
            unit.locations?.companies &&
            !contact.companies.some((c) => c.id === unit.locations.companies.id)
          ) {
            contact.companies.push(unit.locations.companies);
          }

          // Add location if not already present
          if (
            unit.locations &&
            !contact.locations.some((l) => l.id === unit.locations.id)
          ) {
            contact.locations.push({
              id: unit.locations.id,
              name: unit.locations.name,
              address: unit.locations.address,
              city: unit.locations.city,
              state: unit.locations.state,
              zip: unit.locations.zip,
            });
          }
        });

        // Convert map to array and sort by email/phone
        const contactsArray = Array.from(contactGroups.values()).sort(
          (a, b) => {
            const aKey = a.email || a.phone;
            const bKey = b.email || b.phone;
            return aKey.localeCompare(bKey);
          }
        );

        setContacts(contactsArray);
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
        (contact.email && contact.email.toLowerCase().includes(searchLower)) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchLower)) ||
        contact.companies.some((company) =>
          company.name.toLowerCase().includes(searchLower)
        ) ||
        contact.locations.some((location) =>
          location.name.toLowerCase().includes(searchLower)
        ) ||
        contact.units.some((unit) =>
          unit.unit_number.toLowerCase().includes(searchLower)
        );

      if (!matchesSearch) return false;
    }

    // Apply specific filters
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
      !contact.companies.some((company) =>
        company.name.toLowerCase().includes(filters.company.toLowerCase())
      )
    ) {
      return false;
    }

    if (
      filters.location &&
      !contact.locations.some((location) =>
        location.name.toLowerCase().includes(filters.location.toLowerCase())
      )
    ) {
      return false;
    }

    if (
      filters.unit &&
      !contact.units.some((unit) =>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <h3 className="text-lg font-medium">
                        {contact.units.length} Unit
                        {contact.units.length !== 1 ? "s" : ""} Contact
                      </h3>
                    </div>

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

                    {contact.contactTypes.length > 0 && (
                      <div className="text-sm text-gray-500">
                        Contact Types:{" "}
                        <span className="capitalize">
                          {contact.contactTypes.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 md:mt-0 md:text-right">
                    {contact.companies.length > 0 && (
                      <div className="mb-1">
                        <Link
                          to={`/companies/${contact.companies[0].id}`}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-800 md:justify-end"
                        >
                          <Building size={14} />
                          <span>{contact.companies[0].name}</span>
                          {contact.companies.length > 1 && (
                            <span className="text-xs text-gray-500">
                              (+{contact.companies.length - 1} more)
                            </span>
                          )}
                        </Link>
                      </div>
                    )}

                    {contact.locations.length > 0 && (
                      <div className="mb-1">
                        <Link
                          to={`/locations/${contact.locations[0].id}`}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-800 md:justify-end"
                        >
                          <MapPin size={14} />
                          <span>{contact.locations[0].name}</span>
                          {contact.locations.length > 1 && (
                            <span className="text-xs text-gray-500">
                              (+{contact.locations.length - 1} more)
                            </span>
                          )}
                        </Link>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1 text-primary-600 md:justify-end">
                        <Building2 size={14} />
                        <span>
                          {contact.units.length} Unit
                          {contact.units.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Units List */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Associated Units:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {contact.units.map((unit) => (
                      <Link
                        key={unit.id}
                        to={`/units/${unit.id}`}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm"
                      >
                        <Building2 size={12} className="text-gray-400" />
                        <span className="font-medium">
                          Unit {unit.unit_number}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 truncate">
                          {unit.location.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Address Information */}
                {contact.locations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-500">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                      <div>
                        {contact.locations[0].address},{" "}
                        {contact.locations[0].city},{" "}
                        {contact.locations[0].state} {contact.locations[0].zip}
                        {contact.locations.length > 1 && (
                          <span className="text-xs text-gray-400 ml-1">
                            (and {contact.locations.length - 1} other location
                            {contact.locations.length - 1 !== 1 ? "s" : ""})
                          </span>
                        )}
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
