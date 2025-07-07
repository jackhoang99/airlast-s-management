import { useState, useEffect } from 'react';
import { Edit, Save, Plus, Trash2, Calculator, X, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useSupabase } from '../../../lib/supabase-context';

type PhaseOption = {
  description: string;
  cost: string | number;
};

type AccessoryItem = {
  name: string;
  cost: string | number;
};

type ReplacementData = {
  needsCrane: boolean;
  phase1: PhaseOption;
  phase2: PhaseOption;
  phase3: PhaseOption;
  labor: string | number;
  refrigerationRecovery: string | number;
  startUpCosts: string | number;
  accessories: AccessoryItem[];
  thermostatStartup: string | number;
  removalCost: string | number;
  warranty: string;
  additionalItems: AccessoryItem[];
  permitCost: string | number;
  selectedPhase?: string;
  totalCost?: number;
};

type InspectionData = {
  id: string;
  job_id: string;
  model_number: string | null;
  serial_number: string | null;
  age: number | null;
  tonnage: string | null;
  unit_type: 'Gas' | 'Electric' | null;
  system_type: 'RTU' | 'Split System' | null;
  created_at: string;
  updated_at: string;
  completed: boolean;
};

type RepairFormProps = {
  jobId: string;
  inspectionId: string;
  initialData?: ReplacementData;
  onSave?: (data: ReplacementData, inspectionId: string) => void;
  selectedInspection?: InspectionData;
  onClose?: () => void;
};

