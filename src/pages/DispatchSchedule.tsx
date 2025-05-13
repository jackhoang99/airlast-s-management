import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Calendar, List, ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { useSupabase } from '../lib/supabase-context';

type Technician = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  job_title: string;
};

type MapFilters = {
  tags: string[];
  office: string;
  jobType: string;
  jobOwner: string;
  serviceLine: string;
  region: string;
  filterMapBy: string;
  filterDateRangeBy: string;
  dateRange: {
    from: string;
    to: string;
  };
  showCompleted: boolean;
  showSubcontracted: boolean;
  limitByPrice: boolean;
};

const DispatchSchedule = () => {
  const { supabase } = useSupabase();
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [date, setDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({
    tags: [],
    office: 'All Offices',
    jobType: 'All Job Types',
    jobOwner: 'All Job Owners',
    serviceLine: 'All Service Lines',
    region: 'All Regions',
    filterMapBy: 'Due By Date',
    filterDateRangeBy: 'This Month',
    dateRange: {
      from: '05/01/25',
      to: '05/31/25'
    },
    showCompleted: false,
    showSubcontracted: false,
    limitByPrice: false
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('technicians')
          .select('*')
          .eq('status', 'active')
          .order('first_name');

        if (error) throw error;
        setTechnicians(data || []);
      } catch (err) {
        console.error('Error fetching technicians:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTechnicians();
  }, [supabase]);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: 'weekly',
      });

      const google = await loader.load();
      const mapElement = document.getElementById('map');
      
      if (mapElement) {
        const map = new google.maps.Map(mapElement, {
          center: { lat: 33.7489954, lng: -84.3902397 },
          zoom: 12,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });
        setMap(map);
      }
    };

    initMap();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const handlePrevDay = () => {
    setDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 1);
      return newDate;
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const filteredTechnicians = technicians.filter(tech => {
    const fullName = `${tech.first_name} ${tech.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const handleApplyFilters = () => {
    setShowFilters(false);
    // Apply filters logic here
  };

  const handleClearFilters = () => {
    setFilters({
      tags: [],
      office: 'All Offices',
      jobType: 'All Job Types',
      jobOwner: 'All Job Owners',
      serviceLine: 'All Service Lines',
      region: 'All Regions',
      filterMapBy: 'Due By Date',
      filterDateRangeBy: 'This Month',
      dateRange: {
        from: '05/01/25',
        to: '05/31/25'
      },
      showCompleted: false,
      showSubcontracted: false,
      limitByPrice: false
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Dispatch & Schedule</h1>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary">
              <Calendar className="h-4 w-4 mr-2" />
              Today
            </button>
            <Link to="/jobs/create" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                view === 'day'
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 text-sm font-medium border-t border-b ${
                view === 'week'
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                view === 'month'
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrevDay} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium">{formatDate(date)}</span>
            <button onClick={handleNextDay} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Tech Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 input w-64"
              />
            </div>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Map Filters
            </button>
          </div>
        </div>

        {/* Applied Filters */}
        <div className="flex items-center gap-2 mt-4 text-sm">
          <span className="text-gray-500">Applied map filters:</span>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            Jobs Due By This Month
          </span>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            Main Office
          </span>
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            Subcontracted Jobs
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[300px,1fr] overflow-hidden">
        {/* Left Sidebar - Technician List */}
        <div className="border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Main Office</h2>
              <div className="flex items-center gap-2">
                <button className="text-sm text-gray-500">
                  Hide Unassigned Jobs
                </button>
                <Link to="/technicians/add" className="btn btn-primary btn-sm">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Tech
                </Link>
              </div>
            </div>

            {/* Unassigned Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">U</span>
                </div>
                <div>
                  <div className="font-medium">Unassigned</div>
                </div>
              </div>
            </div>

            {/* Technicians List */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredTechnicians.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No technicians found
                </div>
              ) : (
                filteredTechnicians.map(tech => (
                  <div key={tech.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {getInitials(tech.first_name, tech.last_name)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{`${tech.first_name} ${tech.last_name}`}</div>
                      <div className="text-sm text-gray-500">{tech.job_title}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Map and Timeline */}
        <div className="flex flex-col">
          {/* Map */}
          <div className="h-1/2 bg-gray-100 relative">
            <div id="map" className="absolute inset-0"></div>
          </div>

          {/* Timeline */}
          <div className="h-1/2 bg-white border-t border-gray-200 overflow-x-auto">
            <div className="flex">
              {/* Time labels */}
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="flex-none w-32 border-r border-gray-200 p-2 text-sm text-gray-500">
                  {`${(i + 6) % 12 || 12}:00 ${i + 6 < 12 ? 'AM' : 'PM'}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium">Map Filters</h2>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="Select Tags"
                  className="input"
                />
              </div>

              {/* Job Office */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Office
                </label>
                <select 
                  value={filters.office}
                  onChange={(e) => setFilters(prev => ({ ...prev, office: e.target.value }))}
                  className="select"
                >
                  <option>All Offices</option>
                  <option>Main Office</option>
                  <option>Branch Office</option>
                </select>
              </div>

              {/* Job Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select 
                  value={filters.jobType}
                  onChange={(e) => setFilters(prev => ({ ...prev, jobType: e.target.value }))}
                  className="select"
                >
                  <option>All Job Types</option>
                  <option>Service Call</option>
                  <option>Maintenance</option>
                </select>
              </div>

              {/* Job Owner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Owner
                </label>
                <select 
                  value={filters.jobOwner}
                  onChange={(e) => setFilters(prev => ({ ...prev, jobOwner: e.target.value }))}
                  className="select"
                >
                  <option>All Job Owners</option>
                  <option>Airlast Inc. (Demo)</option>
                  <option>Jane Tech</option>
                  <option>John Tech</option>
                  <option>ServiceTrade Support User...</option>
                </select>
              </div>

              {/* Service Line */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Line
                </label>
                <select 
                  value={filters.serviceLine}
                  onChange={(e) => setFilters(prev => ({ ...prev, serviceLine: e.target.value }))}
                  className="select"
                >
                  <option>All Service Lines</option>
                  <option>HVAC</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select 
                  value={filters.region}
                  onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                  className="select"
                >
                  <option>All Regions</option>
                  <option>North</option>
                  <option>South</option>
                  <option>East</option>
                  <option>West</option>
                </select>
              </div>

              {/* Filter Map By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Map By
                </label>
                <select 
                  value={filters.filterMapBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, filterMapBy: e.target.value }))}
                  className="select"
                >
                  <option>Due By Date</option>
                  <option>Schedule Date</option>
                  <option>Created Date</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Date Range By
                </label>
                <select 
                  value={filters.filterDateRangeBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, filterDateRangeBy: e.target.value }))}
                  className="select mb-2"
                >
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>Next Month</option>
                  <option>Custom Range</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.dateRange.from}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, from: e.target.value }
                      }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.dateRange.to}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, to: e.target.value }
                      }))}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Limit by Estimated Price
                  </label>
                  <button 
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      filters.limitByPrice ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    onClick={() => setFilters(prev => ({ ...prev, limitByPrice: !prev.limitByPrice }))}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      filters.limitByPrice ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Show completed jobs
                  </label>
                  <button 
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      filters.showCompleted ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    onClick={() => setFilters(prev => ({ ...prev, showCompleted: !prev.showCompleted }))}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      filters.showCompleted ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Show subcontracted jobs
                  </label>
                  <button 
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      filters.showSubcontracted ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                    onClick={() => setFilters(prev => ({ ...prev, showSubcontracted: !prev.showSubcontracted }))}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      filters.showSubcontracted ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
              <div className="flex justify-between gap-4">
                <button
                  onClick={handleClearFilters}
                  className="btn btn-secondary flex-1"
                >
                  Clear all filters
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="btn btn-primary flex-1"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchSchedule;