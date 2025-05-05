import { useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../ui/Pagination';
import { Database } from '../../types/supabase';

type Location = Database['public']['Tables']['locations']['Row'];

type LocationTableProps = {
  locations: Location[];
  companyId?: string;
  isLoading: boolean;
};

const LocationTable = ({ locations, companyId, isLoading }: LocationTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const paginatedLocations = locations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(locations.length / itemsPerPage);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No locations found.</p>
      </div>
    );
  }

  return (
    <div className="table-container animate-fade">
      <table className="table table-row-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Address</th>
            <th>City</th>
            <th>State</th>
            <th>Zip</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedLocations.map((location) => (
            <tr key={location.id}>
              <td className="font-medium">
                {location.name}
              </td>
              <td>{location.address}</td>
              <td>{location.city}</td>
              <td>{location.state}</td>
              <td>{location.zip}</td>
              <td>
                <span className={`badge ${location.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                  {location.status}
                </span>
              </td>
              <td>
                <div className="flex space-x-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default LocationTable;