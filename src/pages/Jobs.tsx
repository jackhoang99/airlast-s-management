import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';
import { ArrowLeft, Filter, Plus, Calendar, List } from 'lucide-react';

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
  users?: {
    first_name: string;
    last_name: string;
  };
  job_items?: {
    total_cost: number;
  }[];
  units?: {
    unit_number: string;
  };
};

const Jobs = () => {
  const { supabase } = useSupabase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState({
    jobNumber: '',
    jobName: '',
    company: '',
    location: '',
    technician: 'All',
    status: 'All',
    type: 'All',
    dueFrom: '',
    dueTo: '',
    scheduleFrom: '',
    scheduleTo: '',
    showSubcontracted: false,
  });

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
            users:technician_id (
              first_name,
              last_name
            ),
            job_items (
              total_cost
            ),
            units (
              unit_number
            )
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.jobNumber) {
          query = query.ilike('number', `%${filters.jobNumber}%`);
        }
        if (filters.jobName) {
          query = query.ilike('name', `%${filters.jobName}%`);
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

        const { data, error } = await query;

        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [supabase, filters]);

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
      technician: 'All',
      status: 'All',
      type: 'All',
      dueFrom: '',
      dueTo: '',
      scheduleFrom: '',
      scheduleTo: '',
      showSubcontracted: false,
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

  // Calculate total cost from job items
  const getJobTotalCost = (job: Job) => {
    if (!job.job_items || job.job_items.length === 0) return 0;
    return job.job_items.reduce((sum, item) => sum + Number(item.total_cost), 0);
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
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                view === 'calendar'
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Calendar className="h-4 w-4" />
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
              <option value="preventative maintenance">Preventative Maintenance</option>
              <option value="service call">Service Call</option>
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
                name="showSubcontracted"
                checked={filters.showSubcontracted}
                onChange={handleFilterChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show only Subcontracted</span>
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
                <div key={job.id} className="bg-white border rounded-lg shadow-sm">
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
                            {job.locations.address} • {job.locations.city}, {job.locations.state}
                          </div>
                        )}
                        {job.users && (
                          <div className="text-sm text-gray-500 mt-1">
                            Technician: {job.users.first_name} {job.users.last_name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Calendar View Coming Soon</h3>
            <p className="text-gray-500 mt-2">
              The calendar view is currently under development. Please check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;