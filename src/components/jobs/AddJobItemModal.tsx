import { useState, useEffect } from 'react';
import { X, Search, Package, Plus, Info, PenTool as Tool, ShoppingCart } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type JobItem = Database['public']['Tables']['job_items']['Row'];
type ServiceLine = Database['public']['Tables']['service_lines']['Row'];
type JobItemPrice = Database['public']['Tables']['job_item_prices']['Row'];

type AddJobItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onItemAdded: () => void;
};

const AddJobItemModal = ({ isOpen, onClose, jobId, onItemAdded }: AddJobItemModalProps) => {
  const { supabase } = useSupabase();
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'part' | 'labor' | 'item'>('part');
  const [itemPrices, setItemPrices] = useState<JobItemPrice[]>([]);
  const [filteredItemPrices, setFilteredItemPrices] = useState<JobItemPrice[]>([]);
  const [selectedItem, setSelectedItem] = useState<JobItemPrice | null>(null);
  
  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    service_line: 'TRNG',
    quantity: 1,
    unit_cost: 0,
    type: 'part' as 'part' | 'labor' | 'item'
  });

  useEffect(() => {
    const fetchServiceLines = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('service_lines')
          .select('*')
          .order('name');

        if (error) throw error;
        setServiceLines(data || []);
      } catch (err) {
        console.error('Error fetching service lines:', err);
      }
    };

    const fetchItemPrices = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('job_item_prices')
          .select('*')
          .order('code');

        if (error) throw error;
        setItemPrices(data || []);
      } catch (err) {
        console.error('Error fetching item prices:', err);
      }
    };

    fetchServiceLines();
    fetchItemPrices();
  }, [supabase]);

  useEffect(() => {
    // Update type based on selected tab
    setNewItem(prev => ({ ...prev, type: selectedTab }));
    
    // Filter items based on selected tab
    if (itemPrices.length > 0) {
      const filtered = itemPrices.filter(item => item.type === selectedTab);
      setFilteredItemPrices(filtered);
    }
  }, [selectedTab, itemPrices]);

  useEffect(() => {
    // Filter items based on search term
    if (searchTerm.trim() === '') {
      setFilteredItemPrices(itemPrices.filter(item => item.type === selectedTab));
    } else {
      const filtered = itemPrices.filter(
        item => 
          item.type === selectedTab && 
          (item.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
           item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())))
      );
      setFilteredItemPrices(filtered);
    }
  }, [searchTerm, itemPrices, selectedTab]);

  const handleItemSelect = (item: JobItemPrice) => {
    setSelectedItem(item);
    setNewItem({
      code: item.code,
      name: item.name,
      service_line: item.service_line,
      quantity: 1,
      unit_cost: Number(item.unit_cost),
      type: item.type as 'part' | 'labor' | 'item'
    });
  };

  const handleSubmit = async () => {
    if (!supabase) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate total cost
      const totalCost = newItem.quantity * newItem.unit_cost;
      
      const { error } = await supabase
        .from('job_items')
        .insert({
          job_id: jobId,
          code: newItem.code,
          name: newItem.name,
          service_line: newItem.service_line,
          quantity: newItem.quantity,
          unit_cost: newItem.unit_cost,
          total_cost: totalCost,
          type: newItem.type
        });
      
      if (error) throw error;
      
      // Reset form and notify parent
      setNewItem({
        code: '',
        name: '',
        service_line: 'TRNG',
        quantity: 1,
        unit_cost: 0,
        type: selectedTab
      });
      setSelectedItem(null);
      
      onItemAdded();
      onClose();
    } catch (err) {
      console.error('Error adding job item:', err);
      setError('Failed to add item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Add Job Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              className={`px-4 py-2 font-medium text-sm ${
                selectedTab === 'part'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setSelectedTab('part')}
            >
              <div className="flex items-center">
                <Package size={16} className="mr-2" />
                Parts
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                selectedTab === 'labor'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setSelectedTab('labor')}
            >
              <div className="flex items-center">
                <Tool size={16} className="mr-2" />
                Labor
              </div>
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                selectedTab === 'item'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setSelectedTab('item')}
            >
              <div className="flex items-center">
                <ShoppingCart size={16} className="mr-2" />
                Items
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left side - Item selection */}
          <div className="md:col-span-1 border-r pr-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 input w-full"
                />
              </div>
            </div>
            
            <div className="h-[400px] overflow-y-auto">
              {filteredItemPrices.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No items found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItemPrices.map(item => (
                    <div
                      key={item.id}
                      className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedItem?.id === item.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleItemSelect(item)}
                    >
                      <div className="font-medium">{item.code}</div>
                      <div className="text-sm">{item.name}</div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">{item.service_line}</span>
                        <span className="text-sm font-medium">${Number(item.unit_cost).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Item details */}
          <div className="md:col-span-2">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Code
                  </label>
                  <input
                    type="text"
                    value={newItem.code}
                    onChange={(e) => setNewItem(prev => ({ ...prev, code: e.target.value }))}
                    className="input"
                    placeholder={selectedTab === 'labor' ? "LABOR-CODE" : selectedTab === 'part' ? "PART-CODE" : "ITEM-CODE"}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Line
                  </label>
                  <select
                    value={newItem.service_line}
                    onChange={(e) => setNewItem(prev => ({ ...prev, service_line: e.target.value }))}
                    className="select"
                    required
                  >
                    {serviceLines.map(line => (
                      <option key={line.id} value={line.code}>
                        {line.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder={selectedTab === 'labor' ? "Tech Labor Rate (Regular)" : "Item Description"}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.unit_cost}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                      className="input pl-7"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Total Cost</span>
                  </div>
                  <span className="text-lg font-semibold">${(newItem.quantity * newItem.unit_cost).toFixed(2)}</span>
                </div>
              </div>
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
            disabled={isLoading || !newItem.code || !newItem.name || newItem.quantity < 1}
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                Adding...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Add Item
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddJobItemModal;