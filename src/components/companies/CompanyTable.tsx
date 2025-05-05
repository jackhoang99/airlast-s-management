import { useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../ui/Pagination';
import { Database } from '../../types/supabase';

type Company = Database['public']['Tables']['companies']['Row'];

type CompanyTableProps = {
  companies: Company[];
  isLoading: boolean;
};

const CompanyTable = ({ companies, isLoading }: CompanyTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const paginatedCompanies = companies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalPages = Math.ceil(companies.length / itemsPerPage);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No companies found.</p>
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
          {paginatedCompanies.map((company) => (
            <tr key={company.id}>
              <td className="font-medium">
                <Link to={`/companies/${company.id}`} className="text-primary-600 hover:text-primary-800">
                  {company.name}
                </Link>
              </td>
              <td>{company.address}</td>
              <td>{company.city}</td>
              <td>{company.state}</td>
              <td>{company.zip}</td>
              <td>
                <span className={`badge ${company.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                  {company.status}
                </span>
              </td>
              <td>
                <div className="flex space-x-2">
                  <Link 
                    to={`/companies/${company.id}/edit`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link 
                    to={`/companies/${company.id}/report`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Report
                  </Link>
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

export default CompanyTable;