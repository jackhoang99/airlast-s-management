import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { ArrowLeft, FileText, Plus, Edit, Trash2, AlertTriangle, Save, X, Upload, FileUp, Check } from 'lucide-react';

type QuoteTemplate = {
  id: string;
  name: string;
  template_data: any;
  user_id: string;
  created_at: string;
  updated_at: string;
};

const QuoteTemplates = () => {
  const { supabase } = useSupabase();
  const [pdfTemplates, setPdfTemplates] = useState<QuoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTemplateType, setActiveTemplateType] = useState<'inspection' | 'repair' | 'replacement'>('repair');
  
  const [showAddPdfModal, setShowAddPdfModal] = useState(false);
  const [showEditPdfModal, setShowEditPdfModal] = useState(false);
  const [showDeletePdfModal, setShowDeletePdfModal] = useState(false);
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<QuoteTemplate | null>(null);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFormData, setPdfFormData] = useState({
    name: '',
    preservedPages: '1',
    type: 'repair' as 'inspection' | 'repair' | 'replacement'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }
        
        // Fetch PDF templates
        const { data, error } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('template_data->>type', 'pdf')
          .order('name');
        
        if (error) throw error;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      setError('Please select a valid PDF file');
      setPdfFile(null);
    }
  };

  const handleAddPdfTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase || !pdfFile) {
      setError('Please select a PDF file');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // 1. Get the current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // 2. Create a unique template ID
      const templateId = crypto.randomUUID();
      
      // 3. Upload the PDF to storage
      const filePath = `quote-templates/${templateId}/${pdfFile.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, pdfFile, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        });
      
      if (uploadError) throw uploadError;
      
      // 4. Get the public URL
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);
      
      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      // 5. Parse preserved pages
      const preservedPages = pdfFormData.preservedPages
        .split(',')
        .map(p => p.trim())
        .filter(p => p)
        .map(p => {
          if (p.includes('-')) {
            const [start, end] = p.split('-').map(n => parseInt(n.trim()));
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
          }
          return parseInt(p);
        })
        .flat()
        .filter(p => !isNaN(p) && p > 0);
      
      if (preservedPages.length === 0) {
        preservedPages.push(1); // Default to preserving page 1
      }
      
      // 6. Save template to database
      const { error: insertError } = await supabase
        .from('quote_templates')
        .insert({
          name: pdfFormData.name,
          template_data: {
            type: 'pdf',
            templateType: pdfFormData.type,
            fileName: pdfFile.name,
            fileUrl: urlData.publicUrl,
            preservedPages,
            isDefault: false
          },
          user_id: userData.user.id
        });
      
      if (insertError) throw insertError;
      
      // 7. Refresh templates
      const { data: refreshData, error: refreshError } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', 'pdf')
        .order('name');
      
      if (refreshError) throw refreshError;
      setPdfTemplates(refreshData || []);
      
      // 8. Reset form and close modal
      setPdfFile(null);
      setPdfFormData({
        name: '',
        preservedPages: '1',
        type: 'repair'
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

  const handleDeletePdfTemplate = async () => {
    if (!supabase || !selectedPdfTemplate) return;
    
    try {
      // 1. Delete the template from the database
      const { error: deleteError } = await supabase
        .from('quote_templates')
        .delete()
        .eq('id', selectedPdfTemplate.id);
      
      if (deleteError) throw deleteError;
      
      // 2. Delete the file from storage if possible
      if (selectedPdfTemplate.template_data.fileUrl) {
        const url = new URL(selectedPdfTemplate.template_data.fileUrl);
        const pathMatch = url.pathname.match(/\/templates\/(.+)$/);
        
        if (pathMatch && pathMatch[1]) {
          const filePath = decodeURIComponent(pathMatch[1]);
          
          await supabase.storage
            .from('templates')
            .remove([filePath]);
        }
      }
      
      // 3. Refresh templates
      const { data, error: refreshError } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', 'pdf')
        .order('name');
      
      if (refreshError) throw refreshError;
      setPdfTemplates(data || []);
      
      // 4. Reset state and close modal
      setSelectedPdfTemplate(null);
      setShowDeletePdfModal(false);
      
    } catch (err) {
      console.error('Error deleting PDF template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete PDF template');
    }
  };

  const handleSetDefaultTemplate = async (template: QuoteTemplate) => {
    if (!supabase) return;
    
    try {
      // 1. First, unset any existing default templates of this type
      const { error: updateError1 } = await supabase
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
      
      if (updateError1) {
        console.warn('Error unsetting existing default templates:', updateError1);
        // Continue anyway
      }
      
      // 2. Set the new default template
      const updatedTemplateData = {
        ...template.template_data,
        isDefault: true
      };
      
      const { error: updateError2 } = await supabase
        .from('quote_templates')
        .update({
          template_data: updatedTemplateData
        })
        .eq('id', template.id);
      
      if (updateError2) throw updateError2;
      
      // 3. Refresh templates
      const { data, error: refreshError } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', 'pdf')
        .order('name');
      
      if (refreshError) throw refreshError;
      setPdfTemplates(data || []);
      
    } catch (err) {
      console.error('Error setting default template:', err);
      setError(err instanceof Error ? err.message : 'Failed to set default template');
    }
  };

  // Filter templates by type
  const filteredPdfTemplates = pdfTemplates.filter(template => 
    !template.template_data.templateType || 
    template.template_data.templateType === activeTemplateType
  );

  return (
    <div className="space-y-6">
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddPdfModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} className="mr-2" />
            Add PDF Template
          </button>
        </div>
      </div>

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

      {/* Template Type Filter */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTemplateType('inspection')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTemplateType === 'inspection'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Inspection
        </button>
        <button
          onClick={() => setActiveTemplateType('repair')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTemplateType === 'repair'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Repair
        </button>
        <button
          onClick={() => setActiveTemplateType('replacement')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTemplateType === 'replacement'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Replacement
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          // PDF Templates
          filteredPdfTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No PDF templates found for {activeTemplateType} quotes. Upload your first PDF template to get started.</p>
              <button
                onClick={() => setShowAddPdfModal(true)}
                className="btn btn-primary mt-4"
              >
                <Upload size={16} className="mr-2" />
                Upload PDF Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPdfTemplates.map(template => (
                <div key={template.id} className={`border rounded-lg p-4 hover:bg-gray-50 ${template.template_data.isDefault ? 'border-primary-500 bg-primary-50' : ''}`}>
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
                        Created: {new Date(template.created_at).toLocaleDateString()}
                        {template.updated_at && template.updated_at !== template.created_at && 
                          ` • Updated: ${new Date(template.updated_at).toLocaleDateString()}`}
                      </p>
                      <div className="mt-2 text-sm">
                        <p><strong>File:</strong> {template.template_data.fileName}</p>
                        <p><strong>Preserved Pages:</strong> {template.template_data.preservedPages?.length > 0 
                          ? template.template_data.preservedPages.join(', ') 
                          : '1'}</p>
                      </div>
                    </div>
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
          )
        )}
      </div>

      {/* Add PDF Template Modal */}
      {showAddPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Add PDF Template</h2>
              <button onClick={() => setShowAddPdfModal(false)} className="text-gray-400 hover:text-gray-600">
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
                  onChange={(e) => setPdfFormData(prev => ({ ...prev, name: e.target.value }))}
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
                  onChange={(e) => setPdfFormData(prev => ({ ...prev, type: e.target.value as 'inspection' | 'repair' | 'replacement' }))}
                  className="select w-full"
                  required
                >
                  <option value="inspection">Inspection Quote</option>
                  <option value="repair">Repair Quote</option>
                  <option value="replacement">Replacement Quote</option>
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
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <FileUp className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      {pdfFile ? pdfFile.name : 'Click to upload PDF template'}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preserved Pages
                </label>
                <input
                  type="text"
                  value={pdfFormData.preservedPages}
                  onChange={(e) => setPdfFormData(prev => ({ ...prev, preservedPages: e.target.value }))}
                  className="input w-full"
                  placeholder="e.g., 1, 2, 4-6"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter page numbers to preserve (e.g., "1, 2, 4-6"). These pages will remain unchanged when generating quotes.
                  If left empty, page 1 will be preserved by default.
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

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to delete the PDF template "{selectedPdfTemplate.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeletePdfModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeletePdfTemplate}
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