import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useSupabase } from "../lib/supabase-context";
import CompanyForm from "../components/companies/CompanyForm";
import type { Database } from "../types/supabase";

type Company = Database["public"]["Tables"]["companies"]["Row"];

const EditCompany = () => {
  const { id } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!supabase || !id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        setCompany(data);
      } catch (err) {
        console.error("Error fetching company:", err);
        setError("Failed to fetch company details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [supabase, id]);

  const handleDelete = async () => {
    if (!supabase || !company) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from("companies")
        .delete()
        .eq("id", company.id);

      if (deleteError) throw deleteError;
      navigate("/companies");
    } catch (err) {
      console.error("Error deleting company:", err);
      setError("Failed to delete company. Please try again.");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

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
        <p className="text-error-600 mb-4">{error || "Company not found"}</p>
        <Link
          to="/companies"
          className="text-primary-600 hover:text-primary-800"
        >
          Back to Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/companies/${id}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1>Edit Company</h1>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
        >
          Delete Company
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <CompanyForm
          initialData={company}
          onSuccess={() => navigate(`/companies/${id}`)}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete Company
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete <strong>{company.name}</strong>?
              This will also delete all associated locations and units and
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCompany;