const RepairsForm = ({
  jobId,
  inspectionId,
  initialData,
  onSave,
  selectedInspection,
  onClose
}: RepairFormProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
  const [allInspections, setAllInspections] = useState<InspectionData[]>([]);
  const [replacementData, setReplacementData] = useState<ReplacementData>(
    initialData || {
      needsCrane: false,
      phase1: { description: 'Economy Option', cost: '' },
      phase2: { description: 'Standard Option', cost: '' },
      phase3: { description: 'Premium Option', cost: '' },
      labor: '',
      refrigerationRecovery: '',
      startUpCosts: '',
      accessories: [{ name: '', cost: '' }],
      thermostatStartup: '',
      removalCost: '',
      warranty: '',
      additionalItems: [{ name: '', cost: '' }],
      permitCost: '',
    }
  );
  const [totalCost, setTotalCost] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<'phase1' | 'phase2' | 'phase3'>(
    (initialData?.selectedPhase as 'phase1' | 'phase2' | 'phase3') || 'phase2'
  );
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<'options' | 'accessories' | 'additional'>('options');
  const [expandedSection, setExpandedSection] = useState<'options' | 'accessories' | 'additional' | null>('options');

  // Fetch existing replacement + inspection + job details
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !jobId || !inspectionId) return;
      try {
        // 1) Load existing replacement data (if any)
        const { data: existingReplacement, error: replacementError } = await supabase
          .from('job_replacements')
          .select('*')
          .eq('job_id', jobId)
          .eq('inspection_id', inspectionId)
          .maybeSingle();

        if (replacementError && !replacementError.message.includes('The result contains 0 rows')) {
          throw replacementError;
        }

        if (existingReplacement) {
          setReplacementData({
            needsCrane: existingReplacement.needs_crane || false,
            phase1: existingReplacement.phase1 || { description: 'Economy Option', cost: '' },
            phase2: existingReplacement.phase2 || { description: 'Standard Option', cost: '' },
            phase3: existingReplacement.phase3 || { description: 'Premium Option', cost: '' },
            labor: existingReplacement.labor || '',
            refrigerationRecovery: existingReplacement.refrigeration_recovery || '',
            startUpCosts: existingReplacement.start_up_costs || '',
            accessories: existingReplacement.accessories || [{ name: '', cost: '' }],
            thermostatStartup: existingReplacement.thermostat_startup || '',
            removalCost: existingReplacement.removal_cost || '',
            warranty: existingReplacement.warranty || '',
            additionalItems: existingReplacement.additional_items || [{ name: '', cost: '' }],
            permitCost: existingReplacement.permit_cost || '',
            selectedPhase: existingReplacement.selected_phase,
            totalCost: existingReplacement.total_cost
          });

          if (existingReplacement.selected_phase) {
            setSelectedPhase(existingReplacement.selected_phase as 'phase1' | 'phase2' | 'phase3');
          }
          
          if (existingReplacement.total_cost) {
            setTotalCost(existingReplacement.total_cost);
          }

          // Always show the form when initialData is provided or when edit button is clicked
          setIsFormVisible(initialData !== undefined);
        }

        // 2) Fetch all completed inspections for this job
        const { data: inspectionsData, error: inspectionsError } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', jobId)
          .eq('completed', true)
          .order('created_at', { ascending: false });

        if (inspectionsError) throw inspectionsError;
        setAllInspections(inspectionsData || []);

        // 3) Use selectedInspection if provided, else find by ID
        if (selectedInspection) {
          setInspectionData(selectedInspection);
        } else {
          const inspect = inspectionsData?.find(insp => insp.id === inspectionId);
          if (inspect) {
            setInspectionData(inspect);
          }
        }

        // 4) Fetch job details (with location + unit)
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
        setError('Failed to load data');
      }
    };

    fetchData();
  }, [supabase, jobId, inspectionId, selectedInspection, initialData]);

  // Calculate total cost whenever replacement fields or selectedPhase change
  useEffect(() => {
    const calculateTotalCost = () => {
      const phaseCost =
        (selectedPhase === 'phase1'
          ? Number(replacementData.phase1.cost)
          : selectedPhase === 'phase2'
          ? Number(replacementData.phase2.cost)
          : Number(replacementData.phase3.cost)) || 0;
      const laborCost = Number(replacementData.labor) || 0;
      const refrigerationCost = Number(replacementData.refrigerationRecovery) || 0;
      const startUpCost = Number(replacementData.startUpCosts) || 0;
      const thermostatCost = Number(replacementData.thermostatStartup) || 0;
      const removalCost = Number(replacementData.removalCost) || 0;
      const permitCost = Number(replacementData.permitCost) || 0;

      const baseCosts =
        phaseCost +
        laborCost +
        refrigerationCost +
        startUpCost +
        thermostatCost +
        removalCost +
        permitCost;

      const accessoriesCost = replacementData.accessories.reduce(
        (sum, item) => sum + (Number(item.cost) || 0),
        0
      );

      const additionalItemsCost = replacementData.additionalItems.reduce(
        (sum, item) => sum + (Number(item.cost) || 0),
        0
      );

      const totalDirectCosts = baseCosts + accessoriesCost + additionalItemsCost;
      const totalWithMargin = totalDirectCosts > 0 ? Math.round(totalDirectCosts / 0.6) : 0;
      return totalWithMargin;
    };

    setTotalCost(calculateTotalCost());
  }, [replacementData, selectedPhase]);

  // If selectedInspection prop changes, update local state
  useEffect(() => {
    if (selectedInspection) {
      setInspectionData(selectedInspection);
    }
  }, [selectedInspection]);

  const handleAddAccessory = () => {
    setReplacementData(prev => ({
      ...prev,
      accessories: [...prev.accessories, { name: '', cost: '' }]
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
      additionalItems: [...prev.additionalItems, { name: '', cost: '' }]
    }));
  };

  const handleRemoveAdditionalItem = (index: number) => {
    setReplacementData(prev => ({
      ...prev,
      additionalItems: prev.additionalItems.filter((_, i) => i !== index)
    }));
  };

  const toggleSection = (section: 'options' | 'accessories' | 'additional') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !jobId || !inspectionId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if replacement data already exists
      const { data: existingData, error: checkError } = await supabase
        .from('job_replacements')
        .select('id')
        .eq('job_id', jobId)
        .eq('inspection_id', inspectionId)
        .maybeSingle();

      if (checkError) throw checkError;

      const dataToSave = {
        job_id: jobId,
        inspection_id: inspectionId,
        needs_crane: replacementData.needsCrane,
        phase1: {
          description: replacementData.phase1.description,
          cost: Number(replacementData.phase1.cost) || 0,
        },
        phase2: {
          description: replacementData.phase2.description,
          cost: Number(replacementData.phase2.cost) || 0,
        },
        phase3: {
          description: replacementData.phase3.description,
          cost: Number(replacementData.phase3.cost) || 0,
        },
        labor: Number(replacementData.labor) || 0,
        refrigeration_recovery: Number(replacementData.refrigerationRecovery) || 0,
        start_up_costs: Number(replacementData.startUpCosts) || 0,
        accessories: replacementData.accessories.map(item => ({
          name: item.name,
          cost: Number(item.cost) || 0,
        })),
        thermostat_startup: Number(replacementData.thermostatStartup) || 0,
        removal_cost: Number(replacementData.removalCost) || 0,
        warranty: replacementData.warranty,
        additional_items: replacementData.additionalItems.map(item => ({
          name: item.name,
          cost: Number(item.cost) || 0,
        })),
        permit_cost: Number(replacementData.permitCost) || 0,
        updated_at: new Date().toISOString(),
        selected_phase: selectedPhase,
        total_cost: totalCost,
      };

      let savedData;
      
      if (existingData) {
        // Update
        const { data, error: updateError } = await supabase
          .from('job_replacements')
          .update(dataToSave)
          .eq('id', existingData.id)
          .select();
          
        if (updateError) throw updateError;
        savedData = data?.[0];
      } else {
        // Insert
        const { data, error: insertError } = await supabase
          .from('job_replacements')
          .insert(dataToSave)
          .select();
          
        if (insertError) throw insertError;
        savedData = data?.[0];
      }

      setSuccess('Replacement data saved successfully');
      setIsFormVisible(false);
      
      // Create a properly formatted data object to pass to the parent component
      const formattedData = {
        needsCrane: replacementData.needsCrane,
        phase1: replacementData.phase1,
        phase2: replacementData.phase2,
        phase3: replacementData.phase3,
        labor: replacementData.labor,
        refrigerationRecovery: replacementData.refrigerationRecovery,
        startUpCosts: replacementData.startUpCosts,
        accessories: replacementData.accessories,
        thermostatStartup: replacementData.thermostatStartup,
        removalCost: replacementData.removalCost,
        warranty: replacementData.warranty,
        additionalItems: replacementData.additionalItems,
        permitCost: replacementData.permitCost,
        selectedPhase: selectedPhase,
        totalCost: totalCost
      };
      
      if (onSave) {
        onSave(formattedData, inspectionId);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving replacement data:', err);
      setError('Failed to save replacement data');
    } finally {
      setIsLoading(false);
    }
  };

  const inspectionDateLabel = inspectionData
    ? new Date(inspectionData.created_at).toLocaleDateString('en-US')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-auto">
      {/* Modal Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <h3 className="font-medium text-lg">
          {initialData ? 'Edit Replacement Details' : 'Add Replacement Details'}
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {inspectionData && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-blue-800">
                Replacement Details for Inspection from {inspectionDateLabel}
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-blue-700">Model Number</p>
                <p className="text-sm text-blue-900">{inspectionData.model_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700">Serial Number</p>
                <p className="text-sm text-blue-900">{inspectionData.serial_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700">Age (Years)</p>
                <p className="text-sm text-blue-900">{inspectionData.age || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700">Tonnage</p>
                <p className="text-sm text-blue-900">{inspectionData.tonnage || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700">Unit Type</p>
                <p className="text-sm text-blue-900">{inspectionData.unit_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700">System Type</p>
                <p className="text-sm text-blue-900">{inspectionData.system_type || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-success-50 text-success-700 p-3 rounded-md mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Replacement Options Section - Collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="flex justify-between items-center p-3 bg-blue-50 cursor-pointer"
                onClick={() => toggleSection('options')}
              >
                <h3 className="font-medium">Replacement Options</h3>
                {expandedSection === 'options' ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </div>
              
              {expandedSection === 'options' && (
                <div className="p-3">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="needsCrane"
                      checked={replacementData.needsCrane}
                      onChange={e =>
                        setReplacementData(prev => ({ ...prev, needsCrane: e.target.checked }))
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                    />
                    <label htmlFor="needsCrane" className="ml-2 text-sm text-gray-700">
                      Requires Crane
                    </label>
                  </div>

                  {/* Phase Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Replacement Option
                    </label>
                    <div className="space-y-3">
                      {/* Economy Option Card */}
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedPhase === 'phase1'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPhase('phase1')}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">Economy Option</h4>
                          <div className="h-5 w-5 rounded-full border border-primary-500 flex items-center justify-center">
                            {selectedPhase === 'phase1' && (
                              <div className="h-3 w-3 bg-primary-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={replacementData.phase1.description}
                          onChange={e =>
                            setReplacementData(prev => ({
                              ...prev,
                              phase1: { ...prev.phase1, description: e.target.value }
                            }))
                          }
                          className="input w-full mb-2 text-sm"
                          placeholder="Description"
                        />
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={replacementData.phase1.cost}
                            onChange={e => {
                              const value = e.target.value.replace(/^0+/, '');
                              setReplacementData(prev => ({
                                ...prev,
                                phase1: { ...prev.phase1, cost: value }
                              }));
                            }}
                            className="input pl-7 w-full text-sm"
                            placeholder="Cost"
                          />
                        </div>
                      </div>

                      {/* Standard Option Card */}
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedPhase === 'phase2'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPhase('phase2')}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">Standard Option</h4>
                          <div className="h-5 w-5 rounded-full border border-primary-500 flex items-center justify-center">
                            {selectedPhase === 'phase2' && (
                              <div className="h-3 w-3 bg-primary-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={replacementData.phase2.description}
                          onChange={e =>
                            setReplacementData(prev => ({
                              ...prev,
                              phase2: { ...prev.phase2, description: e.target.value }
                            }))
                          }
                          className="input w-full mb-2 text-sm"
                          placeholder="Description"
                        />
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={replacementData.phase2.cost}
                            onChange={e => {
                              const value = e.target.value.replace(/^0+/, '');
                              setReplacementData(prev => ({
                                ...prev,
                                phase2: { ...prev.phase2, cost: value }
                              }));
                            }}
                            className="input pl-7 w-full text-sm"
                            placeholder="Cost"
                          />
                        </div>
                      </div>

                      {/* Premium Option Card */}
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedPhase === 'phase3'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPhase('phase3')}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">Premium Option</h4>
                          <div className="h-5 w-5 rounded-full border border-primary-500 flex items-center justify-center">
                            {selectedPhase === 'phase3' && (
                              <div className="h-3 w-3 bg-primary-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={replacementData.phase3.description}
                          onChange={e =>
                            setReplacementData(prev => ({
                              ...prev,
                              phase3: { ...prev.phase3, description: e.target.value }
                            }))
                          }
                          className="input w-full mb-2 text-sm"
                          placeholder="Description"
                        />
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                            $
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={replacementData.phase3.cost}
                            onChange={e => {
                              const value = e.target.value.replace(/^0+/, '');
                              setReplacementData(prev => ({
                                ...prev,
                                phase3: { ...prev.phase3, cost: value }
                              }));
                            }}
                            className="input pl-7 w-full text-sm"
                            placeholder="Cost"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Labor
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.labor}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            setReplacementData(prev => ({ ...prev, labor: value }));
                          }}
                          className="input pl-7 w-full text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Refrigeration Recovery
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.refrigerationRecovery}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            setReplacementData(prev => ({ ...prev, refrigerationRecovery: value }));
                          }}
                          className="input pl-7 w-full text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Up Costs
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.startUpCosts}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            setReplacementData(prev => ({ ...prev, startUpCosts: value }));
                          }}
                          className="input pl-7 w-full text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Thermostat Start Up
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.thermostatStartup}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            setReplacementData(prev => ({ ...prev, thermostatStartup: value }));
                          }}
                          className="input pl-7 w-full text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Removal of Old Equipment
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.removalCost}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            setReplacementData(prev => ({ ...prev, removalCost: value }));
                          }}
                          className="input pl-7 w-full text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Permit Cost
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={replacementData.permitCost}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            setReplacementData(prev => ({ ...prev, permitCost: value }));
                          }}
                          className="input pl-7 w-full text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Warranty Information
                    </label>
                    <textarea
                      value={replacementData.warranty}
                      onChange={e => setReplacementData(prev => ({ ...prev, warranty: e.target.value }))}
                      className="input w-full text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accessories Section - Collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="flex justify-between items-center p-3 bg-green-50 cursor-pointer"
                onClick={() => toggleSection('accessories')}
              >
                <h3 className="font-medium">Accessories</h3>
                {expandedSection === 'accessories' ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </div>
              
              {expandedSection === 'accessories' && (
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Accessories
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAccessory}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Add Accessory
                    </button>
                  </div>
                  {replacementData.accessories.map((accessory, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Accessory name"
                        value={accessory.name}
                        onChange={e => {
                          const newAccessories = [...replacementData.accessories];
                          newAccessories[index].name = e.target.value;
                          setReplacementData(prev => ({ ...prev, accessories: newAccessories }));
                        }}
                        className="input flex-grow text-sm"
                      />
                      <div className="relative w-24">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Cost"
                          value={accessory.cost}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            const newAccessories = [...replacementData.accessories];
                            newAccessories[index].cost = value;
                            setReplacementData(prev => ({ ...prev, accessories: newAccessories }));
                          }}
                          className="input pl-7 w-full text-sm"
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
              )}
            </div>

            {/* Additional Items Section - Collapsible */}
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="flex justify-between items-center p-3 bg-purple-50 cursor-pointer"
                onClick={() => toggleSection('additional')}
              >
                <h3 className="font-medium">Additional Items</h3>
                {expandedSection === 'additional' ? (
                  <ChevronUp size={20} className="text-gray-500" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500" />
                )}
              </div>
              
              {expandedSection === 'additional' && (
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Additional Items
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAdditionalItem}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Add Item
                    </button>
                  </div>
                  {replacementData.additionalItems.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={e => {
                          const newItems = [...replacementData.additionalItems];
                          newItems[index].name = e.target.value;
                          setReplacementData(prev => ({ ...prev, additionalItems: newItems }));
                        }}
                        className="input flex-grow text-sm"
                      />
                      <div className="relative w-24">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Cost"
                          value={item.cost}
                          onChange={e => {
                            const value = e.target.value.replace(/^0+/, '');
                            const newItems = [...replacementData.additionalItems];
                            newItems[index].cost = value;
                            setReplacementData(prev => ({ ...prev, additionalItems: newItems }));
                          }}
                          className="input pl-7 w-full text-sm"
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
              )}
            </div>

            {/* Cost Summary - Always visible */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium mb-2 flex items-center text-sm">
                <Calculator size={16} className="mr-2 text-gray-700" />
                Cost Summary
              </h4>
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      {selectedPhase === 'phase1'
                        ? 'Economy Option'
                        : selectedPhase === 'phase2'
                        ? 'Standard Option'
                        : 'Premium Option'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {replacementData[selectedPhase].description}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary-700">
                    ${totalCost.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  Includes 40% gross margin
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Footer with action buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Save Replacement
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RepairsForm;