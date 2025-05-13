import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Filter, Plus, Calendar, List } from 'lucide-react';

type Job = {
  id: string;
  number: string;
  name: string;
  status: 'scheduled' | 'unscheduled' | 'completed';
  type: 'preventative maintenance' | 'service call';
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  schedule: {
    start: string;
    duration: string;
  };
  cost?: number;
  invoiced?: boolean;
  training?: boolean;
  timePeriod: {
    start: string;
    due: string;
  };
};

const Jobs = () => {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filters, setFilters] = useState({
    jobNumber: '',
    jobName: '',
    company: '',
    location: '',
    owner: '',
    technician: 'All',
    status: 'All',
    type: 'All',
    dueFrom: '',
    dueTo: '',
    scheduleFrom: '',
    scheduleTo: '',
    showSubcontracted: false,
  });

  const mockJobs: Job[] = [
    {
      id: '40753953',
      number: '0001',
      name: 'NAME OF MALL',
      status: 'scheduled',
      type: 'preventative maintenance',
      location: {
        name: 'NAME OF MALL',
        address: '1030 Grant Street Southeast',
        city: 'Atlanta',
        state: 'GA'
      },
      schedule: {
        start: '05/03/2025 08:00 AM EDT',
        duration: '1.00 hour'
      },
      timePeriod: {
        start: '05/01/2025',
        due: '05/31/2025'
      }
    },
    {
      id: '40751566',
      number: '0002',
      name: 'Plomeek & Gespar',
      status: 'unscheduled',
      type: 'preventative maintenance',
      location: {
        name: 'Plomeek & Gespar',
        address: '3500 John A Merrit Blvd',
        city: 'Nashville',
        state: 'TN'
      },
      schedule: {
        start: '05/01/2025',
        duration: ''
      },
      cost: 500,
      training: true,
      timePeriod: {
        start: '05/01/2025',
        due: '05/31/2025'
      }
    },
    {
      id: '40529020',
      number: '0003',
      name: 'Grant Street Suite 2',
      status: 'completed',
      type: 'service call',
      location: {
        name: 'Grant Street Suite 2',
        address: '1030 Grant Street Southeast',
        city: 'Atlanta',
        state: 'GA'
      },
      schedule: {
        start: '04/24/2025 08:00 AM EDT',
        duration: '1.00 hour'
      },
      invoiced: true,
      timePeriod: {
        start: '04/24/2025',
        due: '04/24/2025'
      }
    },
    {
      id: '40528942',
      number: '0004',
      name: 'Grant Street Suite 7',
      status: 'scheduled',
      type: 'service call',
      location: {
        name: 'Grant Street Suite 7',
        address: '1030 Grant Street SE',
        city: 'Atlanta',
        state: 'GA'
      },
      schedule: {
        start: '04/24/2025 08:00 AM EDT',
        duration: '1.00 hour'
      },
      cost: 180,
      timePeriod: {
        start: '04/24/2025',
        due: '04/24/2025'
      }
    }
  ];

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
      owner: '',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'unscheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preventative maintenance':
        return 'bg-purple-100 text-purple-800';
      case 'service call':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredJobs = mockJobs.filter(job => {
    // Job Number filter
    if (filters.jobNumber && !job.number.toLowerCase().includes(filters.jobNumber.toLowerCase())) {
      return false;
    }

    // Job Name filter
    if (filters.jobName && !job.name.toLowerCase().includes(filters.jobName.toLowerCase())) {
      return false;
    }

    // Location filter
    if (filters.location && !job.location.name.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status !== 'All' && job.status !== filters.status.toLowerCase()) {
      return false;
    }

    // Type filter
    if (filters.type !== 'All' && job.type !== filters.type.toLowerCase()) {
      return false;
    }

    // Due date range filter
    if (filters.dueFrom && new Date(job.timePeriod.due) < new Date(filters.dueFrom)) {
      return false;
    }
    if (filters.dueTo && new Date(job.timePeriod.due) > new Date(filters.dueTo)) {
      return false;
    }

    // Schedule date range filter
    if (filters.scheduleFrom && new Date(job.schedule.start) < new Date(filters.scheduleFrom)) {
      return false;
    }
    if (filters.scheduleTo && new Date(job.schedule.start) > new Date(filters.scheduleTo)) {
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
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
              Owner
            </label>
            <input
              type="text"
              id="owner"
              name="owner"
              value={filters.owner}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="technician" className="block text-sm font-medium text-gray-700 mb-1">
              Technician
            </label>
            <select
              id="technician"
              name="technician"
              value={filters.technician}
              onChange={handleFilterChange}
              className="select"
            >
              <option value="All">All</option>
              <option value="Jane">Jane Tech</option>
              <option value="John">John Tech</option>
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
              <option value="Preventative Maintenance">Preventative Maintenance</option>
              <option value="Service Call">Service Call</option>
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
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white border rounded-lg shadow-sm">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">Job #{job.number}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getTypeColor(job.type)}`}>
                          {job.type}
                        </span>
                        {job.cost && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                            ${job.cost}
                          </span>
                        )}
                        {job.invoiced && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            invoiced
                          </span>
                        )}
                        {job.training && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            training
                          </span>
                        )}
                      </div>
                      <Link 
                        to={`/jobs/${job.id}`}
                        className="text-lg font-medium text-primary-600 hover:text-primary-800"
                      >
                        {job.name}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {job.location.address} • {job.location.city}, {job.location.state}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Start: {job.timePeriod.start}
                      </div>
                      <div className="text-sm text-gray-500">
                        Due: {job.timePeriod.due}
                      </div>
                      {job.schedule.start && (
                        <div className="text-sm text-gray-500">
                          Schedule: {job.schedule.start}
                          {job.schedule.duration && ` (${job.schedule.duration})`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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