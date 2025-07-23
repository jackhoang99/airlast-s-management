import { Link } from "react-router-dom";
import ArrowBack from "../components/ui/ArrowBack";
import CompanyForm from "../components/companies/CompanyForm";

const CreateCompany = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowBack
            fallbackRoute="/companies"
            className="text-gray-500 hover:text-gray-700"
          />
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
