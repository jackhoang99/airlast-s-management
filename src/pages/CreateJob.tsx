import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Filter,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import { Database } from "../types/supabase";
import AppointmentModal from "../components/jobs/AppointmentModal";

type Location = Database["public"]["Tables"]["locations"]["Row"] & {
  companies: {
    name: string;
    id: string;
  };
  units: {
    id: string;
    unit_number: string;
    status: string;
    primary_contact_type: string | null;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
  }[];
};

type User = Database["public"]["Tables"]["users"]["Row"];

const CreateJob = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const unitIdFromUrl = searchParams.get("unitId");
  const locationIdFromUrl = searchParams.get("locationId");
  const unitIdsFromUrl =
    searchParams.get("unitIds")?.split(",").filter(Boolean) || [];
  const [selectedUnitIds, setSelectedUnitIds] =
    useState<string[]>(unitIdsFromUrl);
  const [unitsForLocation, setUnitsForLocation] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [serviceLines, setServiceLines] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<User[]>([]);
  const [jobTypes, setJobTypes] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const [isLoadingUnitDetails, setIsLoadingUnitDetails] = useState(false);
  const [isContractJob, setIsContractJob] = useState(true);
  const [availableTechnicians, setAvailableTechnicians] = useState<User[]>([]);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [additionalContacts, setAdditionalContacts] = useState([
    { first_name: "", last_name: "", phone: "", email: "", type: "" },
  ]);

  const [formData, setFormData] = useState({
    // Service Location
    company_id: "",
    company_name: "",
    location_id: "",
    location_name: "",
    unit_id: "",
    unit_number: "",
    service_address: "",
    service_city: "",
    service_state: "",
    service_zip: "",
    office: "Main Office",
    customer_po: "",
    service_contract: "Standard",

    // Primary Contact
    contact_first_name: "",
    contact_last_name: "",
    contact_type: "",
    contact_phone: "",
    contact_email: "",

    // Service Details
    service_line: "",
    description: "",
    problem_description: "",

    // Schedule
    time_period_start: new Date().toISOString().split("T")[0],
    time_period_due: new Date().toISOString().split("T")[0],
    schedule_date: "",
    schedule_time: "",
    schedule_duration: "1:00",
    schedule_start: "",
    technician_ids: [] as string[],

    // Additional Details
    type: "preventative maintenance",
    is_training: false,
    status: "unscheduled",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;

      try {
        // Fetch locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select(
            `
            *,
            companies (
              id,
              name
            ),
            units (
              id,
              unit_number,
              status,
              primary_contact_type,
              primary_contact_email,
              primary_contact_phone
            )
          `
          )
          .order("name");

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        // Fetch service lines
        const { data: serviceLinesData, error: serviceLinesError } =
          await supabase
            .from("service_lines")
            .select("*")
            .eq("is_active", true)
            .order("name");

        if (serviceLinesError) throw serviceLinesError;
        setServiceLines(serviceLinesData || []);

        // Fetch job types
        const { data: jobTypesData, error: jobTypesError } = await supabase
          .from("job_types")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (jobTypesError) throw jobTypesError;
        setJobTypes(jobTypesData || []);

        // Fetch presets
        const { data: presetsData, error: presetsError } = await supabase
          .from("job_presets")
          .select("*")
          .order("name");

        if (presetsError) throw presetsError;
        setPresets(presetsData || []);

        // Fetch technicians
        const { data: techData, error: techError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "technician")
          .eq("status", "active")
          .order("first_name");

        if (techError) throw techError;
        setAvailableTechnicians(techData || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [supabase]);

  // Load unit details if unitId is provided in URL
  useEffect(() => {
    const loadUnitDetails = async () => {
      if (!supabase || !unitIdFromUrl) return;

      setIsLoadingUnitDetails(true);

      try {
        // Fetch unit details
        const { data: unitData, error: unitError } = await supabase
          .from("units")
          .select(
            `
            *,
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
          .eq("id", unitIdFromUrl)
          .single();

        if (unitError) throw unitError;

        if (unitData && unitData.locations) {
          // Set location data
          const locationData = unitData.locations;

          // Find the full location object with units
          const fullLocation = locations.find(
            (loc) => loc.id === locationData.id
          );

          if (fullLocation) {
            setSelectedLocation(fullLocation);
          }

          // Update form data with unit and location details
          setFormData((prev) => ({
            ...prev,
            company_id: locationData.company_id,
            company_name: locationData.companies?.name || "",
            location_id: locationData.id,
            location_name: locationData.name,
            unit_id: unitData.id,
            unit_number: unitData.unit_number,
            service_address: locationData.address,
            service_city: locationData.city,
            service_state: locationData.state,
            service_zip: locationData.zip,
            // Populate contact information from unit's primary contact
            contact_type: unitData.primary_contact_type || "",
            contact_email: unitData.primary_contact_email || "",
            contact_phone: unitData.primary_contact_phone || "",
          }));

          // Scroll to top of page
          window.scrollTo(0, 0);
        }
      } catch (err) {
        console.error("Error loading unit details:", err);
        setError("Failed to load unit details");
      } finally {
        setIsLoadingUnitDetails(false);
      }
    };

    if (unitIdFromUrl && locations.length > 0) {
      loadUnitDetails();
    }
  }, [supabase, unitIdFromUrl, locations]);

  // After locations are loaded and locationIdFromUrl is present, fetch units for that location
  useEffect(() => {
    if (locationIdFromUrl && locations.length > 0) {
      const location = locations.find((l) => l.id === locationIdFromUrl);
      if (location) {
        setUnitsForLocation(location.units || []);
        // If unitIdsFromUrl is present, preselect those units
        if (unitIdsFromUrl.length > 0) {
          setSelectedUnitIds(unitIdsFromUrl);
        } else {
          setSelectedUnitIds((location.units || []).map((u: any) => u.id));
        }
      }
    }
  }, [locationIdFromUrl, locations]);

  useEffect(() => {
    if (locationIdFromUrl && locations.length > 0) {
      const location = locations.find((l) => l.id === locationIdFromUrl);
      if (location) {
        setSelectedLocation(location);
        setFormData((prev) => ({
          ...prev,
          company_id: location.companies.id,
          company_name: location.companies.name,
          location_id: location.id,
          location_name: location.name,
          service_address: location.address,
          service_city: location.city,
          service_state: location.state,
          service_zip: location.zip,
          unit_id: "",
          unit_number: "",
        }));
      }
    }
  }, [locationIdFromUrl, locations]);

  const handleLocationChange = async (locationId: string) => {
    const location = locations.find((l) => l.id === locationId);
    if (location) {
      setSelectedLocation(location);
      setFormData((prev) => ({
        ...prev,
        company_id: location.companies.id,
        company_name: location.companies.name,
        location_id: locationId,
        location_name: location.name,
        service_address: location.address,
        service_city: location.city,
        service_state: location.state,
        service_zip: location.zip,
        unit_id: "",
        unit_number: "",
      }));
    }
  };

  const handleUnitChange = (unitId: string) => {
    if (!selectedLocation) return;

    const unit = selectedLocation.units?.find((u) => u.id === unitId);
    if (unit) {
      setFormData((prev) => ({
        ...prev,
        unit_id: unitId,
        unit_number: unit.unit_number,
        // Populate contact information from unit's primary contact
        contact_type: unit.primary_contact_type || prev.contact_type,
        contact_email: unit.primary_contact_email || prev.contact_email,
        contact_phone: unit.primary_contact_phone || prev.contact_phone,
      }));
    }
  };

  const handleLoadPreset = (preset: any) => {
    setFormData({
      ...preset.data,
      time_period_start: formData.time_period_start,
      time_period_due: formData.time_period_due,
    });

    if (preset.data.location_id) {
      const location = locations.find((l) => l.id === preset.data.location_id);
      if (location) {
        setSelectedLocation(location);
      }
    }

    if (preset.data.technicians) {
      setSelectedTechnicians(preset.data.technicians);
      setFormData((prev) => ({
        ...prev,
        technician_ids: preset.data.technicians.map((tech: User) => tech.id),
      }));
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("job_presets")
        .delete()
        .eq("id", presetId);

      if (error) throw error;

      // Refresh presets
      const { data } = await supabase
        .from("job_presets")
        .select("*")
        .order("name");

      setPresets(data || []);
    } catch (err) {
      console.error("Error deleting preset:", err);
      setError("Failed to delete preset. Please try again.");
    }
  };

  const handleSavePreset = async () => {
    if (!supabase || !presetName) {
      setPresetError("Please enter a preset name");
      return;
    }

    setIsSavingPreset(true);
    setPresetError(null);

    try {
      const presetData = {
        ...formData,
        technicians: selectedTechnicians,
      };

      // Insert the preset without user_id since it's been removed from the table
      const { error } = await supabase.from("job_presets").insert({
        name: presetName,
        data: presetData,
      });

      if (error) throw error;

      // Reset form and close modal
      setShowPresetModal(false);
      setPresetName("");

      // Refresh presets
      const { data } = await supabase
        .from("job_presets")
        .select("*")
        .order("name");

      setPresets(data || []);
    } catch (err) {
      console.error("Error saving preset:", err);
      setPresetError("Failed to save preset. Please try again.");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleScheduleAppointment = async (appointment: {
    technicianIds: string[];
  }) => {
    if (!supabase) return;

    try {
      // Get technician details
      const { data: techData, error: techError } = await supabase
        .from("users")
        .select("*")
        .in("id", appointment.technicianIds);

      if (techError) throw techError;
      setSelectedTechnicians(techData || []);
      setFormData((prev) => ({
        ...prev,
        technician_ids: appointment.technicianIds,
      }));

      setShowAppointmentModal(false);
    } catch (err) {
      console.error("Error fetching technician details:", err);
      setError("Failed to fetch technician details. Please try again.");
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // Required fields
    if (!formData.location_id)
      errors.location_id = "Service location is required";
    if (!formData.service_address)
      errors.service_address = "Service address is required";
    if (!formData.service_city)
      errors.service_city = "Service city is required";
    if (!formData.service_state)
      errors.service_state = "Service state is required";
    if (!formData.service_zip) errors.service_zip = "Service zip is required";
    if (!formData.service_line)
      errors.service_line = "Service line is required";
    if (!formData.description) errors.description = "Description is required";
    if (!formData.contact_type)
      errors.contact_type = "Contact type is required";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    // Validate form
    if (!validateForm()) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert schedule date and time to ISO string if both are provided
      let scheduleStart = null;
      if (formData.schedule_date && formData.schedule_time) {
        scheduleStart = new Date(
          `${formData.schedule_date}T${formData.schedule_time}`
        ).toISOString();
      }

      // Create the job
      const { data: jobData, error: insertError } = await supabase
        .from("jobs")
        .insert({
          name: `inspection-${formData.service_zip}-${formData.service_line}`.trim(),
          type: formData.type,
          location_id: formData.location_id,
          unit_id: selectedUnitIds.length > 0 ? null : formData.unit_id || null,
          contact_name:
            `${formData.contact_first_name} ${formData.contact_last_name}`.trim(),
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          contact_type: formData.contact_type,
          service_line: formData.service_line,
          description: formData.description,
          problem_description: formData.problem_description,
          customer_po: formData.customer_po,
          is_training: formData.is_training,
          time_period_start: formData.time_period_start,
          time_period_due: formData.time_period_due,
          schedule_start: scheduleStart,
          schedule_duration: formData.schedule_duration
            ? `${formData.schedule_duration} hours`
            : null,
          status: scheduleStart ? "scheduled" : "unscheduled",
          office: formData.office,
          ...(formData.service_contract
            ? { service_contract: formData.service_contract }
            : {}),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If there are technicians, add them to the job_technicians table
      if (formData.technician_ids.length > 0 && jobData) {
        const technicianEntries = formData.technician_ids.map(
          (techId, index) => ({
            job_id: jobData.id,
            technician_id: techId,
            is_primary: index === 0, // First technician is primary
          })
        );

        const { error: techError } = await supabase
          .from("job_technicians")
          .insert(technicianEntries);

        if (techError) throw techError;
      }

      if (jobData && additionalContacts.length > 0) {
        const contactsToInsert = additionalContacts
          .filter((c) => c.first_name || c.last_name || c.phone || c.email)
          .map((c) => ({
            job_id: jobData.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            phone: c.phone,
            email: c.email,
            type: c.type,
          }));
        if (contactsToInsert.length > 0) {
          const { error: contactsError } = await supabase
            .from("job_contacts")
            .insert(contactsToInsert);
          if (contactsError) throw contactsError;
        }
      }

      if (jobData && selectedUnitIds.length > 0) {
        const jobUnitsToInsert = selectedUnitIds.map((unitId) => ({
          job_id: jobData.id,
          unit_id: unitId,
        }));
        const { error: jobUnitsError } = await supabase
          .from("job_units")
          .insert(jobUnitsToInsert);
        if (jobUnitsError) throw jobUnitsError;
      }

      navigate("/jobs");
    } catch (err: any) {
      // Improved error logging for debugging
      console.error("Error creating job:", err);
      setError(
        "Failed to create job. Please try again. " +
          (err?.message ||
            (typeof err === "object" ? JSON.stringify(err) : String(err)))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Create Job</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowPresetModal(true)}
          className="btn btn-secondary"
        >
          <Star className="h-4 w-4 mr-2" />
          Save as Preset
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Suggested Paths</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`p-4 border rounded-lg hover:bg-gray-50 text-left relative ${
                formData.unit_id === preset.data.unit_id
                  ? "border-primary-500 ring-1 ring-primary-500"
                  : ""
              }`}
            >
              <button
                onClick={() => handleDeletePreset(preset.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => handleLoadPreset(preset)}
                className="w-full text-left"
              >
                <h3 className="font-medium">{preset.name}</h3>
                <div className="text-sm text-gray-500 mt-1">
                  <div>
                    {preset.data.type === "preventative maintenance"
                      ? "PM"
                      : "Service Call"}
                    {preset.data.service_line
                      ? ` • ${preset.data.service_line}`
                      : ""}
                  </div>
                  {preset.data.technicians &&
                    preset.data.technicians.length > 0 && (
                      <div className="mt-1 text-gray-600">
                        {preset.data.technicians
                          .map(
                            (tech: User) =>
                              `${tech.first_name} ${tech.last_name}`
                          )
                          .join(", ")}
                      </div>
                    )}
                  {preset.data.location_name && (
                    <div className="mt-1 text-gray-400">
                      {preset.data.location_name}
                    </div>
                  )}
                  {preset.data.unit_number && (
                    <div className="text-gray-400">
                      Unit: {preset.data.unit_number}
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Customer Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Customer Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                value={formData.company_name}
                readOnly
                className="input bg-gray-50"
                placeholder="Select a location to set company"
              />
            </div>

            {/* Location Selection */}
            <div className="md:col-span-2">
              <label
                htmlFor="location_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service Location *
              </label>
              <select
                id="location_id"
                value={formData.location_id}
                onChange={(e) => handleLocationChange(e.target.value)}
                required
                className={`select ${
                  validationErrors.location_id
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
                disabled={isLoadingUnitDetails}
              >
                <option value="">Select Location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.companies?.name})
                  </option>
                ))}
              </select>
              {validationErrors.location_id && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.location_id}
                </p>
              )}
            </div>

            {/* Unit Selection */}
            {selectedLocation &&
              selectedLocation.units &&
              selectedLocation.units.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-medium mb-6">
                    Select Units for this Job
                  </h2>
                  <div className="space-y-2">
                    {selectedLocation.units.map((unit) => (
                      <label key={unit.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedUnitIds.includes(unit.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUnitIds((ids) => [...ids, unit.id]);
                            } else {
                              setSelectedUnitIds((ids) =>
                                ids.filter((id) => id !== unit.id)
                              );
                            }
                          }}
                        />
                        <span>{unit.unit_number}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            <div className="md:col-span-2">
              <label
                htmlFor="service_address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service Address *
              </label>
              <input
                type="text"
                id="service_address"
                name="service_address"
                value={formData.service_address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    service_address: e.target.value,
                  }))
                }
                required
                className={`input ${
                  validationErrors.service_address
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
              />
              {validationErrors.service_address && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.service_address}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="service_city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service City *
              </label>
              <input
                type="text"
                id="service_city"
                name="service_city"
                value={formData.service_city}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    service_city: e.target.value,
                  }))
                }
                required
                className={`input ${
                  validationErrors.service_city
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
              />
              {validationErrors.service_city && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.service_city}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="service_state"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service State *
              </label>
              <input
                type="text"
                id="service_state"
                name="service_state"
                value={formData.service_state}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    service_state: e.target.value,
                  }))
                }
                required
                maxLength={2}
                className={`input ${
                  validationErrors.service_state
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
              />
              {validationErrors.service_state && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.service_state}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="service_zip"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service Zip *
              </label>
              <input
                type="text"
                id="service_zip"
                name="service_zip"
                value={formData.service_zip}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    service_zip: e.target.value,
                  }))
                }
                required
                className={`input ${
                  validationErrors.service_zip
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
              />
              {validationErrors.service_zip && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.service_zip}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="office"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Office Location *
              </label>
              <select
                id="office"
                name="office"
                value={formData.office}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, office: e.target.value }))
                }
                required
                className="select"
              >
                <option value="Main Office">Main Office</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="customer_po"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Customer PO
              </label>
              <input
                type="text"
                id="customer_po"
                name="customer_po"
                value={formData.customer_po}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer_po: e.target.value,
                  }))
                }
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Primary Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Job Primary Contact</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="contact_first_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                type="text"
                id="contact_first_name"
                name="contact_first_name"
                value={formData.contact_first_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact_first_name: e.target.value,
                  }))
                }
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="contact_last_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                type="text"
                id="contact_last_name"
                name="contact_last_name"
                value={formData.contact_last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact_last_name: e.target.value,
                  }))
                }
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="contact_type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Type *
              </label>
              <input
                type="text"
                id="contact_type"
                name="contact_type"
                value={formData.contact_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact_type: e.target.value,
                  }))
                }
                className={`input ${
                  validationErrors.contact_type
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
                placeholder="Contact Type"
              />
              {validationErrors.contact_type && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.contact_type}
                </p>
              )}
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
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact_phone: e.target.value,
                  }))
                }
                className="input"
              />
            </div>

            <div className="md:col-span-2">
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
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact_email: e.target.value,
                  }))
                }
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Additional Contacts */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-medium mb-6 flex items-center justify-between">
            Additional Contacts
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() =>
                setAdditionalContacts([
                  ...additionalContacts,
                  {
                    first_name: "",
                    last_name: "",
                    phone: "",
                    email: "",
                    type: "",
                  },
                ])
              }
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
              className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={contact.first_name}
                  onChange={(e) =>
                    setAdditionalContacts((contacts) =>
                      contacts.map((c, i) =>
                        i === idx ? { ...c, first_name: e.target.value } : c
                      )
                    )
                  }
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
                    setAdditionalContacts((contacts) =>
                      contacts.map((c, i) =>
                        i === idx ? { ...c, last_name: e.target.value } : c
                      )
                    )
                  }
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
                    setAdditionalContacts((contacts) =>
                      contacts.map((c, i) =>
                        i === idx ? { ...c, type: e.target.value } : c
                      )
                    )
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
                    setAdditionalContacts((contacts) =>
                      contacts.map((c, i) =>
                        i === idx ? { ...c, phone: e.target.value } : c
                      )
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={contact.email}
                  onChange={(e) =>
                    setAdditionalContacts((contacts) =>
                      contacts.map((c, i) =>
                        i === idx ? { ...c, email: e.target.value } : c
                      )
                    )
                  }
                />
              </div>
              <div className="md:col-span-5 flex justify-end">
                <button
                  type="button"
                  className="btn btn-error btn-sm"
                  onClick={() =>
                    setAdditionalContacts((contacts) =>
                      contacts.filter((_, i) => i !== idx)
                    )
                  }
                >
                  <X size={16} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Service Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Service</h2>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label
                htmlFor="service_line"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service Line *
              </label>
              <select
                id="service_line"
                name="service_line"
                value={formData.service_line}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    service_line: e.target.value,
                  }))
                }
                required
                className={`select ${
                  validationErrors.service_line
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
              >
                <option value="">Select Service Line</option>
                {serviceLines.map((line) => (
                  <option key={line.id} value={line.code}>
                    {line.name}
                  </option>
                ))}
              </select>
              {validationErrors.service_line && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.service_line}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Job Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, type: e.target.value }))
                }
                required
                className="select"
              >
                {jobTypes.map((type) => (
                  <option key={type.id} value={type.name.toLowerCase()}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description of Service *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
                rows={4}
                className={`input ${
                  validationErrors.description
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-error-600">
                  {validationErrors.description}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="problem_description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description of Problem
              </label>
              <textarea
                id="problem_description"
                name="problem_description"
                value={formData.problem_description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    problem_description: e.target.value,
                  }))
                }
                rows={4}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Appointment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">Appointment</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAppointmentModal(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Select Technicians
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="time_period_start"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Date *
              </label>
              <input
                type="date"
                id="time_period_start"
                name="time_period_start"
                value={formData.time_period_start}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    time_period_start: e.target.value,
                  }))
                }
                required
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="time_period_due"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Due Date *
              </label>
              <input
                type="date"
                id="time_period_due"
                name="time_period_due"
                value={formData.time_period_due}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    time_period_due: e.target.value,
                  }))
                }
                required
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="schedule_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Schedule Date
              </label>
              <input
                type="date"
                id="schedule_date"
                name="schedule_date"
                value={formData.schedule_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule_date: e.target.value,
                  }))
                }
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="schedule_time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Schedule Time
              </label>
              <input
                type="time"
                id="schedule_time"
                name="schedule_time"
                value={formData.schedule_time}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule_time: e.target.value,
                  }))
                }
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="schedule_duration"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Duration
              </label>
              <select
                id="schedule_duration"
                name="schedule_duration"
                value={formData.schedule_duration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    schedule_duration: e.target.value,
                  }))
                }
                className="select"
              >
                <option value="1:00">1:00 hr</option>
                <option value="1:30">1:30 hr</option>
                <option value="2:00">2:00 hr</option>
                <option value="2:30">2:30 hr</option>
                <option value="3:00">3:00 hr</option>
                <option value="3:30">3:30 hr</option>
                <option value="4:00">4:00 hr</option>
              </select>
            </div>
          </div>

          {selectedTechnicians.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Assigned Technicians
              </h3>
              <div className="space-y-3">
                {selectedTechnicians.map((tech) => (
                  <div key={tech.id} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {tech.first_name?.[0] || "?"}
                        {tech.last_name?.[0] || "?"}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {tech.first_name} {tech.last_name}
                      </div>
                      <div className="text-sm text-gray-500 space-y-1 mt-1">
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          {tech.phone || "No phone"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          {tech.email}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Additional Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_training}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_training: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="ml-2 text-sm text-gray-700">Training Job</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link to="/jobs" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                Creating...
              </>
            ) : (
              "Create Job"
            )}
          </button>
        </div>
      </form>

      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Save as Preset</h3>
            {presetError && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {presetError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="input"
                  placeholder="e.g., Standard PM Visit"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPresetModal(false);
                    setPresetName("");
                    setPresetError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreset}
                  className="btn btn-primary"
                  disabled={!presetName || isSavingPreset}
                >
                  {isSavingPreset ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Preset"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        onSave={handleScheduleAppointment}
        selectedTechnicianIds={formData.technician_ids}
      />
    </div>
  );
};

export default CreateJob;
