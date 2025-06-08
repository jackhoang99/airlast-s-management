import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
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
  HelpCircle
} from 'lucide-react';

type QuoteTemplate = {
  id: string;
  name: string;
  template_data: {
    type: string;
    templateType: 'inspection' | 'repair' | 'replacement';
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
    'inspection' | 'repair' | 'replacement'
  >('repair');

  const [showAddPdfModal, setShowAddPdfModal] = useState(false);
  const [showDeletePdfModal, setShowDeletePdfModal] = useState(false);
  const [selectedPdfTemplate, setSelectedPdfTemplate] =
    useState<QuoteTemplate | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFormData, setPdfFormData] = useState({
    name: '',
    type: 'repair' as 'inspection' | 'repair' | 'replacement',
    preservedPagesStart: '1',
    preservedPagesEnd: '1',
    preservedPagesMiddleStart: '3',
    preservedPagesMiddleEnd: '3',
    showInfoBox: false
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ------------------------------------------------------------------------
  // 1) Load existing templates from Supabase on mount (or when supabase changes)
  // ------------------------------------------------------------------------
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error: fetchError } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('template_data->>type', 'pdf')
          .order('name');

        if (fetchError) throw fetchError;
        setPdfTemplates(data || []);
      } catch (err) {
        console.error('Error loading templates:', err);
        setError('Failed to load templates. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [supabase]);

  // ------------------------------------------------------------------------
  // 2) Handle user selecting a PDF file
  // ------------------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError(null);
    } else {
      setError('Please select a valid PDF file (PDF only).');
      setPdfFile(null);
    }
  };

  // ------------------------------------------------------------------------
  // 3) Create a new PDF template (upload + insert row)
  //    - Parses preservedPages ranges into an array.
  // ------------------------------------------------------------------------
  const handleAddPdfTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setError('Supabase not initialized.');
      return;
    }
    if (!pdfFile) {
      setError('Please select a PDF file before saving.');
      return;
    }

    // Parse integers from the fields
    const startPage = parseInt(pdfFormData.preservedPagesStart);
    const endPage = parseInt(pdfFormData.preservedPagesEnd);
    const middleStartPage = parseInt(pdfFormData.preservedPagesMiddleStart);
    const middleEndPage = parseInt(pdfFormData.preservedPagesMiddleEnd);

    if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage) {
      setError('"Preserve Start" must be ≥1 and "Preserve End" must be ≥ "Start".');
      return;
    }

    if (isNaN(middleStartPage) || isNaN(middleEndPage) || middleStartPage < endPage + 1 || middleEndPage < middleStartPage) {
      setError('"Middle Start" must be > "Preserve End" and "Middle End" must be ≥ "Middle Start".');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Get current user
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('No user found');

      // 2. Generate unique template ID for folder
      const templateId = crypto.randomUUID();

      // 3. Upload PDF → storage bucket "templates"
      const filePath = `quote-templates/${templateId}/${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });
      if (uploadError) throw uploadError;

      // 4. Retrieve public URL for that file
      const {
        data: { publicUrl }
      } = supabase.storage.from('templates').getPublicUrl(filePath);
      if (!publicUrl) throw new Error('Could not retrieve public URL for upload');

      // 5. Build preservedPages array
      const preservedPages: number[] = [];
      
      // Add first range
      for (let p = startPage; p <= endPage; p++) {
        preservedPages.push(p);
      }
      
      // Add second range
      for (let p = middleStartPage; p <= middleEndPage; p++) {
        preservedPages.push(p);
      }

      // 6. Insert into "quote_templates" table
      const { error: insertError } = await supabase.from('quote_templates').insert({
        name: pdfFormData.name,
        template_data: {
          type: 'pdf',
          templateType: pdfFormData.type,
          fileName: pdfFile.name,
          fileUrl: publicUrl,
          preservedPages,
          isDefault: false
        },
        user_id: user.id
      });
      if (insertError) throw insertError;

      // 7. Refresh the list after inserting
      const {
        data: refreshed,
        error: refreshError
      } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', 'pdf')
        .order('name');
      if (refreshError) throw refreshError;
      setPdfTemplates(refreshed || []);

      // 8. Reset form & close modal
      setPdfFile(null);
      setPdfFormData({
        name: '',
        type: 'repair',
        preservedPagesStart: '1',
        preservedPagesEnd: '1',
        preservedPagesMiddleStart: '3',
        preservedPagesMiddleEnd: '3',
        showInfoBox: false
      });
      setShowAddPdfModal(false);
    } catch (err) {
      console.error('Error adding PDF template:', err);
      setError(err instanceof Error ? err.message : 'Failed to add PDF template');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ------------------------------------------------------------------------
  // 4) Delete a template (and remove storage file if possible)
  // ------------------------------------------------------------------------
  const handleDeletePdfTemplate = async () => {
    if (!supabase || !selectedPdfTemplate) return;

    try {
      // 1. Delete row from database
      const { error: deleteError } = await supabase
        .from('quote_templates')
        .delete()
        .eq('id', selectedPdfTemplate.id);
      if (deleteError) throw deleteError;

      // 2. Remove file from Supabase storage by parsing its publicUrl
      const fileUrl = selectedPdfTemplate.template_data.fileUrl;
      if (fileUrl) {
        const url = new URL(fileUrl);
        const match = url.pathname.match(/\/templates\/(.+)$/);
        if (match && match[1]) {
          const filePath = decodeURIComponent(match[1]);
          await supabase.storage.from('templates').remove([filePath]);
        }
      }

      // 3. Refresh list
      const {
        data: refreshed,
        error: refreshError
      } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', 'pdf')
        .order('name');
      if (refreshError) throw refreshError;
      setPdfTemplates(refreshed || []);

      // 4. Reset & close delete modal
      setSelectedPdfTemplate(null);
      setShowDeletePdfModal(false);
    } catch (err) {
      console.error('Error deleting PDF template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete PDF template');
    }
  };

  // ------------------------------------------------------------------------
  // 5) Set one template as the "default" of its type (inspection/repair/replacement)
  // ------------------------------------------------------------------------
  const handleSetDefaultTemplate = async (template: QuoteTemplate) => {
    if (!supabase) return;

    try {
      // a) Unset any existing default in this templateType
      await supabase
        .from('quote_templates')
        .update({
          template_data: supabase.rpc('jsonb_set_default', {
            template_data: 'template_data',
            is_default: false
          })
        })
        .eq('template_data->>type', 'pdf')
        .eq('template_data->>templateType', template.template_data.templateType)
        .eq('template_data->>isDefault', 'true');

      // b) Mark this selected one as default
      const updatedData = {
        ...template.template_data,
        isDefault: true
      };
      const { error: updateError } = await supabase
        .from('quote_templates')
        .update({ template_data: updatedData })
        .eq('id', template.id);
      if (updateError) throw updateError;

      // c) Refresh the list
      const {
        data: refreshed,
        error: refreshError
      } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', 'pdf')
        .order('name');
      if (refreshError) throw refreshError;
      setPdfTemplates(refreshed || []);
    } catch (err) {
      console.error('Error setting default template:', err);
      setError(err instanceof Error ? err.message : 'Failed to set default template');
    }
  };

  // Format preserved pages for display
  const formatPreservedPages = (pages: number[]) => {
    if (!pages || pages.length === 0) return "None";
    
    // Sort the pages
    const sortedPages = [...pages].sort((a, b) => a - b);
    
    // Find ranges
    const ranges: string[] = [];
    let rangeStart = sortedPages[0];
    let rangeEnd = sortedPages[0];
    
    for (let i = 1; i < sortedPages.length; i++) {
      if (sortedPages[i] === rangeEnd + 1) {
        // Continue the current range
        rangeEnd = sortedPages[i];
      } else {
        // End the current range and start a new one
        ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
        rangeStart = sortedPages[i];
        rangeEnd = sortedPages[i];
      }
    }
    
    // Add the last range
    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
    
    return ranges.join(', ');
  };

  // ------------------------------------------------------------------------
  // 6) Filter the templates by activeTemplateType before rendering
  // ------------------------------------------------------------------------
  const filteredPdfTemplates = pdfTemplates.filter(
    (t) => t.template_data.templateType === activeTemplateType
  );

  // ------------------------------------------------------------------------
  // 7) Render
  // ------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ======== HEADER / BREADCRUMB ======== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Quote Templates
          </h1>
        </div>
        <div>
          <button
            onClick={() => setShowAddPdfModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Add PDF Template
          </button>
        </div>
      </div>

      {/* ======== ERROR BANNER ======== */}
      {error && (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ======== TEMPLATE TYPE TABS ======== */}
      <div className="flex border-b border-gray-200 mb-4">
        {(['inspection', 'repair', 'replacement'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setActiveTemplateType(type)}
            className={`px-4 py-2 font-medium text-sm ${
              activeTemplateType === type
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* ======== LIST OF PDF TEMPLATES ======== */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredPdfTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>
              No PDF templates found for {activeTemplateType} quotes. Upload your first
              PDF template to get started.
            </p>
            <button
              onClick={() => setShowAddPdfModal(true)}
              className="btn btn-primary mt-4"
            >
              <Plus size={16} className="mr-2" />
              Upload PDF Template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPdfTemplates.map((template) => (
              <div
                key={template.id}
                className={`border rounded-lg p-4 hover:bg-gray-50 ${
                  template.template_data.isDefault
                    ? 'border-primary-500 bg-primary-50'
                    : ''
                }`}
              >
                <div className="flex justify-between">
                  {/* LEFT SIDE: Template Info */}
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
                      Created: {new Date(template.created_at).toLocaleDateString()}
                      {template.updated_at &&
                        template.updated_at !== template.created_at && (
                          <> · Updated: {new Date(template.updated_at).toLocaleDateString()}</>
                        )}
                    </p>
                    <div className="mt-2 text-sm">
                      <p>
                        <strong>File:</strong> {template.template_data.fileName}
                      </p>
                      <p>
                        <strong>Preserved Pages:</strong>{' '}
                        {formatPreservedPages(template.template_data.preservedPages)}
                      </p>
                    </div>
                  </div>

                  {/* RIGHT SIDE: Actions */}
                  <div className="flex items-start gap-2">
                    {!template.template_data.isDefault && (
                      <button
                        onClick={() => handleSetDefaultTemplate(template)}
                        className="btn btn-success btn-sm"
                      >
                        <Check size={14} className="mr-1" />
                        Use Template
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedPdfTemplate(template);
                        setShowDeletePdfModal(true);
                      }}
                      className="btn btn-error btn-sm"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================== ADD PDF TEMPLATE MODAL ==================== */}
      {showAddPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
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
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={pdfFormData.name}
                  onChange={(e) =>
                    setPdfFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="input w-full"
                  required
                  placeholder="e.g., Standard Quote Template"
                />
              </div>

              {/* Template Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type
                </label>
                <select
                  value={pdfFormData.type}
                  onChange={(e) =>
                    setPdfFormData((prev) => ({
                      ...prev,
                      type: e.target.value as 'inspection' | 'repair' | 'replacement'
                    }))
                  }
                  className="select w-full"
                  required
                >
                  <option value="inspection">Inspection Quote</option>
                  <option value="repair">Repair Quote</option>
                  <option value="replacement">Replacement Quote</option>
                </select>
              </div>

              {/* Upload PDF Template */}
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
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <FileUp className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      {pdfFile ? pdfFile.name : 'Click to upload PDF template'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF only, max 10MB</p>
                  </label>
                </div>
                {isUploading && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-primary-600 h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {uploadProgress}% uploaded
                    </p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex">
                <HelpCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">How Page Preservation Works</p>
                  <p>You can specify two ranges of pages to preserve from your template:</p>
                  <ol className="list-decimal ml-5 mt-1 space-y-1">
                    <li>First range: Pages that appear before the dynamic content</li>
                    <li>Second range: Pages that appear after the dynamic content</li>
                  </ol>
                  <p className="mt-1">The dynamic quote content will be inserted between these two ranges.</p>
                  <p className="mt-1">Example: If you specify pages 1-2 and 4-5, the dynamic content will be inserted as page 3.</p>
                </div>
              </div>

              {/* First Range */}
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
                        preservedPagesStart: e.target.value
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
                        preservedPagesEnd: e.target.value
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

              {/* Second Range */}
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
                        preservedPagesMiddleStart: e.target.value
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
                        preservedPagesMiddleEnd: e.target.value
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

              {/* Modal Actions */}
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
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
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

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {showDeletePdfModal && selectedPdfTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center text-error-600 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-4">
              Delete PDF Template
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete the PDF template "
              {selectedPdfTemplate.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeletePdfModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-error" onClick={handleDeletePdfTemplate}>
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