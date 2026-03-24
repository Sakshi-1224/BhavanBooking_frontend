import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axios';

export default function CancelBookingModal({ isOpen, booking, onClose, onSuccess }) {
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // If the modal isn't open or there's no booking, render nothing.
  if (!isOpen || !booking) return null;

  const handleCancelBooking = async () => {
    setIsCancelling(true);
    try {
      const response = await api.patch(`/bookings/${booking.id}/cancel`, {
        cancellationReason: cancelReason,
      });

      toast.success(response.data.message || 'Booking cancelled successfully.');
      
      // Reset state, close modal, and trigger the refresh callback
      setCancelReason('');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 overflow-hidden">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancel Booking</h2>
        
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
          <p className="text-sm text-orange-800 font-medium">Cancellation Policy Reminder:</p>
          <ul className="text-xs text-orange-700 mt-1 list-disc list-inside space-y-1">
            <li>30+ days before check-in: 50% refund</li>
            <li>15-29 days before check-in: 25% refund</li>
            <li>Less than 15 days: No refund</li>
          </ul>
          <p className="text-xs text-orange-700 mt-2 italic">
            *Refunds for online payments will automatically be credited to your original payment method.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Cancellation (Optional)
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            maxLength={255}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Please let us know why you are cancelling..."
          />
          <p className="text-right text-xs text-gray-400 mt-1">
            {cancelReason.length}/255
          </p>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={() => {
              setCancelReason('');
              onClose();
            }}
            disabled={isCancelling}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Keep Booking
          </button>
          <button
            onClick={handleCancelBooking}
            disabled={isCancelling}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg flex items-center gap-2 transition disabled:opacity-70"
          >
            {isCancelling ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}