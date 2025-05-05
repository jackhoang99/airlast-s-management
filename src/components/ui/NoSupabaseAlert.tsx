import { AlertTriangle } from 'lucide-react';

const NoSupabaseAlert = () => {
  return (
    <div className="bg-warning-50 border-l-4 border-warning-500 p-4 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-warning-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-warning-800">
            Supabase Connection Required
          </h3>
          <div className="mt-2 text-sm text-warning-700">
            <p>
              Please click the "Connect to Supabase" button in the top right corner to set up your database connection. This application requires Supabase to store and manage your HVAC customer data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoSupabaseAlert;