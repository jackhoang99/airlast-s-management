import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Briefcase, Search, Filter, MapPin, Clock, CheckSquare, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const TechnicianJobs = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianUsername, setTechnicianUsername] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;
      
      try {
        // Get username from session storage
        const username = sessionStorage.getItem('techUsername');
        setTechnicianUsername(username);
        
        if (username) {
          console.log("Looking up technician with username:", username);
          
          // Try to find user by username
          const { data, error } = await supabase
            .from('users')
            .select('id, role')
            .eq('username', username)
            .eq('role', 'technician')
            .single();
            
          if (error) {
            console.error('Error fetching technician by username:', error);
            // Try with email format
            const email = `${username}@airlast-demo.com`;
            console.log("Trying with email:", email);
            
            const { data: emailData, error: emailError } = await supabase
              .from('users')
              .select('id, role')
              .eq('email', email)
              .eq('role', 'technician')
              .single();
              
            if (emailError) {
              console.error('Error fetching technician by email:', emailError);
              throw new Error('Could not find technician record');
            }
            
            if (emailData) {
              console.log("Found technician by email:", emailData);
              setTechnicianId(emailData.id);
            }
          } else if (data) {
            console.log("Found technician by username:", data);
            setTechnicianId(data.id);
          }
        } else {
          // Fallback to auth user if username not in session
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            console.log("Looking up technician with auth user:", user.email);
            
            // Try to find by email
            const { data, error } = await supabase
              .from('users')
              .select('id, username, role')
              .eq('email', user.email)
              .eq('role', 'technician')
              .single();
              
            if (error) {
              console.error('Error fetching technician by email:', error);
              
              // Try with username from email
              const username = user.email.split('@')[0];
              console.log("Trying with username from email:", username);
              
              const { data: usernameData, error: usernameError } = await supabase
                .from('users')
                .select('id, role')
                .eq('username', username)
                .eq('role', 'technician')
                .single();
                
              if (usernameError) {
                console.error('Error fetching technician by username from email:', usernameError);
                throw new Error('Could not find technician record');
              }
              
              if (usernameData) {
                console.log("Found technician by username from email:", usernameData);
                setTechnicianId(usernameData.id);
                setTechnicianUsername(username);
                sessionStorage.setItem('techUsername', username);
              }
            } else if (data) {
              console.log("Found technician by email:", data);
              setTechnicianId(data.id);
              setTechnicianUsername(data.username);
              sessionStorage.setItem('techUsername', data.username);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching technician info:', err);
        setError('Failed to load technician information. Please try logging in again.');
      }
    };
    
    fetchTechnicianInfo();
  }, [supabase]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!supabase || !technicianId) return;
      
      try {
        setIsLoading(true);
        console.log("Fetching jobs for technician ID:", technicianId);
        
        // Fetch jobs assigned to this technician
        const { data: jobTechData, error: jobTechError } = await supabase
          .from('job_technicians')
          .select('job_id')
          .eq('technician_id', technicianId);
          
        if (jobTechError) {
          console.error('Error fetching job_technicians:', jobTechError);
          throw jobTechError;
        }
        
        console.log("Found job assignments:", jobTechData);
        const jobIds = jobTechData.map(jt => jt.job_id);
        
        if (jobIds.length === 0) {
          console.log("No jobs assigned to this technician");
          setJobs([]);
          setIsLoading(false);
          return;
        }
        
        // Build query for jobs
        let query = supabase
          .from('jobs')
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              zip
            ),
            units (
              unit_number
            )
          `)
          .in('id', jobIds);
          
        // Apply status filter if not 'all'
        if (filterStatus !== 'all') {
          query = query.eq('status', filterStatus);
        }
        
        // Apply type filter if not 'all'
        if (filterType !== 'all') {
          query = query.eq('type', filterType);
        }
        
        // Apply date range filter
        if (filterDateRange !== 'all') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (filterDateRange === 'today') {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query.gte('schedule_start', today.toISOString())
                         .lt('schedule_start', tomorrow.toISOString());
          } else if (filterDateRange === 'week') {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            query = query.gte('schedule_start', today.toISOString())
                         .lt('schedule_start', nextWeek.toISOString());
          } else if (filterDateRange === 'month') {
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            query = query.gte('schedule_start', today.toISOString())
                         .lt('schedule_start', nextMonth.toISOString());
          }
        }
        
        // Order by selected field
        if (sortBy === 'date') {
          query = query.order('schedule_start', { ascending: sortDirection === 'asc' });
        } else if (sortBy === 'name') {
          query = query.order('name', { ascending: sortDirection === 'asc' });
        } else if (sortBy === 'status') {
          query = query.order('status', { ascending: sortDirection === 'asc' });
        }
        
        const { data: jobsData, error: jobsError } = await query;
          
        if (jobsError) {
          console.error('Error fetching jobs:', jobsError);
          throw jobsError;
        }
        
        console.log("Found jobs:", jobsData);
        setJobs(jobsData || []);
        
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load job information');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (technicianId) {
      fetchJobs();
    }
  }, [supabase, technicianId, filterStatus, filterType, filterDateRange, sortBy, sortDirection]);

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Unscheduled';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const filteredJobs = jobs.filter(job => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.number.toLowerCase().includes(searchLower) ||
      (job.locations?.name && job.locations.name.toLowerCase().includes(searchLower)) ||
      (job.locations?.address && job.locations.address.toLowerCase().includes(searchLower)) ||
      (job.locations?.city && job.locations.city.toLowerCase().includes(searchLower))
    );
  });

  const toggleSort = (field: 'date' | 'name' | 'status') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'date' | 'name' | 'status') => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center">
          <Briefcase className="h-6 w-6 mr-2" />
          My Jobs
        </h1>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            Filter
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="select w-full"
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="unscheduled">Unscheduled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="select w-full"
                >
                  <option value="all">All Types</option>
                  <option value="preventative maintenance">Preventative Maintenance</option>
                  <option value="service call">Service Call</option>
                  <option value="inspection">Inspection</option>
                  <option value="repair">Repair</option>
                  <option value="installation">Installation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  className="select w-full"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Sort by:
                <button 
                  onClick={() => toggleSort('date')}
                  className={`ml-2 px-2 py-1 rounded ${sortBy === 'date' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}
                >
                  Date {getSortIcon('date')}
                </button>
                <button 
                  onClick={() => toggleSort('name')}
                  className={`ml-2 px-2 py-1 rounded ${sortBy === 'name' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}
                >
                  Name {getSortIcon('name')}
                </button>
                <button 
                  onClick={() => toggleSort('status')}
                  className={`ml-2 px-2 py-1 rounded ${sortBy === 'status' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}
                >
                  Status {getSortIcon('status')}
                </button>
              </div>
              
              <button 
                onClick={() => {
                  setFilterStatus('all');
                  setFilterType('all');
                  setFilterDateRange('all');
                  setSortBy('date');
                  setSortDirection('asc');
                }}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-500">
            {searchTerm 
              ? "Try adjusting your search terms" 
              : filterStatus !== 'all' || filterType !== 'all' || filterDateRange !== 'all'
                ? "Try adjusting your filters" 
                : technicianUsername 
                  ? `No jobs are currently assigned to ${technicianUsername}` 
                  : "You don't have any jobs assigned yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {filteredJobs.map(job => (
            <Link 
              key={job.id} 
              to={`/tech/jobs/${job.id}`}
              className="block p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <h3 className="font-medium text-gray-900">{job.name}</h3>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full
                      ${job.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                        job.status === 'unscheduled' ? 'bg-yellow-100 text-yellow-800' : 
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Job #{job.number} • {job.type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {job.locations?.name}
                    {job.units ? ` • Unit ${job.units.unit_number}` : ''}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <MapPin size={12} className="mr-1" />
                    <span>
                      {job.locations?.address}, {job.locations?.city}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {job.status === 'completed' ? (
                    <div className="flex items-center text-xs text-success-600">
                      <CheckSquare size={14} className="mr-1" />
                      Completed
                    </div>
                  ) : job.schedule_start ? (
                    <>
                      <div className="flex items-center text-sm font-medium text-primary-600">
                        <Calendar size={14} className="mr-1" />
                        {formatDate(job.schedule_start)}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock size={12} className="mr-1" />
                        {formatTime(job.schedule_start)}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Unscheduled
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TechnicianJobs;