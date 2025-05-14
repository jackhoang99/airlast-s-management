import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type User = Database['public']['Tables']['users']['Row'];

type AppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: {
    technicianId: string;
  }) => void;
};

const AppointmentModal = ({ isOpen, onClose, onSave }: AppointmentModalProps) => {
  const { supabase } = useSupabase();
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [appointment, setAppointment] = useState({
    technicianId: ''
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
          <h2 className="text-lg font-semibold">Assign Technician</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users size={16} />
                Select Technician
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

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(appointment)}
              className="btn btn-primary"
              disabled={!appointment.technicianId}
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;