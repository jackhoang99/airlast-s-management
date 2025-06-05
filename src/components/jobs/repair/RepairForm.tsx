import { useState, useEffect } from 'react';
import { Edit, Save, Plus, Trash2, Calculator } from 'lucide-react';
import { useSupabase } from '../../../lib/supabase-context';
// import SendEmailModal  ← removed

type PhaseOption = {
  description: string;
  cost: string | number;
};

type AccessoryItem = {
  name: string;
  cost: string | number;
};

type RepairData = {
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
  initialData?: RepairData;
  onSave?: (data: RepairData, inspectionId: string) => void;
  selectedInspection?: InspectionData;
};

const RepairsForm = ({
  jobId,
  inspectionId,
  initialData,
  onSave,
  selectedInspection
}: RepairFormProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
  const [allInspections, setAllInspections] = useState<InspectionData[]>([]);
  const [repairData, setRepairData] = useState<RepairData>(
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
  const [selectedPhase, setSelectedPhase] = useState<'phase1' | 'phase2' | 'phase3'>('phase2');
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [isFormVisible, setIsFormVisible] = useState(true);

  // Fetch existing repair + inspection + job details
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !jobId || !inspectionId) return;
      try {
        // 1) Load existing repair data (if any)
        const { data: existingRepair, error: repairError } = await supabase
          .from('job_repairs')
          .select('*')
          .eq('job_id', jobId)
          .eq('inspection_id', inspectionId)
          .maybeSingle();

        if (repairError && !repairError.message.includes('The result contains 0 rows')) {
          throw repairError;
        }

        if (existingRepair) {
          setRepairData({
            needsCrane: existingRepair.needs_crane || false,
            phase1: existingRepair.phase1 || { description: 'Economy Option', cost: '' },
            phase2: existingRepair.phase2 || { description: 'Standard Option', cost: '' },
            phase3: existingRepair.phase3 || { description: 'Premium Option', cost: '' },
            labor: existingRepair.labor || '',
            refrigerationRecovery: existingRepair.refrigeration_recovery || '',
            startUpCosts: existingRepair.start_up_costs || '',
            accessories: existingRepair.accessories || [{ name: '', cost: '' }],
            thermostatStartup: existingRepair.thermostat_startup || '',
            removalCost: existingRepair.removal_cost || '',
            warranty: existingRepair.warranty || '',
            additionalItems: existingRepair.additional_items || [{ name: '', cost: '' }],
            permitCost: existingRepair.permit_cost || '',
          });

          if (existingRepair.selected_phase) {
            setSelectedPhase(existingRepair.selected_phase as 'phase1' | 'phase2' | 'phase3');
          }

          // Hide the form if data already exists
          setIsFormVisible(false);
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
  }, [supabase, jobId, inspectionId, selectedInspection]);

  // Calculate total cost whenever repair fields or selectedPhase change
  useEffect(() => {
    const calculateTotalCost = () => {
      const phaseCost =
        (selectedPhase === 'phase1'
          ? Number(repairData.phase1.cost)
          : selectedPhase === 'phase2'
          ? Number(repairData.phase2.cost)
          : Number(repairData.phase3.cost)) || 0;
      const laborCost = Number(repairData.labor) || 0;
      const refrigerationCost = Number(repairData.refrigerationRecovery) || 0;
      const startUpCost = Number(repairData.startUpCosts) || 0;
      const thermostatCost = Number(repairData.thermostatStartup) || 0;
      const removalCost = Number(repairData.removalCost) || 0;
      const permitCost = Number(repairData.permitCost) || 0;

      const baseCosts =
        phaseCost +
        laborCost +
        refrigerationCost +
        startUpCost +
        thermostatCost +
        removalCost +
        permitCost;

      const accessoriesCost = repairData.accessories.reduce(
        (sum, item) => sum + (Number(item.cost) || 0),
        0
      );

      const additionalItemsCost = repairData.additionalItems.reduce(
        (sum, item) => sum + (Number(item.cost) || 0),
        0
      );

      const totalDirectCosts = baseCosts + accessoriesCost + additionalItemsCost;
      const totalWithMargin = totalDirectCosts > 0 ? Math.round(totalDirectCosts / 0.6) : 0;
      return totalWithMargin;
    };

    setTotalCost(calculateTotalCost());
  }, [repairData, selectedPhase]);

  // If selectedInspection prop changes, update local state
  useEffect(() => {
    if (selectedInspection) {
      setInspectionData(selectedInspection);
    }
  }, [selectedInspection]);

  const handleAddAccessory = () => {
    setRepairData(prev => ({
      ...prev,
      accessories: [...prev.accessories, { name: '', cost: '' }]
    }));
  };

  const handleRemoveAccessory = (index: number) => {
    setRepairData(prev => ({
      ...prev,
      accessories: prev.accessories.filter((_, i) => i !== index)
    }));
  };

  const handleAddAdditionalItem = () => {
    setRepairData(prev => ({
      ...prev,
      additionalItems: [...prev.additionalItems, { name: '', cost: '' }]
    }));
  };

  const handleRemoveAdditionalItem = (index: number) => {
    setRepairData(prev => ({
      ...prev,
      additionalItems: prev.additionalItems.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !jobId || !inspectionId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if repair data already exists
      const { data: existingData, error: checkError } = await supabase
        .from('job_repairs')
        .select('id')
        .eq('job_id', jobId)
        .eq('inspection_id', inspectionId)
        .maybeSingle();

      if (checkError) throw checkError;

      const dataToSave = {
        job_id: jobId,
        inspection_id: inspectionId,
        needs_crane: repairData.needsCrane,
        phase1: {
          description: repairData.phase1.description,
          cost: Number(repairData.phase1.cost) || 0,
        },
        phase2: {
          description: repairData.phase2.description,
          cost: Number(repairData.phase2.cost) || 0,
        },
        phase3: {
          description: repairData.phase3.description,
          cost: Number(repairData.phase3.cost) || 0,
        },
        labor: Number(repairData.labor) || 0,
        refrigeration_recovery: Number(repairData.refrigerationRecovery) || 0,
        start_up_costs: Number(repairData.startUpCosts) || 0,
        accessories: repairData.accessories.map(item => ({
          name: item.name,
          cost: Number(item.cost) || 0,
        })),
        thermostat_startup: Number(repairData.thermostatStartup) || 0,
        removal_cost: Number(repairData.removalCost) || 0,
        warranty: repairData.warranty,
        additional_items: repairData.additionalItems.map(item => ({
          name: item.name,
          cost: Number(item.cost) || 0,
        })),
        permit_cost: Number(repairData.permitCost) || 0,
        updated_at: new Date().toISOString(),
        selected_phase: selectedPhase,
        total_cost: totalCost,
      };

      if (existingData) {
        // Update
        const { error: updateError } = await supabase
          .from('job_repairs')
          .update(dataToSave)
          .eq('id', existingData.id);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('job_repairs')
          .insert(dataToSave);
        if (insertError) throw insertError;
      }

      setSuccess('Repair data saved successfully');
      setIsFormVisible(false);
      if (onSave) {
        onSave(repairData, inspectionId);
      }
    } catch (err) {
      console.error('Error saving repair data:', err);
      setError('Failed to save repair data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
  };

  const inspectionDateLabel = inspectionData
    ? new Date(inspectionData.created_at).toLocaleDateString('en-US')
    : '';

  return (
    <div>
      {inspectionData && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-blue-800">
              Repair Details for Inspection from {inspectionDateLabel}
            </h4>
            {/* “Finish Repair Details” button has been removed here */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-blue-700">Model Number</p>
              <p className="text-blue-900">{inspectionData.model_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Serial Number</p>
              <p className="text-blue-900">{inspectionData.serial_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Age (Years)</p>
              <p className="text-blue-900">{inspectionData.age || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Tonnage</p>
              <p className="text-blue-900">{inspectionData.tonnage || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Unit Type</p>
              <p className="text-blue-900">{inspectionData.unit_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">System Type</p>
              <p className="text-blue-900">{inspectionData.system_type || 'N/A'}</p>
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

      {!isFormVisible && (
        <div className="mb-6 p-4 bg-success-50 rounded-lg border border-success-200">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-success-800 mb-1">Repair Details Saved</h4>
              <p className="text-success-700">
                Repair details have been saved with a total cost of ${totalCost.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleFormVisibility}
                className="btn btn-secondary"
              >
                <Edit size={16} className="mr-2" />
                Edit Repair Details
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-success-700">Selected Option</p>
              <p className="text-success-900">
                {selectedPhase === 'phase1'
                  ? 'Economy Option'
                  : selectedPhase === 'phase2'
                  ? 'Standard Option'
                  : 'Premium Option'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-success-700">Total Cost</p>
              <p className="text-success-900 font-bold">
                ${totalCost.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {isFormVisible && (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="needsCrane"
                checked={repairData.needsCrane}
                onChange={e =>
                  setRepairData(prev => ({ ...prev, needsCrane: e.target.checked }))
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
                Select Repair Option
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Economy Option Card */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPhase === 'phase1'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPhase('phase1')}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Economy Option</h4>
                    <div className="h-5 w-5 rounded-full border border-primary-500 flex items-center justify-center">
                      {selectedPhase === 'phase1' && (
                        <div className="h-3 w-3 bg-primary-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={repairData.phase1.description}
                    onChange={e =>
                      setRepairData(prev => ({
                        ...prev,
                        phase1: { ...prev.phase1, description: e.target.value }
                      }))
                    }
                    className="input w-full mb-2"
                    placeholder="Description"
                  />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={repairData.phase1.cost}
                      onChange={e => {
                        const value = e.target.value.replace(/^0+/, '');
                        setRepairData(prev => ({
                          ...prev,
                          phase1: { ...prev.phase1, cost: value }
                        }));
                      }}
                      className="input pl-7 w-full"
                      placeholder="Cost"
                    />
                  </div>
                </div>

                {/* Standard Option Card */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPhase === 'phase2'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPhase('phase2')}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Standard Option</h4>
                    <div className="h-5 w-5 rounded-full border border-primary-500 flex items-center justify-center">
                      {selectedPhase === 'phase2' && (
                        <div className="h-3 w-3 bg-primary-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={repairData.phase2.description}
                    onChange={e =>
                      setRepairData(prev => ({
                        ...prev,
                        phase2: { ...prev.phase2, description: e.target.value }
                      }))
                    }
                    className="input w-full mb-2"
                    placeholder="Description"
                  />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={repairData.phase2.cost}
                      onChange={e => {
                        const value = e.target.value.replace(/^0+/, '');
                        setRepairData(prev => ({
                          ...prev,
                          phase2: { ...prev.phase2, cost: value }
                        }));
                      }}
                      className="input pl-7 w-full"
                      placeholder="Cost"
                    />
                  </div>
                </div>

                {/* Premium Option Card */}
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedPhase === 'phase3'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPhase('phase3')}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Premium Option</h4>
                    <div className="h-5 w-5 rounded-full border border-primary-500 flex items-center justify-center">
                      {selectedPhase === 'phase3' && (
                        <div className="h-3 w-3 bg-primary-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={repairData.phase3.description}
                    onChange={e =>
                      setRepairData(prev => ({
                        ...prev,
                        phase3: { ...prev.phase3, description: e.target.value }
                      }))
                    }
                    className="input w-full mb-2"
                    placeholder="Description"
                  />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={repairData.phase3.cost}
                      onChange={e => {
                        const value = e.target.value.replace(/^0+/, '');
                        setRepairData(prev => ({
                          ...prev,
                          phase3: { ...prev.phase3, cost: value }
                        }));
                      }}
                      className="input pl-7 w-full"
                      placeholder="Cost"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labor
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={repairData.labor}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+/, '');
                      setRepairData(prev => ({ ...prev, labor: value }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refrigeration Recovery
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={repairData.refrigerationRecovery}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+/, '');
                      setRepairData(prev => ({ ...prev, refrigerationRecovery: value }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Up Costs
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={repairData.startUpCosts}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+/, '');
                      setRepairData(prev => ({ ...prev, startUpCosts: value }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Additional Accessories */}
            <div className="mt-4">
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
              {repairData.accessories.map((accessory, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Accessory name"
                    value={accessory.name}
                    onChange={e => {
                      const newAccessories = [...repairData.accessories];
                      newAccessories[index].name = e.target.value;
                      setRepairData(prev => ({ ...prev, accessories: newAccessories }));
                    }}
                    className="input flex-grow"
                  />
                  <div className="relative w-32">
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
                        const newAccessories = [...repairData.accessories];
                        newAccessories[index].cost = value;
                        setRepairData(prev => ({ ...prev, accessories: newAccessories }));
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thermostat Start Up
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={repairData.thermostatStartup}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+/, '');
                      setRepairData(prev => ({ ...prev, thermostatStartup: value }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Removal of Old Equipment
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={repairData.removalCost}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+/, '');
                      setRepairData(prev => ({ ...prev, removalCost: value }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permit Cost
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={repairData.permitCost}
                    onChange={e => {
                      const value = e.target.value.replace(/^0+/, '');
                      setRepairData(prev => ({ ...prev, permitCost: value }));
                    }}
                    className="input pl-7 w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warranty Information
              </label>
              <textarea
                value={repairData.warranty}
                onChange={e => setRepairData(prev => ({ ...prev, warranty: e.target.value }))}
                className="input w-full"
                rows={3}
              />
            </div>

            {/* Additional Items */}
            <div className="mt-4">
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
              {repairData.additionalItems.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={e => {
                      const newItems = [...repairData.additionalItems];
                      newItems[index].name = e.target.value;
                      setRepairData(prev => ({ ...prev, additionalItems: newItems }));
                    }}
                    className="input flex-grow"
                  />
                  <div className="relative w-32">
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
                        const newItems = [...repairData.additionalItems];
                        newItems[index].cost = value;
                        setRepairData(prev => ({ ...prev, additionalItems: newItems }));
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

            {/* Cost Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 flex items-center">
                <Calculator size={16} className="mr-2 text-gray-700" />
                Cost Summary
              </h4>
              <div className="p-3 bg-white rounded border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {selectedPhase === 'phase1'
                        ? 'Economy Option'
                        : selectedPhase === 'phase2'
                        ? 'Standard Option'
                        : 'Premium Option'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {repairData[selectedPhase].description}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-primary-700">
                    ${totalCost.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  Includes 40% gross margin
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="submit"
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
                  Save Repair
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* <SendEmailModal … />  ← removed */}
    </div>
  );
};

export default RepairsForm;
