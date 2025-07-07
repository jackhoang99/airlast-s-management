import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Database } from '../types/supabase'; 
import { ArrowLeft, Plus, Edit, Trash2, Search, Filter, Gauge, Check, X, AlertTriangle, Clock, DollarSign, Truck, Home } from 'lucide-react';
import AddJobPricingModal from '../components/jobs/AddJobPricingModal';

type JobPartPrice = Database['public']['Tables']['job_part_prices']['Row'];

const ItemPrices = () => {
  const { supabase } = useSupabase();
  const [partItems, setPartItems] = useState<JobPartPrice[]>([]);
  
  const [filteredItems, setFilteredItems] = useState<JobPartPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JobPartPrice | null>(null);
  const [filters, setFilters] = useState({
    type: 'all',
    serviceLine: 'all'
  });
  
  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    description: '',
    service_line: 'HVACGEN',
    parts_cost: '',
    estimated_hours: '',
    flat_rate_non_contract: '',
    flat_rate_pm_contract: ''
  });
  
  const [serviceLines, setServiceLines] = useState<any[]>([]);
  
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
    
    fetchServiceLines();
  }, [supabase]);
  
  useEffect(() => {
    const fetchItems = async () => {
      if (!supabase) return;
      
      try {
        setIsLoading(true);
        
        // Fetch part items
        const { data: partData, error: partError } = await supabase
          .from('job_part_prices')
          .select('*')
          .order('code');
          
        if (partError) throw partError;
        setPartItems(partData || []);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load item prices');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchItems();
  }, [supabase]);
  
  useEffect(() => {
    // Apply filters and search
    let result: JobPartPrice[] = [];
    
    // Get all part items
    result = [...partItems];
    
    // Apply service line filter
    if (filters.serviceLine !== 'all') {
      result = result.filter(item => item.service_line === filters.serviceLine);
    }
    
    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        item => 
          item.code.toLowerCase().includes(lowerSearch) ||
          item.name.toLowerCase().includes(lowerSearch) ||
          (item.description && item.description.toLowerCase().includes(lowerSearch))
      );
    }
    
    setFilteredItems(result);
  }, [partItems, filters, searchTerm]);
  
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('job_part_prices')
        .insert({
          code: newItem.code,
          name: newItem.name,
          description: newItem.description,
          service_line: newItem.service_line,
          parts_cost: parseFloat(newItem.parts_cost),
          estimated_hours: parseFloat(newItem.estimated_hours),
          complexity_multiplier: 1.0,
          adjusted_labor_cost: 60.0,
          truck_fee: 10,
          roof_access_fee: 75,
          total_base_cost: parseFloat(newItem.parts_cost) + 60.0 + 10 + 75,
          flat_rate_non_contract: parseFloat(newItem.flat_rate_non_contract),
          flat_rate_pm_contract: parseFloat(newItem.flat_rate_pm_contract)
        });
          
      if (error) throw error;

      // Refresh the items list
      const { data, error: fetchError } = await supabase
        .from('job_part_prices')
        .select('*')
        .order('code');
        
      if (fetchError) throw fetchError;
      setPartItems(data || []);
      
      // Reset form
      setNewItem({
        code: '',
        name: '',
        description: '',
        service_line: 'HVACGEN',
        parts_cost: '',
        estimated_hours: '',
        flat_rate_non_contract: '',
        flat_rate_pm_contract: ''
      });
      
      // Hide the form
      document.getElementById('addItemPriceForm')?.classList.add('hidden');
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item');
    }
  };
  
  const handleEditItem = async () => {
    if (!supabase || !selectedItem || !('parts_cost' in selectedItem)) return;
    
    try {
      // Update part item
      const { error } = await supabase
        .from('job_part_prices')
        .update({
          name: newItem.name,
          description: newItem.description || null,
          service_line: newItem.service_line,
          parts_cost: parseFloat(newItem.parts_cost),
          estimated_hours: parseFloat(newItem.estimated_hours),
          flat_rate_non_contract: parseFloat(newItem.flat_rate_non_contract),
          flat_rate_pm_contract: parseFloat(newItem.flat_rate_pm_contract)
        })
        .eq('id', selectedItem.id);
        
      if (error) throw error;
      
      // Refresh items
      const { data, error: fetchError } = await supabase
        .from('job_part_prices')
        .select('*')
        .order('code');
        
      if (fetchError) throw fetchError;
      setPartItems(data || []);
      
      // Reset form and close modal
      setSelectedItem(null);
      setNewItem({
        code: '',
        name: '',
        description: '',
        service_line: 'HVACGEN',
        parts_cost: '',
        estimated_hours: '',
        flat_rate_non_contract: '',
        flat_rate_pm_contract: ''
      });
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating item:', err);
      setError('Failed to update item');
    }
  };
  
  const handleDeleteItem = async () => {
    if (!supabase || !selectedItem || !('parts_cost' in selectedItem)) return;
    
    try {
      // Delete part item
      const { error } = await supabase
        .from('job_part_prices')
        .delete()
        .eq('id', selectedItem.id);
        
      if (error) throw error;
      
      // Refresh items
      const { data, error: fetchError } = await supabase
        .from('job_part_prices')
        .select('*')
        .order('code');
        
      if (fetchError) throw fetchError;
      setPartItems(data || []);
      
      // Reset form and close modal
      setSelectedItem(null);
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };
  
  const openEditModal = (item: JobPartPrice) => {
    if ('parts_cost' in item) {
      setSelectedItem(item);
      setNewItem({
        code: item.code,
        name: item.name,
        description: item.description || '',
        service_line: item.service_line,
        parts_cost: Number(item.parts_cost).toString(),
        estimated_hours: Number(item.estimated_hours).toString(),
        flat_rate_non_contract: Number(item.flat_rate_non_contract).toString(),
        flat_rate_pm_contract: Number(item.flat_rate_pm_contract).toString()
      });
      setShowEditModal(true);
    }
  };
  
  const openDeleteModal = (item: JobPartPrice) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };
  
  const getTypeIcon = (item: JobPartPrice) => {
    return <Gauge size={16} className="text-blue-500" />;
  };
  
  const getItemType = (item: JobPartPrice): string => {
    return 'part';
  };

  const handlePriceAdded = async () => {
    // Refresh all item lists
    if (!supabase) return;
    
    try {
      setIsLoading(true);
      
      // Fetch part items
      const { data: partData, error: partError } = await supabase
        .from('job_part_prices')
        .select('*')
        .order('code');
          
      if (partError) throw partError;
      setPartItems(partData || []);
    } catch (err) {
      console.error('Error refreshing items:', err);
      setError('Failed to refresh item prices');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Parts Pricing</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} className="mr-2" />
          Add Part
        </button>
      </div>
      
      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          
          <div className="flex gap-4">
            <div>
              <select
                value={filters.serviceLine}
                onChange={(e) => setFilters(prev => ({ ...prev, serviceLine: e.target.value }))}
                className="select"
              >
                <option value="all">All Service Lines</option>
                {serviceLines.map(line => (
                  <option key={line.id} value={line.code}>
                    {line.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items found. Try adjusting your filters or add a new item.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">TYPE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">PART CODE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">PART NAME</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">SERVICE LINE</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">PARTS COST</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">HOURS</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">NON-CONTRACT</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">PM CONTRACT</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const itemType = getItemType(item);
                  return (
                    <tr key={`${itemType}-${item.id}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          {getTypeIcon(item)}
                          <span className="ml-2 capitalize">{itemType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{item.code}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.service_line}</td>
                      <td className="px-4 py-3 text-sm font-medium">${'parts_cost' in item ? Number(item.parts_cost).toFixed(2) : '0.00'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{Number(item.estimated_hours).toFixed(1)}</td>
                      <td className="px-4 py-3 text-sm font-medium">${Number(item.flat_rate_non_contract).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-medium">${Number(item.flat_rate_pm_contract).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="text-error-600 hover:text-error-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add Job Pricing Modal */}
      <AddJobPricingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onPriceAdded={handlePriceAdded}
      />
      
      {/* Edit Item Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Edit Item Price</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code
                </label>
                <input
                  type="text"
                  value={newItem.code}
                  className="input bg-gray-100"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Part code cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Name *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Line *
                </label>
                <select
                  value={newItem.service_line}
                  onChange={(e) => setNewItem(prev => ({ ...prev, service_line: e.target.value }))}
                  className="select"
                  required
                >
                  {serviceLines.map(line => (
                    <option key={line.id} value={line.code}>
                      {line.name} ({line.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.parts_cost}
                  onChange={(e) => setNewItem(prev => ({ ...prev, parts_cost: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={newItem.estimated_hours}
                  onChange={(e) => setNewItem(prev => ({ ...prev, estimated_hours: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flat Rate (Non-Contract)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.flat_rate_non_contract}
                  onChange={(e) => setNewItem(prev => ({ ...prev, flat_rate_non_contract: e.target.value }))}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flat Rate (PM Contract)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.flat_rate_pm_contract}
                  onChange={(e) => setNewItem(prev => ({ ...prev, flat_rate_pm_contract: e.target.value }))}
                  className="input"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEditItem}
                className="btn btn-primary"
                disabled={!newItem.name || !newItem.parts_cost || !newItem.estimated_hours || !newItem.flat_rate_non_contract || !newItem.flat_rate_pm_contract}
              >
                <Check size={16} className="mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Part Price
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedItem.name}</strong> ({selectedItem.code})? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteItem}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemPrices;