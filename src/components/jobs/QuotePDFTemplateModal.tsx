import { useState, useEffect } from 'react';
import { X, Save, Upload, FileUp, Check } from 'lucide-react';
import PDFTemplateUploader from './PDFTemplateUploader';
import { useSupabase } from '../../lib/supabase-context';

interface QuotePDFTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: {
    name?: string;
    preservedPages?: number[];
    pdfFile?: File | null;
    type?: 'inspection' | 'repair' | 'replacement';
  };
}

const QuotePDFTemplateModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialData
}: QuotePDFTemplateModalProps) => {
  const { supabase } = useSupabase();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    preservedPages: initialData?.preservedPages || [1], // Default to preserving page 1
    type: initialData?.type || 'repair',
    fileUrl: '',
    fileName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handlePageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Parse the input value to handle ranges and individual pages
    try {
      const pages: number[] = [];
      
      // Split by comma
      const parts = value.split(',');
      
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        // Check if it's a range (contains '-')
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
          
          if (isNaN(start) || isNaN(end)) {
            throw new Error('Invalid range format');
          }
          
          // Add all pages in the range
          for (let i = start; i <= end; i++) {
            if (i > 0 && !pages.includes(i)) {
              pages.push(i);
            }
          }
        } else {
          // It's a single page
          const page = parseInt(trimmed);
          
          if (isNaN(page)) {
            throw new Error('Invalid page number');
          }
          
          if (page > 0 && !pages.includes(page)) {
            pages.push(page);
          }
        }
      }
      
      // Ensure we have at least page 1 preserved if nothing was specified
      if (pages.length === 0) {
        pages.push(1);
      }
      
      setFormData(prev => ({ ...prev, preservedPages: pages }));
      setError(null);
    } catch (err) {
      setError('Please enter valid page numbers (e.g., "1, 2, 4-6")');
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, type: e.target.value as 'inspection' | 'repair' | 'replacement' }));
  };

  const handleUploadSuccess = (fileUrl: string, fileName: string) => {
    setFormData(prev => ({ ...prev, fileUrl, fileName }));
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      setError('Template name is required');
      return;
    }
    
    if (!formData.fileUrl && !initialData?.pdfFile) {
      setError('Please upload a PDF template');
      return;
    }
    
    // Ensure we have at least page 1 preserved
    const preservedPages = formData.preservedPages.length > 0 ? formData.preservedPages : [1];
    
    onSave({
      name: formData.name,
      type: formData.type,
      preservedPages,
      templateData: {
        type: 'pdf',
        templateType: formData.type,
        fileName: formData.fileName,
        fileUrl: formData.fileUrl,
        preservedPages,
        isDefault: false
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">PDF Quote Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
              value={formData.type}
              onChange={handleTypeChange}
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
            <PDFTemplateUploader
              templateId={initialData?.name ? initialData.name : new Date().getTime().toString()}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              initialFileName={initialData?.pdfFile?.name}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preserved Pages
            </label>
            <input
              type="text"
              value={formData.preservedPages.join(', ')}
              onChange={handlePageSelection}
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
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!formData.name || (!formData.fileUrl && !initialData?.pdfFile)}
            >
              <Save size={16} className="mr-2" />
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotePDFTemplateModal;