import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Filter, Plus, Calendar, List, ChevronLeft, ChevronRight, X, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    companies: {
      name: string;
    };
  };
  job_technicians?: {
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
    };
  }[];
  job_items?: {
    id: string;
    total_cost: number;
  }[];
  units?: {
    unit_number: string;
  };
};

type Company = Database['public']['Tables']['companies']['Row'];
type Location = Database['public']['Tables']['locations']['Row'];
type Unit = Database['public']['Tables']['units']['Row'];
type JobType = Database['public']['Tables']['job_types']['Row'];

const Jobs = () => {
  const { supabase } = useSupabase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [filters, setFilters] = useState({
    jobNumber: '',
    jobName: '',
    company: '',
    location: '',
    unit: '',
    technician: 'All',
    status: 'All',
    type: 'All',
    dueFrom: '',
    dueTo: '',
    scheduleFrom: '',
    scheduleTo: '',
    showCompleted: true,
  });
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase) return;

      try {
        let query = supabase
          .from('jobs')
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              companies (
                name
              )
            ),
            job_technicians (
              technician_id,
              is_primary,
              users:technician_id (
                first_name,
                last_name
              )
            ),
            job_items!job_items_job_id_fkey (
              id,
              total_cost
            ),
            units (
              unit_number
            )
          `);

        // Apply filters
        if (filters.jobNumber) {
          query = query.ilike('number', `%${filters.jobNumber}%`);
        }
        if (filters.jobName) {
          query = query.ilike('name', `%${filters.jobName}%`);
        }
        if (filters.company) {
          query = query.eq('locations.company_id', filters.company);
        }
        if (filters.location) {
          query = query.eq('location_id', filters.location);
        }
        if (filters.unit) {
          query = query.eq('unit_id', filters.unit);
        }
        if (filters.status !== 'All') {
          query = query.eq('status', filters.status.toLowerCase());
        }
        if (filters.type !== 'All') {
          query = query.eq('type', filters.type.toLowerCase());
        }
        if (filters.dueFrom) {
          query = query.gte('time_period_due', filters.dueFrom);
        }
        if (filters.dueTo) {
          query = query.lte('time_period_due', filters.dueTo);
        }
        if (filters.scheduleFrom) {
          query = query.gte('schedule_start', filters.scheduleFrom);
        }
        if (filters.scheduleTo) {
          query = query.lte('schedule_start', filters.scheduleTo);
        }
        
        // Filter out completed jobs if showCompleted is false
        if (!filters.showCompleted) {
          query = query.neq('status', 'completed');
        }

        const { data, error } = await query;

        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCompanies = async () => {
      if (!supabase) return;
      
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('name');
          
        if (error) throw error;
        setCompanies(data || []);
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };

    const fetchLocations = async () => {
      if (!supabase) return;
      
      try {
        let query = supabase
          .from('locations')
          .select('*')
          .order('name');
          
        // Filter locations by company if a company is selected
        if (filters.company) {
          query = query.eq('company_id', filters.company);
        }
          
        const { data, error } = await query;
        if (error) throw error;
        setLocations(data || []);
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };

    const fetchUnits = async () => {
      if (!supabase) return;
      
      try {
        let query = supabase
          .from('units')
          .select('*')
          .order('unit_number');
          
        // Filter units by location if a location is selected
        if (filters.location) {
          query = query.eq('location_id', filters.location);
        }
          
        const { data, error } = await query;
        if (error) throw error;
        setUnits(data || []);
      } catch (err) {
        console.error('Error fetching units:', err);
      }
    };

    const fetchJobTypes = async () => {
      if (!supabase) return;
      
      try {
        const { data, error } = await supabase
          .from('job_types')
          .select('*')
          .eq('is_active', true)
          .order('name');
          
        if (error) throw error;
        setJobTypes(data || []);
      } catch (err) {
        console.error('Error fetching job types:', err);
      }
    };

    fetchJobs();
    fetchCompanies();
    fetchLocations();
    fetchUnits();
    fetchJobTypes();
  }, [supabase, filters]);

  // When company filter changes, update locations
  useEffect(() => {
    if (filters.company) {
      const fetchLocationsByCompany = async () => {
        if (!supabase) return;
        
        try {
          const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('company_id', filters.company)
            .order('name');
            
          if (error) throw error;
          setLocations(data || []);
          
          // Reset location and unit selection
          setFilters(prev => ({
            ...prev,
            location: '',
            unit: ''
          }));
        } catch (err) {
          console.error('Error fetching locations by company:', err);
        }
      };
      
      fetchLocationsByCompany();
    } else {
      // If no company is selected, fetch all locations
      const fetchAllLocations = async () => {
        if (!supabase) return;
        
        try {
          const { data, error } = await supabase
            .from('locations')
            .select('*')
            .order('name');
            
          if (error) throw error;
          setLocations(data || []);
        } catch (err) {
          console.error('Error fetching all locations:', err);
        }
      };
      
      fetchAllLocations();
    }
  }, [supabase, filters.company]);

  // When location filter changes, update units
  useEffect(() => {
    if (filters.location) {
      const fetchUnitsByLocation = async () => {
        if (!supabase) return;
        
        try {
          const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('location_id', filters.location)
            .order('unit_number');
            
          if (error) throw error;
          setUnits(data || []);
          
          // Reset unit selection
          setFilters(prev => ({
            ...prev,
            unit: ''
          }));
        } catch (err) {
          console.error('Error fetching units by location:', err);
        }
      };
      
      fetchUnitsByLocation();
    } else {
      // If no location is selected, fetch all units
      const fetchAllUnits = async () => {
        if (!supabase) return;
        
        try {
          const { data, error } = await supabase
            .from('units')
            .select('*')
            .order('unit_number');
            
          if (error) throw error;
          setUnits(data || []);
        } catch (err) {
          console.error('Error fetching all units:', err);
        }
      };
      
      fetchAllUnits();
    }
  }, [supabase, filters.location]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const resetFilters = () => {
    setFilters({
      jobNumber: '',
      jobName: '',
      company: '',
      location: '',
      unit: '',
      technician: 'All',
      status: 'All',
      type: 'All',
      dueFrom: '',
      dueTo: '',
      scheduleFrom: '',
      scheduleTo: '',
      showCompleted: true,
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'unscheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'preventative maintenance':
        return 'bg-purple-100 text-purple-800';
      case 'service call':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractBadgeClass = (isContract: boolean) => {
    return isContract 
      ? 'bg-green-100 text-green-800' 
      : 'bg-orange-100 text-orange-800';
  };

  const getQuoteBadgeClass = (isConfirmed: boolean) => {
    return isConfirmed 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  // Calculate total cost from job items
  const getJobTotalCost = (job: Job) => {
    if (!job.job_items || job.job_items.length === 0) return 0;
    return job.job_items.reduce((sum, item) => sum + Number(item.total_cost), 0);
  };

  const handleCompleteJob = async () => {
    if (!supabase || !selectedJob) return;
    
    setIsCompletingJob(true);
    setError(null);
    
    try {
      // Update job status to completed
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedJob.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setJobs(prev => prev.map(job => 
        job.id === selectedJob.id ? { ...job, status: 'completed' } : job
      ));
      
      setShowCompleteModal(false);
      
    } catch (err) {
      console.error('Error completing job:', err);
      setError('Failed to complete job. Please try again.');
    } finally {
      setIsCompletingJob(false);
      setSelectedJob(null);
    }
  };

  const handleDeleteJob = async () => {
    if (!supabase || !selectedJob) return;
    
    setIsDeletingJob(true);
    setError(null);
    
    try {
      // Delete job
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', selectedJob.id);
      
      if (deleteError) throw deleteError;
      
      // Update local state
      setJobs(prev => prev.filter(job => job.id !== selectedJob.id));
      
      setShowDeleteModal(false);
      
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job. Please try again.');
    } finally {
      setIsDeletingJob(false);
      setSelectedJob(null);
    }
  };

  // Get technician names for a job
  const getTechnicianNames = (job: Job) => {
    if (!job.job_technicians || job.job_technicians.length === 0) {
      return 'No technicians assigned';
    }
    
    return job.job_technicians.map(jt => 
      `${jt.users.first_name} ${jt.users.last_name}`
    ).join(', ');
  };

  // Check if job is contract or non-contract
  const isContractJob = (job: Job) => {
    return job.service_contract !== 'Non-Contract';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Jobs</h1>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                view === 'list'
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                view === 'calendar'
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Calendar size={16} />
            </button>
          </div>
          <button className="btn btn-secondary">
            Export to Spreadsheet
          </button>
          <Link to="/jobs/create" className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Create Job
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label htmlFor="jobNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Job Number
            </label>
            <input
              type="text"
              id="jobNumber"
              name="jobNumber"
              value={filters.jobNumber}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="jobName" className="block text-sm font-medium text-gray-700 mb-1">
              Job Name
            </label>
            <input
              type="text"
              id="jobName"
              name="jobName"
              value={filters.jobName}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <select
              id="company"
              name="company"
              value={filters.company}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="">All Companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              id="location"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <select
              id="unit"
              name="unit"
              value={filters.unit}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="">All Units</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="All">All</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Unscheduled">Unscheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="All">All</option>
              {jobTypes.map(jobType => (
                <option key={jobType.id} value={jobType.name.toLowerCase()}>
                  {jobType.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dueFrom" className="block text-sm font-medium text-gray-700 mb-1">
              Due By: From
            </label>
            <input
              type="date"
              id="dueFrom"
              name="dueFrom"
              value={filters.dueFrom}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="dueTo" className="block text-sm font-medium text-gray-700 mb-1">
              Due By: To
            </label>
            <input
              type="date"
              id="dueTo"
              name="dueTo"
              value={filters.dueTo}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="scheduleFrom" className="block text-sm font-medium text-gray-700 mb-1">
              Schedule: From
            </label>
            <input
              type="date"
              id="scheduleFrom"
              name="scheduleFrom"
              value={filters.scheduleFrom}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="scheduleTo" className="block text-sm font-medium text-gray-700 mb-1">
              Schedule: To
            </label>
            <input
              type="date"
              id="scheduleTo"
              name="scheduleTo"
              value={filters.scheduleTo}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="showCompleted"
                checked={filters.showCompleted}
                onChange={handleFilterChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show Completed Jobs</span>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={resetFilters}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              Reset
            </button>
          </div>
        </div>

        {view === 'list' ? (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No jobs found. Try adjusting your filters or create a new job.
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-white border rounded-lg shadow-sm relative">
                  <button 
                    onClick={() => {
                      setSelectedJob(job);
                      setShowDeleteModal(true);
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-error-600 p-1 rounded-full hover:bg-gray-100"
                    title="Delete Job"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-500">Job #{job.number}</span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(job.status)}`}>
                            {job.status}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getTypeBadgeClass(job.type)}`}>
                            {job.type}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getContractBadgeClass(isContractJob(job))}`}>
                            {isContractJob(job) ? 'Contract' : 'Non-Contract'}
                          </span>
                          {job.quote_sent && (
                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getQuoteBadgeClass(job.quote_confirmed || false)}`}>
                              {job.quote_confirmed ? 'Quote Confirmed' : 'Quote Sent'}
                            </span>
                          )}
                          {job.is_training && (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              training
                            </span>
                          )}
                          {job.job_items && job.job_items.length > 0 && (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                              ${getJobTotalCost(job).toFixed(2)}
                            </span>
                          )}
                          {job.units && (
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Unit: {job.units.unit_number}
                            </span>
                          )}
                        </div>
                        <Link 
                          to={`/jobs/${job.id}`}
                          className="text-lg font-medium text-primary-600 hover:text-primary-800"
                        >
                          {job.name}
                        </Link>
                        {job.locations && (
                          <div className="text-sm text-gray-500">
                            <div className="font-medium text-gray-700">
                              {job.locations.companies?.name} • {job.locations.name}
                              {job.units && ` • Unit ${job.units.unit_number}`}
                            </div>
                            <div>
                              {job.locations.address} • {job.locations.city}, {job.locations.state}
                            </div>
                          </div>
                        )}
                        {job.job_technicians && job.job_technicians.length > 0 && (
                          <div className="text-sm text-gray-500 mt-1">
                            Technicians: {getTechnicianNames(job)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-right mr-6">
                          <div className="text-sm font-medium">
                            Start: {job.time_period_start}
                          </div>
                          <div className="text-sm text-gray-500">
                            Due: {job.time_period_due}
                          </div>
                          {job.schedule_start && (
                            <div className="text-sm text-gray-500">
                              Schedule: {formatDateTime(job.schedule_start)}
                              {job.schedule_duration && ` (${job.schedule_duration})`}
                            </div>
                          )}
                        </div>
                        
                        {/* Quick action buttons */}
                        <div className="mt-3 flex gap-2">
                          {job.status !== 'completed' && job.status !== 'cancelled' && (
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowCompleteModal(true);
                              }}
                            >
                              <CheckCircle size={14} className="mr-1" />
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-medium text-gray-900">Calendar View Coming Soon</h3>
            <p className="text-gray-500 mt-2">
              The calendar view is currently under development. Please check back later!
            </p>
          </div>
        )}
      </div>

      {/* Complete Job Confirmation Modal */}
      {showCompleteModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-success-600 mb-4">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Complete Job
            </h3>
            {error ? (
              <div className="text-center text-red-600 mb-4">
                {error}
              </div>
            ) : (
              <p className="text-center text-gray-600 mb-6">
                Are you sure you want to mark Job #{selectedJob.number} as completed? This will update the job status and notify relevant parties.
              </p>
            )}
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedJob(null);
                  setError(null);
                }}
                disabled={isCompletingJob}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success"
                onClick={handleCompleteJob}
                disabled={isCompletingJob}
              >
                {isCompletingJob ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Completing...
                  </>
                ) : (
                  'Complete Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Job Confirmation Modal */}
      {showDeleteModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Job
            </h3>
            {error ? (
              <div className="text-center text-red-600 mb-4">
                {error}
              </div>
            ) : (
              <p className="text-center text-gray-600 mb-6">
                Are you sure you want to delete Job #{selectedJob.number}? This action cannot be undone.
              </p>
            )}
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedJob(null);
                  setError(null);
                }}
                disabled={isDeletingJob}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteJob}
                disabled={isDeletingJob}
              >
                {isDeletingJob ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;