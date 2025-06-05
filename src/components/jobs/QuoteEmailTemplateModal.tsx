import { useState } from 'react';
import { X, Save } from 'lucide-react';

type QuoteEmailTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  template: {
    subject: string;
    greeting: string;
    introText: string;
    approvalText: string;
    approveButtonText: string;
    denyButtonText: string;
    approvalNote: string;
    denialNote: string;
    closingText: string;
    signature: string;
  };
  onSave: (template: any) => void;
  templateType?: 'inspection' | 'repair' | 'replacement';
};

const QuoteEmailTemplateModal = ({ 
  isOpen, 
  onClose, 
  template,
  onSave,
  templateType = 'repair'
}: QuoteEmailTemplateModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    type: templateType,
    ...template
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Edit Quote Email Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input w-full"
              placeholder="e.g., Standard Quote Template"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
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
              Email Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="input w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Greeting
            </label>
            <input
              type="text"
              name="greeting"
              value={formData.greeting}
              onChange={handleChange}
              className="input w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: "Dear Customer,"
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Introduction Text
            </label>
            <textarea
              name="introText"
              value={formData.introText}
              onChange={handleChange}
              className="input w-full"
              rows={3}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Request Text
            </label>
            <input
              type="text"
              name="approvalText"
              value={formData.approvalText}
              onChange={handleChange}
              className="input w-full"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approve Button Text
              </label>
              <input
                type="text"
                name="approveButtonText"
                value={formData.approveButtonText}
                onChange={handleChange}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deny Button Text
              </label>
              <input
                type="text"
                name="denyButtonText"
                value={formData.denyButtonText}
                onChange={handleChange}
                className="input w-full"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Note
            </label>
            <input
              type="text"
              name="approvalNote"
              value={formData.approvalNote}
              onChange={handleChange}
              className="input w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Denial Note
            </label>
            <input
              type="text"
              name="denialNote"
              value={formData.denialNote}
              onChange={handleChange}
              className="input w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This explains what happens if the customer denies the quote.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Closing Text
            </label>
            <input
              type="text"
              name="closingText"
              value={formData.closingText}
              onChange={handleChange}
              className="input w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signature
            </label>
            <textarea
              name="signature"
              value={formData.signature}
              onChange={handleChange}
              className="input w-full"
              rows={2}
              required
            />
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

export default QuoteEmailTemplateModal;