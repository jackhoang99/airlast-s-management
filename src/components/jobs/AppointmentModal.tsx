import { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type User = Database['public']['Tables']['users']['Row'];

type AppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: {
    technicianIds: string[];
  }) => void;
  selectedTechnicianIds?: string[];
};

const AppointmentModal = ({ isOpen, onClose, onSave, selectedTechnicianIds = [] }: AppointmentModalProps) => {
  const { supabase } = useSupabase();
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>(selectedTechnicianIds);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

    if (isOpen) {
      fetchTechnicians();
    }
  }, [supabase, isOpen]);

  useEffect(() => {
    // Update selected techs when selectedTechnicianIds prop changes
    setSelectedTechs(selectedTechnicianIds);
  }, [selectedTechnicianIds]);

  const handleTechnicianToggle = (techId: string) => {
    setSelectedTechs(prev => {
      if (prev.includes(techId)) {
        return prev.filter(id => id !== techId);
      } else {
        return [...prev, techId];
      }
    });
  };

  const filteredTechnicians = technicians.filter(tech => {
    const firstName = tech.first_name || '';
    const lastName = tech.last_name || '';
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    return searchTerm === '' || fullName.includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Assign Technicians</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users size={16} />
                Select Technicians
              </div>
            </label>
            <input
              type="text"
              placeholder="Search technicians..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input mb-4"
            />
            
            <div className="max-h-60 overflow-y-auto border rounded-md">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredTechnicians.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No technicians found</div>
              ) : (
                <div className="divide-y">
                  {filteredTechnicians.map(tech => (
                    <div 
                      key={tech.id} 
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                        selectedTechs.includes(tech.id) ? 'bg-primary-50' : ''
                      }`}
                      onClick={() => handleTechnicianToggle(tech.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {tech.first_name?.[0] || '?'}{tech.last_name?.[0] || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{tech.first_name} {tech.last_name}</div>
                          <div className="text-xs text-gray-500">{tech.email}</div>
                        </div>
                      </div>
                      {selectedTechs.includes(tech.id) && (
                        <Check size={18} className="text-primary-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ technicianIds: selectedTechs })}
              className="btn btn-primary"
              disabled={selectedTechs.length === 0}
            >
              Assign {selectedTechs.length > 0 ? `(${selectedTechs.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;