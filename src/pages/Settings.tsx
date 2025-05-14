import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { Settings as SettingsIcon, Plus, AlertTriangle, Building, Users, Briefcase, Tag, Edit, Package, DollarSign } from 'lucide-react';

type User = Database['public']['Tables']['users']['Row'];
type JobType = Database['public']['Tables']['job_types']['Row'];
type ServiceType = Database['public']['Tables']['service_lines']['Row'];
type Settings = Database['public']['Tables']['settings']['Row'];
type JobItemPrice = Database['public']['Tables']['job_item_prices']['Row'];

const Settings = () => {
  const { supabase } = useSupabase();
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [itemPrices, setItemPrices] = useState<JobItemPrice[]>([]);
  const [companySettings, setCompanySettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newServiceType, setNewServiceType] = useState({
    name: '',
    code: '',
    description: ''
  });

  const [newJobType, setNewJobType] = useState({
    name: '',
    code: '',
    description: ''
  });

  const [newItemPrice, setNewItemPrice] = useState({
    code: '',
    name: '',
    description: '',
    service_line: '',
    unit_cost: '',
    type: 'part' as 'part' | 'labor' | 'item'
  });

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'user',
    status: 'active',
    // Technician specific fields
    hire_date: '',
    job_title: '',
    hourly_rate: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    license_number: '',
    license_expiry: '',
    vehicle_number: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    shirt_size: '',
    boot_size: '',
    preferred_name: '',
    tax_id: '',
    direct_deposit: false,
    bank_name: '',
    bank_routing: '',
    bank_account: '',
    background_check_date: '',
    drug_test_date: '',
    last_review_date: '',
    next_review_date: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;

      try {
        // Fetch service types
        const { data: serviceTypeData, error: serviceTypeError } = await supabase
          .from('service_lines')
          .select('*')
          .order('name');

        if (serviceTypeError) throw serviceTypeError;
        setServiceTypes(serviceTypeData || []);

        // Fetch job types
        const { data: jobTypeData, error: jobTypeError } = await supabase
          .from('job_types')
          .select('*')
          .order('name');

        if (jobTypeError) throw jobTypeError;
        setJobTypes(jobTypeData || []);

        // Fetch users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .order('username');

        if (userError) throw userError;
        setUsers(userData || []);

        // Fetch item prices
        const { data: itemPriceData, error: itemPriceError } = await supabase
          .from('job_item_prices')
          .select('*')
          .order('code');

        if (itemPriceError) throw itemPriceError;
        setItemPrices(itemPriceData || []);

        // Fetch company settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'company')
          .single();

        if (settingsError) throw settingsError;
        setCompanySettings(settingsData);
      } catch (err) {
        console.error('Error fetching settings data:', err);
        setError('Failed to load settings data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleAddServiceType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('service_lines')
        .insert([{
          name: newServiceType.name,
          code: newServiceType.code,
          description: newServiceType.description
        }]);

      if (error) throw error;

      // Reset form and refresh data
      setNewServiceType({ name: '', code: '', description: '' });
      const { data } = await supabase
        .from('service_lines')
        .select('*')
        .order('name');
      
      setServiceTypes(data || []);
    } catch (err) {
      console.error('Error adding service type:', err);
      setError('Failed to add service type');
    }
  };

  const handleAddJobType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('job_types')
        .insert([{
          name: newJobType.name,
          code: newJobType.code,
          description: newJobType.description
        }]);

      if (error) throw error;

      // Reset form and refresh data
      setNewJobType({ name: '', code: '', description: '' });
      const { data } = await supabase
        .from('job_types')
        .select('*')
        .order('name');
      
      setJobTypes(data || []);
    } catch (err) {
      console.error('Error adding job type:', err);
      setError('Failed to add job type');
    }
  };

  const handleAddItemPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('job_item_prices')
        .insert([{
          code: newItemPrice.code,
          name: newItemPrice.name,
          description: newItemPrice.description,
          service_line: newItemPrice.service_line,
          unit_cost: parseFloat(newItemPrice.unit_cost),
          type: newItemPrice.type
        }]);

      if (error) throw error;

      // Reset form and refresh data
      setNewItemPrice({
        code: '',
        name: '',
        description: '',
        service_line: '',
        unit_cost: '',
        type: 'part'
      });
      
      const { data } = await supabase
        .from('job_item_prices')
        .select('*')
        .order('code');
      
      setItemPrices(data || []);
      
      // Hide the form
      document.getElementById('addItemPriceForm')?.classList.add('hidden');
    } catch (err) {
      console.error('Error adding item price:', err);
      setError('Failed to add item price');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      // First create the user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          username: newUser.username,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status
        }])
        .select()
        .single();

      if (userError) throw userError;

      // If the role is technician, create a technician record
      if (newUser.role === 'technician' && userData) {
        const { error: techError } = await supabase
          .from('technicians')
          .insert([{
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            email: newUser.email,
            phone: newUser.phone,
            hire_date: newUser.hire_date,
            job_title: newUser.job_title || 'HVAC Technician',
            hourly_rate: newUser.hourly_rate ? parseFloat(newUser.hourly_rate) : null,
            address: newUser.address,
            city: newUser.city,
            state: newUser.state,
            zip: newUser.zip,
            license_number: newUser.license_number,
            license_expiry: newUser.license_expiry || null,
            vehicle_number: newUser.vehicle_number,
            vehicle_make: newUser.vehicle_make,
            vehicle_model: newUser.vehicle_model,
            vehicle_year: newUser.vehicle_year,
            shirt_size: newUser.shirt_size,
            boot_size: newUser.boot_size,
            preferred_name: newUser.preferred_name,
            tax_id: newUser.tax_id,
            direct_deposit: newUser.direct_deposit,
            bank_name: newUser.bank_name,
            bank_routing: newUser.bank_routing,
            bank_account: newUser.bank_account,
            background_check_date: newUser.background_check_date || null,
            drug_test_date: newUser.drug_test_date || null,
            last_review_date: newUser.last_review_date || null,
            next_review_date: newUser.next_review_date || null
          }]);

        if (techError) throw techError;
      }

      // Reset form and refresh data
      setNewUser({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'user',
        status: 'active',
        hire_date: '',
        job_title: '',
        hourly_rate: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        license_number: '',
        license_expiry: '',
        vehicle_number: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: '',
        shirt_size: '',
        boot_size: '',
        preferred_name: '',
        tax_id: '',
        direct_deposit: false,
        bank_name: '',
        bank_routing: '',
        bank_account: '',
        background_check_date: '',
        drug_test_date: '',
        last_review_date: '',
        next_review_date: ''
      });

      // Refresh users list
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('username');
      
      setUsers(data || []);
      
      // Hide the form
      document.getElementById('addUserForm')?.classList.add('hidden');
    } catch (err) {
      console.error('Error adding user:', err);
      setError('Failed to add user');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-gray-500" />
        <h1>Settings</h1>
      </div>

      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Company Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Company Information</h2>
        </div>

        {companySettings && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium">{(companySettings.value as any).name}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Physical Address</h4>
                <p>{(companySettings.value as any).physical_address.street}</p>
                <p>
                  {(companySettings.value as any).physical_address.city}, {(companySettings.value as any).physical_address.state} {(companySettings.value as any).physical_address.zip}
                </p>
                <p>{(companySettings.value as any).physical_address.phone}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Mailing Address</h4>
                <p>{(companySettings.value as any).mailing_address.street}</p>
                <p>
                  {(companySettings.value as any).mailing_address.city}, {(companySettings.value as any).mailing_address.state} {(companySettings.value as any).mailing_address.zip}
                </p>
                <p>{(companySettings.value as any).mailing_address.phone}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Time Zone</h4>
              <p>{(companySettings.value as any).time_zone}</p>
            </div>
          </div>
        )}
      </div>


      {/* Users Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Users</h2>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('addUserForm')?.classList.remove('hidden')}
          >
            <Plus size={16} className="mr-2" />
            Add User
          </button>
        </div>

        {/* Add User Form */}
        <form
          id="addUserForm"
          onSubmit={handleAddUser}
          className="hidden mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                required
                className="input"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                required
                className="input"
              />
            </div>
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                value={newUser.first_name}
                onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                value={newUser.last_name}
                onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={newUser.phone}
                onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                id="role"
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                className="select"
                required
              >
                <option value="user">User</option>
                <option value="technician">Technician</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Technician Fields */}
          {newUser.role === 'technician' && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Technician Information</h3>
              
              {/* Employment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    value={newUser.hire_date}
                    onChange={(e) => setNewUser(prev => ({ ...prev, hire_date: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={newUser.job_title}
                    onChange={(e) => setNewUser(prev => ({ ...prev, job_title: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newUser.hourly_rate}
                    onChange={(e) => setNewUser(prev => ({ ...prev, hourly_rate: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                document.getElementById('addUserForm')?.classList.add('hidden');
                setNewUser({
                  username: '',
                  email: '',
                  first_name: '',
                  last_name: '',
                  phone: '',
                  role: 'user',
                  status: 'active',
                  hire_date: '',
                  job_title: '',
                  hourly_rate: '',
                  address: '',
                  city: '',
                  state: '',
                  zip: '',
                  license_number: '',
                  license_expiry: '',
                  vehicle_number: '',
                  vehicle_make: '',
                  vehicle_model: '',
                  vehicle_year: '',
                  shirt_size: '',
                  boot_size: '',
                  preferred_name: '',
                  tax_id: '',
                  direct_deposit: false,
                  bank_name: '',
                  bank_routing: '',
                  bank_account: '',
                  background_check_date: '',
                  drug_test_date: '',
                  last_review_date: '',
                  next_review_date: ''
                });
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add User
            </button>
          </div>
        </form>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.first_name} {user.last_name}
                  </td>
                  <td>
                    <span className="capitalize">{user.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    {user.role === 'technician' && (
                      <Link 
                        to={`/technicians/${user.id}/edit`}
                        className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Types Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Service Types</h2>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('addServiceTypeForm')?.classList.remove('hidden')}
          >
            <Plus size={16} className="mr-2" />
            Add Service Type
          </button>
        </div>

        {/* Add Service Type Form */}
        <form
          id="addServiceTypeForm"
          onSubmit={handleAddServiceType}
          className="hidden mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newServiceType.name}
                onChange={(e) => setNewServiceType(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                type="text"
                value={newServiceType.code}
                onChange={(e) => setNewServiceType(prev => ({ ...prev, code: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newServiceType.description}
                onChange={(e) => setNewServiceType(prev => ({ ...prev, description: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                document.getElementById('addServiceTypeForm')?.classList.add('hidden');
                setNewServiceType({ name: '', code: '', description: '' });
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Service Type
            </button>
          </div>
        </form>

        {/* Service Types Table */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {serviceTypes.map((type) => (
                <tr key={type.id}>
                  <td>{type.name}</td>
                  <td>{type.code}</td>
                  <td>{type.description}</td>
                  <td>
                    <span className={`badge ${type.is_active ? 'badge-success' : 'badge-error'}`}>
                      {type.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Types Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Job Types</h2>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('addJobTypeForm')?.classList.remove('hidden')}
          >
            <Plus size={16} className="mr-2" />
            Add Job Type
          </button>
        </div>

        {/* Add Job Type Form */}
        <form
          id="addJobTypeForm"
          onSubmit={handleAddJobType}
          className="hidden mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newJobType.name}
                onChange={(e) => setNewJobType(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code
              </label>
              <input
                type="text"
                value={newJobType.code}
                onChange={(e) => setNewJobType(prev => ({ ...prev, code: e.target.value }))}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newJobType.description}
                onChange={(e) => setNewJobType(prev => ({ ...prev, description: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                document.getElementById('addJobTypeForm')?.classList.add('hidden');
                setNewJobType({ name: '', code: '', description: '' });
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Job Type
            </button>
          </div>
        </form>

        {/* Job Types Table */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobTypes.map((type) => (
                <tr key={type.id}>
                  <td>{type.name}</td>
                  <td>{type.code}</td>
                  <td>{type.description}</td>
                  <td>
                    <span className={`badge ${type.is_active ? 'badge-success' : 'badge-error'}`}>
                      {type.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Settings;