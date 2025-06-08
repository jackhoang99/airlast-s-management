import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';

interface EmailTemplate {
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
}

interface QuoteEmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate;
  onSave: (template: EmailTemplate) => void;
  templateType: 'inspection' | 'repair' | 'replacement';
}

const QuoteEmailTemplateModal = ({
  isOpen,
  onClose,
  template,
  onSave,
  templateType
}: QuoteEmailTemplateModalProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const updatedTemplate: EmailTemplate = {
      subject: formData.get('subject') as string,
      greeting: formData.get('greeting') as string,
      introText: formData.get('introText') as string,
      approvalText: formData.get('approvalText') as string,
      approveButtonText: formData.get('approveButtonText') as string,
      denyButtonText: formData.get('denyButtonText') as string,
      approvalNote: formData.get('approvalNote') as string,
      denialNote: formData.get('denialNote') as string,
      closingText: formData.get('closingText') as string,
      signature: formData.get('signature') as string,
    };

    onSave(updatedTemplate);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg w-full max-w-3xl mx-4 p-6">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium">
              Edit {templateType.charAt(0).toUpperCase() + templateType.slice(1)} Quote Email Template
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                defaultValue={template.subject}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="greeting" className="block text-sm font-medium text-gray-700">
                Greeting
              </label>
              <input
                type="text"
                id="greeting"
                name="greeting"
                defaultValue={template.greeting}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="introText" className="block text-sm font-medium text-gray-700">
                Introduction Text
              </label>
              <textarea
                id="introText"
                name="introText"
                rows={3}
                defaultValue={template.introText}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="approvalText" className="block text-sm font-medium text-gray-700">
                Approval Request Text
              </label>
              <input
                type="text"
                id="approvalText"
                name="approvalText"
                defaultValue={template.approvalText}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="approveButtonText" className="block text-sm font-medium text-gray-700">
                  Approve Button Text
                </label>
                <input
                  type="text"
                  id="approveButtonText"
                  name="approveButtonText"
                  defaultValue={template.approveButtonText}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="denyButtonText" className="block text-sm font-medium text-gray-700">
                  Deny Button Text
                </label>
                <input
                  type="text"
                  id="denyButtonText"
                  name="denyButtonText"
                  defaultValue={template.denyButtonText}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="approvalNote" className="block text-sm font-medium text-gray-700">
                Approval Note
              </label>
              <textarea
                id="approvalNote"
                name="approvalNote"
                rows={2}
                defaultValue={template.approvalNote}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="denialNote" className="block text-sm font-medium text-gray-700">
                Denial Note
              </label>
              <textarea
                id="denialNote"
                name="denialNote"
                rows={2}
                defaultValue={template.denialNote}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="closingText" className="block text-sm font-medium text-gray-700">
                Closing Text
              </label>
              <textarea
                id="closingText"
                name="closingText"
                rows={2}
                defaultValue={template.closingText}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="signature" className="block text-sm font-medium text-gray-700">
                Signature
              </label>
              <textarea
                id="signature"
                name="signature"
                rows={2}
                defaultValue={template.signature}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
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
                Save Template
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default QuoteEmailTemplateModal;