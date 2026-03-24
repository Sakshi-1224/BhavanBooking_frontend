import { useState,useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../api/axios";

export default function AdvancePaymentModal({ booking, onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    advanceAmountCollected: "",
    advancePaymentMode: "CASH",
  });
  useEffect(() => {
    if (booking?.financials?.advanceAmountRequested) {
      setFormData((prev) => ({
        ...prev,
        advanceAmountCollected: booking.financials.advanceAmountRequested,
      }));
    }
  }, [booking]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await api.post("/payments/advance/offline", {
        bookingId: booking.id,
        paymentMode: formData.advancePaymentMode,
        amountCollected: Number(formData.advanceAmountCollected),
      });
      toast.success("Advance payment recorded. Booking confirmed!");
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record advance");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">
          Record Advance Payment
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <p className="text-xs text-gray-600 mb-3">
              Advance Requested:{" "}
              <strong className="text-teal-800">
                ₹{booking?.financials?.advanceAmountRequested}
              </strong>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.advanceAmountCollected}
                
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      advanceAmountCollected: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mode
                </label>
                <select
                  value={formData.advancePaymentMode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      advancePaymentMode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="CASH">CASH</option>
                  <option value="QR">QR / UPI</option>
                </select>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t flex justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Confirm Advance Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
