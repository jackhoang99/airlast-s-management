import { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';
import { Bell, Calendar, Clock, X } from 'lucide-react';

interface JobReminderBannerProps {
  jobId: string;
}

const JobReminderBanner = ({ jobId }: JobReminderBannerProps) => {
  const { supabase } = useSupabase();
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchReminders = async () => {
      if (!supabase || !jobId) return;

      try {
        setIsLoading(true);
        
        // Fetch pending reminders for this job
        const { data, error } = await supabase
          .from('job_reminders')
          .select('*')
          .eq('job_id', jobId)
          .eq('status', 'pending')
          .order('scheduled_for', { ascending: true });

        if (error) throw error;
        setReminders(data || []);
      } catch (err) {
        console.error('Error fetching job reminders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReminders();
  }, [supabase, jobId]);

  if (isLoading || reminders.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4 relative">
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start">
        <Bell className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            Reminder Scheduled
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            This job has {reminders.length} reminder{reminders.length > 1 ? 's' : ''} scheduled.
            {reminders[0].reminder_type === 'email' && ' An email will be sent to notify the customer.'}
          </p>
          <div className="flex items-center mt-2 text-xs text-blue-600">
            <Calendar size={12} className="mr-1" />
            <span>Scheduled for: {new Date(reminders[0].scheduled_for).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobReminderBanner;