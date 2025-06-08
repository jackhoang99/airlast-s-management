import { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';
import { User, Phone, Mail, Calendar, Briefcase, MapPin, Clock, CheckSquare, AlertTriangle } from 'lucide-react';

const TechnicianProfile = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technician, setTechnician] = useState<any>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    scheduledJobs: 0,
    todayJobs: 0
  });

  useEffect(() => {
    const fetchTechnicianInfo = async () => {
      if (!supabase) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch user details
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (userError) throw userError;
          setTechnician(userData);
          
          // Fetch technician stats
          const { data: jobTechData, error: jobTechError } = await supabase
            .from('job_technicians')
            .select('job_id')
            .eq('technician_id', userData.id);
            
          if (jobTechError) throw jobTechError;
          
          const jobIds = jobTechData.map(jt => jt.job_id);
          
          if (jobIds.length > 0) {
            // Get total jobs
            const totalJobs = jobIds.length;
            
            // Get completed jobs
            const { count: completedCount, error: completedError } = await supabase
              .from('jobs')
              .select('*', { count: 'exact', head: true })
              .in('id', jobIds)
              .eq('status', 'completed');
              
            if (completedError) throw completedError;
            
            // Get scheduled jobs
            const { count: scheduledCount, error: scheduledError } = await supabase
              .from('jobs')
              .select('*', { count: 'exact', head: true })
              .in('id', jobIds)
              .eq('status', 'scheduled');
              
            if (scheduledError) throw scheduledError;
            
            // Get today's jobs
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const { count: todayCount, error: todayError } = await supabase
              .from('jobs')
              .select('*', { count: 'exact', head: true })
              .in('id', jobIds)
              .gte('schedule_start', today.toISOString())
              .lt('schedule_start', tomorrow.toISOString());
              
            if (todayError) throw todayError;
            
            setStats({
              totalJobs,
              completedJobs: completedCount || 0,
              scheduledJobs: scheduledCount || 0,
              todayJobs: todayCount || 0
            });
          }
        }
      } catch (err) {
        console.error('Error fetching technician info:', err);
        setError('Failed to load technician information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTechnicianInfo();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !technician) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Profile</h3>
        <p className="text-gray-500 mb-4">{error || 'Profile not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center mr-4">
            <span className="text-2xl font-medium">
              {technician.first_name?.[0] || ''}{technician.last_name?.[0] || ''}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{technician.first_name} {technician.last_name}</h1>
            <p className="text-gray-600 capitalize">{technician.role}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Jobs</p>
              <p className="text-2xl font-semibold mt-1">{stats.todayJobs}</p>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Scheduled</p>
              <p className="text-2xl font-semibold mt-1">{stats.scheduledJobs}</p>
            </div>
            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold mt-1">{stats.completedJobs}</p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Jobs</p>
              <p className="text-2xl font-semibold mt-1">{stats.totalJobs}</p>
            </div>
            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-primary-600" />
          Contact Information
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{technician.email}</p>
            </div>
          </div>
          
          {technician.phone && (
            <div className="flex items-center">
              <Phone className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{technician.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4 flex items-center">
          <Briefcase className="h-5 w-5 mr-2 text-primary-600" />
          Account Information
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="font-medium">{technician.username}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Account Created</p>
              <p className="font-medium">{new Date(technician.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Office</p>
              <p className="font-medium">{technician.office_id || 'Main Office'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianProfile;