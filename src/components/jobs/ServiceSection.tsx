import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';
import { X, FileInput as FileInvoice, Plus, AlertTriangle, DollarSign, Send, Printer, Eye, Mail, Check, Package, Wrench, ShoppingCart, Home, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react'; 
import AddJobPricingModal from './AddJobPricingModal';
import EditJobItemModal from './EditJobItemModal';
import RepairsForm from './replacement/RepairsForm';
import SendEmailModal from './SendEmailModal';

type JobServiceSectionProps = {
  jobId: string;
  jobItems: any[];
  onItemsUpdated: () => void;
  onQuoteStatusChange?: () => void;
};

const ServiceSection = ({
  jobId,
  jobItems,
  onItemsUpdated,
  onQuoteStatusChange,
}: JobServiceSectionProps) => {
  const { supabase } = useSupabase();
  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showRepairsForm, setShowRepairsForm] = useState(false); // This controls the RepairsForm visibility
  const [activeTab, setActiveTab] = useState<'replacement' | 'repair'>('replacement');
  const [jobDetails, setJobDetails] = useState<any>(null);

  // Hold all replacement data for every inspection
  const [replacementDataByInspection, setReplacementDataByInspection] = useState<{ [key: string]: any }>({});
  const [allReplacementData, setAllReplacementData] = useState<any[]>([]);

  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [quoteReady, setQuoteReady] = useState(false);

  // Add a refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch job details
  useEffect(() => {    
    const fetchJobDetails = async () => {
      if (!supabase || !jobId) return;

      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              zip
            ),
            units (
              unit_number
            )
          `)
          .eq('id', jobId)
          .single();

        if (error) throw error;
        setJobDetails(data);
      } catch (err) {
        console.error('Error fetching job details:', err);
      }
    };

    fetchJobDetails();
  }, [supabase, jobId, refreshTrigger]);

  // Combined total across all inspections
  const [totalReplacementCost, setTotalReplacementCost] = useState(0);
  

  const groupedItems = jobItems.reduce((groups, item) => {
    const type = item.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
    return groups;
  }, {} as Record<string, any[]>);
  
  // Fetch replacement data for all inspections
  useEffect(() => {
    const fetchReplacementData = async () => {
      if (!supabase || !jobId) return;
      
      try {
        const { data: replacementData, error: replacementError } = await supabase
          .from('job_replacements')
          .select('*')
          .eq('job_id', jobId);

        if (replacementError) {
          console.error('Error fetching replacement data:', replacementError);
          throw replacementError;
        }
        
        if (replacementData && replacementData.length > 0) {
          // Organize by inspection_id
          const replacementDataMap: {[key: string]: any} = {};
          let totalReplacementCostSum = 0;
          
          replacementData.forEach(item => {
            if (item.inspection_id) {
              replacementDataMap[item.inspection_id] = {
                needsCrane: item.needs_crane,
                phase1: item.phase1,
                phase2: item.phase2,
                phase3: item.phase3,
                labor: item.labor,
                refrigerationRecovery: item.refrigeration_recovery,
                startUpCosts: item.start_up_costs,
                accessories: item.accessories,
                thermostatStartup: item.thermostat_startup,
                removalCost: item.removal_cost,
                warranty: item.warranty,
                additionalItems: item.additional_items,
                permitCost: item.permit_cost,
                selectedPhase: item.selected_phase,
                totalCost: item.total_cost,
                created_at: item.created_at
              };
              
              totalReplacementCostSum += Number(item.total_cost || 0);
            }
          });
          
          setReplacementDataByInspection(replacementDataMap);
        
        console.log("Found job assignments:", jobTechData);
        setAllReplacementData(replacementData);
        setTotalReplacementCost(totalReplacementCostSum);
      }
    } catch (err) {
      console.error('Error fetching replacement data:', err);
    }
  };
  
  fetchReplacementData();
}, [supabase, jobId, refreshTrigger]);

  // Fetch inspections and job details
  useEffect(() => {    
    const fetchJobDetails = async () => {
      if (!supabase || !jobId) return;

      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              zip
            ),
            units (
              unit_number
            )
          `)
          .eq('id', jobId)
          .single();

        if (error) throw error;
        setJobDetails(data);
      } catch (err) {
        console.error('Error fetching job details:', err);
      }
    };

    fetchJobDetails();
  }, [supabase, jobId, refreshTrigger]);

  // Calculate total cost from job items
  const getJobTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // When a new pricing row is added
  const handleAddPricing = async () => {
    onItemsUpdated();
    if (onQuoteStatusChange) onQuoteStatusChange();
  };

  // Delete a single job item
  const handleDeleteItem = async (itemId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('job_items').delete().eq('id', itemId);
      if (error) throw error;

      onItemsUpdated();
      if (onQuoteStatusChange) onQuoteStatusChange();
    } catch (err) {
      console.error('Error deleting job item:', err);
    }
  };

  // Open edit modal for a jobItem
  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setShowEditItemModal(true);
  };

  // Callback after editing completes
  const handleItemUpdated = async (wasUpdated: boolean) => {
    if (wasUpdated) {
      onItemsUpdated();
      if (onQuoteStatusChange) onQuoteStatusChange();
    }
  };

  // "Finish Replacement Details" button: mark all inspections complete, fetch everything, compute totals, then open modal
  const handleFinishReplacementDetails = async () => {
    if (!supabase) return;

    try {
      // Fetch the job record (with location + unit nested)
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          locations (
            name,
            address,
            city,
            state,
            zip
          ),
          units (
            unit_number
          )
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJobDetails(jobData);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  return (
    <div>      
      {showEditItemModal && selectedItem && (
        <EditJobItemModal
          isOpen={showEditItemModal}
          onClose={() => setShowEditItemModal(false)}
          onSave={handleItemUpdated}
          item={selectedItem}
        />
      )}

      {/* Replacement/Repair Tabs */}
      <div className="mb-6 flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('replacement');
          }}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'replacement'
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center">
            <Home size={16} className="mr-2" />
            Replacement Quote
          </div>
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'repair'
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center">
            <Package size={16} className="mr-2" />
            Repair Quote
          </div>
        </button>
      </div>

      {/* Replacement Section */}
      {activeTab === 'replacement' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-md font-medium">Replacement Options</h3>
            <button
              onClick={() => setShowRepairsForm(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} className="mr-1" />
              Add Replacement
            </button>
          </div>
          
          {Object.keys(replacementDataByInspection).length > 0 && (
            <div className="mt-6 p-4 bg-success-50 rounded-lg border border-success-200">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-success-800">Replacement Summary</h3>
                <div className="text-xl font-bold text-success-700">
                  ${totalReplacementCost.toLocaleString()}
                </div>
              </div>
              <p className="text-sm text-success-600 mt-1">
                {Object.keys(replacementDataByInspection).length} replacement option(s) added
              </p>
              <div className="mt-4 flex justify-between">
                <button
                  onClick={handleFinishReplacementDetails}
                  className="btn btn-secondary"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Update Replacement Details
                </button>
                <button
                  onClick={() => setShowSendQuoteModal(true)}
                  className="btn btn-success"
                >
                  <Send size={16} className="mr-2" />
                  Send Replacement Quote
                </button>
              </div>
            </div>
          )}
          {Object.keys(replacementDataByInspection).length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Home className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No replacement options added yet</p>
              <button 
                onClick={() => setShowRepairsForm(true)} 
                className="btn btn-primary mt-4"
              >
                <Plus size={16} className="mr-2" />
                Add Replacement
              </button>
            </div>
          )}
        </div>
      )}

      {/* Repair Items Tab */}
      {activeTab === 'repair' && 
        (jobItems.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium flex items-center">
                <Package size={16} className="mr-2 text-blue-500" />
                Repair Items
              </h3>
              <button
                onClick={() => setShowAddPricingModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} className="mr-1" />
                Add Item
              </button>
            </div>
            
            {/* Parts Section */}
            {groupedItems['part'] && groupedItems['part'].length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 p-2 border-b border-blue-100">
                  <h4 className="text-sm font-medium flex items-center">
                    <Package size={14} className="mr-1 text-blue-500" />
                    Parts
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedItems['part'].map(item => (
                    <div key={item.id} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                          <div className="font-medium">${Number(item.total_cost).toFixed(2)}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-error-600 hover:text-error-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labor Section */}
            {groupedItems['labor'] && groupedItems['labor'].length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-green-50 p-2 border-b border-green-100">
                  <h4 className="text-sm font-medium flex items-center">
                    <Wrench size={14} className="mr-1 text-green-500" />
                    Labor
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedItems['labor'].map(item => (
                    <div key={item.id} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                          <div className="font-medium">${Number(item.total_cost).toFixed(2)}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-error-600 hover:text-error-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Items Section */}
            {groupedItems['item'] && groupedItems['item'].length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-purple-50 p-2 border-b border-purple-100">
                  <h4 className="text-sm font-medium flex items-center">
                    <ShoppingCart size={14} className="mr-1 text-purple-500" />
                    Other Items
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedItems['item'].map(item => (
                    <div key={item.id} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                          <div className="font-medium">${Number(item.total_cost).toFixed(2)}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-error-600 hover:text-error-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-lg">${getJobTotalCost().toFixed(2)}</span>
              </div>
            </div>
            
            {/* Send Quote Button */}
            {groupedItems['part'] && groupedItems['part'].length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSendQuoteModal(true)}
                  className="btn btn-primary"
                >
                  <Send size={16} className="mr-2" />
                  Send Repair Quote
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-3">No items added yet</p>
            <button
              onClick={() => setShowAddPricingModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} className="mr-1" />
              Add First Item
            </button>
          </div>
        ))}

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
      
      {/* Repairs/Replacement Form Modal */}
      {showRepairsForm && ( 
        <RepairsForm
          jobId={jobId}
          onSave={() => {
            setShowRepairsForm(false);
            setRefreshTrigger(prev => prev + 1); // Trigger a refresh
          }}
          onClose={() => {
            console.log("Closing RepairsForm");
            setShowRepairsForm(false);
          }}
        />
      )}

      {/* Send Quote Modal (for all inspections & combined replacement data) */}
      {showSendQuoteModal && jobDetails && (
        <SendEmailModal
          isOpen={showSendQuoteModal}
          onClose={() => setShowSendQuoteModal(false)}
          jobId={jobId}
          jobNumber={jobDetails.number}
          jobName={jobDetails.name}
          customerName={jobDetails.contact_name}
          initialEmail={jobDetails.contact_email || ''}
          allReplacementData={allReplacementData}
          totalCost={activeTab === 'replacement' ? totalReplacementCost : getJobTotalCost()}
          location={
            jobDetails.locations
              ? {
                  name: jobDetails.locations.name,
                  address: jobDetails.locations.address,
                  city: jobDetails.locations.city,
                  state: jobDetails.locations.state,
                  zip: jobDetails.locations.zip,
                }
              : null
          }
          unit={
            jobDetails.units
              ? {
                  unit_number: jobDetails.units.unit_number,
                }
              : null
          }
          quoteType={activeTab}
          onEmailSent={() => {
            window.location.reload();
          }}
          replacementDataByInspection={activeTab === 'replacement' ? replacementDataByInspection : {}}
        />
      )}
    </div>
  );
};

export default ServiceSection;