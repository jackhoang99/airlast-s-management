import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { 
  ArrowLeft, 
  Award, 
  Search, 
  Filter, 
  AlertTriangle, 
  Truck,
  MapPin,
  Wrench,
  Clock,
  Calendar,
  CheckCircle,
  DollarSign,
  Info,
} from 'lucide-react';

const TechScorecard = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    period: 'week',
    office: 'all',
    sortBy: 'totalTime',
  });
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // Calculate date range based on selected period
  const getDateRange = () => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date(today);
    
    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(today.getDate() - 6); // Last 7 days
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 6);
    }
    
    return { startDate, endDate };
  };

  // Format date range for display
  const formatDateRange = () => {
    const { startDate, endDate } = getDateRange();
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      });
    };
    
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  };

  useEffect(() => {
    const fetchTechnicianData = async () => {
      if (!supabase) return;

      try {
        setIsLoading(true);

        // Fetch technicians with their job performance data
        const { data: techData, error: techError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            office_id
          `)
          .eq('role', 'technician')
          .eq('status', 'active')
          .order('first_name');

        if (techError) throw techError;

        // For each technician, calculate their performance metrics
        const techniciansWithMetrics = await Promise.all(
          (techData || []).map(async (tech) => {
            const { startDate, endDate } = getDateRange();
            
            // Get jobs assigned to this technician
            const { data: jobTechData, error: jobTechError } = await supabase
              .from('job_technicians')
              .select('job_id')
              .eq('technician_id', tech.id);

            if (jobTechError) {
              console.error('Error fetching job assignments:', jobTechError);
              return { ...tech, metrics: getDefaultMetrics() };
            }

            const jobIds = jobTechData?.map(jt => jt.job_id) || [];

            if (jobIds.length === 0) {
              return { ...tech, metrics: getDefaultMetrics() };
            }

            // Get clock events for time tracking
            const { data: clockEvents, error: clockError } = await supabase
              .from('job_clock_events')
              .select('*')
              .gte('event_time', startDate.toISOString())
              .lte('event_time', endDate.toISOString())
              .eq('user_id', tech.id)
              .in('job_id', jobIds)
              .order('event_time');

            if (clockError) {
              console.error('Error fetching clock events:', clockError);
              return { ...tech, metrics: getDefaultMetrics() };
            }

            // Get job data for appointments and revenue
            const { data: jobsData, error: jobsError } = await supabase
              .from('jobs')
              .select(`
                *,
                job_items (
                  total_cost
                )
              `)
              .gte('updated_at', startDate.toISOString())
              .lte('updated_at', endDate.toISOString())
              .in('id', jobIds);

            if (jobsError) {
              console.error('Error fetching jobs data:', jobsError);
              return { ...tech, metrics: getDefaultMetrics() };
            }

            // Calculate metrics
            const metrics = calculateMetrics(clockEvents || [], jobsData || []);
            return {
              ...tech,
              metrics,
            };
          })
        );

        // Sort by total time
        const sortedTechnicians = techniciansWithMetrics.sort((a, b) => 
          b.metrics.totalTime - a.metrics.totalTime
        );

        setTechnicians(sortedTechnicians);

      } catch (err) {
        console.error('Error fetching technician data:', err);
        setError('Failed to load technician scorecard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTechnicianData();
  }, [supabase, selectedPeriod]);

  const getDefaultMetrics = () => ({
    enRouteTime: 0,
    enRoutePercentage: 0,
    onsiteTime: 0,
    onsitePercentage: 0,
    totalTime: 0,
    onsiteAppointments: 0,
    lateAppointments: 0,
    missedAppointments: 0,
    revenue: 0,
  });

  const calculateMetrics = (clockEvents: any[], jobsData: any[]) => {
    // Group events by job
    const jobEvents: Record<string, any[]> = {};
    clockEvents.forEach(event => {
      if (!jobEvents[event.job_id]) {
        jobEvents[event.job_id] = [];
      }
      jobEvents[event.job_id].push(event);
    });

    let totalEnRouteTime = 0;
    let totalOnsiteTime = 0;

    // Calculate time for each job
    Object.values(jobEvents).forEach((events: any[]) => {
      events.sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
      
      let clockInTime: Date | null = null;
      
      events.forEach(event => {
        const eventTime = new Date(event.event_time);
        
        if (event.event_type === 'clock_in') {
          clockInTime = eventTime;
        } else if (event.event_type === 'clock_out' && clockInTime) {
          const duration = eventTime.getTime() - clockInTime.getTime();
          // Distribute time: 30% en route, 70% onsite
          totalEnRouteTime += duration * 0.3;
          totalOnsiteTime += duration * 0.7;
          clockInTime = null;
        } else if (event.event_type === 'break_start' && clockInTime) {
          const duration = eventTime.getTime() - clockInTime.getTime();
          totalEnRouteTime += duration * 0.3;
          totalOnsiteTime += duration * 0.7;
        } else if (event.event_type === 'break_end') {
          clockInTime = eventTime;
        }
      });
    });

    // Convert milliseconds to hours
    const enRouteTime = totalEnRouteTime / (1000 * 60 * 60);
    const onsiteTime = totalOnsiteTime / (1000 * 60 * 60);
    const totalTime = enRouteTime + onsiteTime;

    // Calculate percentages
    const enRoutePercentage = totalTime > 0 ? (enRouteTime / totalTime) * 100 : 0;
    const onsitePercentage = totalTime > 0 ? (onsiteTime / totalTime) * 100 : 0;

    // Calculate appointment metrics
    const scheduledJobs = jobsData.filter(job => job.status === 'scheduled').length;
    const completedJobs = jobsData.filter(job => job.status === 'completed').length;
    const lateJobs = 0; // Would need additional logic to determine lateness
    const missedJobs = jobsData.filter(job => job.status === 'cancelled').length;

    // Calculate revenue from completed jobs
    const revenue = jobsData
      .filter(job => job.status === 'completed')
      .reduce((total, job) => {
        const jobRevenue = (job.job_items || []).reduce((sum: number, item: any) => 
          sum + Number(item.total_cost || 0), 0
        );
        return total + jobRevenue;
      }, 0);

    return {
      enRouteTime,
      enRoutePercentage,
      onsiteTime,
      onsitePercentage,
      totalTime,
      onsiteAppointments: scheduledJobs,
      lateAppointments: lateJobs,
      missedAppointments: missedJobs,
      revenue,
    };
  };

  const filteredTechnicians = technicians.filter(tech => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      tech.first_name.toLowerCase().includes(searchLower) ||
      tech.last_name.toLowerCase().includes(searchLower) ||
      tech.email.toLowerCase().includes(searchLower)
    );
  });


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <Award className="h-6 w-6" />
            Technician Scorecard from {formatDateRange()}
          </h1>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="select"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search technicians..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
        </div>

        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 mb-4 pb-4 border-b border-gray-200">
          <div className="col-span-2"></div>
          
          {/* Time Log Section */}
          <div className="col-span-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Time Log</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
              <div className="flex items-center justify-center gap-1">
                <Truck className="h-4 w-4" />
                <span>En Route</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>Onsite</span>
              </div>
              <div className="text-center">Total Time</div>
            </div>
          </div>

          {/* Appointments Section */}
          <div className="col-span-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Appointments</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
              <div className="flex items-center justify-center gap-1">
                <span>Onsite</span>
                <Info className="h-3 w-3" />
              </div>
              <div className="flex items-center justify-center gap-1">
                <span>Late</span>
                <Info className="h-3 w-3" />
              </div>
              <div className="flex items-center justify-center gap-1">
                <span>Missed</span>
                <Info className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Invoices Section */}
          <div className="col-span-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Invoices</h3>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center justify-center gap-1">
                <span>Revenue</span>
                <Info className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No technicians found.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Office Header */}
            <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
              Main Office
            </div>
            
            {filteredTechnicians.map((tech, index) => (
              <div key={tech.id} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 hover:bg-gray-50">
                {/* Technician Info */}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {tech.first_name?.charAt(0) || '?'}{tech.last_name?.charAt(0) || '?'}
                    </span>
                  </div>
                </div>

                {/* Time Log */}
                <div className="col-span-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="font-semibold">{tech.metrics.enRouteTime.toFixed(0)}h</div>
                    <div className="text-xs text-gray-500">{tech.metrics.enRoutePercentage.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="font-semibold">{tech.metrics.onsiteTime.toFixed(0)}h</div>
                    <div className="text-xs text-gray-500">{tech.metrics.onsitePercentage.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{tech.metrics.totalTime.toFixed(0)}h</div>
                  </div>
                </div>

                {/* Appointments */}
                <div className="col-span-3 grid grid-cols-3 gap-2 text-center">
                  <div className="font-semibold">{tech.metrics.onsiteAppointments}</div>
                  <div className="font-semibold">{tech.metrics.lateAppointments}</div>
                  <div className="font-semibold">{tech.metrics.missedAppointments}</div>
                </div>

                {/* Revenue */}
                <div className="col-span-3 text-center">
                  <div className="font-semibold">
                    {tech.metrics.revenue > 0 ? `$${tech.metrics.revenue.toLocaleString()}` : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechScorecard;