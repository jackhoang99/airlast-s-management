import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';
import { ArrowLeft, Printer, Download, AlertTriangle } from 'lucide-react';

interface QuotePDFViewerProps {
  jobId: string;
  quoteType: 'inspection' | 'repair' | 'replacement';
  onBack: () => void;
}

const QuotePDFViewer: React.FC<QuotePDFViewerProps> = ({ 
  jobId, 
  quoteType,
  onBack
}) => {
  const { supabase } = useSupabase();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const generatePDF = async () => {
      if (!supabase || !jobId) {
        setError('Supabase client not initialized');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // 1. Get the job details
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
            *,
            locations (
              name,
              address,
              city,
              state,
              zip,
              companies (
                name
              )
            ),
            units (
              unit_number
            )
          `)
          .eq('id', jobId)
          .single();
          
        if (jobError) throw jobError;
        
        // 2. Get inspection data if needed
        let inspectionData = null;
        if (quoteType === 'inspection' || quoteType === 'repair' || quoteType === 'replacement') {
          const { data: inspData, error: inspError } = await supabase
            .from('job_inspections')
            .select('*')
            .eq('job_id', jobId)
            .eq('completed', true);
            
          if (inspError) throw inspError;
          inspectionData = inspData;
        }
        
        // 3. Get repair data if needed
        let repairData = null;
        if (quoteType === 'repair' || quoteType === 'replacement') {
          const { data: repData, error: repError } = await supabase
            .from('job_repairs')
            .select('*')
            .eq('job_id', jobId)
            .maybeSingle();
            
          if (repError && !repError.message.includes('contains 0 rows')) throw repError;
          repairData = repData;
        }
        
        // 4. Get job items
        const { data: jobItems, error: itemsError } = await supabase
          .from('job_items')
          .select('*')
          .eq('job_id', jobId);
          
        if (itemsError) throw itemsError;
        
        // 5. Get the PDF template for this quote type
        const { data: templateData, error: templateError } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('template_data->>type', 'pdf')
          .eq('template_data->>templateType', quoteType)
          .eq('template_data->>isDefault', 'true')
          .maybeSingle();
          
        if (templateError && !templateError.message.includes('contains 0 rows')) throw templateError;
        
        // If no default template is found, try to find any template of this type
        let templateToUse = templateData;
        if (!templateToUse) {
          console.log('No default template found, looking for any template of type:', quoteType);
          const { data: anyTemplate, error: anyTemplateError } = await supabase
            .from('quote_templates')
            .select('*')
            .eq('template_data->>type', 'pdf')
            .eq('template_data->>templateType', quoteType)
            .limit(1);
            
          if (anyTemplateError) throw anyTemplateError;
          
          if (anyTemplate && anyTemplate.length > 0) {
            console.log('Found non-default template:', anyTemplate[0]);
            templateToUse = anyTemplate[0];
            
            // Set this template as default
            const updatedTemplateData = {
              ...templateToUse.template_data,
              isDefault: true
            };
            
            const { error: updateError } = await supabase
              .from('quote_templates')
              .update({ template_data: updatedTemplateData })
              .eq('id', templateToUse.id);
              
            if (updateError) {
              console.error('Error setting template as default:', updateError);
            } else {
              console.log('Template set as default successfully');
            }
          }
        }
        
        if (!templateToUse) {
          throw new Error(`No PDF template found for ${quoteType} quotes. Please upload a template and set it as default.`);
        }
        
        // 6. Generate a unique quote number if one doesn't exist
        const quoteNumber = `QT-${jobData.number}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        
        // 7. Call the edge function to generate the PDF
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quote-pdf`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            jobId,
            quoteType,
            quoteNumber,
            templateId: templateToUse.id,
            jobData,
            inspectionData,
            repairData,
            jobItems
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate PDF');
        }
        
        const result = await response.json();
        
        if (result.pdfUrl) {
          setPdfUrl(result.pdfUrl);
        } else {
          throw new Error('No PDF URL returned from the server');
        }
      } catch (err) {
        console.error('Error generating PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate PDF');
      } finally {
        setIsLoading(false);
      }
    };
    
    generatePDF();
  }, [supabase, jobId, quoteType]);
  
  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  };
  
  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `quote-${jobId}-${quoteType}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Job Details
        </button>
        
        <div className="flex gap-2">
          {pdfUrl && (
            <>
              <button
                onClick={handlePrint}
                className="btn btn-secondary"
              >
                <Printer size={16} className="mr-2" />
                Print Quote
              </button>
              <button
                onClick={handleDownload}
                className="btn btn-primary"
              >
                <Download size={16} className="mr-2" />
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>
      
      {error ? (
        <div className="bg-error-50 border-l-4 border-error-500 p-4 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-error-500" />
            <div className="ml-3">
              <p className="text-sm text-error-700">{error}</p>
              <p className="text-sm text-error-700 mt-2">
                Please make sure you have uploaded a valid PDF template and set it as the default template for {quoteType} quotes.
              </p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Generating PDF...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment while we process your template.</p>
        </div>
      ) : pdfUrl ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <iframe 
            src={pdfUrl} 
            className="w-full h-[800px] border-0"
            title="Quote PDF"
          />
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No PDF could be generated. Please try again.
        </div>
      )}
    </div>
  );
};

export default QuotePDFViewer;