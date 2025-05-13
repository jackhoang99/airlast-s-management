import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Star, X } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';

type Location = Database['public']['Tables']['locations']['Row'] & {
  companies: {
    name: string;
    id: string;
  };
  units: {
    id: string;
    unit_number: string;
    status: string;
  }[];
};

const CreateJob = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [serviceLines, setServiceLines] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<any[]>([]);
  const [showSuggestedPresets, setShowSuggestedPresets] = useState(true);
  
  const [formData, setFormData] = useState({
    // Service Location
    company_id: '',
    company_name: '',
    location_id: '',
    location_name: '',
    unit_id: '',
    unit_number: '',
    service_address: '',
    service_city: '',
    service_state: '',
    service_zip: '',
    office: 'Main Office',
    customer_po: '',
    service_contract: 'Standard',

    // Primary Contact
    contact_first_name: '',
    contact_last_name: '',
    contact_type: '',
    contact_phone: '',
    contact_email: '',

    // Service Details
    service_line: '',
    description: '',
    problem_description: '',
    
    // Schedule
    time_period_start: new Date().toISOString().split('T')[0],
    time_period_due: new Date().toISOString().split('T')[0],
    schedule_start: '',
    schedule_duration: '1.00',
    
    // Additional Details
    type: 'preventative maintenance',
    estimated_cost: '',
    is_training: false,
    status: 'unscheduled'
  });

  useEffect(() => {
    const fetchLocations = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('locations')
          .select(`
            *,
            companies (
              id,
              name
            ),
            units (
              id,
              unit_number,
              status
            )
          `)
          .order('name');

        if (error) throw error;
        setLocations(data || []);
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };

    const fetchServiceLines = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('service_lines')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setServiceLines(data || []);
      } catch (err) {
        console.error('Error fetching service lines:', err);
      }
    };

    const fetchPresets = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('job_presets')
          .select('*')
          .order('name');

        if (error) throw error;
        setPresets(data || []);
      } catch (err) {
        console.error('Error fetching presets:', err);
      }
    };

    fetchLocations();
    fetchServiceLines();
    fetchPresets();
  }, [supabase]);

  const handleLocationChange = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (location) {
      setSelectedLocation(location);
      setFormData(prev => ({
        ...prev,
        company_id: location.companies.id,
        company_name: location.companies.name,
        location_id: locationId,
        location_name: location.name,
        service_address: location.address,
        service_city: location.city,
        service_state: location.state,
        service_zip: location.zip,
        unit_id: '',
        unit_number: ''
      }));
    }
  };

  const handleUnitChange = (unitId: string) => {
    const unit = selectedLocation?.units.find(u => u.id === unitId);
    if (unit) {
      setFormData(prev => ({
        ...prev,
        unit_id: unitId,
        unit_number: unit.unit_number
      }));
    }
  };

  const handleSavePreset = async () => {
    if (!supabase || !presetName) return;

    try {
      const { error } = await supabase
        .from('job_presets')
        .insert({
          name: presetName,
          data: formData
        });

      if (error) throw error;
      setShowPresetModal(false);
      setPresetName('');
      
      // Refresh presets
      const { data } = await supabase
        .from('job_presets')
        .select('*')
        .order('name');
      
      setPresets(data || []);
    } catch (err) {
      console.error('Error saving preset:', err);
    }
  };

  const handleLoadPreset = (preset: any) => {
    setFormData({
      ...formData,
      ...preset.data,
      // Don't override these fields
      company_id: formData.company_id,
      company_name: formData.company_name,
      location_id: formData.location_id,
      location_name: formData.location_name,
      unit_id: formData.unit_id,
      unit_number: formData.unit_number,
      service_address: formData.service_address,
      service_city: formData.service_city,
      service_state: formData.service_state,
      service_zip: formData.service_zip
    });
    setShowSuggestedPresets(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('jobs')
        .insert({
          name: `${formData.service_line} - ${formData.description}`.trim(),
          type: formData.type,
          location_id: formData.location_id,
          contact_name: `${formData.contact_first_name} ${formData.contact_last_name}`.trim(),
          contact_phone: formData.contact_phone,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          is_training: formData.is_training,
          time_period_start: formData.time_period_start,
          time_period_due: formData.time_period_due,
          schedule_start: formData.schedule_start || null,
          schedule_duration: formData.schedule_duration ? `${formData.schedule_duration} hours` : null,
          status: formData.schedule_start ? 'scheduled' : 'unscheduled',
          office: formData.office,
          contract_name: formData.service_contract
        });

      if (insertError) throw insertError;
      navigate('/jobs');
    } catch (err) {
      console.error('Error creating job:', err);
      setError('Failed to create job. Please try again.');
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

      {showSuggestedPresets && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Suggested Paths</h2>
            <button
              type="button"
              onClick={() => setShowSuggestedPresets(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleLoadPreset(preset)}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium">{preset.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {preset.data.type === 'preventative maintenance' ? 'PM' : 'Service Call'}
                  {preset.data.service_line ? ` • ${preset.data.service_line}` : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

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
              <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 mb-1">
                Service Location *
              </label>
              <select
                id="location_id"
                value={formData.location_id}
                onChange={(e) => handleLocationChange(e.target.value)}
                required
                className="select"
              >
                <option value="">Select Location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.companies?.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Selection */}
            <div className="md:col-span-2">
              <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700 mb-1">
                Service Unit
              </label>
              <select
                id="unit_id"
                value={formData.unit_id}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="select"
                disabled={!selectedLocation}
              >
                <option value="">Select Unit</option>
                {selectedLocation?.units
                  .filter(unit => unit.status === 'Active')
                  .map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="service_address" className="block text-sm font-medium text-gray-700 mb-1">
                Service Address *
              </label>
              <input
                type="text"
                id="service_address"
                value={formData.service_address}
                onChange={(e) => setFormData(prev => ({ ...prev, service_address: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="service_city" className="block text-sm font-medium text-gray-700 mb-1">
                Service City *
              </label>
              <input
                type="text"
                id="service_city"
                value={formData.service_city}
                onChange={(e) => setFormData(prev => ({ ...prev, service_city: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="service_state" className="block text-sm font-medium text-gray-700 mb-1">
                Service State *
              </label>
              <input
                type="text"
                id="service_state"
                value={formData.service_state}
                onChange={(e) => setFormData(prev => ({ ...prev, service_state: e.target.value }))}
                required
                maxLength={2}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="service_zip" className="block text-sm font-medium text-gray-700 mb-1">
                Service Zip *
              </label>
              <input
                type="text"
                id="service_zip"
                value={formData.service_zip}
                onChange={(e) => setFormData(prev => ({ ...prev, service_zip: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="office" className="block text-sm font-medium text-gray-700 mb-1">
                Office Location *
              </label>
              <select
                id="office"
                value={formData.office}
                onChange={(e) => setFormData(prev => ({ ...prev, office: e.target.value }))}
                required
                className="select"
              >
                <option value="Main Office">Main Office</option>
              </select>
            </div>

            <div>
              <label htmlFor="customer_po" className="block text-sm font-medium text-gray-700 mb-1">
                Customer PO
              </label>
              <input
                type="text"
                id="customer_po"
                value={formData.customer_po}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_po: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="service_contract" className="block text-sm font-medium text-gray-700 mb-1">
                Service Contract
              </label>
              <select
                id="service_contract"
                value={formData.service_contract}
                onChange={(e) => setFormData(prev => ({ ...prev, service_contract: e.target.value }))}
                className="select"
              >
                <option value="Standard">Standard</option>
                <option value="Financial">Financial</option>
                <option value="Management">Management</option>
                <option value="On-site">On-site</option>
                <option value="Owner">Owner</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
          </div>
        </div>

        {/* Primary Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Job Primary Contact</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="contact_first_name" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="contact_first_name"
                value={formData.contact_first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_first_name: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="contact_last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="contact_last_name"
                value={formData.contact_last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_last_name: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="contact_type" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Type
              </label>
              <select
                id="contact_type"
                value={formData.contact_type}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_type: e.target.value }))}
                className="select"
              >
                <option value="">Select Type</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="contact_email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Service</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="service_line" className="block text-sm font-medium text-gray-700 mb-1">
                Service Line *
              </label>
              <select
                id="service_line"
                value={formData.service_line}
                onChange={(e) => setFormData(prev => ({ ...prev, service_line: e.target.value }))}
                required
                className="select"
              >
                <option value="">Select Service Line</option>
                {serviceLines.map(line => (
                  <option key={line.id} value={line.name}>
                    {line.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description of Service *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
                rows={4}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="problem_description" className="block text-sm font-medium text-gray-700 mb-1">
                Description of Problem
              </label>
              <textarea
                id="problem_description"
                value={formData.problem_description}
                onChange={(e) => setFormData(prev => ({ ...prev, problem_description: e.target.value }))}
                rows={4}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">Appointment</h2>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                // Open schedule modal or navigate to scheduling page
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Appointment
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="time_period_start" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                id="time_period_start"
                value={formData.time_period_start}
                onChange={(e) => setFormData(prev => ({ ...prev, time_period_start: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="time_period_due" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                id="time_period_due"
                value={formData.time_period_due}
                onChange={(e) => setFormData(prev => ({ ...prev, time_period_due: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label htmlFor="schedule_start" className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Date/Time
              </label>
              <input
                type="datetime-local"
                id="schedule_start"
                value={formData.schedule_start}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_start: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="schedule_duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (hours)
              </label>
              <input
                type="number"
                id="schedule_duration"
                value={formData.schedule_duration}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_duration: e.target.value }))}
                step="0.25"
                min="0.25"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-6">Additional Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Job Type *
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                required
                className="select"
              >
                <option value="preventative maintenance">Preventative Maintenance</option>
                <option value="service call">Service Call</option>
              </select>
            </div>

            <div>
              <label htmlFor="estimated_cost" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost
              </label>
              <input
                type="number"
                id="estimated_cost"
                value={formData.estimated_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
                step="0.01"
                min="0"
                className="input"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_training}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_training: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className="ml-2 text-sm text-gray-700">Training Job</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            to="/jobs"
            className="btn btn-secondary"
          >
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
              'Create Job'
            )}
          </button>
        </div>
      </form>

      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Save as Preset</h3>
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
                    setPresetName('');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreset}
                  className="btn btn-primary"
                  disabled={!presetName}
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateJob;