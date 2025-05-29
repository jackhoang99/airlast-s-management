import { useState, useEffect } from 'react';
import { Home, Save, Plus, Trash2, Calculator, Send } from 'lucide-react';
import { useSupabase } from '../../../lib/supabase-context';

type PhaseOption = {
  description: string;
  cost: number;
};

type AccessoryItem = {
  name: string;
  cost: number;
};

type ReplacementData = {
  needsCrane: boolean;
  phase1: PhaseOption;
  phase2: PhaseOption;
  phase3: PhaseOption;
  labor: number;
  refrigerationRecovery: number;
  startUpCosts: number;
  accessories: AccessoryItem[];
  thermostatStartup: number;
  removalCost: number;
  warranty: string;
  additionalItems: AccessoryItem[];
  permitCost: number;
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

type ReplacementFormProps = {
  jobId: string;
  initialData?: ReplacementData;
  onSave?: (data: ReplacementData) => void;
  selectedInspection?: InspectionData;
};

const ReplacementForm = ({ jobId, initialData, onSave, selectedInspection }: ReplacementFormProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
  const [allInspections, setAllInspections] = useState<InspectionData[]>([]);
  const [replacementData, setReplacementData] = useState<ReplacementData>(
    initialData || {
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
    }
  );
  const [totalCost, setTotalCost] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<'phase1' | 'phase2' | 'phase3'>('phase2');
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');

  // Fetch existing replacement data and inspection data
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !jobId) return;

      try {
        // Fetch replacement data
        const { data: replacementData, error: replacementError } = await supabase
          .from('job_replacements')
          .select('*')
          .eq('job_id', jobId)
          .maybeSingle();

        if (replacementError && !replacementError.message.includes('The result contains 0 rows')) {
          throw replacementError;
        }

        if (replacementData) {
          setReplacementData({
            needsCrane: replacementData.needs_crane || false,
            phase1: replacementData.phase1 || { description: 'Economy Option', cost: 0 },
            phase2: replacementData.phase2 || { description: 'Standard Option', cost: 0 },
            phase3: replacementData.phase3 || { description: 'Premium Option', cost: 0 },
            labor: replacementData.labor || 0,
            refrigerationRecovery: replacementData.refrigeration_recovery || 0,
            startUpCosts: replacementData.start_up_costs || 0,
            accessories: replacementData.accessories || [{ name: '', cost: 0 }],
            thermostatStartup: replacementData.thermostat_startup || 0,
            removalCost: replacementData.removal_cost || 0,
            warranty: replacementData.warranty || '',
            additionalItems: replacementData.additional_items || [{ name: '', cost: 0 }],
            permitCost: replacementData.permit_cost || 0,
          });
          
          // Set selected phase if it exists
          if (replacementData.selected_phase) {
            setSelectedPhase(replacementData.selected_phase as 'phase1' | 'phase2' | 'phase3');
          }
        }

        // Fetch all completed inspections
        const { data: inspectionsData, error: inspectionsError } = await supabase
          .from('job_inspections')
          .select('*')
          .eq('job_id', jobId)
          .eq('completed', true)
          .order('created_at', { ascending: false });

        if (inspectionsError) throw inspectionsError;
        setAllInspections(inspectionsData || []);

        // If no selectedInspection is provided, use the first completed inspection
        if (!selectedInspection && inspectionsData && inspectionsData.length > 0) {
          setInspectionData(inspectionsData[0]);
        } else if (selectedInspection) {
          // Use the provided selectedInspection
          setInspectionData(selectedInspection);
        }
        
        // Fetch job details
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
        setCustomerEmail(jobData.contact_email || '');
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      }
    };

    fetchData();
  }, [supabase, jobId, selectedInspection]);

  // Calculate total cost whenever relevant fields change or selected phase changes
  useEffect(() => {
    // Calculate total cost based on selected phase
    const calculateTotalCost = () => {
      const phaseCost = selectedPhase === 'phase1' ? replacementData.phase1.cost : 
                      selectedPhase === 'phase2' ? replacementData.phase2.cost : 
                      replacementData.phase3.cost;
      
      // Sum of all costs
      const baseCosts = 
        Number(phaseCost) +
        Number(replacementData.labor) +
        Number(replacementData.refrigerationRecovery) +
        Number(replacementData.startUpCosts) +
        Number(replacementData.thermostatStartup) +
        Number(replacementData.removalCost) +
        Number(replacementData.permitCost);
      
      // Add accessories costs
      const accessoriesCost = replacementData.accessories.reduce(
        (sum, item) => sum + Number(item.cost), 0
      );
      
      // Add additional items costs
      const additionalItemsCost = replacementData.additionalItems.reduce(
        (sum, item) => sum + Number(item.cost), 0
      );
      
      // Total direct costs
      const totalDirectCosts = baseCosts + accessoriesCost + additionalItemsCost;
      
      // Apply 40% margin (divide by 0.6 to get price with 40% margin)
      const totalWithMargin = totalDirectCosts > 0 ? Math.round(totalDirectCosts / 0.6) : 0;
      
      return totalWithMargin;
    };
    
    setTotalCost(calculateTotalCost());
  }, [replacementData, selectedPhase]);

  // Update inspection data when selectedInspection changes
  useEffect(() => {
    if (selectedInspection) {
      setInspectionData(selectedInspection);
    }
  }, [selectedInspection]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !jobId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if replacement data already exists
      const { data: existingData, error: checkError } = await supabase
        .from('job_replacements')
        .select('id')
        .eq('job_id', jobId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      const dataToSave = {
        job_id: jobId,
        needs_crane: replacementData.needsCrane,
        phase1: replacementData.phase1,
        phase2: replacementData.phase2,
        phase3: replacementData.phase3,
        labor: replacementData.labor,
        refrigeration_recovery: replacementData.refrigerationRecovery,
        start_up_costs: replacementData.startUpCosts,
        accessories: replacementData.accessories,
        thermostat_startup: replacementData.thermostatStartup,
        removal_cost: replacementData.removalCost,
        warranty: replacementData.warranty,
        additional_items: replacementData.additionalItems,
        permit_cost: replacementData.permitCost,
        updated_at: new Date().toISOString(),
        selected_phase: selectedPhase,
        total_cost: totalCost
      };

      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('job_replacements')
          .update(dataToSave)
          .eq('id', existingData.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('job_replacements')
          .insert(dataToSave);

        if (insertError) throw insertError;
      }

      setSuccess('Repair data saved successfully');
      
      if (onSave) {
        onSave(replacementData);
      }
    } catch (err) {
      console.error('Error saving repair data:', err);
      setError('Failed to save repair data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFinishRepairDetails = () => {
    // First save the repair details
    handleSubmit(new Event('submit') as any);
    // Then show the quote modal
    setShowQuoteModal(true);
  };
  
  const handleSendQuote = async () => {
    if (!supabase || !jobId || !customerEmail) {
      setError('Customer email is required to send a quote');
      return;
    }
    
    setIsSendingQuote(true);
    setError(null);
    
    try {
      // Generate a unique token for quote confirmation
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Update job with token and quote sent status
      const { data: updatedJob, error: updateError } = await supabase
        .from('jobs')
        .update({
          quote_token: token,
          quote_sent: true,
          quote_sent_at: new Date().toISOString(),
          contact_email: customerEmail // Update with potentially edited email
        })
        .eq('id', jobId)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Call the Supabase Edge Function to send the email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-repair-quote`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          jobId,
          customerEmail,
          quoteToken: token,
          jobNumber: jobDetails.number,
          jobName: jobDetails.name,
          customerName: jobDetails.contact_name,
          inspectionData: allInspections, // Send all inspections
          replacementData: replacementData,
          selectedPhase: selectedPhase,
          totalCost: totalCost,
          location: jobDetails.locations ? {
            name: jobDetails.locations.name,
            address: jobDetails.locations.address,
            city: jobDetails.locations.city,
            state: jobDetails.locations.state,
            zip: jobDetails.locations.zip
          } : null,
          unit: jobDetails.units ? {
            unit_number: jobDetails.units.unit_number
          } : null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send quote email');
      }
      
      setSuccess('Quote sent successfully!');
      setShowQuoteModal(false);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setIsSendingQuote(false);
    }
  };

  return (
    <div>
      {inspectionData && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Inspection Information</h4>
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
      
      <form onSubmit={handleSubmit}>
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

          {/* Phase Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Repair Option
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div className="h-3 w-3 bg-primary-500 rounded-full"></div>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={replacementData.phase1.description}
                  onChange={(e) => setReplacementData(prev => ({ 
                    ...prev, 
                    phase1: { ...prev.phase1, description: e.target.value } 
                  }))}
                  className="input w-full mb-2"
                  placeholder="Description"
                />
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
                    placeholder="Cost"
                  />
                </div>
              </div>

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
                      <div className="h-3 w-3 bg-primary-500 rounded-full"></div>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={replacementData.phase2.description}
                  onChange={(e) => setReplacementData(prev => ({ 
                    ...prev, 
                    phase2: { ...prev.phase2, description: e.target.value } 
                  }))}
                  className="input w-full mb-2"
                  placeholder="Description"
                />
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
                    placeholder="Cost"
                  />
                </div>
              </div>

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
                      <div className="h-3 w-3 bg-primary-500 rounded-full"></div>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={replacementData.phase3.description}
                  onChange={(e) => setReplacementData(prev => ({ 
                    ...prev, 
                    phase3: { ...prev.phase3, description: e.target.value } 
                  }))}
                  className="input w-full mb-2"
                  placeholder="Description"
                />
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
                    placeholder="Cost"
                  />
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
                    {selectedPhase === 'phase1' ? 'Economy Option' : 
                     selectedPhase === 'phase2' ? 'Standard Option' : 
                     'Premium Option'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {replacementData[selectedPhase].description}
                  </div>
                </div>
                <div className="text-xl font-bold text-primary-700">${totalCost.toLocaleString()}</div>
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
            className="btn btn-secondary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-primary-600 rounded-full mr-2"></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Repair
              </>
            )}
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleFinishRepairDetails}
            disabled={isLoading || totalCost === 0}
          >
            <Send size={16} className="mr-2" />
            Finish Repair Details
          </button>
        </div>
      </form>
      
      {/* Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-primary-600 mb-4">
              <Send size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Send Repair Quote
            </h3>
            
            {error && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will send a repair quote to the customer based on the inspection results and repair details you've entered.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    id="customerEmail"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="input"
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Selected Option:</span>
                    <span className="font-medium">
                      {selectedPhase === 'phase1' ? 'Economy' : 
                       selectedPhase === 'phase2' ? 'Standard' : 
                       'Premium'}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium">{replacementData[selectedPhase].description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">${totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowQuoteModal(false)}
                disabled={isSendingQuote}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSendQuote}
                disabled={isSendingQuote || !customerEmail}
              >
                {isSendingQuote ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Quote
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReplacementForm;