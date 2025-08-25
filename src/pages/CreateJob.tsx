import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
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
import ArrowBack from "../components/ui/ArrowBack";
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
  const companyIdFromUrl = searchParams.get("companyId");
  const unitIdsFromUrl =
    searchParams.get("unitIds")?.split(",").filter(Boolean) || [];
  const [selectedUnitIds, setSelectedUnitIds] =
    useState<string[]>(unitIdsFromUrl);
  const [unitsForLocation, setUnitsForLocation] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [serviceLines, setServiceLines] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<User[]>([]);
  const [technicianSchedules, setTechnicianSchedules] = useState<{
    [technicianId: string]: { scheduleDate: string; scheduleTime: string };
  }>({});
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

  // Helper function to format schedule display
  const formatScheduleDisplay = (
    scheduleDate: string,
    scheduleTime: string
  ) => {
    try {
      const date = new Date(scheduleDate);
      const time = new Date(`2000-01-01T${scheduleTime}`);

      return {
        date: date.toLocaleDateString(),
        time: time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      };
    } catch (error) {
      return { date: scheduleDate, time: scheduleTime };
    }
  };

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
    technician_ids: [] as string[],

    // Additional Details
    type: "maintenance",
    additional_type: "",
    is_agreement_customer: false,
    is_training: false,
    status: "unscheduled",

    // Parts Ordered Fields
    vendor: "",
    date_ordered: "",
    estimated_arrival_date: "",
    part_number: "",
    po_number: "",
  });

  // Filter locations based on selected company
  const filteredLocations = formData.company_id
    ? locations.filter(
        (location) => location.company_id === formData.company_id
      )
    : locations;

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

        // Extract unique companies from locations
        if (locationsData) {
          const uniqueCompanies = Array.from(
            new Map(
              locationsData
                .map((loc) => loc.companies)
                .filter(Boolean)
                .map((company) => [company.id, company])
            ).values()
          ).sort((a, b) => a.name.localeCompare(b.name));
          setCompanies(uniqueCompanies);
        }

        // Fetch service lines
        const { data: serviceLinesData, error: serviceLinesError } =
          await supabase.from("service_lines").select("*").order("name");

        if (serviceLinesError) throw serviceLinesError;
        setServiceLines(serviceLinesData || []);

        // Fetch job types
        const { data: jobTypesData, error: jobTypesError } = await supabase
          .from("job_types")
          .select("*")
          .order("name");

        if (jobTypesError) throw jobTypesError;
        setJobTypes(jobTypesData || []);
        console.log("Available job types:", jobTypesData);

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

  // Pre-populate company when companyId is provided in URL
  useEffect(() => {
    if (companyIdFromUrl && locations.length > 0) {
      // Find a location that belongs to the specified company
      const companyLocation = locations.find(
        (loc) => loc.company_id === companyIdFromUrl
      );

      if (companyLocation) {
        setFormData((prev) => ({
          ...prev,
          company_id: companyLocation.company_id,
          company_name: companyLocation.companies?.name || "",
        }));
      }
    }
  }, [companyIdFromUrl, locations]);

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

  const clearValidationError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      setFormData((prev) => ({
        ...prev,
        company_id: companyId,
        company_name: company.name,
        // Clear location if it doesn't belong to the selected company
        ...(prev.location_id &&
          !filteredLocations.find((l) => l.id === prev.location_id) && {
            location_id: "",
            location_name: "",
            service_address: "",
            service_city: "",
            service_state: "",
            service_zip: "",
            unit_id: "",
            unit_number: "",
          }),
      }));
      setSelectedLocation(null);
      // Clear related validation errors
      clearValidationError("location_id");
      clearValidationError("service_address");
      clearValidationError("service_city");
      clearValidationError("service_state");
      clearValidationError("service_zip");
      clearValidationError("units");
    }
  };

  const handleLocationChange = async (locationId: string) => {
    const location = filteredLocations.find((l) => l.id === locationId);
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
      // Clear related validation errors
      clearValidationError("service_address");
      clearValidationError("service_city");
      clearValidationError("service_state");
      clearValidationError("service_zip");
      clearValidationError("units");
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
      // Ensure parts ordered fields are included
      vendor: preset.data.vendor || "",
      date_ordered: preset.data.date_ordered || "",
      estimated_arrival_date: preset.data.estimated_arrival_date || "",
      part_number: preset.data.part_number || "",
      po_number: preset.data.po_number || "",
    });

    if (preset.data.location_id) {
      const location = filteredLocations.find(
        (l) => l.id === preset.data.location_id
      );
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
    technicianSchedules: {
      technicianId: string;
      scheduleDate: string;
      scheduleTime: string;
    }[];
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

      // Convert technicianSchedules array to object for easier access
      const schedulesObject: {
        [technicianId: string]: { scheduleDate: string; scheduleTime: string };
      } = {};
      appointment.technicianSchedules.forEach((schedule) => {
        schedulesObject[schedule.technicianId] = {
          scheduleDate: schedule.scheduleDate,
          scheduleTime: schedule.scheduleTime,
        };
      });
      setTechnicianSchedules(schedulesObject);

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
    if (formData.type === "maintenance" && !formData.additional_type)
      errors.additional_type =
        "Maintenance type is required for maintenance jobs";

    // Unit validation - require at least one unit to be selected
    if (
      selectedLocation &&
      (!selectedLocation.units || selectedLocation.units.length === 0)
    ) {
      errors.units =
        "No units available for this location. Please add units to this location first.";
    } else if (selectedUnitIds.length === 0) {
      errors.units = "At least one unit must be selected";
    }

    setValidationErrors(errors);

    // If there are errors, scroll to top to show validation summary
    if (Object.keys(errors).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    // Validate form
    if (!validateForm()) {
      // Don't set a generic error message, let the individual field errors show
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create the job
      const { data: jobData, error: insertError } = await supabase
        .from("jobs")
        .insert({
          name: `${formData.type}-${formData.service_zip}-${formData.service_line}`.trim(),
          type: formData.type,
          additional_type:
            formData.type === "maintenance" ? formData.additional_type : null,
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
          status: "unscheduled", // Will be updated after technician assignment
          office: formData.office,
          ...(formData.service_contract
            ? { service_contract: formData.service_contract }
            : {}),
          is_agreement_customer: formData.is_agreement_customer,
          ...(formData.type === "parts ordered" && {
            vendor: formData.vendor || null,
            date_ordered: formData.date_ordered || null,
            estimated_arrival_date: formData.estimated_arrival_date || null,
            part_number: formData.part_number || null,
            po_number: formData.po_number || null,
          }),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Handle technician assignments
      if (jobData) {
        if (formData.technician_ids.length > 0) {
          // Add technicians to the job_technicians table
          const technicianEntries = formData.technician_ids.map(
            (techId, index) => {
              const schedule = technicianSchedules[techId];
              return {
                job_id: jobData.id,
                technician_id: techId,
                is_primary: index === 0, // First technician is primary
                scheduled_at:
                  schedule?.scheduleDate && schedule?.scheduleTime
                    ? (() => {
                        // Parse the date and time
                        const [year, month, day] = schedule.scheduleDate
                          .split("-")
                          .map(Number);
                        const [hours, minutes] = schedule.scheduleTime
                          .split(":")
                          .map(Number);

                        // Create a date object in Eastern Time
                        const easternDate = new Date(
                          year,
                          month - 1,
                          day,
                          hours,
                          minutes
                        );

                        // Convert to ISO string for storage
                        return easternDate.toISOString();
                      })()
                    : null,
              };
            }
          );

          const { error: techError } = await supabase
            .from("job_technicians")
            .insert(technicianEntries);

          if (techError) throw techError;

          // Update job status to scheduled
          const { error: statusError } = await supabase
            .from("jobs")
            .update({ status: "scheduled" })
            .eq("id", jobData.id);

          if (statusError) throw statusError;
        } else {
          // Remove all technicians from this job
          const { error: deleteError } = await supabase
            .from("job_technicians")
            .delete()
            .eq("job_id", jobData.id);

          if (deleteError) throw deleteError;

          // Update job status to unscheduled
          const { error: statusError } = await supabase
            .from("jobs")
            .update({ status: "unscheduled" })
            .eq("id", jobData.id);

          if (statusError) throw statusError;
        }
      }

      if (jobData && additionalContacts.length > 0) {
        const contactsToInsert = additionalContacts
          .filter((c) => c.first_name || c.last_name || c.phone || c.email)
          .map((c) => ({
            job_id: jobData.id,
            first_name: c.first_name,
            last_name: c.last_name,
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
          <ArrowBack
            fallbackRoute="/jobs"
            className="text-gray-500 hover:text-gray-700"
          />
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
                    {preset.data.type === "maintenance"
                      ? `Maintenance${
                          preset.data.additional_type
                            ? ` • ${preset.data.additional_type}`
                            : ""
                        }`
                      : preset.data.type}
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

        {/* Validation Summary */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4 relative">
            <button
              type="button"
              onClick={() => setValidationErrors({})}
              className="absolute top-2 right-2 text-error-400 hover:text-error-600"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-3 pr-6">
              <AlertTriangle className="h-5 w-5 text-error-600" />
              <h3 className="text-sm font-medium text-error-800">
                Please complete the following required fields:
              </h3>
            </div>
            <ul className="space-y-1">
              {validationErrors.location_id && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Service Location:</strong>{" "}
                  {validationErrors.location_id}
                </li>
              )}
              {validationErrors.service_address && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Service Address:</strong>{" "}
                  {validationErrors.service_address}
                </li>
              )}
              {validationErrors.service_city && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Service City:</strong> {validationErrors.service_city}
                </li>
              )}
              {validationErrors.service_state && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Service State:</strong>{" "}
                  {validationErrors.service_state}
                </li>
              )}
              {validationErrors.service_zip && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Service Zip:</strong> {validationErrors.service_zip}
                </li>
              )}
              {validationErrors.service_line && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Service Line:</strong> {validationErrors.service_line}
                </li>
              )}
              {validationErrors.description && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Description:</strong> {validationErrors.description}
                </li>
              )}
              {validationErrors.contact_type && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Contact Type:</strong> {validationErrors.contact_type}
                </li>
              )}
              {validationErrors.additional_type && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Maintenance Type:</strong>{" "}
                  {validationErrors.additional_type}
                </li>
              )}
              {validationErrors.units && (
                <li className="text-sm text-error-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-error-500 rounded-full"></span>
                  <strong>Units:</strong> {validationErrors.units}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Customer Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Customer Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Selection */}
            <div className="md:col-span-2">
              <label
                htmlFor="company_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Company
              </label>
              <select
                id="company_id"
                value={formData.company_id}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="select"
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
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
                onChange={(e) => {
                  handleLocationChange(e.target.value);
                  clearValidationError("location_id");
                }}
                required
                className={`select ${
                  validationErrors.location_id
                    ? "border-error-500 ring-1 ring-error-500"
                    : ""
                }`}
                disabled={isLoadingUnitDetails}
              >
                <option value="">Select Location</option>
                {filteredLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}{" "}
                    {formData.company_id ? "" : `(${location.companies?.name})`}
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
            {selectedLocation && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium mb-6">
                  Select Units for this Job *
                </h2>
                {selectedLocation.units && selectedLocation.units.length > 0 ? (
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
                            // Clear units validation error when any unit is selected/deselected
                            if (
                              selectedUnitIds.length > 0 ||
                              e.target.checked
                            ) {
                              clearValidationError("units");
                            }
                          }}
                        />
                        <span>{unit.unit_number}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No units available for this location. Please add units to
                    this location first.
                  </p>
                )}
                {validationErrors.units && (
                  <p className="mt-2 text-sm text-error-600">
                    {validationErrors.units}
                  </p>
                )}
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
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    service_address: e.target.value,
                  }));
                  clearValidationError("service_address");
                }}
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
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    service_city: e.target.value,
                  }));
                  clearValidationError("service_city");
                }}
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
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    service_state: e.target.value,
                  }));
                  clearValidationError("service_state");
                }}
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
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    service_zip: e.target.value,
                  }));
                  clearValidationError("service_zip");
                }}
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
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    contact_type: e.target.value,
                  }));
                  clearValidationError("contact_type");
                }}
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
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    service_line: e.target.value,
                  }));
                  clearValidationError("service_line");
                }}
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

            {formData.type === "maintenance" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Agreement Status
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_agreement_customer}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_agreement_customer: e.target.checked,
                            additional_type: "", // Reset additional type when agreement status changes
                          }))
                        }
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Customer is on maintenance agreement
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="additional_type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Maintenance Type *
                  </label>
                  <select
                    id="additional_type"
                    name="additional_type"
                    value={formData.additional_type}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        additional_type: e.target.value,
                      }));
                      clearValidationError("additional_type");
                    }}
                    required
                    className={`select ${
                      validationErrors.additional_type
                        ? "border-error-500 ring-1 ring-error-500"
                        : ""
                    }`}
                  >
                    <option value="">Select Maintenance Type</option>
                    {formData.is_agreement_customer ? (
                      <>
                        <option value="PM Filter Change">
                          PM Filter Change
                        </option>
                        <option value="PM Cleaning AC">PM Cleaning AC</option>
                        <option value="PM Cleaning HEAT">
                          PM Cleaning HEAT
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="ONE Filter Change">
                          ONE Filter Change
                        </option>
                        <option value="ONE Cleaning AC">ONE Cleaning AC</option>
                        <option value="ONE Cleaning HEAT">
                          ONE Cleaning HEAT
                        </option>
                      </>
                    )}
                  </select>
                  {validationErrors.additional_type && (
                    <p className="mt-1 text-sm text-error-600">
                      {validationErrors.additional_type}
                    </p>
                  )}
                </div>
              </>
            )}

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
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }));
                  clearValidationError("description");
                }}
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

            {/* Parts Ordered Fields */}
            {console.log("Current job type:", formData.type)}
            {formData.type === "parts ordered" && (
              <>
                <div className="md:col-span-2">
                  <h3 className="text-md font-medium text-gray-700 mb-4 border-b pb-2">
                    Parts Order Information
                  </h3>
                </div>

                <div>
                  <label
                    htmlFor="vendor"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vendor
                  </label>
                  <input
                    type="text"
                    id="vendor"
                    name="vendor"
                    value={formData.vendor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vendor: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Vendor/Supplier name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="date_ordered"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date Ordered
                  </label>
                  <input
                    type="date"
                    id="date_ordered"
                    name="date_ordered"
                    value={formData.date_ordered}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        date_ordered: e.target.value,
                      }))
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="estimated_arrival_date"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Estimated Arrival Date
                  </label>
                  <input
                    type="date"
                    id="estimated_arrival_date"
                    name="estimated_arrival_date"
                    value={formData.estimated_arrival_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimated_arrival_date: e.target.value,
                      }))
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="part_number"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Part Number
                  </label>
                  <input
                    type="text"
                    id="part_number"
                    name="part_number"
                    value={formData.part_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        part_number: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Part number"
                  />
                </div>

                <div>
                  <label
                    htmlFor="po_number"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    PO Number
                  </label>
                  <input
                    type="text"
                    id="po_number"
                    name="po_number"
                    value={formData.po_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        po_number: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="Purchase order number"
                  />
                </div>
              </>
            )}
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
          </div>

          {selectedTechnicians.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Assigned Technicians
              </h3>
              <div className="space-y-3">
                {selectedTechnicians.map((tech) => {
                  const schedule = technicianSchedules[tech.id];
                  return (
                    <div key={tech.id} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {tech.first_name?.[0] || "?"}
                          {tech.last_name?.[0] || "?"}
                        </span>
                      </div>
                      <div className="flex-1">
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
                          {schedule && (
                            <div className="flex items-center gap-2">
                              <Calendar size={14} />
                              <span>
                                {
                                  formatScheduleDisplay(
                                    schedule.scheduleDate,
                                    schedule.scheduleTime
                                  ).date
                                }{" "}
                                at{" "}
                                {
                                  formatScheduleDisplay(
                                    schedule.scheduleDate,
                                    schedule.scheduleTime
                                  ).time
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
