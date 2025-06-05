import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, PenTool, ShoppingCart, Clipboard, Home, Send } from 'lucide-react';
import { JobItem } from '../../types/job';
import AddJobPricingModal from './AddJobPricingModal';
import EditJobItemModal from './EditJobItemModal';
import { useSupabase } from '../../lib/supabase-context';
import InspectionForm from './inspection/InspectionForm';
import InspectionDisplay from './inspection/InspectionDisplay';
import RepairsForm from './replacement/RepairsForm';
import SendEmailModal from './SendEmailModal';

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
  onQuoteStatusChange,
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
  const [showRepairsForm, setShowRepairsForm] = useState(false);

  // Hold all repair data for every inspection
  const [repairDataByInspection, setRepairDataByInspection] = useState<{ [key: string]: any }>({});
  const [allRepairData, setAllRepairData] = useState<any[]>([]);

  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [inspectionData, setInspectionData] = useState<any[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);

  // Combined total across all inspections
  const [totalRepairCost, setTotalRepairCost] = useState(0);

  // Group job items by their `type` field
  const groupedItems = jobItems.reduce((groups, item) => {
    const type = item.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
    return groups;
  }, {} as Record<string, JobItem[]>);

  // Calculate total cost of all jobItems
  const calculateTotalCost = () => {
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
  const handleEditItem = (item: JobItem) => {
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

  // When an inspection is saved
  const handleSaveInspection = (data: any) => {
    console.log('Inspection data saved:', data);
    setShowInspectionForm(false);
    setEditingInspection(null);
    onItemsUpdated();
    if (onQuoteStatusChange) onQuoteStatusChange();
  };

  // Edit an existing inspection
  const handleEditInspection = (inspection: any) => {
    setEditingInspection(inspection);
    setShowInspectionForm(true);
  };

  const handleCancelInspectionEdit = () => {
    setShowInspectionForm(false);
    setEditingInspection(null);
  };

  // When a repair is saved for a particular inspection
  const handleSaveRepair = (data: any, inspectionId: string) => {
    console.log('Repair data saved for inspection:', inspectionId, data);

    setRepairDataByInspection((prev) => ({
      ...prev,
      [inspectionId]: data,
    }));

    setShowRepairsForm(false);
    onItemsUpdated();
    if (onQuoteStatusChange) onQuoteStatusChange();

    // Recalculate combined total across all inspections
    calculateTotalRepairCost();
  };

  // Recompute totalRepairCost from repairDataByInspection
  const calculateTotalRepairCost = () => {
    const total = Object.values(repairDataByInspection).reduce(
      (sum, data: any) => sum + Number(data.totalCost || 0),
      0
    );
    setTotalRepairCost(total);
    return total;
  };

  // User clicks an inspection: either show existing repairs or open new form
  const handleSelectInspection = (inspection: any) => {
    setSelectedInspection(inspection);

    if (inspection && repairDataByInspection[inspection.id]) {
      setShowRepairSection(true);
    } else {
      setShowRepairsForm(true);
    }
  };

  // "Finish Repair Details" button: mark all inspections complete, fetch everything, compute totals, then open modal
  const handleFinishRepairDetails = async () => {
    if (!supabase || !jobId) return;

    try {
      // 1) Mark all job_inspections for this job as completed
      const { error: completeError } = await supabase
        .from('job_inspections')
        .update({ completed: true })
        .eq('job_id', jobId);

      if (completeError) throw completeError;

      // 2) Fetch all completed inspections for display
      const { data: allInspData, error: allInspError } = await supabase
        .from('job_inspections')
        .select('*')
        .eq('job_id', jobId)
        .eq('completed', true);

      if (allInspError) throw allInspError;
      setAllInspections(allInspData || []);
      setInspectionData(allInspData || []);

      // 3) Fetch the job record (with location + unit nested)
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

      // 4) Fetch all repair rows for this job
      const { data: allRepData, error: repairError } = await supabase
        .from('job_repairs')
        .select('*')
        .eq('job_id', jobId);

      if (repairError) throw repairError;

      // 5) Store all repair rows for the modal
      setAllRepairData(allRepData || []);

      // 6) Calculate the actual total cost from all repair data
      const actualTotalCost = Object.values(repairDataByInspection).reduce(
        (sum, data: any) => sum + Number(data.totalCost || 0),
        0
      );
      setTotalRepairCost(actualTotalCost);

      // 7) Finally, open the "Send Quote" modal
      setShowSendQuoteModal(true);
    } catch (err) {
      console.error('Error preparing to send quote:', err);
    }
  };

  // Fetch job details (to check quote_confirmed / repair_approved) on mount or jobId change
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

      if (data.quote_confirmed && data.repair_approved) {
        setShowRepairSection(true);
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
    }
  };

  // Fetch existing repair data on mount (so you can display "Repair Details Saved" block before clicking Finish)
  const fetchRepairData = async () => {
    if (!supabase || !jobId) return;

    try {
      const { data, error } = await supabase
        .from('job_repairs')
        .select('*')
        .eq('job_id', jobId);

      if (error) throw error;

      const repairMap: { [key: string]: any } = {};
      data.forEach((item) => {
        if (item.inspection_id) {
          repairMap[item.inspection_id] = {
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
          };
        }
      });
      
      setRepairDataByInspection(repairMap);
      setAllRepairData(data);
      
      // Calculate total repair cost
      const total = data.reduce((sum, item) => sum + (item.total_cost || 0), 0);
      setTotalRepairCost(total);
    } catch (err) {
      console.error('Error fetching repair data:', err);
    }
  };

  // On mount or whenever jobId changes, load jobDetails + existing repairs
  useEffect(() => {
    fetchJobDetails();
    fetchRepairData();
  }, [jobId, supabase]);

  // Fetch all inspections on mount
  useEffect(() => {
    const fetchAllInspections = async () => {
      if (!supabase || !jobId) return;
      
      try {
        const { data, error } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', jobId)
          .eq('completed', true);
          
        if (error) throw error;
        setAllInspections(data || []);
        setInspectionData(data || []);
      } catch (err) {
        console.error('Error fetching all inspections:', err);
      }
    };
    
    fetchAllInspections();
  }, [jobId, supabase]);

  return (
    <div className="card">
      {/* Header & Tabs */}
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

      {/* Inspection/Repair Tab */}
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
              
              {/* Repair Details Section - Always visible if there are inspections */}
              {allInspections && allInspections.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-medium flex items-center">
                      <Home size={16} className="mr-2 text-green-500" />
                      Repair Details for All Inspections
                    </h3>
                    <button
                      onClick={handleFinishRepairDetails}
                      className="btn btn-primary"
                    >
                      <Send size={16} className="mr-2" />
                      Finish Repair Details
                    </button>
                  </div>
                  
                  {/* Summary of all repair data */}
                  {Object.keys(repairDataByInspection).length > 0 ? (
                    <div className="mb-6 p-4 bg-success-50 rounded-lg border border-success-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-success-800 mb-1">
                            Repair Details Saved
                          </h4>
                          <p className="text-success-700">
                            Repair details have been saved for {Object.keys(repairDataByInspection).length} inspection(s)
                          </p>
                        </div>
                      </div>

                      {/* Display repair details for each inspection */}
                      {Object.entries(repairDataByInspection).map(([inspectionId, data], index) => {
                        const inspection = allInspections.find(insp => insp.id === inspectionId);
                        return (
                          <div key={inspectionId} className="mt-4 p-3 bg-white rounded-lg border border-success-100">
                            <h5 className="font-medium text-success-800">
                              Inspection {index + 1} {inspection ? `(${new Date(inspection.created_at).toLocaleDateString()})` : ''}
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                              <div>
                                <p className="text-sm font-medium text-success-700">
                                  Selected Option
                                </p>
                                <p className="text-success-900">
                                  {data.selectedPhase === 'phase1'
                                    ? 'Economy Option'
                                    : data.selectedPhase === 'phase2'
                                    ? 'Standard Option'
                                    : 'Premium Option'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-success-700">
                                  Total Cost
                                </p>
                                <p className="text-success-900 font-bold">
                                  ${Number(data.totalCost).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-success-700">
                                  Requires Crane
                                </p>
                                <p className="text-success-900">
                                  {data.needsCrane ? 'Yes' : 'No'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Combined total cost for all inspections */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-blue-800">
                            Combined Total for All Inspections
                          </p>
                          <p className="text-blue-800 font-bold text-lg">
                            ${totalRepairCost.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">
                        No repair details found for any inspections.
                      </p>
                      <p className="text-gray-500 mt-2">
                        Select an inspection above to add repair details.
                      </p>
                    </div>
                  )}

                  {/* Individual inspection repair form (when an inspection is selected) */}
                  {selectedInspection && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-3">
                        Repair Details for Inspection from {new Date(selectedInspection.created_at).toLocaleDateString()}
                      </h4>
                      
                      {showRepairsForm ? (
                        <RepairsForm
                          jobId={jobId}
                          inspectionId={selectedInspection.id}
                          initialData={repairDataByInspection[selectedInspection.id]}
                          onSave={(data) => handleSaveRepair(data, selectedInspection.id)}
                          selectedInspection={selectedInspection}
                        />
                      ) : repairDataByInspection[selectedInspection.id] ? (
                        <div className="mb-6 p-4 bg-success-50 rounded-lg border border-success-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-success-800 mb-1">
                                Repair Details Saved
                              </h4>
                              <p className="text-success-700">
                                Repair details have been saved with a total cost of $
                                {repairDataByInspection[selectedInspection.id].totalCost?.toLocaleString() ||
                                  '0'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowRepairsForm(true)}
                                className="btn btn-secondary"
                              >
                                <Edit size={16} className="mr-2" />
                                Edit Repair Details
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-success-700">
                                Selected Option
                              </p>
                              <p className="text-success-900">
                                {repairDataByInspection[selectedInspection.id].selectedPhase ===
                                'phase1'
                                  ? 'Economy Option'
                                  : repairDataByInspection[selectedInspection.id].selectedPhase ===
                                    'phase2'
                                  ? 'Standard Option'
                                  : 'Premium Option'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-success-700">
                                Total Cost
                              </p>
                              <p className="text-success-900 font-bold">
                                $
                                {repairDataByInspection[selectedInspection.id].totalCost
                                  ?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-success-700">
                                Requires Crane
                              </p>
                              <p className="text-success-900">
                                {repairDataByInspection[selectedInspection.id].needsCrane
                                  ? 'Yes'
                                  : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">
                            No repair details found for this inspection.
                          </p>
                          <button
                            onClick={() => setShowRepairsForm(true)}
                            className="btn btn-primary mt-4"
                          >
                            <Plus size={16} className="mr-2" />
                            Add Repair Details
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' &&
        (jobItems.length > 0 ? (
          <div className="space-y-6">
            {/* Parts Section */}
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
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">
                          ITEM
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">
                          QTY
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          UNIT PRICE
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          TOTAL
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedItems['part'].map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.code}
                            </div>
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            ${Number(item.unit_cost).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${Number(item.total_cost).toFixed(2)}
                          </td>
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

            {/* Labor Section */}
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
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">
                          ITEM
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">
                          QTY
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          UNIT PRICE
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          TOTAL
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedItems['labor'].map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.code}
                            </div>
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            ${Number(item.unit_cost).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${Number(item.total_cost).toFixed(2)}
                          </td>
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

            {/* Other Items Section */}
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
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">
                          ITEM
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500">
                          QTY
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          UNIT PRICE
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          TOTAL
                        </th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-500 text-right">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedItems['item'].map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.code}
                            </div>
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            ${Number(item.unit_cost).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${Number(item.total_cost).toFixed(2)}
                          </td>
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

            {/* Grand Total */}
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

      {/* Send Quote Modal (for all inspections & combined repair data) */}
      {showSendQuoteModal && jobDetails && (
        <SendEmailModal
          isOpen={showSendQuoteModal}
          onClose={() => setShowSendQuoteModal(false)}
          jobId={jobId}
          jobNumber={jobDetails.number}
          jobName={jobDetails.name}
          customerName={jobDetails.contact_name}
          initialEmail={jobDetails.contact_email || ''}
          inspectionData={inspectionData}
          allRepairData={allRepairData}
          totalCost={totalRepairCost}
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
          quoteType="repair"
          onEmailSent={() => {
            window.location.reload();
          }}
          repairDataByInspection={repairDataByInspection}
        />
      )}
    </div>
  );
};

export default JobServiceSection;