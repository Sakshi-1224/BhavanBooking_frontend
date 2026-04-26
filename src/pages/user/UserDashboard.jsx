import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, CreditCard, Calendar, Loader2, FileText, Banknote, User as UserIcon } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import InvoicePrintView from '../../components/InvoicePrintView';
import CancelBookingModal from '../../components/booking/CancelBookingModal';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING_CLERK_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PENDING_ADMIN_APPROVAL: 'bg-orange-100 text-orange-800 border-orange-200',
    PENDING_PAYMENT: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    AWAITING_CASH_PAYMENT: 'bg-purple-100 text-purple-800 border-purple-200 animate-pulse',
    ON_HOLD: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
    CHECKED_IN: 'bg-teal-100 text-teal-800 border-teal-200',
    CHECKED_OUT: 'bg-gray-200 text-gray-800 border-gray-300',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
    PENDING_CANCELLATION: 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse',
  };

  const labels = {
    PENDING_CLERK_REVIEW: 'Under Clerk Review',
    PENDING_ADMIN_APPROVAL: 'Awaiting Admin Approval',
    PENDING_PAYMENT: 'Action Required: Make Payment',
    AWAITING_CASH_PAYMENT: 'Awaiting Cash at Desk',
    ON_HOLD: 'Dates On Hold (Balance Pending)',
    CONFIRMED: 'Confirmed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    PENDING_CANCELLATION: 'Cancellation Processing',
  };

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.CANCELLED}`}>
      {labels[status] || status.replace(/_/g, ' ')}
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

  const handlePayment = async (bookingId, paymentPhase, paymentOption = 'FULL') => {
    setProcessingPaymentId(bookingId);

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      setProcessingPaymentId(null);
      return toast.error('Failed to load Razorpay. Please check your connection.');
    }

    try {
      const createOrderUrl = paymentPhase === 'INITIAL' ? '/payments/initial/create-order' : '/payments/remaining/create-order';
      const verifyOrderUrl = paymentPhase === 'INITIAL' ? '/payments/initial/verify' : '/payments/remaining/verify';

      const payload = paymentPhase === 'INITIAL' ? { bookingId, paymentOption } : { bookingId };

      const orderResponse = await api.post(createOrderUrl, payload);
      const orderData = orderResponse.data.data;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Maharashtra Mandal Raipur',
        description: `${paymentPhase === 'INITIAL' ? (paymentOption === 'HOLD' ? 'Hold' : 'Full') : 'Balance'} Payment`,
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
            toast.success(`🎉 Payment successful!`);
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
        theme: { color: '#e53e3e' },
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
     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your facility reservations and payments.</p>
        </div>
        
        {/* New Profile Link Button */}
        <Link 
          to="/profile" 
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2.5 rounded-lg font-semibold shadow-sm transition-colors"
        >
          <UserIcon size={18} className="text-blue-600" />
          My Profile
        </Link>
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
                      
                      const advancePaid = Number(booking.financials?.holdAmountPaid || booking.financials?.advanceAmountRequested || 0);
                      const isPartial = booking.financials?.paymentStatus === 'PARTIAL';
                      const isCompleted = booking.financials?.paymentStatus === 'COMPLETED';
                      
                      // MATH UPDATED: Amount Paid and Amount Due only apply to the base rent online
                      const amountPaid = isCompleted ? base : (isPartial ? advancePaid : 0);
                      const amountDue = base - amountPaid;

                      return (
                        <>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Base Quote (Rent):</span>
                            <span className="font-bold text-gray-900">₹{base.toLocaleString('en-IN')}</span>
                          </div>
                          
                          <div className="flex justify-between text-sm text-orange-600 border-b border-gray-200 pb-2">
                            <span>Security Deposit:</span>
                            <span className="font-semibold">₹{deposit.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200 mb-3">
                            <p className="text-[11px] text-orange-800 font-medium leading-tight text-center">
                              * Security deposit of ₹{deposit.toLocaleString('en-IN')} is collected separately at check-in.
                            </p>
                          </div>
                          
                          {(isPartial || isCompleted) && (
                            <div className="mt-3 p-3 bg-white border rounded-md shadow-sm space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-green-600 font-semibold">Rent Paid:</span>
                                <span className="text-green-600 font-bold">₹{amountPaid.toLocaleString('en-IN')}</span>
                              </div>
                              {amountDue > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-red-600 font-semibold">Remaining Rent Due:</span>
                                  <span className="text-red-600 font-bold">₹{amountDue.toLocaleString('en-IN')}</span>
                                </div>
                              )}
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

                  {/* --- INITIAL PAYMENT BLOCK WITH ONLINE/OFFLINE TOGGLE --- */}
                  {booking.status === 'PENDING_PAYMENT' && (
                    <div className="mt-1 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      {!booking.verification?.aadharFrontImageUrl ? (
                        <div>
                          <h4 className="font-bold text-blue-800 mb-2">Upload KYC to Enable Payment</h4>
                          <p className="text-sm text-gray-600 mb-3">As per management rules, please upload your Aadhaar card to proceed with the payment.</p>
                          
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
                            <div className="space-y-3 mt-4">
                              {/* 🚨 MATH UPDATED: OPTION 1: PAY FULL RENT ONLY */}
                              <button 
                                onClick={() => handlePayment(booking.id, 'INITIAL', 'FULL')} 
                                disabled={processingPaymentId === booking.id}
                                className="w-full flex items-center justify-between py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                              >
                                <span><CreditCard size={18} className="inline mr-2" /> Pay Rent Full</span>
                                <span>₹{Number(booking.financials?.calculatedAmount).toLocaleString('en-IN')}</span>
                              </button>

                              {/* 🚨 MATH UPDATED: OPTION 2: HOLD (Percentage of Rent ONLY) */}
                              {booking.financials?.isHoldingAllowed && (
                                 <button 
                                   onClick={() => handlePayment(booking.id, 'INITIAL', 'HOLD')} 
                                   disabled={processingPaymentId === booking.id}
                                   className="w-full flex items-center justify-between py-3 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                 >
                                   <div className="text-left">
                                      <span className="block"><CreditCard size={18} className="inline mr-2" /> Hold Dates ({booking.financials.holdingPercentage}%)</span>
                                      <span className="text-xs text-indigo-200 font-normal">Balance due in {booking.financials.holdingValidityDays} days</span>
                                   </div>
                                   <span>₹{(Number(booking.financials?.calculatedAmount) * (Number(booking.financials.holdingPercentage) / 100)).toLocaleString('en-IN')}</span>
                                 </button>
                              )}
                            </div>
                          ) : (
                            <div className="bg-white border border-gray-200 p-4 rounded-lg text-center shadow-sm">
                              <Banknote size={24} className="mx-auto text-green-600 mb-2" />
                              <h4 className="font-bold text-gray-800">Pay Cash at Desk</h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                Please visit the Bhavan Clerk Desk to make your payment in cash.
                              </p>
                              <p className="text-xs text-red-500 mt-3 font-semibold bg-red-50 py-1.5 px-2 rounded">
                                ⏳ Auto-cancels if unpaid before deadline.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- REMAINING BALANCE BLOCK --- */}
                  {booking.status === 'ON_HOLD' && booking.financials?.paymentStatus === 'PARTIAL' && (
                    <div className="mt-4">
                      {booking.financials?.holdDeadline && (
                        <p className="text-xs text-red-500 font-bold uppercase mb-2">
                          ⚠️ Balance due by {formatDate(booking.financials.holdDeadline)}
                        </p>
                      )}
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

                  {/* 1. CANCEL BUTTON LOGIC */}
                  {
                    !['PENDING_CANCELLATION', 'CANCELLED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status) && 
                    new Date(booking.schedule.startTime) > new Date() && 
                    (
                      <button 
                        onClick={() => setBookingToCancel(booking)}
                        className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-4 border-2 border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition shadow-sm"
                      >
                        <AlertCircle size={18} /> Cancel Booking
                      </button>
                    )
                  }

                  {/* 2. CANCELLATION SUMMARY */}
                  {['PENDING_CANCELLATION', 'CANCELLED'].includes(booking.status) && (
                    <div className="mt-4 bg-gray-100 border border-gray-200 p-4 rounded-lg">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                        <AlertCircle size={18} className="text-gray-500" />
                        Cancellation Summary
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Your booking cancellation has been requested. As per policy, you are eligible for a <strong>₹{booking.financials?.refundAmount || 0}</strong> refund.
                      </p>

                      {booking.financials?.refundAmount > 0 && booking.financials?.paymentStatus === 'REFUNDED' ? (
                        <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm font-semibold flex items-center gap-2 border border-green-200">
                          <CheckCircle size={16} /> Refund Processed Successfully
                        </div>
                      ) : booking.financials?.refundAmount > 0 ? (
                        <div className="bg-orange-50 text-orange-800 p-3 rounded-md text-sm font-semibold flex items-center gap-2 border border-orange-200">
                          <Clock size={16} /> Refund Pending Admin Verification
                          <span className="block text-xs font-normal mt-1 text-orange-700">
                            Once approved by the Admin, online payments will be credited in 3-5 days. Cash payments must be collected at the desk.
                          </span>
                        </div>
                      ) : (
                        <div className="bg-gray-200 text-gray-700 p-3 rounded-md text-sm font-semibold">
                          No refund applicable for this cancellation.
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(booking.status === 'PENDING_CLERK_REVIEW' || booking.status === 'PENDING_ADMIN_APPROVAL') && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md mt-4">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>Waiting for management approval. We will notify you when payment is required.</p>
                    </div>
                  )}
                  
                  {booking.status === 'CONFIRMED' && booking.financials?.paymentStatus === 'COMPLETED' && (
                    <div className="flex items-center justify-center gap-2 text-sm font-bold text-green-700 bg-green-100 p-3 rounded-md mt-4">
                      <CheckCircle size={18} /> Rent Paid in Full
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