import { useState } from 'react';
import { X, DollarSign, Check } from 'lucide-react';
import { useSupabase } from '../../lib/supabase-context';
import { Database } from '../../types/supabase';

type JobInvoice = Database['public']['Tables']['job_invoices']['Row'];

type MarkAsPaidModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: JobInvoice | null;
  jobName: string;
  customerName?: string;
};

const MarkAsPaidModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  invoice, 
  jobName,
  customerName
}: MarkAsPaidModalProps) => {
  const { supabase } = useSupabase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const handleMarkAsPaid = async () => {
    if (!supabase || !invoice) {
      setError('Unable to process payment at this time');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Update invoice status to paid
      const { error: updateError } = await supabase
        .from('job_invoices')
        .update({
          status: 'paid',
          paid_date: paymentDate,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          payment_notes: paymentNotes || null
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      setError('Failed to mark invoice as paid. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-center text-success-600 mb-4">
          <DollarSign size={40} />
        </div>
        <h3 className="text-lg font-semibold text-center mb-4">
          Mark Invoice as Paid
        </h3>
        
        {error && (
          <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This will mark invoice #{invoice.invoice_number} as paid with the details below.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Job:</span>
              <span className="font-medium">{jobName}</span>
            </div>
            {customerName && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium">{customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">${Number(invoice.amount).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="select w-full"
                required
              >
                <option value="credit_card">Credit Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="input w-full"
                placeholder="Check #, Transaction ID, etc."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Notes
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Any additional notes about this payment"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            className="btn btn-success"
            onClick={handleMarkAsPaid}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Mark as Paid
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkAsPaidModal;