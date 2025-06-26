import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useSupabase } from '../../../lib/supabase-context';

interface ClockInOutProps {
  jobId: string;
  technicianId: string;
  currentClockStatus: 'clocked_out' | 'clocked_in' | 'on_break';
  jobStatus: string;
  onStatusChange: (newStatus: 'clocked_out' | 'clocked_in' | 'on_break') => void;
}

const ClockInOut = ({ 
  jobId, 
  technicianId, 
  currentClockStatus, 
  jobStatus,
  onStatusChange 
}: ClockInOutProps) => {
  const { supabase } = useSupabase();
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClockEvent = async (eventType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end') => {
    if (!supabase || !jobId || !technicianId) {
      setError("Unable to record time - missing required information");
      return;
    }

    // Set the appropriate loading state
    if (eventType === 'clock_in') setIsClockingIn(true);
    else if (eventType === 'clock_out') setIsClockingOut(true);
    else if (eventType === 'break_start') setIsStartingBreak(true);
    else if (eventType === 'break_end') setIsEndingBreak(true);

    try {
      console.log("Recording clock event:", {
        job_id: jobId,
        user_id: technicianId,
        event_type: eventType,
        event_time: new Date().toISOString()
      });

      // Insert the clock event directly using the auth user ID
      const { data, error } = await supabase
        .from('job_clock_events')
        .insert({
          job_id: jobId,
          user_id: technicianId,
          event_type: eventType,
          event_time: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error(`Error recording ${eventType}:`, error);
        throw error;
      }

      console.log("Clock event recorded successfully:", data);

      // Update current status
      let newStatus: 'clocked_out' | 'clocked_in' | 'on_break';
      if (eventType === 'clock_in') {
        newStatus = 'clocked_in';
      } else if (eventType === 'clock_out') {
        newStatus = 'clocked_out';
      } else if (eventType === 'break_start') {
        newStatus = 'on_break';
      } else {
        newStatus = 'clocked_in';
      }
      
      onStatusChange(newStatus);
      setError(null);
    } catch (err) {
      console.error(`Error recording ${eventType}:`, err);
      setError(`Failed to record ${eventType.replace('_', ' ')}. Please try again.`);
    } finally {
      // Reset all loading states
      setIsClockingIn(false);
      setIsClockingOut(false);
      setIsStartingBreak(false);
      setIsEndingBreak(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-3 rounded-md mb-4">
          <p className="text-error-700">{error}</p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3">
        {currentClockStatus === 'clocked_out' ? (
          <button
            onClick={() => handleClockEvent('clock_in')}
            className="btn btn-primary"
            disabled={isClockingIn || jobStatus === 'completed' || jobStatus === 'cancelled'}
          >
            {isClockingIn ? (
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
            ) : (
              <Clock size={16} className="mr-2" />
            )}
            Clock In
          </button>
        ) : currentClockStatus === 'clocked_in' ? (
          <>
            <button
              onClick={() => handleClockEvent('clock_out')}
              className="btn btn-error"
              disabled={isClockingOut}
            >
              {isClockingOut ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <Clock size={16} className="mr-2" />
              )}
              Clock Out
            </button>
            <button
              onClick={() => handleClockEvent('break_start')}
              className="btn btn-secondary"
              disabled={isStartingBreak}
            >
              {isStartingBreak ? (
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              ) : (
                <Clock size={16} className="mr-2" />
              )}
              Start Break
            </button>
          </>
        ) : (
          <button
            onClick={() => handleClockEvent('break_end')}
            className="btn btn-primary"
            disabled={isEndingBreak}
          >
            {isEndingBreak ? (
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
            ) : (
              <Clock size={16} className="mr-2" />
            )}
            End Break
          </button>
        )}
      </div>
    </div>
  );
};

export default ClockInOut;