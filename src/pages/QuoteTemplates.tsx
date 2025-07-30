import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../lib/supabase-context";
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  AlertTriangle,
  Save,
  X,
  FileUp,
  Check,
  HelpCircle,
} from "lucide-react";

type QuoteTemplate = {
  id: string;
  name: string;
  template_data: {
    type: string;
    templateType: "repair" | "replacement" | "pm" | "inspection";
    fileName: string;
    fileUrl: string;
    preservedPages: number[];
    isDefault: boolean;
  };
  user_id: string;
  created_at: string;
  updated_at: string;
};

const QuoteTemplates = () => {
  const { supabase } = useSupabase();
  const [pdfTemplates, setPdfTemplates] = useState<QuoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTemplateType, setActiveTemplateType] = useState<
    "repair" | "replacement" | "pm" | "inspection"
  >("repair");

  const [showAddPdfModal, setShowAddPdfModal] = useState(false);
  const [showDeletePdfModal, setShowDeletePdfModal] = useState(false);
  const [selectedPdfTemplate, setSelectedPdfTemplate] =
    useState<QuoteTemplate | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [pdfFormData, setPdfFormData] = useState({
    name: "",
    type: "repair" as "repair" | "replacement" | "pm" | "inspection",
    preservedPagesStart: "1",
    preservedPagesEnd: "1",
    preservedPagesMiddleStart: "3",
    preservedPagesMiddleEnd: "3",
    showInfoBox: false,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error: fetchError } = await supabase
          .from("quote_templates")
          .select("*")
          .eq("template_data->>type", "pdf")
          .order("name");
        if (fetchError) throw fetchError;
        setPdfTemplates(data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load templates. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
      setError(null);
    } else {
      setError("Please select a valid PDF file (PDF only).");
      setPdfFile(null);
    }
  };

  const handleAddPdfTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError("Supabase not initialized.");
    if (!pdfFile) return setError("Please select a PDF file before saving.");

    const startPage = parseInt(pdfFormData.preservedPagesStart);
    const endPage = parseInt(pdfFormData.preservedPagesEnd);
    const middleStart = parseInt(pdfFormData.preservedPagesMiddleStart);
    const middleEnd = parseInt(pdfFormData.preservedPagesMiddleEnd);

    if (
      isNaN(startPage) ||
      isNaN(endPage) ||
      startPage < 1 ||
      endPage < startPage ||
      isNaN(middleStart) ||
      isNaN(middleEnd) ||
      middleStart < endPage + 1 ||
      middleEnd < middleStart
    ) {
      return setError("Invalid page ranges.");
    }

    setIsUploading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("No user found");

      const templateId = crypto.randomUUID();
      const filePath = `quote-templates/${templateId}/${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("templates")
        .upload(filePath, pdfFile, {
          cacheControl: "3600",
          upsert: true,
          onUploadProgress: ({ loaded, total }) =>
            setUploadProgress(Math.round((loaded / total) * 100)),
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("templates").getPublicUrl(filePath);
      if (!publicUrl) throw new Error("Could not retrieve public URL");

      const preservedPages: number[] = [];
      for (let p = startPage; p <= endPage; p++) preservedPages.push(p);
      for (let p = middleStart; p <= middleEnd; p++) preservedPages.push(p);

      const { error: insertError } = await supabase
        .from("quote_templates")
        .insert({
          name: pdfFormData.name,
          template_data: {
            type: "pdf",
            templateType: pdfFormData.type,
            fileName: pdfFile.name,
            fileUrl: publicUrl,
            preservedPages,
            isDefault: false,
          },
          user_id: user.id,
        });
      if (insertError) throw insertError;

      // refresh
      const { data: refreshed, error: refreshError } = await supabase
        .from("quote_templates")
        .select("*")
        .eq("template_data->>type", "pdf")
        .order("name");
      if (refreshError) throw refreshError;
      setPdfTemplates(refreshed || []);

      // reset
      setPdfFile(null);
      setPdfFormData({
        name: "",
        type: "repair" as "repair" | "replacement" | "pm" | "inspection",
        preservedPagesStart: "1",
        preservedPagesEnd: "1",
        preservedPagesMiddleStart: "3",
        preservedPagesMiddleEnd: "3",
        showInfoBox: false,
      });
      setShowAddPdfModal(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add template");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePdfTemplate = async () => {
    if (!supabase || !selectedPdfTemplate) return;
    try {
      const { error: deleteError } = await supabase
        .from("quote_templates")
        .delete()
        .eq("id", selectedPdfTemplate.id);
      if (deleteError) throw deleteError;

      // remove file
      const fileUrl = selectedPdfTemplate.template_data.fileUrl;
      if (fileUrl) {
        const match = new URL(fileUrl).pathname.match(/\/templates\/(.+)$/);
        if (match?.[1]) {
          await supabase.storage
            .from("templates")
            .remove([decodeURIComponent(match[1])]);
        }
      }

      // refresh
      const { data: refreshed, error: refreshError } = await supabase
        .from("quote_templates")
        .select("*")
        .eq("template_data->>type", "pdf")
        .order("name");
      if (refreshError) throw refreshError;
      setPdfTemplates(refreshed || []);

      setSelectedPdfTemplate(null);
      setShowDeletePdfModal(false);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to delete template"
      );
    }
  };

  const handleSetDefaultTemplate = async (template: QuoteTemplate) => {
    if (!supabase) return;
    try {
      // unset existing
      await supabase
        .from("quote_templates")
        .update({
          template_data: supabase.rpc("jsonb_set_default", {
            template_data: "template_data",
            is_default: false,
          }),
        })
        .eq("template_data->>type", "pdf")
        .eq("template_data->>templateType", template.template_data.templateType)
        .eq("template_data->>isDefault", "true");

      // set new
      const updatedData = { ...template.template_data, isDefault: true };
      await supabase
        .from("quote_templates")
        .update({ template_data: updatedData })
        .eq("id", template.id);

      // refresh
      const { data: refreshed, error: refreshError } = await supabase
        .from("quote_templates")
        .select("*")
        .eq("template_data->>type", "pdf")
        .order("name");
      if (refreshError) throw refreshError;
      setPdfTemplates(refreshed || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to set default");
    }
  };

  const formatPreservedPages = (pages: number[]) => {
    if (!pages.length) return "None";
    const sorted = [...pages].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0],
      end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = sorted[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(", ");
  };

  const filtered = pdfTemplates.filter(
    (t) => t.template_data.templateType === activeTemplateType
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <FileText className="h-6 w-6" /> Quote Templates
          </h1>
        </div>
        <button
          onClick={() => setShowAddPdfModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} className="mr-2" /> Add PDF Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <p className="ml-3 text-sm text-error-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {(["repair", "replacement", "pm", "inspection"] as const).map(
          (type) => (
            <button
              key={type}
              onClick={() => setActiveTemplateType(type)}
              className={`px-4 py-2 font-medium text-sm ${
                activeTemplateType === type
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          )
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : !filtered.length ? (
          <div className="text-center py-8 text-gray-500">
            <p>No PDF templates found for {activeTemplateType} quotes.</p>
            <button
              onClick={() => setShowAddPdfModal(true)}
              className="btn btn-primary mt-4"
            >
              <Plus size={16} className="mr-2" /> Upload PDF Template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((template) => (
              <div
                key={template.id}
                className={`border rounded-lg p-4 hover:bg-gray-50 ${
                  template.template_data.isDefault
                    ? "border-primary-500 bg-primary-50"
                    : ""
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-lg">{template.name}</h3>
                      {template.template_data.isDefault && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Created:{" "}
                      {new Date(template.created_at).toLocaleDateString()}
                      {template.updated_at !== template.created_at && (
                        <>
                          {" "}
                          · Updated:{" "}
                          {new Date(template.updated_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                    <div className="mt-2 text-sm">
                      <p>
                        <strong>File:</strong> {template.template_data.fileName}
                      </p>
                      <p>
                        <strong>Preserved Pages:</strong>{" "}
                        {formatPreservedPages(
                          template.template_data.preservedPages
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    {!template.template_data.isDefault && (
                      <button
                        onClick={() => handleSetDefaultTemplate(template)}
                        className="btn btn-success btn-sm"
                      >
                        <Check size={14} className="mr-1" /> Use Template
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedPdfTemplate(template);
                        setShowDeletePdfModal(true);
                      }}
                      className="btn btn-error btn-sm"
                    >
                      <Trash2 size={14} className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Add PDF Template</h2>
              <button
                onClick={() => setShowAddPdfModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPdfTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={pdfFormData.name}
                  onChange={(e) =>
                    setPdfFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="input w-full"
                  required
                  placeholder="e.g., Standard Quote Template"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type
                </label>
                <select
                  value={pdfFormData.type}
                  onChange={(e) =>
                    setPdfFormData((prev) => ({
                      ...prev,
                      type: e.target.value as
                        | "repair"
                        | "replacement"
                        | "pm"
                        | "inspection",
                    }))
                  }
                  className="select w-full"
                  required
                >
                  <option value="repair">Repair Quote</option>
                  <option value="replacement">Replacement Quote</option>
                  <option value="pm">PM Quote</option>
                  <option value="inspection">Inspection Quote</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload PDF Template *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <FileUp className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      {pdfFile ? pdfFile.name : "Click to upload PDF template"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF only, max 10MB
                    </p>
                  </label>
                </div>
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {uploadProgress}% uploaded
                    </p>
                  </div>
                )}
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex">
                <HelpCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">
                    How Page Preservation Works
                  </p>
                  <p>
                    You can specify two ranges of pages to preserve from your
                    template:
                  </p>
                  <ol className="list-decimal ml-5 mt-1 space-y-1">
                    <li>
                      First range: Pages that appear before the dynamic content
                    </li>
                    <li>
                      Second range: Pages that appear after the dynamic content
                    </li>
                  </ol>
                  <p className="mt-1">
                    The dynamic quote content will be inserted between these two
                    ranges.
                  </p>
                  <p className="mt-1">
                    Example: If you specify pages 1-2 and 4-5, the dynamic
                    content will be inserted as page 3.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Range: Preserve Pages
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={pdfFormData.preservedPagesStart}
                    onChange={(e) =>
                      setPdfFormData((prev) => ({
                        ...prev,
                        preservedPagesStart: e.target.value,
                      }))
                    }
                    className="input w-full"
                    required
                    placeholder="Start page"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    min={pdfFormData.preservedPagesStart || 1}
                    value={pdfFormData.preservedPagesEnd}
                    onChange={(e) =>
                      setPdfFormData((prev) => ({
                        ...prev,
                        preservedPagesEnd: e.target.value,
                      }))
                    }
                    className="input w-full"
                    required
                    placeholder="End page"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pages that appear before the dynamic content
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Second Range: Preserve Pages
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={parseInt(pdfFormData.preservedPagesEnd) + 1 || 2}
                    value={pdfFormData.preservedPagesMiddleStart}
                    onChange={(e) =>
                      setPdfFormData((prev) => ({
                        ...prev,
                        preservedPagesMiddleStart: e.target.value,
                      }))
                    }
                    className="input w-full"
                    required
                    placeholder="Start page"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    min={pdfFormData.preservedPagesMiddleStart || 3}
                    value={pdfFormData.preservedPagesMiddleEnd}
                    onChange={(e) =>
                      setPdfFormData((prev) => ({
                        ...prev,
                        preservedPagesMiddleEnd: e.target.value,
                      }))
                    }
                    className="input w-full"
                    required
                    placeholder="End page"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pages that appear after the dynamic content
                </p>
              </div>
              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddPdfModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading || !pdfFile || !pdfFormData.name}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save Template
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeletePdfModal && selectedPdfTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete PDF Template
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete “{selectedPdfTemplate.name}”? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeletePdfModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePdfTemplate}
                className="btn btn-error"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteTemplates;
