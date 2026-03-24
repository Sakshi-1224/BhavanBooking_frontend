import { useState } from 'react';
import { UploadCloud, AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../../api/axios';

export default function CheckInModal({ booking, onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    idDocument: null,
    remainingAmountPaid: '',
    checkInPaymentMode: 'CASH'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const checkInForm = new FormData();
      if (!formData.idDocument) {
        setIsProcessing(false);
        return toast.warn("Please upload the guest's ID document.");
      }
      checkInForm.append('aadharImage', formData.idDocument); 

      if (booking?.financials?.paymentStatus === 'PARTIAL') {
        if (!formData.remainingAmountPaid) {
          setIsProcessing(false);
          return toast.warn("Please enter the remaining amount collected.");
        }
        checkInForm.append('remainingAmountPaid', formData.remainingAmountPaid);
        checkInForm.append('checkInPaymentMode', formData.checkInPaymentMode);
      }

      await api.patch(`/bookings/${booking.id}/check-in`, checkInForm, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success('Check-in successful!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete check-in');
    } finally {
      setIsProcessing(false);
    }
  };

  const dueAmount = (Number(booking?.financials?.calculatedAmount) + Number(booking?.financials?.securityDeposit)) - Number(booking?.financials?.advanceAmountRequested);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">Guest Check-In</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><UploadCloud size={16}/> Upload ID Document</label>
            <input type="file" required accept="image/*,application/pdf" onChange={(e) => setFormData({...formData, idDocument: e.target.files[0]})} className="w-full border rounded-md bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            <p className="text-xs text-gray-500 mt-2">Accepts PDF, JPG, PNG.</p>
          </div>

          {booking?.financials?.paymentStatus === 'PARTIAL' && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Collect Remaining Balance</h3>
              <p className="text-xs text-gray-600 mb-3">Due Amount: <strong className="text-red-600">₹{dueAmount}</strong></p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹)</label>
                  <input type="number" required min="1" value={formData.remainingAmountPaid} onChange={(e) => setFormData({...formData, remainingAmountPaid: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. 5000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mode</label>
                  <select value={formData.checkInPaymentMode} onChange={(e) => setFormData({...formData, checkInPaymentMode: e.target.value})} className="w-full px-3 py-2 border rounded-md bg-white">
                    <option value="CASH">CASH</option>
                    <option value="QR">QR / UPI</option>
                  </select>
                </div>
              </div>
            </div>
          )}

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