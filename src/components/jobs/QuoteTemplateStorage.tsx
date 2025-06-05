import { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase-context';

// Define the hook to handle PDF template storage
export const usePDFTemplateStorage = () => {
  const { supabase } = useSupabase();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload a PDF file to Supabase Storage
  const uploadPDFTemplate = async (file: File, templateId: string): Promise<string | null> => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return null;
    }

    setIsUploading(true);
    setError(null);

    try {
      console.time('Upload PDF');
      // Create a unique file path using the template ID
      const filePath = `quote-templates/${templateId}/${file.name}`;
      
      // Upload the file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      console.timeEnd('Upload PDF');
      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading PDF template:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload PDF template');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Delete a PDF file from Supabase Storage
  const deletePDFTemplate = async (filePath: string): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return false;
    }

    try {
      const { error: deleteError } = await supabase.storage
        .from('templates')
        .remove([filePath]);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err) {
      console.error('Error deleting PDF template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete PDF template');
      return false;
    }
  };

  return {
    uploadPDFTemplate,
    deletePDFTemplate,
    isUploading,
    error
  };
};

// Define the hook to handle template data in the database
export const useQuoteTemplates = () => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all templates of a specific type
  const fetchTemplates = async (type: 'email' | 'pdf'): Promise<any[]> => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('template_data->>type', type)
        .order('name');

      if (fetchError) {
        throw fetchError;
      }

      return data || [];
    } catch (err) {
      console.error(`Error fetching ${type} templates:`, err);
      setError(err instanceof Error ? err.message : `Failed to fetch ${type} templates`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Save a new template
  const saveTemplate = async (templateData: any): Promise<string | null> => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Ensure preservedPages has at least page 1 if it's empty
      if (templateData.templateData.type === 'pdf' && 
          (!templateData.templateData.preservedPages || 
           templateData.templateData.preservedPages.length === 0)) {
        templateData.templateData.preservedPages = [1];
      }

      const { data, error: insertError } = await supabase
        .from('quote_templates')
        .insert({
          name: templateData.name,
          template_data: templateData.templateData,
          user_id: userData.user.id
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data?.id || null;
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing template
  const updateTemplate = async (templateId: string, templateData: any): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure preservedPages has at least page 1 if it's empty
      if (templateData.templateData.type === 'pdf' && 
          (!templateData.templateData.preservedPages || 
           templateData.templateData.preservedPages.length === 0)) {
        templateData.templateData.preservedPages = [1];
      }

      const { error: updateError } = await supabase
        .from('quote_templates')
        .update({
          name: templateData.name,
          template_data: templateData.templateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (err) {
      console.error('Error updating template:', err);
      setError(err instanceof Error ? err.message : 'Failed to update template');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a template
  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('quote_templates')
        .delete()
        .eq('id', templateId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Set a template as the default for its type
  const setDefaultTemplate = async (templateId: string, templateType: string, quoteType: string): Promise<boolean> => {
    if (!supabase) {
      setError('Supabase client not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, unset any existing default templates of this type
      const { error: updateError1 } = await supabase
        .from('quote_templates')
        .update({
          template_data: supabase.rpc('jsonb_set_default', {
            template_data: 'template_data',
            is_default: false
          })
        })
        .eq('template_data->>type', templateType)
        .eq('template_data->>templateType', quoteType)
        .eq('template_data->>isDefault', true);

      if (updateError1) {
        console.warn('Error unsetting existing default templates:', updateError1);
        // Continue anyway
      }

      // Then set the new default template
      const { data, error: updateError2 } = await supabase
        .from('quote_templates')
        .select('template_data')
        .eq('id', templateId)
        .single();

      if (updateError2) {
        throw updateError2;
      }

      const updatedTemplateData = {
        ...data.template_data,
        isDefault: true
      };

      const { error: updateError3 } = await supabase
        .from('quote_templates')
        .update({
          template_data: updatedTemplateData
        })
        .eq('id', templateId);

      if (updateError3) {
        throw updateError3;
      }

      return true;
    } catch (err) {
      console.error('Error setting default template:', err);
      setError(err instanceof Error ? err.message : 'Failed to set default template');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    isLoading,
    error
  };
};