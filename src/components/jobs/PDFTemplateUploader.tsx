import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Loader, AlertTriangle, Check, X } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';

type PDFTemplateUploaderProps = {
  onUploadSuccess: (fileUrl: string, fileName: string) => void;
  onUploadError: (error: string) => void;
  templateId: string;
  initialFileName?: string;
};

const PDFTemplateUploader = ({
  onUploadSuccess,
  onUploadError,
  templateId,
  initialFileName
}: PDFTemplateUploaderProps) => {
  const { supabase } = useSupabase();
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>(initialFileName || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setUploadStatus('error');
      setError('Only PDF files are allowed');
      onUploadError('Only PDF files are allowed');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadStatus('error');
      setError('File size exceeds 10MB limit');
      onUploadError('File size exceeds 10MB limit');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setUploadStatus('uploading');

    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      // Create a unique file path
      const filePath = `quote-templates/${templateId}/${selectedFile.name}`;
      
      // Upload the file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      if (urlData) {
        setUploadStatus('success');
        onUploadSuccess(urlData.publicUrl, selectedFile.name);
      } else {
        throw new Error('Failed to get public URL for uploaded file');
      }
    } catch (err) {
      console.error('Error uploading PDF template:', err);
      setUploadStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      onUploadError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const handleRetry = () => {
    setUploadStatus('idle');
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {uploadStatus === 'idle' ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
            id="pdf-file-upload"
          />
          <label
            htmlFor="pdf-file-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            <Upload className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {initialFileName ? 'Change PDF Template' : 'Upload PDF Template'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {initialFileName ? `Current file: ${initialFileName}` : 'Click to browse or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF only, max 10MB</p>
          </label>
        </div>
      ) : uploadStatus === 'uploading' ? (
        <div className="border-2 border-gray-300 rounded-lg p-6 text-center">
          <Loader className="h-12 w-12 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">Uploading {fileName}...</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
            <div className="bg-primary-600 h-2.5 rounded-full w-1/2"></div>
          </div>
        </div>
      ) : uploadStatus === 'success' ? (
        <div className="border-2 border-success-300 bg-success-50 rounded-lg p-6 text-center">
          <Check className="h-12 w-12 text-success-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-success-700">
            {fileName} uploaded successfully!
          </p>
          <button
            onClick={handleRetry}
            className="mt-3 text-xs text-primary-600 hover:text-primary-800"
          >
            Upload a different file
          </button>
        </div>
      ) : (
        <div className="border-2 border-error-300 bg-error-50 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-error-700">
            {error || 'Failed to upload file'}
          </p>
          <button
            onClick={handleRetry}
            className="mt-3 px-4 py-2 bg-error-600 text-white rounded-md text-sm hover:bg-error-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFTemplateUploader;