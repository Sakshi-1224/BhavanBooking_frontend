import { useState } from 'react';
import { UploadCloud, CheckCircle, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../../api/axios';

export default function CheckInModal({ booking, onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    idDocument: null,
    securityDepositCollected: false // NEW: Backend expects this
  });

  // Check if Aadhaar is already uploaded
  const hasAadhaarAlready = !!booking?.verification?.aadharFrontImageUrl;
  
  // NEW: Strictly check payment status based on backend rules
  const isPaymentCompleted = booking?.financials?.paymentStatus === 'COMPLETED';
  const securityDepositRequired = booking?.financials?.securityDeposit || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Safety block: Backend will reject this anyway
    if (!isPaymentCompleted) {
      return toast.error("Full payment must be completed before check-in.");
    }

    if (!hasAadhaarAlready && !formData.idDocument) {
      return toast.warn("Please upload the guest's ID document.");
    }

    if (!formData.securityDepositCollected) {
      return toast.warn(`Please confirm collection of ₹${securityDepositRequired} security deposit.`);
    }

    setIsProcessing(true);
    
    try {
      // 1. If Aadhaar needs to be uploaded, do it FIRST (Backend separated this route)
      if (!hasAadhaarAlready && formData.idDocument) {
        const idPayload = new FormData();
        // Assuming your backend route expects 'frontImage' and 'backImage' based on controller
        idPayload.append('frontImage', formData.idDocument);
        idPayload.append('backImage', formData.idDocument); // Adjust based on your actual UI needs
        
        await api.post(`/bookings/${booking.id}/aadhaar/admin`, idPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // 2. Process Check-In (Payment is no longer sent here, only security deposit status)
      const checkInPayload = {
        securityDepositCollected: formData.securityDepositCollected
      };

      await api.patch(`/bookings/${booking.id}/check-in`, checkInPayload);
      
      toast.success('Guest checked in successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete check-in');
    } finally {
      setIsProcessing(false);
    }
  };

  // UI BLOCKER: If payment isn't complete, do not allow check-in at all
  if (!isPaymentCompleted) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative text-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"></button>
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Pending</h2>
          <p className="text-gray-600 mb-6">
            The remaining balance for this booking must be settled before the guest can check-in. Please process the remaining payment first.
          </p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"></button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">Guest Check-In</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* KYC SECTION */}
          {hasAadhaarAlready ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
               <p className="text-sm text-green-700 font-bold flex items-center gap-2">
                 <CheckCircle size={18}/> Guest KYC (Aadhaar) already verified.
               </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><UploadCloud size={16}/> Upload ID Document</label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setFormData({...formData, idDocument: e.target.files[0]})} className="w-full border rounded-md bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
          )}

          {/* NEW: SECURITY DEPOSIT SECTION */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><ShieldCheck size={16}/> Security Deposit</h3>
            <p className="text-xs text-gray-600 mb-3">Required Deposit: <strong className="text-gray-900">₹{securityDepositRequired}</strong></p>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={formData.securityDepositCollected}
                onChange={(e) => setFormData({...formData, securityDepositCollected: e.target.checked})}
              />
              <span className="text-sm font-medium text-gray-800">I confirm ₹{securityDepositRequired} deposit has been collected (Cash/Offline).</span>
            </label>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-6 border-t flex justify-end">
            <button type="submit" disabled={isProcessing} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-md">
              {isProcessing ? 'Processing...' : 'Confirm Check-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}