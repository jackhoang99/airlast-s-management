import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import {
  X,
  Save,
  Loader2,
  Calendar,
  ChevronLeft,
  Phone,
  Mail,
  Plus,
} from "lucide-react";
import { useSupabase } from "../../lib/supabase-context";
import { Job } from "../../types/job";

type EditJobModalProps = {
  open: boolean;
  onClose: () => void;
  job: Job;
  onJobUpdated: (updatedJob: Job) => void;
};

const EditJobModal = ({
  open,
  onClose,
  job,
  onJobUpdated,
}: EditJobModalProps) => {
  console.log("EditJobModal rendered with job:", job);
  console.log("Job contacts in job object:", job?.job_contacts);
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceLines, setServiceLines] = useState<any[]>([]);
  const [jobTypes, setJobTypes] = useState<any[]>([]);

  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [additionalContacts, setAdditionalContacts] = useState([
    { first_name: "", last_name: "", phone: "", email: "", type: "" },
  ]);

  // Form state
  const [formData, setFormData] = useState({
    // Service Location
    company_id: job.company_id || "",
    company_name: job.company_name || "",
    location_id: job.location_id || "",
    location_name: job.location_name || "",
    unit_id: job.unit_id || "",
    unit_number: job.unit_number || "",
    service_address: job.service_address || "",
    service_city: job.service_city || "",
    service_state: job.service_state || "",
    service_zip: job.service_zip || "",
    office: job.office || "Main Office",
    customer_po: job.customer_po || "",
    service_contract: job.service_contract || "Standard",

    // Primary Contact
    contact_first_name: job.contact_first_name || "",
    contact_last_name: job.contact_last_name || "",
    contact_type: job.contact_type || "",
    contact_phone: job.contact_phone || "",
    contact_email: job.contact_email || "",

    // Job Details
    name: job.name || "",
    description: job.description || "",
    problem_description: job.problem_description || "",
    status: job.status || "scheduled",
    type: job.type || "service call",
    additional_type: job.additional_type || "",
    service_line: job.service_line || "",
    is_agreement_customer: job.is_agreement_customer || false,
    is_training: job.is_training || false,

    // Schedule
    time_period_start: job.time_period_start
      ? new Date(job.time_period_start).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    time_period_due: job.time_period_due
      ? new Date(job.time_period_due).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;

      try {
        // Fetch companies
        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("*")
          .order("name");

        if (companiesError) throw companiesError;
        setCompanies(companiesData || []);

        // Fetch locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("*, companies(name)")
          .order("name");

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);
        setFilteredLocations(locationsData || []);

        // Fetch service lines
        const { data: serviceLinesData, error: serviceLinesError } =
          await supabase.from("service_lines").select("*").order("name");

        if (serviceLinesError) throw serviceLinesError;
        setServiceLines(serviceLinesData || []);
        console.log("Service lines fetched:", serviceLinesData);

        // Fetch job types
        const { data: jobTypesData, error: jobTypesError } = await supabase
          .from("job_types")
          .select("*")
          .order("name");

        if (jobTypesError) throw jobTypesError;
        setJobTypes(jobTypesData || []);
        console.log("Job types fetched:", jobTypesData);

        console.log(
          "Total service lines loaded:",
          serviceLinesData?.length || 0
        );
        console.log("Total job types loaded:", jobTypesData?.length || 0);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [supabase]);

  // Load job contacts when job changes
  useEffect(() => {
    console.log("useEffect for job contacts triggered, job:", job?.id);
    console.log("Job contacts in job object:", job?.job_contacts);
    console.log("Full job object:", job);

    // First check if job already has contacts
    if (job?.job_contacts && job.job_contacts.length > 0) {
      console.log("Using contacts from job object:", job.job_contacts);
      const loadedContacts = job.job_contacts.map((contact) => {
        console.log("Processing contact:", contact);
        const contactObj = {
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          phone: contact.phone || "",
          email: contact.email || "",
          type: contact.type || "",
        };
        console.log("Processed contact from job object:", contactObj);
        return contactObj;
      });
      console.log(
        "Setting additional contacts from job object:",
        loadedContacts
      );
      setAdditionalContacts(loadedContacts);
      return;
    }

    // If no contacts in job object, fetch from database
    const fetchJobContacts = async () => {
      if (!supabase || !job) {
        console.log("Missing supabase or job, returning early");
        return;
      }

      console.log("Fetching job contacts from database for job ID:", job.id);

      try {
        const { data: contactsData, error: contactsError } = await supabase
          .from("job_contacts")
          .select("*")
          .eq("job_id", job.id);

        if (contactsError) {
          console.error("Error fetching job contacts:", contactsError);
          return;
        }

        console.log("Job contacts fetched from database:", contactsData);

        if (contactsData && contactsData.length > 0) {
          const loadedContacts = contactsData.map((contact) => {
            const contactObj = {
              first_name: contact.first_name || "",
              last_name: contact.last_name || "",
              phone: contact.phone || "",
              email: contact.email || "",
              type: contact.type || "",
            };
            console.log("Processed contact from database:", contactObj);
            return contactObj;
          });
          console.log(
            "Setting additional contacts from database:",
            loadedContacts
          );
          setAdditionalContacts(loadedContacts);
        } else {
          console.log(
            "No contacts found in database, setting default empty contact"
          );
          // Reset to default empty contact if no contacts exist
          setAdditionalContacts([
            { first_name: "", last_name: "", phone: "", email: "", type: "" },
          ]);
        }
      } catch (err) {
        console.error("Error fetching job contacts:", err);
      }
    };

    fetchJobContacts();
  }, [supabase, job?.id, job?.job_contacts]);

  // Reset form when job changes and dropdown data is available
  useEffect(() => {
    if (job && serviceLines.length > 0 && jobTypes.length > 0) {
      console.log("Job data for editing:", job);
      console.log("Available service lines:", serviceLines);
      console.log("Available job types:", jobTypes);

      // Handle service line - job might have code or name, we need to find the code
      let serviceLineValue = job.service_line || "";
      if (serviceLineValue && serviceLines.length > 0) {
        // First try to find by code (exact match)
        let matchingServiceLine = serviceLines.find(
          (line) => line.code === serviceLineValue
        );

        // If not found by code, try by name
        if (!matchingServiceLine) {
          matchingServiceLine = serviceLines.find(
            (line) => line.name === serviceLineValue
          );
        }

        if (matchingServiceLine) {
          serviceLineValue = matchingServiceLine.code;
          console.log("Matched service line:", matchingServiceLine);
        } else {
          console.log("No matching service line found for:", serviceLineValue);
          serviceLineValue = ""; // Reset if no match found
        }
      }

      // Handle job type - job stores the name in lowercase, we need to find the matching type
      let jobTypeValue = job.type || "";
      if (jobTypeValue && jobTypes.length > 0) {
        // Try to find by name (case insensitive)
        const matchingJobType = jobTypes.find(
          (type) => type.name.toLowerCase() === jobTypeValue.toLowerCase()
        );

        if (matchingJobType) {
          jobTypeValue = matchingJobType.name.toLowerCase();
          console.log("Matched job type:", matchingJobType);
        } else {
          console.log("No matching job type found for:", jobTypeValue);
          jobTypeValue = ""; // Reset if no match found
        }
      }

      // Extract location and company data from nested structure
      const locationData = job.locations || {};
      const companyData = locationData.companies || {};
      const units = job.units || [];
      const firstUnit = units[0] || {};

      setFormData({
        // Service Location
        company_id: locationData.company_id || "",
        company_name: companyData.name || "",
        location_id: job.location_id || "",
        location_name: locationData.name || "",
        unit_id: firstUnit.id || "",
        unit_number: firstUnit.unit_number || "",
        service_address: locationData.address || "",
        service_city: locationData.city || "",
        service_state: locationData.state || "",
        service_zip: locationData.zip || "",
        office: job.office || "Main Office",
        customer_po: job.customer_po || "",
        service_contract: job.service_contract || "Standard",

        // Primary Contact
        contact_first_name: job.contact_name
          ? job.contact_name.split(" ")[0] || ""
          : "",
        contact_last_name: job.contact_name
          ? job.contact_name.split(" ").slice(1).join(" ") || ""
          : "",
        contact_type: job.contact_type || "",
        contact_phone: job.contact_phone || "",
        contact_email: job.contact_email || "",

        // Job Details
        name: job.name || "",
        description: job.description || "",
        problem_description: job.problem_description || "",
        status: job.status || "scheduled",
        type: jobTypeValue,
        additional_type: job.additional_type || "",
        service_line: serviceLineValue,
        is_agreement_customer: job.is_agreement_customer || false,
        is_training: job.is_training || false,

        // Schedule
        time_period_start: job.time_period_start
          ? new Date(job.time_period_start).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        time_period_due: job.time_period_due
          ? new Date(job.time_period_due).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });

      console.log("Form data set with service_line:", serviceLineValue);
      console.log("Form data set with type:", jobTypeValue);
    }
  }, [job, serviceLines, jobTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from("jobs")
        .update({
          // Job Details
          name: formData.name,
          description: formData.description || null,
          problem_description: formData.problem_description || null,
          status: formData.status,
          type: formData.type,
          additional_type:
            formData.type === "maintenance" ? formData.additional_type : null,
          service_line: formData.service_line || null,
          is_training: formData.is_training,
          is_agreement_customer: formData.is_agreement_customer,

          // Contact Information
          contact_name:
            `${formData.contact_first_name} ${formData.contact_last_name}`.trim() ||
            null,
          contact_phone: formData.contact_phone || null,
          contact_email: formData.contact_email || null,
          contact_type: formData.contact_type || null,

          // Location and Unit
          location_id: formData.location_id || null,
          unit_id: formData.unit_id || null,

          // Additional Details
          office: formData.office || null,
          customer_po: formData.customer_po || null,
          service_contract: formData.service_contract || null,

          // Schedule
          time_period_start: formData.time_period_start,
          time_period_due: formData.time_period_due,
        })
        .eq("id", job.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Handle additional contacts
      if (additionalContacts.length > 0) {
        // First, remove existing additional contacts
        await supabase.from("job_contacts").delete().eq("job_id", job.id);

        // Filter out empty contacts and add new ones
        const validContacts = additionalContacts.filter(
          (contact) =>
            contact.first_name.trim() ||
            contact.last_name.trim() ||
            contact.phone.trim() ||
            contact.email.trim()
        );

        if (validContacts.length > 0) {
          const contactAssignments = validContacts.map((contact) => ({
            job_id: job.id,
            first_name: contact.first_name || null,
            last_name: contact.last_name || null,
            phone: contact.phone || null,
            email: contact.email || null,
            type: contact.type || null,
          }));

          const { error: contactError } = await supabase
            .from("job_contacts")
            .insert(contactAssignments);

          if (contactError) {
            console.error("Error updating additional contacts:", contactError);
          }
        }
      }

      // Fetch the complete updated job with all relationships
      const { data: completeJob, error: fetchError } = await supabase
        .from("jobs")
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
              name
            )
          ),
          job_units:job_units (
            id,
            unit_id,
            units:unit_id (
              id,
              unit_number,
              status,
              primary_contact_type,
              primary_contact_email,
              primary_contact_phone,
              billing_entity,
              billing_email,
              billing_city,
              billing_state,
              billing_zip,
              office
            )
          ),

          job_contacts (
            id,
            first_name,
            last_name,
            phone,
            email,
            type
          )
        `
        )
        .eq("id", job.id)
        .single();

      if (fetchError) {
        console.error("Error fetching complete job data:", fetchError);
        // Still call onJobUpdated with the basic data if fetch fails
        onJobUpdated(data);
      } else {
        // Flatten job_units to include the join table's id and unit_id for inspection linkage
        const jobUnits = (completeJob.job_units || []).map((ju: any) => ({
          id: ju.id, // job_units table PK
          unit_id: ju.unit_id, // unit_id from job_units
          unit_number: ju.units?.unit_number,
        }));
        const units = (completeJob.job_units || [])
          .map((ju: any) => ju.units)
          .filter(Boolean);
        const completeJobWithUnits = { ...completeJob, units, jobUnits };

        onJobUpdated(completeJobWithUnits);
      }

      onClose();
    } catch (err) {
      console.error("Error updating job:", err);
      setError("Failed to update job. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCompanyChange = (companyId: string) => {
    setFormData((prev) => ({
      ...prev,
      company_id: companyId,
      location_id: "", // Reset location when company changes
      location_name: "",
      service_address: "",
      service_city: "",
      service_state: "",
      service_zip: "",
    }));

    // Filter locations based on selected company
    if (companyId) {
      const filtered = locations.filter(
        (location) => location.company_id === companyId
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(locations);
    }
  };

  const handleLocationChange = (locationId: string) => {
    const selectedLocation = locations.find((loc) => loc.id === locationId);
    if (selectedLocation) {
      setFormData((prev) => ({
        ...prev,
        location_id: locationId,
        location_name: selectedLocation.name,
        service_address: selectedLocation.address || "",
        service_city: selectedLocation.city || "",
        service_state: selectedLocation.state || "",
        service_zip: selectedLocation.zip || "",
      }));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-start justify-center p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-gray-50 w-full max-w-7xl mx-auto min-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                disabled={isLoading}
              >
                <ChevronLeft size={20} />
              </button>
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Edit Job #{job.number}
              </Dialog.Title>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Location *
                  </label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    required
                    className="select"
                  >
                    <option value="">Select Location</option>
                    {(formData.company_id ? filteredLocations : locations).map(
                      (location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                          {!formData.company_id
                            ? ` (${location.companies?.name})`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Address *
                  </label>
                  <input
                    type="text"
                    value={formData.service_address}
                    onChange={(e) =>
                      handleInputChange("service_address", e.target.value)
                    }
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service City *
                  </label>
                  <input
                    type="text"
                    value={formData.service_city}
                    onChange={(e) =>
                      handleInputChange("service_city", e.target.value)
                    }
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service State *
                  </label>
                  <input
                    type="text"
                    value={formData.service_state}
                    onChange={(e) =>
                      handleInputChange("service_state", e.target.value)
                    }
                    required
                    maxLength={2}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Zip *
                  </label>
                  <input
                    type="text"
                    value={formData.service_zip}
                    onChange={(e) =>
                      handleInputChange("service_zip", e.target.value)
                    }
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Office Location *
                  </label>
                  <select
                    value={formData.office}
                    onChange={(e) =>
                      handleInputChange("office", e.target.value)
                    }
                    required
                    className="select"
                  >
                    <option value="Main Office">Main Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer PO
                  </label>
                  <input
                    type="text"
                    value={formData.customer_po}
                    onChange={(e) =>
                      handleInputChange("customer_po", e.target.value)
                    }
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Job Primary Contact */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-6">Job Primary Contact</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_first_name}
                    onChange={(e) =>
                      handleInputChange("contact_first_name", e.target.value)
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_last_name}
                    onChange={(e) =>
                      handleInputChange("contact_last_name", e.target.value)
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_type}
                    onChange={(e) =>
                      handleInputChange("contact_type", e.target.value)
                    }
                    className="input"
                    placeholder="Contact Type"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      handleInputChange("contact_phone", e.target.value)
                    }
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      handleInputChange("contact_email", e.target.value)
                    }
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Additional Contacts */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              {console.log(
                "Rendering Additional Contacts section, current state:",
                additionalContacts
              )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Line *
                  </label>
                  <select
                    value={formData.service_line}
                    onChange={(e) =>
                      handleInputChange("service_line", e.target.value)
                    }
                    required
                    className="select"
                  >
                    <option value="">Select Service Line</option>
                    {serviceLines.map((line) => (
                      <option key={line.id} value={line.code}>
                        {line.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    required
                    className="select"
                  >
                    <option value="">Select Job Type</option>
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
                                additional_type: "",
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maintenance Type *
                      </label>
                      <select
                        value={formData.additional_type}
                        onChange={(e) =>
                          handleInputChange("additional_type", e.target.value)
                        }
                        required
                        className="select"
                      >
                        <option value="">Select Maintenance Type</option>
                        {formData.is_agreement_customer ? (
                          <>
                            <option value="PM Filter Change">
                              PM Filter Change
                            </option>
                            <option value="PM Cleaning AC">
                              PM Cleaning AC
                            </option>
                            <option value="PM Cleaning HEAT">
                              PM Cleaning HEAT
                            </option>
                          </>
                        ) : (
                          <>
                            <option value="ONE Filter Change">
                              ONE Filter Change
                            </option>
                            <option value="ONE Cleaning AC">
                              ONE Cleaning AC
                            </option>
                            <option value="ONE Cleaning HEAT">
                              ONE Cleaning HEAT
                            </option>
                          </>
                        )}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description of Service *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    required
                    rows={4}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description of Problem
                  </label>
                  <textarea
                    value={formData.problem_description}
                    onChange={(e) =>
                      handleInputChange("problem_description", e.target.value)
                    }
                    rows={4}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Appointment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-6">Appointment</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.time_period_start}
                    onChange={(e) =>
                      handleInputChange("time_period_start", e.target.value)
                    }
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={formData.time_period_due}
                    onChange={(e) =>
                      handleInputChange("time_period_due", e.target.value)
                    }
                    required
                    className="input"
                  />
                </div>
              </div>
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
                    <span className="ml-2 text-sm text-gray-700">
                      Training Job
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Updating...
                  </>
                ) : (
                  "Update Job"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default EditJobModal;
