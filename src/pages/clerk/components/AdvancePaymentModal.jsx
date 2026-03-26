import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import api from '../../../api/axios';
import { toast } from 'react-toastify';

export default function AdvancePaymentModal({ booking, onClose, onSuccess }) {
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [transactionId, setTransactionId] = useState('');
  
  // Aadhaar State for the Clerk
  const [aadhaarFiles, setAadhaarFiles] = useState({ front: null, back: null });
  const [isProcessing, setIsProcessing] = useState(false);

  // 🚨 THE FIX: Look inside the verification object! 🚨
  const hasAadhaarAlready = !!booking.verification?.aadharFrontImageUrl; 

const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // STEP 1: Upload Aadhaar if user hasn't uploaded yet
      if (!hasAadhaarAlready) {
        if (!aadhaarFiles.front || !aadhaarFiles.back) {
          setIsProcessing(false);
          return toast.warn("Aadhaar front and back images are required for cash bookings.");
        }

        const formData = new FormData();
        formData.append('frontImage', aadhaarFiles.front);
        formData.append('backImage', aadhaarFiles.back);

        await api.patch(`/bookings/${booking.id}/aadhaar`, formData);
      }

      // 🚨 THE FIX IS HERE 🚨
      // STEP 2: Record the Cash/QR Payment exactly as the backend DTO expects
      await api.post('/payments/advance/offline', {
        bookingId: booking.id,
        paymentMode: paymentMode,
        amountCollected: Number(booking.financials?.advanceAmountRequested || 0)
      });

      toast.success("Payment recorded and KYC updated successfully!");
      onSuccess(); // Triggers dashboard refresh
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
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Record Advance Payment</h2>
        
        <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
           <p className="flex justify-between">
             <span>Amount to Collect:</span> 
             <span className="font-bold text-lg">₹{booking.financials?.advanceAmountRequested || 0}</span>
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* KYC SECTION FOR CLERK */}
          <div className="border-2 border-dashed border-gray-300 p-3 rounded-lg bg-gray-50">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><Upload size={16}/> Guest KYC (Aadhaar)</h3>
            
            {/* THIS WILL NOW PROPERLY HIDE THE UPLOAD FORM IF KYC EXISTS */}
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

          {/* PAYMENT DETAILS */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border p-2 rounded">
              <option value="CASH">Cash (In-Hand)</option>
              <option value="QR">Bhavan QR Code</option>
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
              {isProcessing ? 'Processing...' : 'Confirm Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}