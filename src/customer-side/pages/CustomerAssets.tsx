import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useSupabase } from '../../lib/supabase-context';
import { Package, Search, Filter, Calendar, AlertTriangle, Building2, MapPin } from 'lucide-react';

const CustomerAssets = () => {
  const { supabase } = useSupabase();
  const { company, searchTerm: globalSearchTerm } = useOutletContext<{ company: any, searchTerm: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    modelNumber: '',
    serialNumber: '',
    unitType: '',
    location: '',
    unit: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    // Set local search term from global search if provided
    if (globalSearchTerm) {
      setSearchTerm(globalSearchTerm);
    }
  }, [globalSearchTerm]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!supabase || !company) return;

      try {
        setIsLoading(true);
        
        // First get all locations for this company
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('id, name')
          .eq('company_id', company.id)
          .order('name');
          
        if (locationError) throw locationError;
        setLocations(locationData || []);
        
        const locationIds = locationData?.map(loc => loc.id) || [];
        
        if (locationIds.length === 0) {
          setAssets([]);
          setIsLoading(false);
          return;
        }
        
        // Get all units for these locations
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('id, unit_number, location_id')
          .in('location_id', locationIds)
          .order('unit_number');
          
        if (unitError) throw unitError;
        setUnits(unitData || []);
        
        const unitIds = unitData?.map(unit => unit.id) || [];
        
        if (unitIds.length === 0) {
          setAssets([]);
          setIsLoading(false);
          return;
        }
        
        // Then fetch all assets for these units
        let query = supabase
          .from('assets')
          .select(`
            *,
            units (
              id,
              unit_number,
              location_id,
              locations (
                id,
                name,
                company_id,
                companies (
                  name
                )
              )
            )
          `)
          .in('unit_id', unitIds);
          
        // Apply filters
        if (filters.modelNumber) {
          query = query.ilike('model->>model_number', `%${filters.modelNumber}%`);
        }
        if (filters.serialNumber) {
          query = query.ilike('model->>serial_number', `%${filters.serialNumber}%`);
        }
        if (filters.unitType) {
          query = query.eq('model->>unit_type', filters.unitType);
        }
        if (filters.location) {
          query = query.eq('units.location_id', filters.location);
        }
        if (filters.unit) {
          query = query.eq('unit_id', filters.unit);
        }
        if (filters.dateFrom) {
          query = query.gte('inspection_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('inspection_date', filters.dateTo);
        }
        
        const { data, error } = await query.order('inspection_date', { ascending: false });
        
        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('Failed to load assets');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssets();
  }, [supabase, company, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      modelNumber: '',
      serialNumber: '',
      unitType: '',
      location: '',
      unit: '',
      dateFrom: '',
      dateTo: '',
    });
    setSearchTerm('');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredAssets = assets.filter(asset => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const modelNumber = asset.model?.model_number?.toLowerCase() || '';
    const serialNumber = asset.model?.serial_number?.toLowerCase() || '';
    const unitType = asset.model?.unit_type?.toLowerCase() || '';
    const systemType = asset.model?.system_type?.toLowerCase() || '';
    const unitNumber = asset.units?.unit_number?.toLowerCase() || '';
    const locationName = asset.units?.locations?.name?.toLowerCase() || '';
    
    return (
      modelNumber.includes(searchLower) ||
      serialNumber.includes(searchLower) ||
      unitType.includes(searchLower) ||
      systemType.includes(searchLower) ||
      unitNumber.includes(searchLower) ||
      locationName.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Assets</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 input w-full"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <Filter size={16} className="mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="modelNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Model Number
              </label>
              <input
                type="text"
                id="modelNumber"
                name="modelNumber"
                value={filters.modelNumber}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                value={filters.serialNumber}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="unitType" className="block text-sm font-medium text-gray-700 mb-1">
                Unit Type
              </label>
              <select
                id="unitType"
                name="unitType"
                value={filters.unitType}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Types</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                id="location"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                id="unit"
                name="unit"
                value={filters.unit}
                onChange={handleFilterChange}
                className="select"
              >
                <option value="">All Units</option>
                {units
                  .filter(unit => !filters.location || unit.location_id === filters.location)
                  .map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
          </div>
        )}

        {showFilters && (
          <div className="flex justify-end mb-4">
            <button
              onClick={resetFilters}
              className="text-primary-600 hover:text-primary-800"
            >
              Reset Filters
            </button>
          </div>
        )}

        {error && (
          <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-error-500" />
              <div className="ml-3">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No assets found. Try adjusting your search or filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map(asset => (
              <Link
                key={asset.id}
                to={`/customer/units/${asset.units.id}/assets`}
                className="bg-white border rounded-lg shadow-sm p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <Package size={16} className="text-primary-600 mr-2" />
                    <h3 className="font-medium">
                      {asset.model?.model_number || "No model number"}
                    </h3>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(asset.inspection_date)}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <div>S/N: {asset.model?.serial_number || "N/A"}</div>
                  <div>Age: {asset.model?.age || "N/A"} years</div>
                  <div>Type: {asset.model?.unit_type || "N/A"}</div>
                </div>
                
                <div className="flex items-center text-xs text-gray-500 mt-3">
                  <Building2 size={14} className="mr-1" />
                  <span>Unit {asset.units.unit_number}</span>
                </div>
                
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <MapPin size={14} className="mr-1" />
                  <span>{asset.units.locations?.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerAssets;