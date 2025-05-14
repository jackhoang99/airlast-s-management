import { useState, useEffect } from 'react';
import { X, Users, Calendar, Clock, Timer } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type User = Database['public']['Tables']['users']['Row'];

type AppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: {
    technicianId: string;
    date: string;
    time: string;
    duration: string;
  }) => void;
};

const AppointmentModal = ({ isOpen, onClose, onSave }: AppointmentModalProps) => {
  const { supabase } = useSupabase();
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [appointment, setAppointment] = useState({
    technicianId: '',
    date: '',
    time: '',
    duration: '1:00'
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
      }
    };

    fetchTechnicians();
  }, [supabase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Schedule Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users size={16} />
                Assign Technician
              </div>
            </label>
            <select
              value={appointment.technicianId}
              onChange={(e) => setAppointment(prev => ({ ...prev, technicianId: e.target.value }))}
              className="select"
            >
              <option value="">Select Technician</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  Schedule Date
                </div>
              </label>
              <input
                type="date"
                value={appointment.date}
                onChange={(e) => setAppointment(prev => ({ ...prev, date: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Schedule Time
                </div>
              </label>
              <input
                type="time"
                value={appointment.time}
                onChange={(e) => setAppointment(prev => ({ ...prev, time: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Timer size={16} />
                Duration
              </div>
            </label>
            <select
              value={appointment.duration}
              onChange={(e) => setAppointment(prev => ({ ...prev, duration: e.target.value }))}
              className="select"
            >
              <option value="1:00">1:00 hr</option>
              <option value="1:30">1:30 hr</option>
              <option value="2:00">2:00 hr</option>
              <option value="2:30">2:30 hr</option>
              <option value="3:00">3:00 hr</option>
              <option value="3:30">3:30 hr</option>
              <option value="4:00">4:00 hr</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(appointment)}
            className="btn btn-primary"
            disabled={!appointment.technicianId || !appointment.date || !appointment.time}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;