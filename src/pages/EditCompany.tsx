import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSupabase } from '../lib/supabase-context';
import CompanyForm from '../components/companies/CompanyForm';
import type { Database } from '../types/supabase';

type Company = Database['public']['Tables']['companies']['Row'];

const EditCompany = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!supabase || !id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setCompany(data);
      } catch (err) {
        console.error('Error fetching company:', err);
        setError('Failed to fetch company details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [supabase, id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error || 'Company not found'}</p>
        <Link to="/companies" className="text-primary-600 hover:text-primary-800">
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/companies/${id}`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Edit Company</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <CompanyForm 
          initialData={company}
          onSuccess={() => navigate(`/companies/${id}`)}
        />
      </div>
    </div>
  );
};

export default EditCompany;