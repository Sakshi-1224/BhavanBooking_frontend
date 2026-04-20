import { useState } from 'react';
import { X, Banknote } from 'lucide-react';
import api from '../../../api/axios';
import { toast } from 'react-toastify';

export default function RemainingPaymentModal({ booking, onClose, onSuccess }) {
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 🚨 UPDATED MATH: Strictly calculate remaining RENT only. 
  // Deposit is completely ignored here.
  const base = Number(booking?.financials?.calculatedAmount || 0);
  const advance = Number(booking?.financials?.holdAmountPaid || booking?.financials?.advanceAmountRequested || 0);
  const dueAmount = base - advance;
  const deposit = Number(booking?.financials?.securityDeposit || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Hit the manual payment route
      await api.post('/payments/offline-remaining', {
        bookingId: booking.id,
        paymentMode: paymentMode,
        amountCollected: Number(dueAmount) 
      });
      toast.success("Remaining rent collected successfully!");
      onSuccess(); // Refresh dashboard
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
          <Banknote className="text-green-600"/> Collect Remaining Rent
        </h2>
        
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
           <p className="flex justify-between text-sm text-gray-700 mb-1"><span>Total Rent:</span> <span>₹{base.toLocaleString('en-IN')}</span></p>
           <p className="flex justify-between text-sm text-gray-700 mb-2 border-b border-yellow-200 pb-2"><span>Advance Paid:</span> <span className="text-green-600">- ₹{advance.toLocaleString('en-IN')}</span></p>
           <p className="flex justify-between font-bold text-lg text-red-600"><span>Rent to Collect Now:</span> <span>₹{dueAmount.toLocaleString('en-IN')}</span></p>
        </div>

        {/* Reminder for Clerk */}
        <div className="bg-orange-50 border border-orange-200 p-2 rounded mb-4 text-center">
          <p className="text-xs font-semibold text-orange-800">
            * Security Deposit of ₹{deposit.toLocaleString('en-IN')} will be collected separately at Check-In.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border p-2 rounded bg-white">
              <option value="CASH">Cash (In-Hand)</option>
              <option value="QR">Bhavan QR Code / UPI</option>
            </select>
          </div>

          {paymentMode === 'QR' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Transaction Ref ID</label>
              <input type="text" required value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. UPI Ref Number" />
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={isProcessing} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">
              {isProcessing ? 'Processing...' : `Confirm Payment of ₹${dueAmount.toLocaleString('en-IN')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}