import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LocationForm from '../components/locations/LocationForm';

const CreateLocation = () => {
  const { companyId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={companyId ? `/companies/${companyId}` : '/companies'} 
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Add Location</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <LocationForm companyId={companyId} />
      </div>
    </div>
  );
};

export default CreateLocation;