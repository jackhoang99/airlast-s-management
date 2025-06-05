import { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';
import { JobItem } from '../../types/job';

interface EditRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wasUpdated: boolean) => void;
  repair: JobItem | null;
}

const EditRepairModal = ({ isOpen, onClose, onSave, repair }: EditRepairModalProps) => {
  const { supabase } = useSupabase();
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState('0.00');
  const [totalCost, setTotalCost] = useState('0.00');

  useEffect(() => {
    if (repair) {
      setQuantity(repair.quantity);
      setUnitCost(repair.unit_cost.toString());
      setTotalCost(repair.total_cost.toString());
    }
  }, [repair]);

  useEffect(() => {
    // Calculate total cost whenever quantity or unit cost changes
    const total = quantity * parseFloat(unitCost);
    setTotalCost(total.toFixed(2));
  }, [quantity, unitCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !repair) return;

    try {
      const { error } = await supabase
        .from('job_items')
        .update({
          quantity,
          unit_cost: parseFloat(unitCost),
          total_cost: parseFloat(totalCost)
        })
        .eq('id', repair.id);

      if (error) throw error;

      onSave(true);
      onClose();
    } catch (err) {
      console.error('Error updating repair item:', err);
      onSave(false);
    }
  };

  if (!isOpen || !repair) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Repair Item</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Item Name</label>
              <p className="mt-1 text-gray-600">{repair.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <p className="mt-1 text-gray-600">{repair.code}</p>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700">
                Unit Cost
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="unitCost"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="block w-full pl-7 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total Cost</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  value={totalCost}
                  disabled
                  className="block w-full pl-7 rounded-md border-gray-300 bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRepairModal;