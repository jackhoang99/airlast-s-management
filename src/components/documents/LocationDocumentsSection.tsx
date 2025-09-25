import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import { FileText, Plus, Edit, Trash2, Download, Eye } from "lucide-react";
import AddDocumentModal from "./AddDocumentModal";
import EditDocumentModal from "./EditDocumentModal";
import ViewDocumentFileModal from "./ViewDocumentFileModal";

type LocationDocument =
  Database["public"]["Tables"]["location_documents"]["Row"] & {
    locations?: {
      name: string;
      address: string;
      city: string;
      state: string;
      companies?: {
        name: string;
      };
    };
  };

interface LocationDocumentsSectionProps {
  locationId: string;
  companyId: string;
  title?: string;
}

const LocationDocumentsSection: React.FC<LocationDocumentsSectionProps> = ({
  locationId,
  companyId,
  title = "Location Documents",
}) => {
  const { supabase } = useSupabase();
  const [documents, setDocuments] = useState<LocationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<LocationDocument | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [supabase, locationId]);

  const fetchDocuments = async () => {
    if (!supabase) return;

    try {
      setLoading(true);
      if (!locationId) {
        setDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from("location_documents")
        .select(
          `
          *,
          locations (
            name,
            address,
            city,
            state,
            companies (
              name
            )
          )
        `
        )
        .eq("location_id", locationId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = () => {
    setShowAddModal(true);
  };

  const handleEditDocument = (document: LocationDocument) => {
    setSelectedDocument(document);
    setShowEditModal(true);
  };

  const handleViewDocument = (document: LocationDocument) => {
    setSelectedDocument(document);
    setShowViewModal(true);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!supabase) return;

    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error } = await supabase
        .from("location_documents")
        .update({ status: "deleted" })
        .eq("id", documentId);

      if (error) throw error;
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleDownloadDocument = async (document: LocationDocument) => {
    if (!supabase || !document.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from("location-documents")
        .createSignedUrl(document.file_path, 3600);

      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = document.file_name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "archived":
        return "bg-yellow-100 text-yellow-800";
      case "deleted":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDocumentTypeIcon = (documentType: string | null) => {
    switch (documentType) {
      case "contract":
        return "📄";
      case "warranty":
        return "🛡️";
      case "manual":
        return "📖";
      case "certificate":
        return "🏆";
      case "permit":
        return "📋";
      case "inspection":
        return "🔍";
      default:
        return "📄";
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            {title}
          </h2>
        </div>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-600" />
          {title}
        </h2>
        <button onClick={handleAddDocument} className="btn btn-primary btn-xs">
          <Plus size={14} className="mr-1" />
          Add Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">
            No documents found
          </h3>
          <p className="text-gray-500 mb-3 text-sm">
            Get started by adding your first document for this location
          </p>
          <button
            onClick={handleAddDocument}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} className="mr-1" />
            Add Document
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document Name
                </th>
                <th className="hidden md:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="hidden lg:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden xl:table-cell px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-xs">
                          {getDocumentTypeIcon(document.document_type)}
                        </span>
                      </div>
                      <span className="font-medium break-words">
                        {document.document_name}
                      </span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-2 text-sm text-gray-500">
                    {document.description ? (
                      <span className="break-words">
                        {document.description}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-2 text-sm text-gray-500">
                    {document.file_name ? (
                      <div className="flex flex-col">
                        <span className="text-sm break-words">
                          {document.file_name}
                        </span>
                        {document.file_size && (
                          <span className="text-xs text-gray-400">
                            {Math.round(document.file_size / 1024)} KB
                          </span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        document.status
                      )}`}
                    >
                      {document.status}
                    </span>
                  </td>
                  <td className="hidden xl:table-cell px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {new Date(document.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {document.file_path && (
                        <>
                          <button
                            onClick={() => handleViewDocument(document)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="View document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(document)}
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="Download document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditDocument(document)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit document"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddDocumentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchDocuments}
        locationId={locationId}
        companyId={companyId}
        documentType="location"
      />

      {selectedDocument && (
        <>
          <EditDocumentModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedDocument(null);
            }}
            onSuccess={fetchDocuments}
            document={selectedDocument}
            documentType="location"
          />

          <ViewDocumentFileModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setSelectedDocument(null);
            }}
            documentData={selectedDocument}
            documentType="location"
          />
        </>
      )}
    </div>
  );
};

export default LocationDocumentsSection;
