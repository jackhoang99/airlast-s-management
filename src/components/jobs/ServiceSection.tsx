import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';
import { Plus, Edit, Trash2, Search, Filter, Package, Wrench, ShoppingCart, Clipboard, Home, Send, ChevronDown, ChevronUp, X, CheckCircle, AlertTriangle, Clock, Users, FileText, Check } from 'lucide-react';
import AddJobPricingModal from './AddJobPricingModal';
import EditJobItemModal from './EditJobItemModal';
import RepairsForm from './replacement/RepairsForm';
import SendEmailModal from './SendEmailModal';
import InspectionForm from './inspection/InspectionForm';

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

  const [activeTab, setActiveTab] = useState<'replacement' | 'repair'>('replacement');

  const [jobDetails, setJobDetails] = useState<any>(null);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [showReplacementsForm, setShowReplacementsForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectionToEdit, setInspectionToEdit] = useState<any>(null);

  // Hold all replacement data for every inspection
  const [replacementDataByInspection, setReplacementDataByInspection] = useState<{ [key: string]: any }>({});
  const [allReplacementData, setAllReplacementData] = useState<any[]>([]);

  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [inspectionCompleted, setInspectionCompleted] = useState(false);
  const [quoteReady, setQuoteReady] = useState(false);

  // Combined total across all inspections
  const [totalReplacementCost, setTotalReplacementCost] = useState(0);
  
  // Add a refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Group job items by their `type` field
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
          setAllReplacementData(replacementData);
          
          // Calculate total replacement cost
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
    const fetchInspectionData = async () => {
      if (!supabase || !jobId) return;
      
      try {
        const { data, error } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAllInspections(data || []);
        
        // Check if any inspection is completed
        const hasCompletedInspection = data?.some(inspection => inspection.completed) || false;
        setInspectionCompleted(hasCompletedInspection);
        setQuoteReady(hasCompletedInspection);
      } catch (err) {
        console.error('Error fetching inspection data:', err);
      }
    };

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

    fetchInspectionData();
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

  // When a replacement is saved for a particular inspection
  const handleSaveReplacement = (data: any, inspectionId: string) => {
    console.log('Replacement data saved for inspection:', inspectionId, data);

    // Update local state
    setReplacementDataByInspection((prev) => ({
      ...prev,
      [inspectionId]: data,
    }));

    setShowReplacementsForm(false);
    onItemsUpdated();
    if (onQuoteStatusChange) {
      onQuoteStatusChange();
    }

    // Trigger a refresh to fetch the latest data
    setRefreshTrigger(prev => prev + 1);
  };

  // User clicks an inspection: either show existing replacements or open new form
  const handleSelectInspection = (inspection: any) => {
    setSelectedInspection(inspection);

    if (inspection && replacementDataByInspection[inspection.id]) {
      // If replacement data exists, show the form with existing data
      setShowReplacementsForm(true);
    } else {
      // If no replacement data exists, show the form to create new data
      setShowReplacementsForm(true);
    }
  };

  // "Finish Replacement Details" button: mark all inspections complete, fetch everything, compute totals, then open modal
  const handleFinishReplacementDetails = async () => {
    if (!supabase) return;

    try {
      // Fetch all completed inspections for display
      const { data: allInspData, error: allInspError } = await supabase
        .from('job_inspections')
        .select('*')
        .eq('job_id', jobId)
        .eq('completed', true);

      if (allInspError) throw allInspError;
      setAllInspections(allInspData || []);

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

      // Fetch all replacement rows for this job
      const { data: allRepData, error: replacementError } = await supabase
        .from('job_replacements')
        .select('*')
        .eq('job_id', jobId);

      if (replacementError) throw replacementError;

      // Store all replacement rows for the modal
      setAllReplacementData(allRepData || []);

      // Calculate the actual total cost from all replacement data
      const actualTotalCost = Object.values(replacementDataByInspection).reduce(
        (sum, data: any) => sum + (data.totalCost || 0), 
        0
      );
      setTotalReplacementCost(actualTotalCost);

      // Finally, open the "Send Quote" modal
      setShowSendQuoteModal(true);
    } catch (err) {
      console.error('Error preparing to send quote:', err);
    }
  };

  const handleAddInspection = () => {
    setInspectionToEdit(null);
    setShowInspectionForm(true);
  };

  const handleEditInspection = (inspection: any) => {
    setInspectionToEdit(inspection);
    setShowInspectionForm(true);
  };

  const handleSaveInspection = () => {
    setShowInspectionForm(false);
    setInspectionToEdit(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteInspection = async (inspectionId: string) => {
    if (!supabase) return;
    
    try {
      // First delete any associated replacement data
      const { error: replacementDeleteError } = await supabase
        .from('job_replacements')
        .delete()
        .eq('inspection_id', inspectionId);
        
      if (replacementDeleteError) throw replacementDeleteError;
      
      // Then delete the inspection
      const { error } = await supabase
        .from('job_inspections')
        .delete()
        .eq('id', inspectionId);
        
      if (error) throw error;
      
      // Refresh the inspection list
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      console.error('Error deleting inspection:', err);
    }
  };

  const handleCompleteInspections = async () => {
    if (!supabase || !jobId) return;

    try {
      // Update all inspections to mark them as completed
      const { error: updateError } = await supabase
        .from('job_inspections')
        .update({ completed: true })
        .eq('job_id', jobId);
        
      if (updateError) throw updateError;
      
      // Check if job_repairs record exists for each inspection
      for (const inspection of allInspections) {
        const { data: replacementData, error: replacementError } = await supabase
          .from('job_replacements')
          .select('id')
          .eq('job_id', jobId)
          .eq('inspection_id', inspection.id)
          .maybeSingle();
          
        if (replacementError && !replacementError.message.includes("The result contains 0 rows")) {
          throw replacementError;
        }
        
        // If no replacement record exists for this inspection, create one
        if (!replacementData) {
          const { error: insertError } = await supabase
            .from('job_replacements')
            .insert({
              job_id: jobId,
              inspection_id: inspection.id,
              needs_crane: false,
              phase1: { description: 'Economy Option', cost: 0 },
              phase2: { description: 'Standard Option', cost: 0 },
              phase3: { description: 'Premium Option', cost: 0 },
              labor: 0,
              refrigeration_recovery: 0,
              start_up_costs: 0,
              accessories: [],
              thermostat_startup: 0,
              removal_cost: 0,
              permit_cost: 0,
              selected_phase: 'phase2',
              total_cost: 0
            });
            
          if (insertError) throw insertError;
        }
      }
      
      // Refresh the inspection data
      setRefreshTrigger(prev => prev + 1);
      setInspectionCompleted(true);
      setQuoteReady(true);
      
    } catch (err) {
      console.error('Error completing inspections:', err);
    }
  };

  // Check if there are any part items
  const hasPartItems = groupedItems['part'] && groupedItems['part'].length > 0;

  // Calculate total cost of part items
  const calculatePartItemsCost = () => {
    if (!groupedItems['part']) return 0;
    return groupedItems['part'].reduce((total, item) => total + Number(item.total_cost), 0);
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex border rounded-lg overflow-hidden">
        <button
          onClick={() => setActiveTab('replacement')}
          className={`flex-1 py-2 px-3 text-sm font-medium ${
            activeTab === 'replacement' 
              ? 'bg-primary-50 text-primary-700' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Home size={16} className="inline-block mr-1" />
          Replacement
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          className={`flex-1 py-2 px-3 text-sm font-medium ${
            activeTab === 'repair' 
              ? 'bg-primary-50 text-primary-700' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Package size={16} className="inline-block mr-1" />
          Repair
        </button>
      </div>

      {/* Replacement View */}
      {activeTab === 'replacement' && (
        <div className="space-y-4">
          {showInspectionForm ? (
            <InspectionForm 
              jobId={jobId}
              initialData={inspectionToEdit}
              onSave={handleSaveInspection}
              onCancel={() => {
                setShowInspectionForm(false);
                setInspectionToEdit(null);
              }}
            />
          ) : showReplacementsForm && selectedInspection ? (
            <RepairsForm 
              jobId={jobId} 
              inspectionId={selectedInspection.id} 
              initialData={replacementDataByInspection[selectedInspection.id]}
              onSave={(data) => handleSaveReplacement(data, selectedInspection.id)}
              selectedInspection={selectedInspection}
              onClose={() => setShowReplacementsForm(false)}
            />
          ) : (
            <div className="space-y-4">
              {/* Inspection Section */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 p-4 flex justify-between items-center">
                  <h3 className="text-md font-medium flex items-center">
                    <Clipboard size={14} className="mr-1 text-blue-500" />
                    Inspection Details
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddInspection}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus size={14} className="mr-1" />
                      Add
                    </button>
                    {allInspections.length > 0 && !inspectionCompleted && (
                      <button
                        onClick={handleCompleteInspections}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Inspection Status Messages */}
                {inspectionCompleted && (
                  <div className="m-4 p-3 bg-success-50 border-l-4 border-success-500 rounded-md">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-success-700">Inspections completed</p>
                        {quoteReady && !jobDetails?.quote_sent && (
                          <p className="text-sm mt-1 text-success-700">
                            Ready to add replacement details for each inspection.
                          </p>
                        )}
                        {jobDetails?.quote_sent && !jobDetails?.quote_confirmed && (
                          <p className="text-sm mt-1 text-blue-700">
                            Quote sent to customer. Waiting for confirmation.
                          </p>
                        )}
                        {jobDetails?.quote_confirmed && (
                          <div className="text-sm mt-1">
                            <p className="text-success-700">
                              Quote confirmed by customer on {jobDetails.quote_confirmed_at ? new Date(jobDetails.quote_confirmed_at).toLocaleString() : 'N/A'}.
                            </p>
                            {jobDetails.repair_approved ? (
                              <p className="text-success-700 flex items-center mt-1">
                                <Check size={14} className="mr-1" />
                                Customer approved replacements
                              </p>
                            ) : jobDetails.repair_approved === false ? (
                              <p className="text-error-700 flex items-center mt-1">
                                <X size={14} className="mr-1" />
                                Customer declined replacements
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Inspection List */}
                {allInspections.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {allInspections.map((inspection) => {
                      const hasReplacementData = replacementDataByInspection[inspection.id];
                      const replacementStatus = hasReplacementData ? {
                        selectedPhase: hasReplacementData.selectedPhase || 'phase2',
                        totalCost: hasReplacementData.totalCost || 0,
                        needsCrane: hasReplacementData.needsCrane || false
                      } : null;
                      
                      return (
                        <div 
                          key={inspection.id} 
                          className={`bg-white border rounded-lg overflow-hidden ${
                            inspection.completed ? 'border-success-200' : 'border-gray-200'
                          } ${selectedInspection?.id === inspection.id ? 'ring-2 ring-primary-500' : ''}`}
                        >
                          <div className="p-3 flex justify-between items-center">
                            <div>
                              <div className="flex items-center flex-wrap gap-1">
                                <h4 className="font-medium text-sm">
                                  Inspection from {new Date(inspection.created_at).toLocaleDateString()}
                                </h4>
                                <div className="flex gap-1">
                                  {inspection.completed && (
                                    <span className="text-xs bg-success-100 text-success-800 px-2 py-0.5 rounded-full">
                                      Completed
                                    </span>
                                  )}
                                  {selectedInspection?.id === inspection.id && (
                                    <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                                      Selected
                                    </span>
                                  )}
                                  {hasReplacementData && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      Replacement Data
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Show compact replacement info if available */}
                              {hasReplacementData && (
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">
                                    {replacementStatus?.selectedPhase === 'phase1' ? 'Economy' : 
                                     replacementStatus?.selectedPhase === 'phase2' ? 'Standard' : 'Premium'} Option
                                  </span>
                                  <span className="mx-1">•</span>
                                  <span className="font-medium">${replacementStatus?.totalCost.toLocaleString()}</span>
                                  {replacementStatus?.needsCrane && (
                                    <span className="ml-1">(Crane Required)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-end px-3 pb-2 gap-2">
                            <button
                              onClick={() => handleSelectInspection(inspection)}
                              className="btn btn-primary btn-sm"
                            >
                              {hasReplacementData ? 'Edit Replacement' : 'Add Replacement'}
                            </button>
                            <button
                              onClick={() => handleEditInspection(inspection)}
                              className="text-primary-600 hover:text-primary-800 p-1"
                              aria-label="Edit inspection"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteInspection(inspection.id)}
                              className={`text-error-600 hover:text-error-800 p-1 ${
                                inspection.completed ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              disabled={inspection.completed}
                              aria-label="Delete inspection"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          {/* Inspection Details */}
                          <div className="px-3 pb-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs font-medium text-gray-500">Model Number</p>
                                <p>{inspection.model_number || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Serial Number</p>
                                <p>{inspection.serial_number || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Age (Years)</p>
                                <p>{inspection.age || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Tonnage</p>
                                <p>{inspection.tonnage || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Unit Type</p>
                                <p>{inspection.unit_type || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">System Type</p>
                                <p>{inspection.system_type || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-lg m-4">
                    <Clipboard className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-gray-500 mb-3">No inspection data available</p>
                    <button
                      onClick={handleAddInspection}
                      className="btn btn-primary"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Inspection
                    </button>
                  </div>
                )}
              </div>
              
              {/* Replacement Summary */}
              {Object.keys(replacementDataByInspection).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-green-50 p-4 flex justify-between items-center">
                    <h3 className="text-md font-medium flex items-center">
                      <Home size={16} className="mr-2 text-green-500" />
                      Replacement Summary
                    </h3>
                    <button
                      onClick={handleFinishReplacementDetails}
                      className="btn btn-primary btn-sm"
                      disabled={Object.keys(replacementDataByInspection).length === 0}
                    >
                      <Send size={14} className="mr-1" />
                      Send Replacement Quote
                    </button>
                  </div>
                  
                  <div className="p-4">
                    {/* Display replacement details for each inspection */}
                    <div className="space-y-3 mb-4">
                      {Object.entries(replacementDataByInspection).map(([inspectionId, data], index) => {
                        const inspection = allInspections.find(insp => insp.id === inspectionId);
                        return (
                          <div 
                            key={inspectionId} 
                            className="p-3 bg-white rounded-lg border border-green-100"
                          >
                            <div className="flex justify-between items-center">
                              <h5 className="font-medium text-sm">
                                Replacement {index + 1} {inspection ? `(${new Date(inspection.created_at).toLocaleDateString()})` : ''}
                              </h5>
                              <div className="text-sm font-bold text-green-800">
                                ${Number(data.totalCost).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-xs text-green-700 mt-1">
                              {data.selectedPhase === 'phase1' ? 'Economy' : 
                               data.selectedPhase === 'phase2' ? 'Standard' : 'Premium'} Option
                              {data.needsCrane && ' • Crane Required'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Combined total cost for all inspections */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-blue-800 text-sm">
                          Combined Total
                        </p>
                        <p className="text-blue-800 font-bold">
                          ${totalReplacementCost.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Call to Action if no inspections yet */}
              {allInspections.length === 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-blue-800">Start with an Inspection</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Begin by adding an inspection to record equipment details. After completing the inspection, 
                        you can add replacement details and send a quote to the customer.
                      </p>
                      <button
                        onClick={handleAddInspection}
                        className="btn btn-primary btn-sm mt-2"
                      >
                        <Plus size={14} className="mr-1" />
                        Add Inspection
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Workflow Guidance */}
              {allInspections.length > 0 && !inspectionCompleted && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-blue-800">Complete Your Inspections</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Once you've added all necessary inspections, click "Complete Inspections" to proceed 
                        with adding replacement details for each inspection.
                      </p>
                      <button
                        onClick={handleCompleteInspections}
                        className="btn btn-success btn-sm mt-2"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Complete Inspections
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Guidance for adding replacement details */}
              {inspectionCompleted && Object.keys(replacementDataByInspection).length < allInspections.length && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start">
                    <FileText className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Add Replacement Details</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Click "Add Replacement" or "Edit Replacement" on each inspection to add replacement details. 
                        Once all inspections have replacement details, you can send a quote to the customer.
                      </p>
                      <p className="text-sm text-yellow-700 mt-1 font-medium">
                        {Object.keys(replacementDataByInspection).length} of {allInspections.length} inspections have replacement details
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
          totalCost={activeTab === 'replacement' ? totalReplacementCost : calculatePartItemsCost()}
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