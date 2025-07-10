import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Calendar, List, ChevronLeft, ChevronRight, UserPlus, X, MapPin, Clock, Calendar as CalendarIcon, User, CheckCircle } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase';

type User = Database['public']['Tables']['users']['Row'];
type Technician = Database['public']['Tables']['technicians']['Row'];

type Job = Database['public']['Tables']['jobs']['Row'] & {
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  };
  units?: {
    unit_number: string;
  };
  job_technicians?: {
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
    };
  }[];
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
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [technicianJobs, setTechnicianJobs] = useState<{[key: string]: Date[]}>({}); // Store dates with jobs for each technician
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
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
      from: new Date().toISOString().split('T')[0],
      to: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
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
          .from('users')
          .select('*')
          .eq('role', 'technician')
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
              zip
            ),
            units (
              unit_number
            ),
            job_technicians (
              technician_id,
              is_primary,
              users:technician_id (
                first_name,
                last_name
              )
            ),
            job_items (
              total_cost
            )
          `)
          .gte('time_period_start', filters.dateRange.from)
          .lte('time_period_due', filters.dateRange.to);

        const { data, error } = await query;

        if (error) throw error;
        
        // Process jobs to add geocoded locations
        const jobsWithCoordinates = await Promise.all(data.map(async (job) => {
          if (job.locations) {
            const { lat, lng } = await geocodeAddress(
              `${job.locations.address}, ${job.locations.city}, ${job.locations.state} ${job.locations.zip}`
            );
            return {
              ...job,
              locations: {
                ...job.locations,
                lat,
                lng
              }
            };
          }
          return job;
        }));
        
        // Separate completed and non-completed jobs
        const completed = jobsWithCoordinates.filter(job => job.status === 'completed');
        const active = jobsWithCoordinates.filter(job => job.status !== 'completed');
        
        setJobs(active);
        setCompletedJobs(completed);
        
        // Update map markers
        if (map) {
          updateMapMarkers(active);
        }

        // Build a map of technician IDs to dates with jobs
        const techJobDates: {[key: string]: Date[]} = {};
        
        // Only include non-completed jobs for the dates
        active.forEach(job => {
          // Check the job_technicians array
          if (job.job_technicians && job.job_technicians.length > 0) {
            const technicianIds = job.job_technicians.map(jt => jt.technician_id);
            
            // For each technician, add the job date
            if (job.schedule_start) {
              const jobDate = new Date(job.schedule_start);
              
              technicianIds.forEach(techId => {
                if (!techJobDates[techId]) {
                  techJobDates[techId] = [];
                }
                
                // Only add the date if it's not already in the array
                if (!techJobDates[techId].some(d => 
                  d.getDate() === jobDate.getDate() && 
                  d.getMonth() === jobDate.getMonth() && 
                  d.getFullYear() === jobDate.getFullYear()
                )) {
                  techJobDates[techId].push(jobDate);
                }
              });
            }
          }
        });
        
        setTechnicianJobs(techJobDates);
      } catch (err) {
        console.error('Error fetching jobs:', err);
      }
    };

    fetchTechnicians();
    fetchJobs();
  }, [supabase, filters.dateRange]);

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places', 'routes'],
        });

        const google = await loader.load();
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: 33.7489954, lng: -84.3902397 },
            zoom: 10,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });
          
          setMap(mapInstance);
          
          // Add markers for jobs if we have them
          if (jobs.length > 0) {
            updateMapMarkers(jobs);
          }
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();
    
    return () => {
      // Clean up markers when component unmounts
      markers.forEach(marker => marker.setMap(null));
    };
  }, []);

  // Update map markers when date or selected technician changes
  useEffect(() => {
    if (map && jobs.length > 0) {
      // Filter jobs for the selected date and technician
      const filteredJobs = jobs.filter(job => {
        // Filter by technician if one is selected
        if (selectedTechnician) {
          // Check the job_technicians array
          const hasTechnician = job.job_technicians && 
            job.job_technicians.some(jt => jt.technician_id === selectedTechnician);
            
          if (!hasTechnician) {
            return false;
          }
        }
        
        // Filter by date
        if (job.schedule_start) {
          const jobDate = new Date(job.schedule_start);
          return (
            jobDate.getDate() === date.getDate() &&
            jobDate.getMonth() === date.getMonth() &&
            jobDate.getFullYear() === date.getFullYear()
          );
        }
        return false;
      });
      
      updateMapMarkers(filteredJobs);
    }
  }, [date, selectedTechnician, map, jobs]);

  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number}> => {
    // This is a mock geocoding function since we don't have a real geocoding service
    // In a real application, you would use Google's Geocoding API or similar
    
    // Generate a random point near Atlanta for demo purposes
    const atlantaLat = 33.7489954;
    const atlantaLng = -84.3902397;
    
    // Random offset within ~5 miles
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    
    return {
      lat: atlantaLat + latOffset,
      lng: atlantaLng + lngOffset
    };
  };

  const updateMapMarkers = (jobsToMark: Job[]) => {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    if (!map) return;
    
    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();
    
    jobsToMark.forEach(job => {
      if (job.locations?.lat && job.locations?.lng) {
        const position = { lat: job.locations.lat, lng: job.locations.lng };
        
        // Create marker
        const marker = new google.maps.Marker({
          position,
          map,
          title: job.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: getJobStatusColor(job.status),
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#FFFFFF',
            scale: 8
          }
        });
        
        // Create info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="max-width: 200px;">
              <h3 style="margin: 0; font-size: 14px; font-weight: 600;">${job.name}</h3>
              <p style="margin: 4px 0; font-size: 12px;">
                ${job.locations?.address}<br>
                ${job.locations?.city}, ${job.locations?.state} ${job.locations?.zip}
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Status:</strong> ${job.status}<br>
                <strong>Type:</strong> ${job.type}<br>
                ${job.schedule_start ? `<strong>Scheduled:</strong> ${formatDateTime(job.schedule_start)}<br>` : ''}
                ${job.job_technicians && job.job_technicians.length > 0 
                  ? `<strong>Technicians:</strong> ${job.job_technicians.map(jt => 
                      `${jt.users.first_name} ${jt.users.last_name}`).join(', ')}` 
                  : ''}
              </p>
              <a href="/jobs/${job.id}" style="color: #0672be; font-size: 12px; text-decoration: none;">View Job Details</a>
            </div>
          `
        });
        
        // Add click listener
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
        
        newMarkers.push(marker);
        bounds.extend(position);
      }
    });
    
    setMarkers(newMarkers);
    
    // Adjust map to fit all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);
      
      // Don't zoom in too far
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  };

  const getJobStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return '#3b82f6'; // blue
      case 'unscheduled':
        return '#f59e0b'; // amber
      case 'completed':
        return '#10b981'; // green
      case 'cancelled':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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
        from: new Date().toISOString().split('T')[0],
        to: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
      },
      showCompleted: false,
      showSubcontracted: false,
      limitByPrice: false
    });
  };

  // Filter jobs for the timeline
  const getJobsForTimeline = () => {
    const jobsToShow = showCompletedJobs ? [...jobs, ...completedJobs] : jobs;
    
    return jobsToShow.filter(job => {
      // Filter by technician if one is selected
      if (selectedTechnician) {
        // Check the job_technicians array
        const hasTechnician = job.job_technicians && 
          job.job_technicians.some(jt => jt.technician_id === selectedTechnician);
          
        if (!hasTechnician) {
          return false;
        }
      }
      
      // Only show jobs with schedule_start for the timeline
      if (!job.schedule_start) {
        return false;
      }
      
      // Check if job is scheduled for the selected date
      const jobDate = new Date(job.schedule_start);
      return (
        jobDate.getDate() === date.getDate() &&
        jobDate.getMonth() === date.getMonth() &&
        jobDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get unassigned jobs
  const getUnassignedJobs = () => {
    return jobs.filter(job => 
      (!job.job_technicians || job.job_technicians.length === 0) && 
      job.status !== 'completed' && 
      job.status !== 'cancelled'
    );
  };

  // Get jobs for a specific technician
  const getJobsForTechnician = (techId: string) => {
    return jobs.filter(job => {
      // Check the job_technicians array
      const hasTechnician = job.job_technicians && 
        job.job_technicians.some(jt => jt.technician_id === techId);
        
      return hasTechnician && job.status !== 'completed' && job.status !== 'cancelled';
    });
  };
  
  // Get completed jobs for a specific technician
  const getCompletedJobsForTechnician = (techId: string) => {
    return completedJobs.filter(job => {
      // Check the job_technicians array
      const hasTechnician = job.job_technicians && 
        job.job_technicians.some(jt => jt.technician_id === techId);
        
      return hasTechnician;
    });
  };

  // Calculate position and width for timeline job blocks
  const getTimelinePosition = (job: Job) => {
    if (!job.schedule_start) return null;
    
    const startTime = new Date(job.schedule_start);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    
    // Calculate duration in hours (default to 1 hour if not specified)
    let durationHours = 1;
    if (job.schedule_duration) {
      const durationMatch = job.schedule_duration.toString().match(/(\d+):(\d+)/);
      if (durationMatch) {
        durationHours = parseInt(durationMatch[1]) + parseInt(durationMatch[2]) / 60;
      }
    }
    
    // Timeline starts at 12 AM (0) and ends at 12 PM (24)
    const timelineStart = 0;
    const timelineEnd = 24;
    const timelineWidth = timelineEnd - timelineStart;
    
    // Calculate position and width as percentages
    const left = ((startHour - timelineStart) / timelineWidth) * 100;
    const width = (durationHours / timelineWidth) * 100;
    
    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(0, Math.min(100 - left, width))}%`
    };
  };

  // Handle clicking on a date in the technician's job dates list
  const handleDateClick = (selectedDate: Date) => {
    setDate(selectedDate);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Dispatch & Schedule</h1>
          <div className="flex items-center gap-2">
            <button 
              className="btn btn-secondary"
              onClick={() => setDate(new Date())}
            >
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
          {filters.showSubcontracted && (
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Subcontracted Jobs
            </span>
          )}
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showCompletedJobs"
                    checked={showCompletedJobs}
                    onChange={() => setShowCompletedJobs(!showCompletedJobs)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="showCompletedJobs" className="text-sm text-gray-500">
                    Show Completed
                  </label>
                </div>
                <Link to="/technicians/add" className="btn btn-primary btn-sm">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Tech
                </Link>
              </div>
            </div>

            {/* Unassigned Section */}
            <div className="mb-4">
              <div 
                className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer ${
                  selectedTechnician === null ? 'bg-gray-100' : ''
                }`}
                onClick={() => setSelectedTechnician(null)}
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">U</span>
                </div>
                <div>
                  <div className="font-medium">Unassigned</div>
                  <div className="text-xs text-gray-500">{getUnassignedJobs().length} jobs</div>
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
                filteredTechnicians.map(tech => {
                  const techJobs = getJobsForTechnician(tech.id);
                  const completedTechJobs = getCompletedJobsForTechnician(tech.id);
                  const jobDates = technicianJobs[tech.id] || [];
                  
                  return (
                    <div key={tech.id}>
                      <div 
                        className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer ${
                          selectedTechnician === tech.id ? 'bg-gray-100' : ''
                        }`}
                        onClick={() => setSelectedTechnician(tech.id)}
                      >
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {getInitials(tech.first_name, tech.last_name)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{`${tech.first_name} ${tech.last_name}`}</div>
                          <div className="text-xs text-gray-500">
                            {tech.role === 'technician' ? 'technician' : tech.role} • {techJobs.length} jobs
                            {showCompletedJobs && completedTechJobs.length > 0 && ` • ${completedTechJobs.length} completed`}
                          </div>
                        </div>
                      </div>
                      
                      {/* Show job dates when technician is selected */}
                      {selectedTechnician === tech.id && jobDates.length > 0 && (
                        <div className="ml-10 mt-2 mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-1">Scheduled Dates:</div>
                          <div className="space-y-1">
                            {jobDates.map((jobDate, index) => (
                              <div 
                                key={index}
                                className={`text-xs p-1 rounded cursor-pointer ${
                                  jobDate.getDate() === date.getDate() && 
                                  jobDate.getMonth() === date.getMonth() && 
                                  jobDate.getFullYear() === date.getFullYear()
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'hover:bg-gray-100'
                                }`}
                                onClick={() => handleDateClick(jobDate)}
                              >
                                {jobDate.toLocaleDateString()}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show completed jobs when technician is selected and showCompletedJobs is true */}
                      {selectedTechnician === tech.id && showCompletedJobs && completedTechJobs.length > 0 && (
                        <div className="ml-10 mt-2 mb-4">
                          <div className="text-xs font-medium text-gray-500 mb-1">Completed Jobs:</div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {completedTechJobs.map(job => (
                              <Link 
                                key={job.id}
                                to={`/jobs/${job.id}`}
                                className="text-xs p-1 rounded hover:bg-gray-100 flex items-center gap-1"
                              >
                                <CheckCircle size={12} className="text-success-500" />
                                <span className="truncate">{job.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Map and Timeline */}
        <div className="flex flex-col">
          {/* Map */}
          <div className="h-1/2 bg-gray-100 relative">
            <div className="absolute inset-0 flex">
              <div className="flex-1">
                <div id="map" ref={mapRef} className="h-full w-full"></div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-1/2 bg-white border-t border-gray-200 overflow-x-auto">
            <div className="relative min-w-[1200px]">
              {/* Time labels */}
              <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                <div className="w-[200px] border-r border-gray-200 p-2 text-sm font-medium text-gray-500">
                  Technician
                </div>
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex-1 border-r border-gray-200 p-2 text-sm text-gray-500 text-center">
                    {`${i % 12 || 12}:00 ${i < 12 ? 'AM' : 'PM'}`}
                  </div>
                ))}
              </div>
              
              {/* Unassigned row */}
              <div className="flex border-b border-gray-200 hover:bg-gray-50">
                <div className="w-[200px] border-r border-gray-200 p-2 flex items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                    <span className="text-gray-600 text-sm">U</span>
                  </div>
                  <div>
                    <div className="font-medium">Unassigned</div>
                    <div className="text-xs text-gray-500">{getUnassignedJobs().length} jobs</div>
                  </div>
                </div>
                <div className="flex-1 relative h-16">
                  {/* This is where unassigned jobs would be displayed */}
                </div>
              </div>
              
              {/* Technician rows */}
              {filteredTechnicians.map(tech => (
                <div key={tech.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                  <div className="w-[200px] border-r border-gray-200 p-2 flex items-center">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-2">
                      <span className="text-sm font-medium">
                        {getInitials(tech.first_name, tech.last_name)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{`${tech.first_name} ${tech.last_name}`}</div>
                      <div className="text-xs text-gray-500">{tech.role === 'technician' ? 'technician' : tech.role}</div>
                    </div>
                  </div>
                  <div className="flex-1 relative h-16">
                    {getJobsForTimeline()
                      .filter(job => {
                        // Check the job_technicians array
                        return job.job_technicians && 
                          job.job_technicians.some(jt => jt.technician_id === tech.id);
                      })
                      .map(job => {
                        const position = getTimelinePosition(job);
                        if (!position) return null;
                        
                        return (
                          <Link
                            key={job.id}
                            to={`/jobs/${job.id}`}
                            className={`absolute top-2 h-12 rounded-md p-1 text-xs text-white overflow-hidden ${
                              job.status === 'completed' ? 'bg-green-500' : 
                              job.status === 'cancelled' ? 'bg-red-500' : 
                              'bg-blue-500'
                            }`}
                            style={{
                              left: position.left,
                              width: position.width,
                              minWidth: '80px'
                            }}
                          >
                            <div className="font-medium truncate">{job.name}</div>
                            <div className="truncate">
                              {job.locations?.name || 'No location'} {job.units ? `- ${job.units.unit_number}` : ''}
                            </div>
                          </Link>
                        );
                      })}
                  </div>
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

            <div className="p-4 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 65px - 73px)' }}>
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
                  <option>Installation</option>
                  <option>Repair</option>
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