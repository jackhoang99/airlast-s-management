import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';

const TemplateDebug = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [repairDefaults, setRepairDefaults] = useState<any[]>([]);
  const [replacementDefaults, setReplacementDefaults] = useState<any[]>([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!supabase) return;
      
      try {
        setIsLoading(true);
        
        // Fetch all templates
        const { data: allTemplates, error: templatesError } = await supabase
          .from('quote_templates')
          .select('*')
          .order('name');
          
        if (templatesError) throw templatesError;
        setTemplates(allTemplates || []);
        
        // Find repair default templates
        const { data: repairDefault, error: repairError } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('template_data->>type', 'pdf')
          .eq('template_data->>templateType', 'repair')
          .eq('template_data->>isDefault', 'true');
          
        if (repairError) throw repairError;
        setRepairDefaults(repairDefault || []);
        
        // Find replacement default templates
        const { data: replacementDefault, error: replacementError } = await supabase
          .from('quote_templates')
          .select('*')
          .eq('template_data->>type', 'pdf')
          .eq('template_data->>templateType', 'replacement')
          .eq('template_data->>isDefault', 'true');
          
        if (replacementError) throw replacementError;
        setReplacementDefaults(replacementDefault || []);
        
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to fetch templates');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplates();
  }, [supabase]);

  const setAsDefault = async (templateId: string, templateType: 'repair' | 'replacement') => {
    if (!supabase) return;
    
    try {
      // First, unset all existing defaults for this template type
      await supabase
        .from('quote_templates')
        .update({
          template_data: supabase.rpc('jsonb_set_default', {
            template_data: 'template_data',
            is_default: false
          })
        })
        .eq('template_data->>type', 'pdf')
        .eq('template_data->>templateType', templateType)
        .eq('template_data->>isDefault', 'true');
        
      // Get the template to update
      const { data: template, error: templateError } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('id', templateId)
        .single();
        
      if (templateError) throw templateError;
      
      // Update the template to be default
      const updatedData = { ...template.template_data, isDefault: true };
      await supabase
        .from('quote_templates')
        .update({ template_data: updatedData })
        .eq('id', templateId);
        
      // Refresh the data
      window.location.reload();
    } catch (err) {
      console.error('Error setting default template:', err);
      setError('Failed to set default template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/quotes/templates" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Template Diagnostics
          </h1>
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Default Templates Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Default Templates Status</h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-2">Repair Quote Templates</h3>
                {repairDefaults.length === 0 ? (
                  <div className="bg-error-50 p-3 rounded-md text-error-700">
                    <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                    No default repair template found. This will cause PDF generation to fail.
                  </div>
                ) : repairDefaults.length === 1 ? (
                  <div className="bg-success-50 p-3 rounded-md text-success-700">
                    Default template set: {repairDefaults[0].name}
                  </div>
                ) : (
                  <div className="bg-warning-50 p-3 rounded-md text-warning-700">
                    <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                    Multiple default repair templates found ({repairDefaults.length}). This may cause issues.
                  </div>
                )}
              </div>
              
              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-2">Replacement Quote Templates</h3>
                {replacementDefaults.length === 0 ? (
                  <div className="bg-error-50 p-3 rounded-md text-error-700">
                    <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                    No default replacement template found. This will cause PDF generation to fail.
                  </div>
                ) : replacementDefaults.length === 1 ? (
                  <div className="bg-success-50 p-3 rounded-md text-success-700">
                    Default template set: {replacementDefaults[0].name}
                  </div>
                ) : (
                  <div className="bg-warning-50 p-3 rounded-md text-warning-700">
                    <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                    Multiple default replacement templates found ({replacementDefaults.length}). This may cause issues.
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* All Templates */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">All Templates ({templates.length})</h2>
            
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No templates found. Please create templates first.
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map(template => {
                  const templateData = template.template_data || {};
                  const isDefault = templateData.isDefault === true;
                  const templateType = templateData.templateType || 'unknown';
                  
                  return (
                    <div 
                      key={template.id} 
                      className={`p-4 rounded-lg border ${isDefault ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <div className="text-sm text-gray-500 mt-1">
                            <div>Type: {templateData.type || 'N/A'}</div>
                            <div>Template Type: {templateType}</div>
                            <div>Default: {isDefault ? 'Yes' : 'No'}</div>
                            {templateData.fileName && <div>File: {templateData.fileName}</div>}
                            {templateData.preservedPages && (
                              <div>Preserved Pages: {JSON.stringify(templateData.preservedPages)}</div>
                            )}
                          </div>
                        </div>
                        
                        {!isDefault && (
                          <button
                            onClick={() => setAsDefault(template.id, templateType as 'repair' | 'replacement')}
                            className="btn btn-primary btn-sm"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDebug;