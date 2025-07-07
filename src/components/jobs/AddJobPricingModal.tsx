import { useState, useEffect } from 'react';
import { X, Search, Package, Plus, Info, Wrench, ShoppingCart, Check, Users, Gauge } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type JobPartPrice = Database['public']['Tables']['job_part_prices']['Row'];
type JobLaborPrice = Database['public']['Tables']['job_labor_prices']['Row'];
type JobItemPrice = Database['public']['Tables']['job_item_prices']['Row'];
type ServiceLine = Database['public']['Tables']['service_lines']['Row'];
type JobItem = Database['public']['Tables']['job_items']['Row'];

type AddJobPricingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPriceAdded?: () => void;
  jobId?: string; // Add jobId prop
  editItem?: JobItem; // Add editItem prop for editing existing items
};

const AddJobPricingModal = ({ 
  isOpen, 
  onClose, 
  onPriceAdded = () => {},
  jobId,
  editItem
}: AddJobPricingModalProps) => {
  const { supabase } = useSupabase();
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'part' | 'labor' | 'item'>('part');
  
  // Items from database
  const [partItems, setPartItems] = useState<JobPartPrice[]>([]);
  
  // Filtered items based on search
  const [filteredPartItems, setFilteredPartItems] = useState<JobPartPrice[]>([]);
  
  // Selected item
  const [selectedPartItem, setSelectedPartItem] = useState<JobPartPrice | null>(null);
  
  // Roof access fee toggle
  const [includeRoofAccessFee, setIncludeRoofAccessFee] = useState(true);
  
  // Multiple technicians toggle
  const [multipleTechs, setMultipleTechs] = useState(false);
  
  // Selected item code display
  const [selectedItemCode, setSelectedItemCode] = useState<string>('0121G00072PDGS-GPH PANEL');
  
  // Selected pricing type (non-contract or PM contract)
  const [selectedPricingType, setSelectedPricingType] = useState<'non-contract' | 'pm-contract'>('non-contract');
  
  const [newItem, setNewItem] = useState({
    // Common fields
    code: '',
    name: '',
    description: '',
    service_line: 'TRNG',
    unit_cost: 0,
    quantity: 1,
    // Part-specific fields
    parts_cost: 0,
    estimated_hours: 1.0,
    complexity_multiplier: 1.0,
    adjusted_labor_cost: 60.0,
    truck_fee: 10.0,
    roof_access_fee: 75.0,
    total_base_cost: 0.0,
    flat_rate_non_contract: 0.0,
    flat_rate_pm_contract: 0.0,
    // Labor-specific fields
    skill_level: 'standard',
    is_overtime: false,
    is_emergency: false,
    duration_hours: 1.0,
    // Item-specific fields
    category: 'General',
    is_taxable: true
  });

  // Fetch service lines on mount
  useEffect(() => {
    if (!supabase) return;

    const fetchServiceLines = async () => {
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
  
  // Fetch all items on mount
  useEffect(() => {
    if (!supabase || !isOpen) return;
    
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        // Fetch part items
        const { data: partData, error: partError } = await supabase
          .from('job_part_prices')
          .select('*')
          .order('code');
          
        if (partError) throw partError;
        setPartItems(partData || []);
        setFilteredPartItems(partData || []);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load items');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchItems();
  }, [supabase, isOpen]);
  
  // Initialize form when editing an existing item
  useEffect(() => {
    if (editItem) {
      // Set the appropriate tab based on item type
      setSelectedTab(editItem.type as 'part' | 'labor' | 'item');
      
      // Set common fields
      setNewItem(prev => ({
        ...prev,
        code: editItem.code,
        name: editItem.name,
        service_line: editItem.service_line,
        unit_cost: Number(editItem.unit_cost),
        quantity: editItem.quantity
      }));
      
      // Update selected item code display
      setSelectedItemCode(`${editItem.code} - ${editItem.name}`);
    }
  }, [editItem]);
  
  // Reset form when tab changes
  useEffect(() => {
    if (!editItem) {
      setNewItem({
        ...newItem,
        code: '',
        name: '',
        description: '',
        unit_cost: 0,
        quantity: 1
      });
      setSearchTerm('');
      setSelectedPartItem(null);
      setSelectedItemCode('0121G00072PDGS-GPH PANEL');
    }
  }, [selectedTab, editItem]);

  // Filter items based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPartItems(partItems);
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Filter part items
    setFilteredPartItems(
      partItems.filter(item => 
        item.code.toLowerCase().includes(lowerSearchTerm) ||
        (item.description?.toLowerCase().includes(lowerSearchTerm) ?? false)
      )
    );
    
  }, [searchTerm, partItems]);

  // Calculate derived values for parts
  useEffect(() => {
    if (selectedTab === 'part') {
      const roofFee = includeRoofAccessFee ? Number(newItem.roof_access_fee) : 0;
      
      // Apply multi-tech markup to labor cost if needed
      let adjustedLaborCost = Number(newItem.adjusted_labor_cost);
      if (multipleTechs) {
        adjustedLaborCost += 50; // Add $50/hour markup for multiple techs
      }
      
      const totalBaseCost = 
        Number(newItem.parts_cost) + 
        (Number(newItem.estimated_hours) * Number(newItem.complexity_multiplier) * adjustedLaborCost) +
        Number(newItem.truck_fee) + 
        roofFee;
      
      const flatRateNonContract = Math.round(totalBaseCost * 1.35);
      const flatRatePmContract = Math.round(flatRateNonContract * 0.9);
      
      setNewItem(prev => ({
        ...prev,
        total_base_cost: totalBaseCost,
        flat_rate_non_contract: flatRateNonContract,
        flat_rate_pm_contract: flatRatePmContract,
        unit_cost: selectedPricingType === 'non-contract' ? flatRateNonContract : flatRatePmContract
      }));
    }
  }, [
    selectedTab,
    newItem.parts_cost,
    newItem.estimated_hours,
    newItem.complexity_multiplier,
    newItem.adjusted_labor_cost,
    newItem.truck_fee,
    newItem.roof_access_fee,
    includeRoofAccessFee,
    multipleTechs,
    selectedPricingType
  ]);

  const handleSelectPartItem = (item: JobPartPrice) => {
    setSelectedPartItem(item);
    
    setNewItem({
      ...newItem,
      code: item.code,
      name: item.name,
      description: item.description || '',
      service_line: item.service_line,
      unit_cost: Number(item.unit_cost),
      parts_cost: Number(item.parts_cost),
      estimated_hours: Number(item.estimated_hours),
      complexity_multiplier: Number(item.complexity_multiplier),
      adjusted_labor_cost: Number(item.adjusted_labor_cost),
      truck_fee: Number(item.truck_fee),
      roof_access_fee: Number(item.roof_access_fee),
      total_base_cost: Number(item.total_base_cost),
      flat_rate_non_contract: Number(item.flat_rate_non_contract),
      flat_rate_pm_contract: Number(item.flat_rate_pm_contract)
    });
    
    // Set roof access fee toggle based on item value
    setIncludeRoofAccessFee(Number(item.roof_access_fee) > 0);
    
    // Update selected item code display
    setSelectedItemCode(`${item.code}${item.description ? ` - ${item.description}` : ''}`);
  };
  
  const handleSubmit = async () => {
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      if (editItem) {
        // Update existing job item
        const { error: updateError } = await supabase
          .from('job_items') 
          .update({
            quantity: newItem.quantity,
            unit_cost: newItem.unit_cost,
            total_cost: newItem.quantity * newItem.unit_cost
          })
          .eq('id', editItem.id);

        if (updateError) throw updateError;
      } else {
        // If jobId is provided, add the item to job_items table
        if (jobId) {
          const finalUnitCost = selectedTab === 'part' 
            ? (selectedPricingType === 'non-contract' ? newItem.flat_rate_non_contract : newItem.flat_rate_pm_contract)
            : newItem.unit_cost;

          const { error: jobItemError } = await supabase
            .from('job_items')
            .insert({
              job_id: jobId,
              code: newItem.code,
              name: newItem.name || newItem.description || newItem.code,
              service_line: newItem.service_line,
              quantity: newItem.quantity,
              unit_cost: finalUnitCost,
              total_cost: finalUnitCost * newItem.quantity, // Calculate total based on quantity
              type: selectedTab
            });

          if (jobItemError) throw jobItemError;
        } 
        // Only add to price tables if no jobId is provided (we're in the pricing management section)
        else if (selectedTab === 'part') {
          const { error } = await supabase
            .from('job_part_prices')
            .insert({
              code: newItem.code,
              name: newItem.name,
              description: newItem.description || null,
              service_line: newItem.service_line,
              parts_cost: newItem.parts_cost,
              estimated_hours: newItem.estimated_hours,
              complexity_multiplier: newItem.complexity_multiplier,
              adjusted_labor_cost: multipleTechs ? newItem.adjusted_labor_cost + 50 : newItem.adjusted_labor_cost,
              truck_fee: newItem.truck_fee,
              roof_access_fee: includeRoofAccessFee ? newItem.roof_access_fee : 0,
              total_base_cost: newItem.total_base_cost,
              flat_rate_non_contract: newItem.flat_rate_non_contract,
              flat_rate_pm_contract: newItem.flat_rate_pm_contract
            });
          if (error) throw error;
        }
      }

      onPriceAdded();
      onClose();
    } catch (err) {
      console.error('Error adding/updating price item:', err);
      setError('Failed to save price item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">{editItem ? 'Edit Item' : 'Add Pricing'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Selected Item Code Display */}
        <div className="bg-gray-50 p-3 mb-6 rounded-md">
          <p className="text-gray-700 font-medium">{selectedItemCode}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Tabs - Only show if not editing */}
        {!editItem && (
          <div className="mb-6 flex border-b border-gray-200 overflow-x-auto">
            <div className="px-4 py-2 font-medium text-sm whitespace-nowrap text-gray-900 border-b-2 border-gray-900">
              <div className="flex items-center">
                <Gauge size={16} className="mr-2" />
                Parts
              </div>
            </div>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="space-y-6 overflow-y-auto flex-1">
          {/* Search and Item Selection - Only show if not editing */}
          {!editItem && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Parts
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 input w-full"
                />
              </div>
              
              {/* Item List */}
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                {filteredPartItems.length > 0 ? (
                  <div className="divide-y">
                    {filteredPartItems.map(item => (
                      <div 
                        key={item.id}
                        className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedPartItem?.id === item.id ? 'bg-primary-50' : ''}`}
                        onClick={() => handleSelectPartItem(item)}
                      >
                        <div className="font-medium">{item.code}{item.description ? ` - ${item.description}` : ''}</div>
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>
                            Parts: ${Number(item.parts_cost).toFixed(2)} | Hours: {Number(item.estimated_hours).toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>
                            Non-Contract: ${Number(item.flat_rate_non_contract).toFixed(2)}
                          </span>
                          <span>
                            PM-Contract: ${Number(item.flat_rate_pm_contract).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">No part items found</div>
                )}
              </div>
            </div>
          )}

          {/* Common Fields */}
          {!editItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code *
                </label>
                <input
                  type="text"
                  value={newItem.code}
                  onChange={e => setNewItem(prev => ({ ...prev, code: e.target.value }))}
                  className="input"
                  placeholder={
                    selectedTab === 'part' ? 'PART-CODE' : 
                    selectedTab === 'labor' ? 'LABOR-CODE' : 
                    'ITEM-CODE'
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Line
                </label>
                <select
                  value={newItem.service_line}
                  onChange={e => setNewItem(prev => ({ ...prev, service_line: e.target.value }))}
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
          )}

          {/* Quantity field - for both new and edit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={e => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="input"
                required
              />
            </div>
            
            {/* Unit Cost - for editing or when not a part */}
            {(editItem || selectedTab !== 'part') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unit_cost}
                    onChange={e => setNewItem(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                    className="input pl-7"
                    required
                  />
                </div>
              </div>
            )}
            
            {/* Total Cost - read only, calculated field */}
            {editItem && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Cost
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <input
                    type="text"
                    value={(newItem.quantity * newItem.unit_cost).toFixed(2)}
                    className="input pl-7 bg-gray-50"
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>

          {selectedTab !== 'part' && !editItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder={
                    selectedTab === 'labor' ? 'Tech Labor Rate (Regular)' : 'Item Name'
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="Description (optional)"
                />
              </div>
            </div>
          )}

          {/* Part-specific fields */}
          {selectedTab === 'part' && !editItem && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parts Cost
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.parts_cost}
                      onChange={e => setNewItem(prev => ({ ...prev, parts_cost: parseFloat(e.target.value) || 0 }))}
                      className="input pl-7"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newItem.estimated_hours}
                    onChange={e => setNewItem(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complexity Multiplier
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newItem.complexity_multiplier}
                    onChange={e => setNewItem(prev => ({ ...prev, complexity_multiplier: parseFloat(e.target.value) || 1 }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Adjusted Labor Cost
                    </label>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-2">
                        {multipleTechs ? 'Multiple Techs' : 'Single Tech'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMultipleTechs(!multipleTechs)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full ${
                          multipleTechs ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          multipleTechs ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={multipleTechs ? newItem.adjusted_labor_cost + 50 : newItem.adjusted_labor_cost}
                      onChange={e => setNewItem(prev => ({ 
                        ...prev, 
                        adjusted_labor_cost: multipleTechs ? 
                          parseFloat(e.target.value) - 50 : 
                          parseFloat(e.target.value) || 0 
                      }))}
                      className="input pl-7"
                    />
                  </div>
                  {multipleTechs && (
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Users size={12} className="mr-1" />
                      <span>Includes $50/hour multi-tech markup</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Truck Fee
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.truck_fee}
                      onChange={e => setNewItem(prev => ({ ...prev, truck_fee: parseFloat(e.target.value) || 0 }))}
                      className="input pl-7"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Roof Access Fee
                    </label>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-2">
                        {includeRoofAccessFee ? 'Included' : 'Not included'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIncludeRoofAccessFee(!includeRoofAccessFee)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full ${
                          includeRoofAccessFee ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          includeRoofAccessFee ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.roof_access_fee}
                      onChange={e => setNewItem(prev => ({ ...prev, roof_access_fee: parseFloat(e.target.value) || 0 }))}
                      className={`input pl-7 ${!includeRoofAccessFee ? 'bg-gray-100 text-gray-500' : ''}`}
                      disabled={!includeRoofAccessFee}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div 
                  className={`p-4 rounded-lg cursor-pointer border ${
                    selectedPricingType === 'non-contract' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPricingType('non-contract')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Flat Rate (Non-Contract)
                      </label>
                      <div className="relative">
                        <span className="text-lg font-semibold">${newItem.flat_rate_non_contract.toFixed(2)}</span>
                      </div>
                    </div>
                    {selectedPricingType === 'non-contract' && (
                      <Check size={20} className="text-primary-600" />
                    )}
                  </div>
                </div>
                <div 
                  className={`p-4 rounded-lg cursor-pointer border ${
                    selectedPricingType === 'pm-contract' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPricingType('pm-contract')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Flat Rate (PM Contract)
                      </label>
                      <div className="relative">
                        <span className="text-lg font-semibold">${newItem.flat_rate_pm_contract.toFixed(2)}</span>
                      </div>
                    </div>
                    {selectedPricingType === 'pm-contract' && (
                      <Check size={20} className="text-primary-600" />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isLoading || (editItem ? false : !newItem.code)}
          >
            {isLoading
              ? <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
              : editItem ? <Check size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
            {isLoading ? 'Saving...' : editItem ? 'Save Changes' : 'Add Pricing'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddJobPricingModal;