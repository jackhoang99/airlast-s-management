import { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';
import { Bell, Calendar, Clock, CheckCircle, AlertTriangle, Mail, MessageSquare } from 'lucide-react';

interface JobReminderListProps {
  jobId: string;
}

const JobReminderList = ({ jobId }: JobReminderListProps) => {
  const { supabase } = useSupabase();
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReminders = async () => {
      if (!supabase || !jobId) return;

      try {
        setIsLoading(true);
        
        // Fetch all reminders for this job
        const { data, error } = await supabase
          .from('job_reminders')
          .select('*')
          .eq('job_id', jobId)
          .order('scheduled_for', { ascending: false });

        if (error) throw error;
        setReminders(data || []);
      } catch (err) {
        console.error('Error fetching job reminders:', err);
        setError('Failed to load reminders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReminders();
  }, [supabase, jobId]);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail size={16} className="text-blue-500" />;
      case 'in_app':
        return <MessageSquare size={16} className="text-green-500" />;
      case 'sms':
        return <Bell size={16} className="text-purple-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'sent':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Sent</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-50 border-l-4 border-error-500 p-3 rounded-md">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-error-500" />
          <div className="ml-3">
            <p className="text-sm text-error-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No reminders have been scheduled for this job
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium flex items-center mb-4">
        <Bell className="h-5 w-5 mr-2 text-primary-600" />
        Reminders
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled For</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reminders.map((reminder) => (
              <tr key={reminder.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {getReminderTypeIcon(reminder.reminder_type)}
                    <span className="ml-2 text-sm capitalize">{reminder.reminder_type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {reminder.recipient}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(reminder.scheduled_for)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {reminder.sent_at ? formatDateTime(reminder.sent_at) : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(reminder.status)}
                  {reminder.status === 'failed' && reminder.error_message && (
                    <div className="text-xs text-error-600 mt-1">{reminder.error_message}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobReminderList;