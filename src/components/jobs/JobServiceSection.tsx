import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, PenTool, ShoppingCart, Clipboard, Home } from 'lucide-react';
import { JobItem } from '../../types/job';
import AddJobPricingModal from './AddJobPricingModal';
import EditJobItemModal from './EditJobItemModal';
import { useSupabase } from '../../lib/supabase-context';
import InspectionForm from './inspection/InspectionForm';
import InspectionDisplay from './inspection/InspectionDisplay';
import ReplacementForm from './replacement/ReplacementForm';

type JobServiceSectionProps = {
  jobId: string;
  jobItems: JobItem[];
  onItemsUpdated: () => void;
  onQuoteStatusChange?: () => void;
};

const JobServiceSection = ({ 
  jobId, 
  jobItems, 
  onItemsUpdated, 
  onQuoteStatusChange 
}: JobServiceSectionProps) => {
  const { supabase } = useSupabase();
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JobItem | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'inspection-repair'>('inspection-repair');
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [showRepairSection, setShowRepairSection] = useState(false);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);

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

  const handleSaveInspection = (data: any) => {
    console.log('Inspection data saved:', data);
    setShowInspectionForm(false);
    setEditingInspection(null);
    onItemsUpdated();
    if (onQuoteStatusChange) {
      onQuoteStatusChange();
    }
  };

  const handleEditInspection = (inspection: any) => {
    setEditingInspection(inspection);
    setShowInspectionForm(true);
  };

  const handleCancelInspectionEdit = () => {
    setShowInspectionForm(false);
    setEditingInspection(null);
  };

  const handleSaveReplacement = (data: any) => {
    console.log('Replacement data saved:', data);
    onItemsUpdated();
    if (onQuoteStatusChange) {
      onQuoteStatusChange();
    }
  };

  const handleSelectInspection = (inspection: any) => {
    setSelectedInspection(inspection);
  };

  // Fetch job details to check repair approval status
  const fetchJobDetails = async () => {
    if (!supabase || !jobId) return;
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
        
      if (error) throw error;
      setJobDetails(data);
      
      // Show repair section if repair is approved
      if (data.quote_confirmed && data.repair_approved) {
        setShowRepairSection(true);
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
    }
  };

  // Fetch job details on component mount
  useEffect(() => {
    fetchJobDetails();
  }, [jobId, supabase]);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Service</h2>
        <div className="flex gap-2">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('inspection-repair')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'inspection-repair'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <Clipboard size={16} className="mr-2" />
                Inspection/Repair
              </div>
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <ShoppingCart size={16} className="mr-2" />
                Items
              </div>
            </button>
          </div>
          
          {activeTab === 'items' && (
            <button
              onClick={() => setShowAddPricingModal(true)}
              className="btn btn-primary"
            >
              <Plus size={16} className="mr-2" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {activeTab === 'inspection-repair' && (
        <div className="border-b pb-6 mb-6">
          {showInspectionForm ? (
            <InspectionForm 
              jobId={jobId} 
              initialData={editingInspection} 
              onSave={handleSaveInspection} 
              onCancel={handleCancelInspectionEdit}
            />
          ) : (
            <>
              <InspectionDisplay 
                jobId={jobId} 
                onAddInspection={() => setShowInspectionForm(true)}
                onEditInspection={handleEditInspection}
                onInspectionComplete={() => {
                  fetchJobDetails();
                  onItemsUpdated();
                  if (onQuoteStatusChange) {
                    onQuoteStatusChange();
                  }
                }}
                onSelectInspection={handleSelectInspection}
                selectedInspectionId={selectedInspection?.id}
              />
              
              {/* Show repair section only if repair is approved */}
              {(showRepairSection || (jobDetails?.quote_confirmed && jobDetails?.repair_approved)) && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-md font-medium mb-3 flex items-center">
                    <Home size={16} className="mr-2 text-green-500" />
                    Repair Details
                  </h3>
                  <ReplacementForm 
                    jobId={jobId} 
                    onSave={handleSaveReplacement} 
                    selectedInspection={selectedInspection}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        jobItems.length > 0 ? (
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
        )
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

export default JobServiceSection;