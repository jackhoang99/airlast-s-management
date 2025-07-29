import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  Plus,
  FileInput as FileInvoice,
  X,
  Check,
  DollarSign,
} from "lucide-react";
import ArrowBack from "../components/ui/ArrowBack";

type Job = {
  id: string;
  number: string;
  name: string;
  status: string;
  type: string;
  contact_name: string;
  contact_email: string;
  created_at: string;
  location_id: string;
  locations: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  units: Array<{
    id: string;
    unit_number: string;
  }>;
};

const CreateInvoice = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const { entityType, entityId } = useParams<{
    entityType: string;
    entityId: string;
  }>();

  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [jobInvoiceTypes, setJobInvoiceTypes] = useState<
    Record<string, "all" | "replacement" | "repair" | "inspection">
  >({});
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entityName, setEntityName] = useState<string>("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    // If no entity parameters, show selection mode
    if (!entityType || !entityId) {
      setIsSelectionMode(true);
      fetchFilterOptions();
      return;
    }

    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      setError(null);

      try {
        let locationIds: string[] = [];

        if (entityType === "company") {
          // Fetch all locations for this company
          const { data: locations, error: locationsError } = await supabase
            .from("locations")
            .select("id")
            .eq("company_id", entityId);

          if (locationsError) throw locationsError;
          if (!locations || locations.length === 0) {
            setError("No locations found for this company");
            return;
          }
          locationIds = locations.map((loc: any) => loc.id);
        } else if (entityType === "location") {
          locationIds = [entityId];
        } else if (entityType === "unit") {
          // For unit, we'll get the location from the unit
          const { data: unit, error: unitError } = await supabase
            .from("units")
            .select("location_id")
            .eq("id", entityId)
            .single();

          if (unitError) throw unitError;
          if (!unit) {
            setError("Unit not found");
            return;
          }
          locationIds = [unit.location_id];
        } else {
          setError("Invalid entity type");
          return;
        }

        // Fetch entity name
        if (entityType === "company") {
          const { data: company, error: companyError } = await supabase
            .from("companies")
            .select("name")
            .eq("id", entityId)
            .single();
          if (companyError) throw companyError;
          setEntityName(company.name);
        } else if (entityType === "location") {
          const { data: location, error: locationError } = await supabase
            .from("locations")
            .select("name")
            .eq("id", entityId)
            .single();
          if (locationError) throw locationError;
          setEntityName(location.name);
        } else if (entityType === "unit") {
          const { data: unit, error: unitError } = await supabase
            .from("units")
            .select("unit_number")
            .eq("id", entityId)
            .single();
          if (unitError) throw unitError;
          setEntityName(`Unit ${unit.unit_number}`);
        }

        // Fetch all jobs (we'll filter them based on entity type and user selections)
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(
            `
            id,
            number,
            name,
            status,
            type,
            contact_name,
            contact_email,
            created_at,
            location_id,
            locations (
              name,
              address,
              city,
              state,
              zip
            ),
            job_units (
              units (
                id,
                unit_number
              )
            )
          `
          );

        if (jobsError) throw jobsError;

        // Fetch jobs that already have invoices
        const { data: jobsWithInvoices, error: invoicesError } = await supabase
          .from("job_invoices")
          .select("job_id");

        if (invoicesError) throw invoicesError;

        const jobsWithInvoiceIds = new Set(
          (jobsWithInvoices || []).map((invoice: any) => invoice.job_id)
        );

        // Filter out jobs that already have invoices
        const jobsWithoutInvoices = (jobsData || []).filter(
          (job: any) => !jobsWithInvoiceIds.has(job.id)
        );

        // Transform the data to flatten units
        const transformedJobs = jobsWithoutInvoices.map((job: any) => ({
          ...job,
          units: (job.job_units || [])
            .map((ju: any) => ju.units)
            .filter(Boolean),
        }));

        setAvailableJobs(transformedJobs);

        // Fetch companies, locations, and units for filtering
        await fetchFilterOptions();

        // Set initial filter values based on entity type
        if (entityType === "company") {
          setSelectedCompany(entityId);
        } else if (entityType === "location") {
          // Find the company for this location
          const locationData = locations.find(
            (loc: any) => loc.id === entityId
          );
          if (locationData) {
            setSelectedCompany(locationData.company_id);
            setSelectedLocation(entityId);
          }
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch jobs");
      } finally {
        setIsLoadingJobs(false);
      }
    };

    const fetchFilterOptions = async () => {
      try {
        // Fetch companies
        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("id, name")
          .order("name");

        if (companiesError) throw companiesError;
        setCompanies(companiesData || []);

        // Fetch locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id, name, company_id")
          .order("name");

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        // Fetch units
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select("id, unit_number, location_id")
          .order("unit_number");

        if (unitsError) throw unitsError;
        setUnits(unitsData || []);
      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    };

    const handleEntitySelection = async () => {
      if (!selectedCompany && !selectedLocation && !selectedUnit) {
        setError("Please select a company, location, or unit");
        return;
      }

      setIsLoadingJobs(true);
      setError(null);

      try {
        let locationIds: string[] = [];
        let selectedEntityType = "";
        let selectedEntityId = "";

        if (selectedUnit) {
          // Unit selected - get its location
          const { data: unit, error: unitError } = await supabase
            .from("units")
            .select("location_id, unit_number")
            .eq("id", selectedUnit)
            .single();

          if (unitError) throw unitError;
          if (!unit) {
            setError("Unit not found");
            return;
          }
          locationIds = [unit.location_id];
          selectedEntityType = "unit";
          selectedEntityId = selectedUnit;
          setEntityName(`Unit ${unit.unit_number}`);
        } else if (selectedLocation) {
          // Location selected
          locationIds = [selectedLocation];
          selectedEntityType = "location";
          selectedEntityId = selectedLocation;

          const { data: location, error: locationError } = await supabase
            .from("locations")
            .select("name")
            .eq("id", selectedLocation)
            .single();
          if (locationError) throw locationError;
          setEntityName(location.name);
        } else if (selectedCompany) {
          // Company selected - get all its locations
          const { data: locations, error: locationsError } = await supabase
            .from("locations")
            .select("id")
            .eq("company_id", selectedCompany);

          if (locationsError) throw locationsError;
          if (!locations || locations.length === 0) {
            setError("No locations found for this company");
            return;
          }
          locationIds = locations.map((loc: any) => loc.id);
          selectedEntityType = "company";
          selectedEntityId = selectedCompany;

          const { data: company, error: companyError } = await supabase
            .from("companies")
            .select("name")
            .eq("id", selectedCompany)
            .single();
          if (companyError) throw companyError;
          setEntityName(company.name);
        }

        // Fetch all jobs for the selected locations
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(
            `
          id,
          number,
          name,
          status,
          type,
          contact_name,
          contact_email,
          created_at,
          location_id,
          locations (
            name,
            address,
            city,
            state,
            zip
          ),
          job_units (
            units (
              id,
              unit_number
            )
          )
        `
          )
          .in("location_id", locationIds);

        if (jobsError) throw jobsError;

        // Fetch jobs that already have invoices
        const { data: jobsWithInvoices, error: invoicesError } = await supabase
          .from("job_invoices")
          .select("job_id");

        if (invoicesError) throw invoicesError;

        const jobsWithInvoiceIds = new Set(
          (jobsWithInvoices || []).map((invoice: any) => invoice.job_id)
        );

        // Filter out jobs that already have invoices
        const jobsWithoutInvoices = (jobsData || []).filter(
          (job: any) => !jobsWithInvoiceIds.has(job.id)
        );

        // Transform the data to flatten units
        const transformedJobs = jobsWithoutInvoices.map((job: any) => ({
          ...job,
          units: (job.job_units || [])
            .map((ju: any) => ju.units)
            .filter(Boolean),
        }));

        setAvailableJobs(transformedJobs);
        setIsSelectionMode(false);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch jobs");
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchJobs();
    fetchFilterOptions();
  }, [supabase, entityType, entityId]);

  // Pre-populate filters based on entity type
  useEffect(() => {
    if (
      !entityType ||
      !entityId ||
      companies.length === 0 ||
      locations.length === 0 ||
      units.length === 0
    ) {
      return;
    }

    const prePopulateFilters = async () => {
      try {
        if (entityType === "location") {
          // Pre-populate company and location for location entity
          const { data: location, error: locationError } = await supabase
            .from("locations")
            .select("id, name, company_id")
            .eq("id", entityId)
            .single();

          if (locationError) throw locationError;
          setSelectedCompany(location.company_id);
          setSelectedLocation(location.id);
        } else if (entityType === "unit") {
          // Pre-populate company, location, and unit for unit entity
          const { data: unit, error: unitError } = await supabase
            .from("units")
            .select(
              `
              id,
              unit_number,
              location_id,
              locations (
                id,
                name,
                company_id
              )
            `
            )
            .eq("id", entityId)
            .single();

          if (unitError) throw unitError;
          setSelectedCompany(unit.locations.company_id);
          setSelectedLocation(unit.location_id);
          setSelectedUnit(unit.id);
        }
      } catch (err) {
        console.error("Error pre-populating filters:", err);
      }
    };

    prePopulateFilters();
  }, [
    supabase,
    entityType,
    entityId,
    companies.length,
    locations.length,
    units.length,
  ]);

  const handleCreateInvoicesForSelectedJobs = async () => {
    if (!supabase || selectedJobs.size === 0) {
      setError("Please select jobs");
      return;
    }

    // Check if all selected jobs have invoice types
    const selectedJobIds = Array.from(selectedJobs);
    const jobsWithoutTypes = selectedJobIds.filter(
      (jobId) => !jobInvoiceTypes[jobId]
    );
    if (jobsWithoutTypes.length > 0) {
      setError("Please select invoice types for all jobs");
      return;
    }

    setIsCreatingInvoice(true);
    setError(null);

    try {
      const selectedJobData = availableJobs.filter((job) =>
        selectedJobIds.includes(job.id)
      );

      // Create one consolidated invoice
      const consolidatedInvoiceNumber = `${entityType?.toUpperCase()}-${entityId?.slice(
        0,
        8
      )}-INV-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`;

      // Calculate total amount for all selected jobs
      let totalAmount = 0;
      const jobAmounts: { jobId: string; amount: number }[] = [];

      for (const job of selectedJobData) {
        // Fetch replacement total from job_replacements table
        const { data: replacements, error: repError } = await supabase
          .from("job_replacements")
          .select("total_cost")
          .eq("job_id", job.id);

        if (repError) throw repError;

        // Fetch repair total from job_items table (all items)
        const { data: jobItems, error: itemsError } = await supabase
          .from("job_items")
          .select("total_cost")
          .eq("job_id", job.id);

        if (itemsError) throw itemsError;

        // Calculate totals using same logic as Job Details page
        const replacementTotal = (replacements || []).reduce(
          (sum, row) => sum + Number(row.total_cost || 0),
          0
        );

        const repairTotal = (jobItems || []).reduce(
          (sum, row) => sum + Number(row.total_cost || 0),
          0
        );

        // Calculate amount based on invoice type for this specific job
        const jobInvoiceType = jobInvoiceTypes[job.id];
        let amount = 0;
        if (jobInvoiceType === "inspection") {
          amount = 180;
        } else if (jobInvoiceType === "all") {
          amount = replacementTotal + repairTotal;
        } else if (jobInvoiceType === "replacement") {
          amount = replacementTotal;
        } else if (jobInvoiceType === "repair") {
          amount = repairTotal;
        }

        totalAmount += amount;
        jobAmounts.push({ jobId: job.id, amount });
      }

      // Create single consolidated invoice
      const { data: consolidatedInvoice, error: invoiceError } = await supabase
        .from("job_invoices")
        .insert({
          job_id: selectedJobData[0].id, // Use first job as primary
          invoice_number: consolidatedInvoiceNumber,
          amount: totalAmount,
          status: "draft",
          issued_date: new Date().toISOString().split("T")[0],
          due_date: dueDate,
          type: "all", // Use "all" as the base type for consolidated invoices
          parent_invoice_id: null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Store the consolidated invoice information
      const jobDetails = selectedJobData.map((job, index) => ({
        jobId: job.id,
        jobNumber: job.number,
        jobName: job.name,
        amount: jobAmounts[index]?.amount || 0,
        jobType: jobInvoiceTypes[job.id] || "all",
      }));

      // Store job details in localStorage for the invoice template to access
      console.log(
        "Storing consolidated invoice details for:",
        consolidatedInvoice.id
      );
      console.log("Job details to store:", jobDetails);
      localStorage.setItem(
        `consolidated_invoice_${consolidatedInvoice.id}`,
        JSON.stringify(jobDetails)
      );

      // Navigate to the all invoices page
      navigate("/invoices");
    } catch (err) {
      console.error("Error creating consolidated invoice:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create consolidated invoice"
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    const newSelectedJobs = new Set(selectedJobs);
    if (newSelectedJobs.has(jobId)) {
      newSelectedJobs.delete(jobId);
      // Remove job type when deselecting
      const newJobInvoiceTypes = { ...jobInvoiceTypes };
      delete newJobInvoiceTypes[jobId];
      setJobInvoiceTypes(newJobInvoiceTypes);
    } else {
      newSelectedJobs.add(jobId);
    }
    setSelectedJobs(newSelectedJobs);
  };

  const selectAllJobs = () => {
    const allJobIds = filteredJobs.map((job) => job.id);
    setSelectedJobs(new Set(allJobIds));
  };

  const clearJobSelection = () => {
    setSelectedJobs(new Set());
    setJobInvoiceTypes({});
  };

  // Filter jobs based on selected filters
  const filteredJobs = availableJobs.filter((job) => {
    // Filter by company - check if job's location belongs to selected company
    if (selectedCompany) {
      const jobLocation = locations.find((loc) => loc.id === job.location_id);
      if (!jobLocation || jobLocation.company_id !== selectedCompany) {
        return false;
      }
    }

    // Filter by location
    if (selectedLocation && job.location_id !== selectedLocation) {
      return false;
    }

    // Filter by unit - check if job has the selected unit
    if (selectedUnit) {
      const jobUnitIds = job.units?.map((unit: any) => unit.id) || [];
      if (!jobUnitIds.includes(selectedUnit)) {
        return false;
      }
    }

    return true;
  });

  // Get filtered locations based on selected company
  const filteredLocations = selectedCompany
    ? locations.filter((loc) => loc.company_id === selectedCompany)
    : locations;

  // Get filtered units based on selected location
  const filteredUnits = selectedLocation
    ? units.filter((unit) => unit.location_id === selectedLocation)
    : units;

  if (isLoadingJobs) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error}</p>
        <ArrowBack
          fallbackRoute={
            entityType === "company"
              ? "/companies"
              : entityType === "location"
              ? "/locations"
              : "/units"
          }
          className="text-primary-600 hover:text-primary-800"
        />
      </div>
    );
  }

  // Show entity selection interface when no entity is specified
  if (isSelectionMode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
              <p className="text-gray-600">
                Select a company, location, or unit to create an invoice
              </p>
            </div>
            <ArrowBack
              fallbackRoute="/invoices"
              className="text-primary-600 hover:text-primary-800"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Entity Selection */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Select Entity</h2>
            <p className="text-gray-600 mb-6">
              Choose a company, location, or unit to create an invoice for. You can only select one at a time.
            </p>

            <div className="space-y-6">
              {/* Company Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <select
                  className="select w-full"
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setSelectedLocation("");
                    setSelectedUnit("");
                  }}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  className="select w-full"
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setSelectedCompany("");
                    setSelectedUnit("");
                  }}
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <select
                  className="select w-full"
                  value={selectedUnit}
                  onChange={(e) => {
                    setSelectedUnit(e.target.value);
                    setSelectedCompany("");
                    setSelectedLocation("");
                  }}
                >
                  <option value="">Select a unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Continue Button */}
              <div className="pt-4">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleEntitySelection}
                  disabled={!selectedCompany && !selectedLocation && !selectedUnit}
                >
                  Continue to Job Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
            <p className="text-gray-600">
              Create a consolidated invoice for {entityName}
            </p>
          </div>
          <ArrowBack
            fallbackRoute={
              entityType === "company"
                ? "/companies"
                : entityType === "location"
                ? "/locations"
                : "/units"
            }
            className="text-primary-600 hover:text-primary-800"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job Selection Section */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Select Jobs</h2>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllJobs}
                    className="btn btn-secondary btn-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearJobSelection}
                    className="btn btn-secondary btn-sm"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Filter Dropdowns */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Filter Jobs
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Use the filters below to narrow down jobs. You can filter by
                  company, location, or unit.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Company Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setSelectedLocation(""); // Reset location when company changes
                        setSelectedUnit(""); // Reset unit when company changes
                      }}
                      className="input w-full"
                    >
                      <option value="">All Companies</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        setSelectedUnit(""); // Reset unit when location changes
                      }}
                      className="input w-full"
                    >
                      <option value="">All Locations</option>
                      {filteredLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">All Units</option>
                      {filteredUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unit_number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(selectedCompany || selectedLocation || selectedUnit) && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setSelectedCompany("");
                        setSelectedLocation("");
                        setSelectedUnit("");
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {availableJobs.length === 0
                      ? "No jobs available for invoicing"
                      : "No jobs match the selected filters"}
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedJobs.has(job.id)
                          ? "border-primary-500 bg-primary-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleJobSelection(job.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              Job #{job.number}
                            </span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                job.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : job.status === "scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {job.status}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {job.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.locations?.name} • {job.locations?.address},{" "}
                            {job.locations?.city}, {job.locations?.state}
                          </div>
                          {job.units && job.units.length > 0 && (
                            <div className="text-sm text-gray-500">
                              Units:{" "}
                              {job.units
                                .map((unit: any) => unit.unit_number)
                                .join(", ")}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            Created:{" "}
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Invoice Configuration Section */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">
                Invoice Configuration
              </h2>

              {/* Invoice Types */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Invoice Types (Select for each job)
                </label>
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">
                          Job #{job.number} - {job.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedJobs.has(job.id)
                            ? "Selected"
                            : "Not selected"}
                        </div>
                      </div>

                      {selectedJobs.has(job.id) && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div
                              className={`p-2 border rounded cursor-pointer text-xs ${
                                jobInvoiceTypes[job.id] === "all"
                                  ? "border-primary-500 bg-primary-50"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() =>
                                setJobInvoiceTypes((prev) => ({
                                  ...prev,
                                  [job.id]: "all",
                                }))
                              }
                            >
                              <div className="font-medium">Standard</div>
                              <div className="text-gray-500">All costs</div>
                              {jobInvoiceTypes[job.id] === "all" && (
                                <Check
                                  size={12}
                                  className="text-primary-600 mt-1"
                                />
                              )}
                            </div>

                            <div
                              className={`p-2 border rounded cursor-pointer text-xs ${
                                jobInvoiceTypes[job.id] === "replacement"
                                  ? "border-primary-500 bg-primary-50"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() =>
                                setJobInvoiceTypes((prev) => ({
                                  ...prev,
                                  [job.id]: "replacement",
                                }))
                              }
                            >
                              <div className="font-medium">Replacement</div>
                              <div className="text-gray-500">Parts only</div>
                              {jobInvoiceTypes[job.id] === "replacement" && (
                                <Check
                                  size={12}
                                  className="text-primary-600 mt-1"
                                />
                              )}
                            </div>

                            <div
                              className={`p-2 border rounded cursor-pointer text-xs ${
                                jobInvoiceTypes[job.id] === "repair"
                                  ? "border-primary-500 bg-primary-50"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() =>
                                setJobInvoiceTypes((prev) => ({
                                  ...prev,
                                  [job.id]: "repair",
                                }))
                              }
                            >
                              <div className="font-medium">Repair</div>
                              <div className="text-gray-500">Labor only</div>
                              {jobInvoiceTypes[job.id] === "repair" && (
                                <Check
                                  size={12}
                                  className="text-primary-600 mt-1"
                                />
                              )}
                            </div>

                            <div
                              className={`p-2 border rounded cursor-pointer text-xs ${
                                jobInvoiceTypes[job.id] === "inspection"
                                  ? "border-primary-500 bg-primary-50"
                                  : "hover:bg-gray-100"
                              }`}
                              onClick={() =>
                                setJobInvoiceTypes((prev) => ({
                                  ...prev,
                                  [job.id]: "inspection",
                                }))
                              }
                            >
                              <div className="font-medium">Inspection</div>
                              <div className="text-gray-500">Fixed fee</div>
                              {jobInvoiceTypes[job.id] === "inspection" && (
                                <Check
                                  size={12}
                                  className="text-primary-600 mt-1"
                                />
                              )}
                            </div>
                          </div>

                          {!jobInvoiceTypes[job.id] && (
                            <div className="text-xs text-red-500">
                              Please select an invoice type for this job
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Due Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  className="input w-full"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Summary */}
              <div className="bg-white p-3 rounded border mb-6">
                <h5 className="font-medium text-sm mb-2">Summary</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Available Jobs:</span>
                    <span className="font-medium">{filteredJobs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Jobs:</span>
                    <span className="font-medium">{selectedJobs.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jobs with Types:</span>
                    <span className="font-medium">
                      {
                        Array.from(selectedJobs).filter(
                          (jobId) => jobInvoiceTypes[jobId]
                        ).length
                      }{" "}
                      / {selectedJobs.size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span className="font-medium">
                      {new Date(dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleCreateInvoicesForSelectedJobs}
                  disabled={
                    isCreatingInvoice ||
                    selectedJobs.size === 0 ||
                    Array.from(selectedJobs).some(
                      (jobId) => !jobInvoiceTypes[jobId]
                    )
                  }
                >
                  <DollarSign size={16} className="mr-2" />
                  {isCreatingInvoice
                    ? `Creating ${selectedJobs.size} Invoice${
                        selectedJobs.size > 1 ? "s" : ""
                      }...`
                    : `Create ${selectedJobs.size} Invoice${
                        selectedJobs.size > 1 ? "s" : ""
                      }`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
