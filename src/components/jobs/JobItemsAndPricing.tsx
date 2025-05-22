import { useState } from 'react';
import { Plus, Edit, Trash2, Package, PenTool, ShoppingCart } from 'lucide-react';
import { JobItem } from '../../types/job';
import AddJobPricingModal from './AddJobPricingModal';
import EditJobItemModal from './EditJobItemModal';
import { useSupabase } from '../../lib/supabase-context';

type JobItemsAndPricingProps = {
  jobId: string;
  jobItems: JobItem[];
  onItemsUpdated: () => void;
  onQuoteStatusChange?: () => void;
};

const JobItemsAndPricing = ({ jobId, jobItems, onItemsUpdated, onQuoteStatusChange }: JobItemsAndPricingProps) => {
  const { supabase } = useSupabase();
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JobItem | null>(null);

  // Group job items by type
  const groupedItems = jobItems.reduce((groups, item) => {
    const type = item.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {} as Record<string, JobItem[]>);

  // Calculate total cost
  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  const handleAddPricing = async () => {
    onItemsUpdated();
    if (onQuoteStatusChange) {
      onQuoteStatusChange();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('job_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      onItemsUpdated();
      if (onQuoteStatusChange) {
        onQuoteStatusChange();
      }
    } catch (err) {
      console.error('Error deleting job item:', err);
    }
  };

  const handleEditItem = (item: JobItem) => {
    setSelectedItem(item);
    setShowEditItemModal(true);
  };

  const handleItemUpdated = async (wasUpdated: boolean) => {
    if (wasUpdated) {
      onItemsUpdated();
      if (onQuoteStatusChange) {
        onQuoteStatusChange();
      }
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Items & Pricing</h2>
        <button
          onClick={() => setShowAddPricingModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} className="mr-2" />
          Add Item
        </button>
      </div>

      {jobItems.length > 0 ? (
        <div className="space-y-6">
          {/* Parts */}
          {groupedItems['part'] && groupedItems['part'].length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-3 flex items-center">
                <Package size={16} className="mr-2 text-blue-500" />
                Parts
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500">ITEM</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500">QTY</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">UNIT PRICE</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">TOTAL</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems['part'].map(item => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.code}</div>
                        </td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">${Number(item.unit_cost).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium">${Number(item.total_cost).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-error-600 hover:text-error-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Labor */}
          {groupedItems['labor'] && groupedItems['labor'].length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-3 flex items-center">
                <PenTool size={16} className="mr-2 text-green-500" />
                Labor
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500">ITEM</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500">QTY</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">UNIT PRICE</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">TOTAL</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems['labor'].map(item => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.code}</div>
                        </td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">${Number(item.unit_cost).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium">${Number(item.total_cost).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-error-600 hover:text-error-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other Items */}
          {groupedItems['item'] && groupedItems['item'].length > 0 && (
            <div>
              <h3 className="text-md font-medium mb-3 flex items-center">
                <ShoppingCart size={16} className="mr-2 text-purple-500" />
                Other Items
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500">ITEM</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500">QTY</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">UNIT PRICE</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">TOTAL</th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems['item'].map(item => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.code}</div>
                        </td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">${Number(item.unit_cost).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium">${Number(item.total_cost).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-error-600 hover:text-error-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">${calculateTotalCost().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No items added yet</p>
      )}

      {/* Add Pricing Modal */}
      <AddJobPricingModal
        isOpen={showAddPricingModal}
        onClose={() => setShowAddPricingModal(false)}
        onPriceAdded={handleAddPricing}
        jobId={jobId}
      />

      {/* Edit Item Modal */}
      <EditJobItemModal
        isOpen={showEditItemModal}
        onClose={() => setShowEditItemModal(false)}
        onSave={handleItemUpdated}
        item={selectedItem}
      />
    </div>
  );
};

export default JobItemsAndPricing;