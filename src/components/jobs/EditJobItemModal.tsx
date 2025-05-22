import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type JobItem = Database['public']['Tables']['job_items']['Row'];

type EditJobItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wasUpdated: boolean) => void;
  item: JobItem | null;
};

const EditJobItemModal = ({ isOpen, onClose, onSave, item }: EditJobItemModalProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalValues, setOriginalValues] = useState<{
    quantity: number;
    unit_cost: number;
    total_cost: number;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    quantity: 1,
    unit_cost: 0,
    total_cost: 0,
  });

  useEffect(() => {
    // Reset form data when item changes
    if (item) {
      const newFormData = {
        quantity: item.quantity,
        unit_cost: Number(item.unit_cost),
        total_cost: Number(item.total_cost),
      };
      
      setFormData(newFormData);
      setOriginalValues(newFormData);
    }
  }, [item]);

  // Update total cost when quantity or unit cost changes
  useEffect(() => {
    const total = formData.quantity * formData.unit_cost;
    setFormData(prev => ({ ...prev, total_cost: total }));
  }, [formData.quantity, formData.unit_cost]);

  const handleSubmit = async () => {
    if (!supabase || !item) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('job_items')
        .update({
          quantity: formData.quantity,
          unit_cost: formData.unit_cost,
          total_cost: formData.total_cost
        })
        .eq('id', item.id);

      if (updateError) throw updateError;
      
      // Check if values were actually changed
      const wasUpdated = 
        formData.quantity !== originalValues?.quantity ||
        formData.unit_cost !== originalValues?.unit_cost;
      
      onSave(wasUpdated);
      onClose();
    } catch (err) {
      console.error('Error updating job item:', err);
      setError('Failed to update item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Edit Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item
            </label>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-500">{item.code}</div>
              <div className="text-xs text-gray-400 mt-1 capitalize">{item.type}</div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Cost
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                className="input pl-7"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Cost
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
              <input
                type="text"
                value={formData.total_cost.toFixed(2)}
                readOnly
                className="input pl-7 bg-gray-50"
              />
            </div>
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
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditJobItemModal;