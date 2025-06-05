// Script to add sample email and PDF quote templates to Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleTemplates() {
  try {
    console.log('Adding sample quote templates to Supabase...');
    
    // Get current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw new Error(`Error getting user: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error('No authenticated user found. Please log in first.');
    }
    
    const userId = user.id;
    console.log(`Using user ID: ${userId}`);
    
    // Sample email templates
    const emailTemplates = [
      {
        name: 'Standard Inspection Email',
        template_data: {
          type: 'email',
          templateType: 'inspection',
          subject: 'Inspection Quote from Airlast HVAC',
          greeting: 'Dear Customer,',
          introText: 'Thank you for choosing Airlast HVAC services. We have completed the inspection of your HVAC system and have prepared our findings for your review.',
          approvalText: 'Please review our inspection results and recommended actions below:',
          approveButtonText: 'Approve Inspection',
          denyButtonText: 'Decline Recommendations',
          approvalNote: 'By approving, you authorize us to proceed with the recommended actions.',
          denialNote: 'If you decline, you will be charged $180.00 for the inspection service only.',
          closingText: 'If you have any questions about our findings, please don\'t hesitate to contact us.',
          signature: 'Best regards,\nThe Airlast HVAC Team',
          isDefault: true
        },
        user_id: userId
      },
      {
        name: 'Standard Repair Email',
        template_data: {
          type: 'email',
          templateType: 'repair',
          subject: 'Repair Quote from Airlast HVAC',
          greeting: 'Dear Customer,',
          introText: 'Thank you for choosing Airlast HVAC services. Based on our inspection, we have prepared a repair quote for your review.',
          approvalText: 'Please click one of the buttons below to approve or deny the recommended repairs:',
          approveButtonText: 'Approve Repairs',
          denyButtonText: 'Deny Repairs',
          approvalNote: 'If you approve, we will schedule the repair work at your earliest convenience.',
          denialNote: 'If you deny, you will be charged $180.00 for the inspection service.',
          closingText: 'If you have any questions, please don\'t hesitate to contact us.',
          signature: 'Best regards,\nThe Airlast HVAC Team',
          isDefault: true
        },
        user_id: userId
      },
      {
        name: 'Standard Replacement Email',
        template_data: {
          type: 'email',
          templateType: 'replacement',
          subject: 'Replacement Quote from Airlast HVAC',
          greeting: 'Dear Customer,',
          introText: 'Thank you for choosing Airlast HVAC services. Based on our assessment, we have prepared a replacement quote for your HVAC system.',
          approvalText: 'Please click one of the buttons below to approve or deny the recommended replacement:',
          approveButtonText: 'Approve Replacement',
          denyButtonText: 'Deny Replacement',
          approvalNote: 'If you approve, we will schedule the replacement work at your earliest convenience.',
          denialNote: 'If you deny, you will be charged $180.00 for the inspection service.',
          closingText: 'If you have any questions about our quote, please don\'t hesitate to contact us.',
          signature: 'Best regards,\nThe Airlast HVAC Team',
          isDefault: true
        },
        user_id: userId
      },
      {
        name: 'Urgent Repair Email',
        template_data: {
          type: 'email',
          templateType: 'repair',
          subject: 'URGENT: Critical Repair Quote from Airlast HVAC',
          greeting: 'Dear Customer,',
          introText: 'During our recent inspection, we identified critical issues with your HVAC system that require immediate attention to prevent further damage or safety concerns.',
          approvalText: 'Please review our urgent repair recommendations and respond as soon as possible:',
          approveButtonText: 'Approve Urgent Repairs',
          denyButtonText: 'Decline Repairs',
          approvalNote: 'If approved, we will prioritize scheduling these critical repairs.',
          denialNote: 'Please note that declining these repairs may lead to system failure, higher repair costs in the future, or potential safety hazards.',
          closingText: 'If you have any questions or concerns, please contact us immediately.',
          signature: 'Regards,\nAirlast HVAC Emergency Response Team',
          isDefault: false
        },
        user_id: userId
      }
    ];
    
    // Sample PDF templates
    const pdfTemplates = [
      {
        name: 'Standard Inspection PDF',
        template_data: {
          type: 'pdf',
          templateType: 'inspection',
          fileName: 'inspection_template.pdf',
          fileUrl: `${supabaseUrl}/storage/v1/object/public/templates/quote-templates/sample/inspection_template.pdf`,
          preservedPages: [1],
          isDefault: true
        },
        user_id: userId
      },
      {
        name: 'Standard Repair PDF',
        template_data: {
          type: 'pdf',
          templateType: 'repair',
          fileName: 'repair_template.pdf',
          fileUrl: `${supabaseUrl}/storage/v1/object/public/templates/quote-templates/sample/repair_template.pdf`,
          preservedPages: [1],
          isDefault: true
        },
        user_id: userId
      },
      {
        name: 'Standard Replacement PDF',
        template_data: {
          type: 'pdf',
          templateType: 'replacement',
          fileName: 'replacement_template.pdf',
          fileUrl: `${supabaseUrl}/storage/v1/object/public/templates/quote-templates/sample/replacement_template.pdf`,
          preservedPages: [1],
          isDefault: true
        },
        user_id: userId
      }
    ];
    
    // First, delete all existing templates
    console.log('Deleting existing templates...');
    const { error: deleteError } = await supabase
      .from('quote_templates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This will delete all records
      
    if (deleteError) {
      console.error(`Error deleting existing templates:`, deleteError);
    } else {
      console.log('Existing templates deleted successfully');
    }
    
    // Insert email templates
    console.log('Adding email templates...');
    for (const template of emailTemplates) {
      const { data, error } = await supabase
        .from('quote_templates')
        .insert(template);
        
      if (error) {
        console.error(`Error adding email template "${template.name}":`, error);
      } else {
        console.log(`Added email template: ${template.name}`);
      }
    }
    
    // Insert PDF templates
    console.log('Adding PDF templates...');
    for (const template of pdfTemplates) {
      const { data, error } = await supabase
        .from('quote_templates')
        .insert(template);
        
      if (error) {
        console.error(`Error adding PDF template "${template.name}":`, error);
      } else {
        console.log(`Added PDF template: ${template.name}`);
      }
    }
    
    console.log('Sample templates added successfully!');
  } catch (error) {
    console.error('Error adding sample templates:', error);
  }
}

// Run the function
addSampleTemplates();