import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, CreditCard, Calendar, Loader2, FileText, Banknote } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import InvoicePrintView from '../../components/InvoicePrintView';
import CancelBookingModal from '../../components/booking/CancelBookingModal';

// Helper to format dates nicely
const formatDate = (dateString) => {
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

// Helper for Status Badges
const StatusBadge = ({ status }) => {
  const styles = {
    PENDING_CLERK_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PENDING_ADMIN_APPROVAL: 'bg-orange-100 text-orange-800 border-orange-200',
    PENDING_ADVANCE_PAYMENT: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    AWAITING_CASH_PAYMENT: 'bg-purple-100 text-purple-800 border-purple-200 animate-pulse',
    CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    PENDING_CLERK_REVIEW: 'Under Clerk Review',
    PENDING_ADMIN_APPROVAL: 'Awaiting Admin Approval',
    PENDING_ADVANCE_PAYMENT: 'Action Required: Pay Advance',
    AWAITING_CASH_PAYMENT: 'Awaiting Cash at Desk',
    CONFIRMED: 'Confirmed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.CANCELLED}`}>
      {labels[status] || status}
    </span>
  );
};

export default function UserDashboard() {
  const [aadhaarFiles, setAadhaarFiles] = useState({ front: null, back: null });
  const [isUploading, setIsUploading] = useState(false);
  const [printModal, setPrintModal] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [processingPaymentId, setProcessingPaymentId] = useState(null); 
  
  // NEW: State to track which payment mode the user wants to view for each booking
  const [paymentPreferences, setPaymentPreferences] = useState({});

  const { user } = useAuthStore();

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleUserAadhaarUpload = async (bookingId) => {
    if (!aadhaarFiles.front || !aadhaarFiles.back) {
      return toast.warn("Please select both front and back images of your Aadhaar.");
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('frontImage', aadhaarFiles.front);
      formData.append('backImage', aadhaarFiles.back);

      await api.post(`/bookings/${bookingId}/upload-aadhaar`, formData);
      toast.success("Aadhaar uploaded successfully! You can now proceed to payment.");
      
      setAadhaarFiles({ front: null, back: null });
      fetchMyBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload documents.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await api.get('/bookings/my-bookings');
      setBookings(response.data.data);
    } catch (error) {
      toast.error('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  // --- RAZORPAY PAYMENT HANDLER ---
  const handlePayment = async (bookingId, paymentType) => {
    setProcessingPaymentId(bookingId);

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      setProcessingPaymentId(null);
      return toast.error('Failed to load Razorpay. Please check your connection.');
    }

    try {
      const createOrderUrl = paymentType === 'ADVANCE' 
        ? '/payments/advance/create-order' 
        : '/payments/remaining/create-order';
      
      const verifyOrderUrl = paymentType === 'ADVANCE' 
        ? '/payments/advance/verify' 
        : '/payments/remaining/verify';

      const orderResponse = await api.post(createOrderUrl, { bookingId });
      const orderData = orderResponse.data.data;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Maharashtra Mandal Raipur',
        description: `${paymentType === 'ADVANCE' ? 'Advance' : 'Balance'} Payment`,
        order_id: orderData.orderId,
        
        handler: async function (response) {
          try {
            toast.info('Verifying payment securely...', { autoClose: false, toastId: 'verify-toast' });
            
            await api.post(verifyOrderUrl, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: bookingId
            });
            
            toast.dismiss('verify-toast');
            toast.success(`🎉 ${paymentType === 'ADVANCE' ? 'Advance' : 'Balance'} payment successful!`);
            fetchMyBookings();
          } catch (err) {
            toast.dismiss('verify-toast');
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setProcessingPaymentId(null);
          }
        },
        prefill: {
          name: user.fullName,
          contact: user.mobile,
          email: user.email || ''
        },
        theme: {
          color: '#e53e3e',
        },
        modal: {
          ondismiss: function() {
            setProcessingPaymentId(null);
            toast.info('Payment window closed.');
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response){
        toast.error(`Payment Failed: ${response.error.description}`);
        setProcessingPaymentId(null);
      });

      paymentObject.open();

    } catch (error) {
      setProcessingPaymentId(null);
      toast.error(error.response?.data?.message || 'Failed to initiate payment.');
    }
  };

  if (loading) return <div className="p-20 text-center text-xl text-gray-500">Loading your bookings...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">My Bookings</h1>
        <p className="text-gray-600 mt-2">Manage your facility reservations and payments.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
          <p className="mt-1 text-gray-500">You haven't made any booking requests yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            
            // Derive the locally selected payment mode for this specific booking card
            const selectedMode = paymentPreferences[booking.id] || 'ONLINE';

            return (
              <div key={booking.id} className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
                
                {/* Left Side: Booking Info */}
                <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{booking.facility?.name || 'Facility Name Unavailable'}</h2>
                      <p className="text-sm text-gray-500 font-medium">Event: {booking.eventType} • Guests: {booking.guestCount}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="flex items-start gap-3">
                      <Clock className="text-red-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Check-in</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(booking.schedule.startTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-gray-400 shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Check-out</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(booking.schedule.endTime)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Financials & Actions */}
                <div className="p-6 md:w-1/3 bg-gray-50 flex flex-col justify-center">
                <div className="space-y-2 mb-6">
                    {/* Calculations */}
                    {(() => {
                      const base = Number(booking.financials?.calculatedAmount || 0);
                      const deposit = Number(booking.financials?.securityDeposit || 0);
                      const totalCost = base + deposit;
                      const advance = Number(booking.financials?.advanceAmountRequested) || 0;
                      
                      const isPartial = booking.financials?.paymentStatus === 'PARTIAL';
                      const isCompleted = booking.financials?.paymentStatus === 'COMPLETED';
                      
                      const amountPaid = isCompleted ? totalCost : (isPartial ? advance : 0);
                      const amountDue = totalCost - amountPaid;

                      return (
                        <>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Base Quote:</span>
                            <span>₹{base.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500 border-b pb-2">
                            <span>Deposit:</span>
                            <span>₹{deposit.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-800 pt-1">
                            <span>Total Amount:</span>
                            <span>₹{totalCost.toLocaleString('en-IN')}</span>
                          </div>
                          
                          {booking.financials?.advanceAmountRequested && (
                            <div className="mt-3 p-3 bg-white border rounded-md shadow-sm space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-green-600 font-semibold">Amount Paid:</span>
                                <span className="text-green-600 font-bold">₹{amountPaid.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-red-600 font-semibold">Remaining Due:</span>
                                <span className="text-red-600 font-bold">₹{amountDue.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {booking.status === 'REJECTED' && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-md mt-4">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>This booking request was rejected by management because the facility is unavailable. Please try different dates.</p>
                    </div>
                  )}

                  {/* --- 🚀 ADVANCE PAYMENT BLOCK WITH ONLINE/OFFLINE TOGGLE --- */}
                  {booking.status === 'PENDING_ADVANCE_PAYMENT' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      {!booking.verification?.aadharFrontImageUrl ? (
                        <div>
                          <h4 className="font-bold text-blue-800 mb-2">Upload KYC to Enable Payment</h4>
                          <p className="text-sm text-gray-600 mb-3">As per management rules, please upload your Aadhaar card to proceed with the online advance payment.</p>
                          
                          <div className="flex flex-col sm:flex-row gap-3 mb-3">
                            <div className="flex-1">
                              <label className="block text-xs font-bold mb-1">Aadhaar Front</label>
                              <input type="file" accept="image/*" onChange={(e) => setAadhaarFiles({...aadhaarFiles, front: e.target.files[0]})} className="text-sm w-full" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-bold mb-1">Aadhaar Back</label>
                              <input type="file" accept="image/*" onChange={(e) => setAadhaarFiles({...aadhaarFiles, back: e.target.files[0]})} className="text-sm w-full" />
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleUserAadhaarUpload(booking.id)}
                            disabled={isUploading}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold w-full hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isUploading ? 'Uploading...' : 'Upload & Continue'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-green-700 font-bold mb-3 flex items-center gap-1">
                            <CheckCircle size={16} /> KYC Verified. Select Payment Mode:
                          </p>
                          
                          {/* ONLINE / OFFLINE TOGGLE */}
                          <div className="flex bg-blue-100/50 p-1 rounded-lg mb-4 border border-blue-200">
                            <button
                              onClick={() => setPaymentPreferences({...paymentPreferences, [booking.id]: 'ONLINE'})}
                              className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${selectedMode === 'ONLINE' ? 'bg-white shadow text-blue-700' : 'text-blue-900/60 hover:bg-blue-200/50'}`}
                            >
                              Online
                            </button>
                            <button
                              onClick={() => setPaymentPreferences({...paymentPreferences, [booking.id]: 'OFFLINE'})}
                              className={`flex-1 py-1.5 text-sm font-bold rounded-md transition flex justify-center items-center gap-1 ${selectedMode === 'OFFLINE' ? 'bg-white shadow text-blue-700' : 'text-blue-900/60 hover:bg-blue-200/50'}`}
                            >
                              Cash / Desk
                            </button>
                          </div>

                          {/* RENDER BASED ON TOGGLE */}
                          {selectedMode === 'ONLINE' ? (
                            <button 
                              onClick={() => handlePayment(booking.id, 'ADVANCE')} 
                              disabled={processingPaymentId === booking.id}
                              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {processingPaymentId === booking.id ? (
                                <><Loader2 size={18} className="animate-spin" /> Processing...</>
                              ) : (
                                <><CreditCard size={18} /> Pay Advance (₹{booking.financials?.advanceAmountRequested})</>
                              )}
                            </button>
                          ) : (
                            <div className="bg-white border border-gray-200 p-4 rounded-lg text-center shadow-sm">
                              <Banknote size={24} className="mx-auto text-green-600 mb-2" />
                              <h4 className="font-bold text-gray-800">Pay Cash at Desk</h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                Please visit the Bhavan Clerk Desk to pay the advance of <strong>₹{booking.financials?.advanceAmountRequested}</strong> in cash.
                              </p>
                              <p className="text-xs text-red-500 mt-3 font-semibold bg-red-50 py-1.5 px-2 rounded">
                                ⏳ Auto-cancels if unpaid in 24 hours.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- REMAINING BALANCE BLOCK --- */}
                  {booking.status === 'CONFIRMED' && booking.financials?.paymentStatus === 'PARTIAL' && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 font-bold uppercase mb-2">Final Settlement</p>
                      <button 
                        onClick={() => handlePayment(booking.id, 'REMAINING')}
                        disabled={processingPaymentId === booking.id}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {processingPaymentId === booking.id ? (
                          <><Loader2 size={18} className="animate-spin" /> Processing...</>
                        ) : (
                          <><CreditCard size={18} /> Pay Remaining Online</>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="mt-2 border-t pt-1"></div>

                  {/* CANCEL BUTTON */}
                  {booking.status === 'CONFIRMED' && new Date(booking.schedule.startTime) > new Date() && (
                    <button 
                      onClick={() => setBookingToCancel(booking)}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-4 border-2 border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition shadow-sm"
                    >
                      <AlertCircle size={18} /> Cancel Booking
                    </button>
                  )}
                  
                  {(booking.status === 'PENDING_CLERK_REVIEW' || booking.status === 'PENDING_ADMIN_APPROVAL') && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md mt-4">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>Waiting for management approval. We will notify you when payment is required.</p>
                    </div>
                  )}
                  
                  {booking.status === 'CONFIRMED' && booking.financials?.paymentStatus === 'COMPLETED' && (
                    <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-700 bg-green-100 p-3 rounded-md mt-4">
                      <CheckCircle size={18} /> Paid in Full
                    </div>
                  )}

                  {booking.status === 'CHECKED_OUT' && (
                    <button 
                      onClick={async () => {
                        try {
                          const response = await api.get(`/billing/my-invoice/${booking.id}`);
                          setPrintModal({ invoice: response.data.data.invoice, booking });
                        } catch(err) { 
                          toast.error("Invoice not found or not yet approved by Admin."); 
                        }
                      }} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2.5 rounded transition flex justify-center items-center gap-2 shadow-sm mt-4 font-semibold"
                    >
                      <FileText size={18}/> View / Print Final Bill
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      {printModal && (
        <InvoicePrintView 
          invoice={printModal.invoice} 
          booking={printModal.booking} 
          onClose={() => setPrintModal(null)} 
        />
      )}
      
      <CancelBookingModal 
        isOpen={!!bookingToCancel} 
        booking={bookingToCancel} 
        onClose={() => setBookingToCancel(null)} 
        onSuccess={fetchMyBookings} 
      />
    </div>
  );
}