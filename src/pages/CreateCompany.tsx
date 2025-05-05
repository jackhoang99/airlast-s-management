import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CompanyForm from '../components/companies/CompanyForm';

const CreateCompany = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/companies" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Create Customer Company</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <CompanyForm />
      </div>
    </div>
  );
};

export default CreateCompany;