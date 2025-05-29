import { useState } from 'react';
import { Plus, Edit, Trash2, Package, PenTool, ShoppingCart, Clipboard, Home } from 'lucide-react';
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
  const [inspectionData, setInspectionData] = useState({
    modelNumber: '',
    serialNumber: '',
    age: '',
    tonnage: '',
    unitType: 'Gas', // Gas or Electric
    systemType: 'RTU', // RTU or Split System
  });
  const [replacementData, setReplacementData] = useState({
    needsCrane: false,
    phase1: { description: 'Economy Option', cost: 0 },
    phase2: { description: 'Standard Option', cost: 0 },
    phase3: { description: 'Premium Option', cost: 0 },
    labor: 0,
    refrigerationRecovery: 0,
    startUpCosts: 0,
    accessories: [{ name: '', cost: 0 }],
    thermostatStartup: 0,
    removalCost: 0,
    warranty: '',
    additionalItems: [{ name: '', cost: 0 }],
    permitCost: 0,
  });

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

  const handleAddAccessory = () => {
    setReplacementData(prev => ({
      ...prev,
      accessories: [...prev.accessories, { name: '', cost: 0 }]
    }));
  };

  const handleRemoveAccessory = (index: number) => {
    setReplacementData(prev => ({
      ...prev,
      accessories: prev.accessories.filter((_, i) => i !== index)
    }));
  };

  const handleAddAdditionalItem = () => {
    setReplacementData(prev => ({
      ...prev,
      additionalItems: [...prev.additionalItems, { name: '', cost: 0 }]
    }));
  };

  const handleRemoveAdditionalItem = (index: number) => {
    setReplacementData(prev => ({
      ...prev,
      additionalItems: prev.additionalItems.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Service</h2>
        <button
          onClick={() => setShowAddPricingModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} className="mr-2" />
          Add Item
        </button>
      </div>

      {/* Inspection Section */}
      <div className="mb-6 border-b pb-6">
        <h3 className="text-md font-medium mb-3 flex items-center">
          <Clipboard size={16} className="mr-2 text-blue-500" />
          Inspection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
            <input
              type="text"
              value={inspectionData.modelNumber}
              onChange={(e) => setInspectionData(prev => ({ ...prev, modelNumber: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
            <input
              type="text"
              value={inspectionData.serialNumber}
              onChange={(e) => setInspectionData(prev => ({ ...prev, serialNumber: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age (Years)</label>
            <input
              type="number"
              value={inspectionData.age}
              onChange={(e) => setInspectionData(prev => ({ ...prev, age: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tonnage</label>
            <input
              type="text"
              value={inspectionData.tonnage}
              onChange={(e) => setInspectionData(prev => ({ ...prev, tonnage: e.target.value }))}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
            <select
              value={inspectionData.unitType}
              onChange={(e) => setInspectionData(prev => ({ ...prev, unitType: e.target.value }))}
              className="select w-full"
            >
              <option value="Gas">Gas</option>
              <option value="Electric">Electric</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Type</label>
            <select
              value={inspectionData.systemType}
              onChange={(e) => setInspectionData(prev => ({ ...prev, systemType: e.target.value }))}
              className="select w-full"
            >
              <option value="RTU">RTU</option>
              <option value="Split System">Split System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Replacement Section */}
      <div className="mb-6 border-b pb-6">
        <h3 className="text-md font-medium mb-3 flex items-center">
          <Home size={16} className="mr-2 text-green-500" />
          Replacement
        </h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="needsCrane"
              checked={replacementData.needsCrane}
              onChange={(e) => setReplacementData(prev => ({ ...prev, needsCrane: e.target.checked }))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <label htmlFor="needsCrane" className="ml-2 text-sm text-gray-700">Requires Crane</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 1 - Economy Option */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Phase 1 - Economy Option</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={replacementData.phase1.description}
                    onChange={(e) => setReplacementData(prev => ({ 
                      ...prev, 
                      phase1: { ...prev.phase1, description: e.target.value } 
                    }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={replacementData.phase1.cost}
                      onChange={(e) => setReplacementData(prev => ({ 
                        ...prev, 
                        phase1: { ...prev.phase1, cost: Number(e.target.value) } 
                      }))}
                      className="input pl-7 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2 - Standard Option */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Phase 2 - Standard Option</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={replacementData.phase2.description}
                    onChange={(e) => setReplacementData(prev => ({ 
                      ...prev, 
                      phase2: { ...prev.phase2, description: e.target.value } 
                    }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={replacementData.phase2.cost}
                      onChange={(e) => setReplacementData(prev => ({ 
                        ...prev, 
                        phase2: { ...prev.phase2, cost: Number(e.target.value) } 
                      }))}
                      className="input pl-7 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 3 - Premium Option */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Phase 3 - Premium Option</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={replacementData.phase3.description}
                    onChange={(e) => setReplacementData(prev => ({ 
                      ...prev, 
                      phase3: { ...prev.phase3, description: e.target.value } 
                    }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      value={replacementData.phase3.cost}
                      onChange={(e) => setReplacementData(prev => ({ 
                        ...prev, 
                        phase3: { ...prev.phase3, cost: Number(e.target.value) } 
                      }))}
                      className="input pl-7 w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Labor</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={replacementData.labor}
                  onChange={(e) => setReplacementData(prev => ({ ...prev, labor: Number(e.target.value) }))}
                  className="input pl-7 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refrigeration Recovery</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={replacementData.refrigerationRecovery}
                  onChange={(e) => setReplacementData(prev => ({ ...prev, refrigerationRecovery: Number(e.target.value) }))}
                  className="input pl-7 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Up Costs</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={replacementData.startUpCosts}
                  onChange={(e) => setReplacementData(prev => ({ ...prev, startUpCosts: Number(e.target.value) }))}
                  className="input pl-7 w-full"
                />
              </div>
            </div>
          </div>

          {/* Additional Accessories */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Additional Accessories</label>
              <button
                type="button"
                onClick={handleAddAccessory}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                + Add Accessory
              </button>
            </div>
            {replacementData.accessories.map((accessory, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Accessory name"
                  value={accessory.name}
                  onChange={(e) => {
                    const newAccessories = [...replacementData.accessories];
                    newAccessories[index].name = e.target.value;
                    setReplacementData(prev => ({ ...prev, accessories: newAccessories }));
                  }}
                  className="input flex-grow"
                />
                <div className="relative w-32">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    placeholder="Cost"
                    value={accessory.cost}
                    onChange={(e) => {
                      const newAccessories = [...replacementData.accessories];
                      newAccessories[index].cost = Number(e.target.value);
                      setReplacementData(prev => ({ ...prev, accessories: newAccessories }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAccessory(index)}
                    className="text-error-600 hover:text-error-800"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thermostat Start Up</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={replacementData.thermostatStartup}
                  onChange={(e) => setReplacementData(prev => ({ ...prev, thermostatStartup: Number(e.target.value) }))}
                  className="input pl-7 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Removal of Old Equipment</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={replacementData.removalCost}
                  onChange={(e) => setReplacementData(prev => ({ ...prev, removalCost: Number(e.target.value) }))}
                  className="input pl-7 w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Permit Cost</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={replacementData.permitCost}
                  onChange={(e) => setReplacementData(prev => ({ ...prev, permitCost: Number(e.target.value) }))}
                  className="input pl-7 w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Information</label>
            <textarea
              value={replacementData.warranty}
              onChange={(e) => setReplacementData(prev => ({ ...prev, warranty: e.target.value }))}
              className="input w-full"
              rows={3}
            />
          </div>

          {/* Additional Items */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Additional Items</label>
              <button
                type="button"
                onClick={handleAddAdditionalItem}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                + Add Item
              </button>
            </div>
            {replacementData.additionalItems.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => {
                    const newItems = [...replacementData.additionalItems];
                    newItems[index].name = e.target.value;
                    setReplacementData(prev => ({ ...prev, additionalItems: newItems }));
                  }}
                  className="input flex-grow"
                />
                <div className="relative w-32">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    placeholder="Cost"
                    value={item.cost}
                    onChange={(e) => {
                      const newItems = [...replacementData.additionalItems];
                      newItems[index].cost = Number(e.target.value);
                      setReplacementData(prev => ({ ...prev, additionalItems: newItems }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalItem(index)}
                    className="text-error-600 hover:text-error-800"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
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