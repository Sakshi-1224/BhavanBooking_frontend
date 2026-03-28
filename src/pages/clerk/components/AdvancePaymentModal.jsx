import { useState } from 'react';
import { X, Upload, Banknote } from 'lucide-react';
import api from '../../../api/axios';
import { toast } from 'react-toastify';

export default function AdvancePaymentModal({ booking, onClose, onSuccess }) {
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [transactionId, setTransactionId] = useState('');
  
  // 🚨 FIX: Safely check both possible DTO variable names for the advance amount
  const requestedAdvance = Number(booking.financials?.advanceAmountRequested || booking.financials?.advanceRequested || 0);
  
  // 🚨 FIX: Add a state for the Clerk to manually confirm the collected amount
  const [amountCollected, setAmountCollected] = useState(requestedAdvance || '');
  
  const [aadhaarFiles, setAadhaarFiles] = useState({ front: null, back: null });
  const [isProcessing, setIsProcessing] = useState(false);

  const hasAadhaarAlready = !!booking.verification?.aadharFrontImageUrl; 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Final safety check before sending to backend
    if (Number(amountCollected) <= 0) {
      setIsProcessing(false);
      return toast.warn("Amount collected must be greater than ₹0.");
    }

    try {
      if (!hasAadhaarAlready) {
        if (!aadhaarFiles.front || !aadhaarFiles.back) {
          setIsProcessing(false);
          return toast.warn("Aadhaar front and back images are required for cash bookings.");
        }
        const formData = new FormData();
        formData.append('frontImage', aadhaarFiles.front);
        formData.append('backImage', aadhaarFiles.back);

        // Upload the images first
        await api.patch(`/bookings/admin/${booking.id}/upload-aadhaar`, formData);
      }

      // Record the Payment
      await api.post('/payments/advance/offline', {
        bookingId: booking.id,
        paymentMode: paymentMode,
        amountCollected: Number(amountCollected) // 🚨 Now sends the explicitly typed amount
      });

      toast.success("Payment recorded and KYC updated successfully!");
      onSuccess(); 
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process transaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
          <Banknote className="text-blue-600" /> Record Advance Payment
        </h2>
        
        <div className="bg-blue-50 p-3 rounded mb-4 text-sm flex justify-between items-center border border-blue-100">
           <span className="text-gray-700">Requested Advance:</span> 
           <span className="font-bold text-lg text-blue-800">
             {requestedAdvance > 0 ? `₹${requestedAdvance.toLocaleString('en-IN')}` : 'Not Specified'}
           </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* KYC SECTION */}
          <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg bg-gray-50">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><Upload size={16}/> Guest KYC (Aadhaar)</h3>
            
            {hasAadhaarAlready ? (
              <p className="text-xs text-green-700 font-bold bg-green-100 p-2 rounded">✅ Guest has already uploaded Aadhaar online.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Front Image *</label>
                  <input type="file" required accept="image/*" onChange={e => setAadhaarFiles({...aadhaarFiles, front: e.target.files[0]})} className="w-full text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Back Image *</label>
                  <input type="file" required accept="image/*" onChange={e => setAadhaarFiles({...aadhaarFiles, back: e.target.files[0]})} className="w-full text-xs" />
                </div>
              </div>
            )}
          </div>

          {/* PAYMENT INPUTS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Amount Collected</label>
              <input 
                type="number" 
                required 
                min="1"
                value={amountCollected} 
                onChange={(e) => setAmountCollected(e.target.value)} 
                className="w-full border p-2 rounded font-bold text-green-700 bg-white" 
                placeholder="e.g. 5000" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Payment Mode</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border p-2 rounded bg-white">
                <option value="CASH">Cash (In-Hand)</option>
                <option value="QR">Bhavan QR / UPI</option>
              </select>
            </div>
          </div>

          {paymentMode === 'QR' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Transaction Ref ID</label>
              <input type="text" required value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full border p-2 rounded" placeholder="e.g. UPI Ref Number" />
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={isProcessing} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md transition">
              {isProcessing ? 'Processing...' : 'Confirm Cash Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}