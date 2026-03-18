import { useState, useEffect } from 'react';
import { CheckCircle, Clock, LogOut, X, LogIn, LogOut as LogOutIcon, UploadCloud, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

export default function ClerkDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING_CLERK_REVIEW');
  const [isProcessing, setIsProcessing] = useState(null);
  
  // Modal States
  const [modalType, setModalType] = useState(null); // 'checkin' | 'checkout' | null
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [formData, setFormData] = useState({});
  
  // NEW: Invoice Tracking States for Maker-Checker Flow
  const [invoiceData, setInvoiceData] = useState(null);
  const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/auth/admin/bookings');
      setBookings(response.data.data);
    } catch (error) {
      toast.error('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (bookingId) => {
    setIsProcessing(bookingId);
    try {
      await api.patch(`/auth/admin/bookings/${bookingId}/verify`);
      toast.success('Booking verified and sent to Admin!');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify booking');
    } finally {
      setIsProcessing(null);
    }
  };

  // UPGRADED: Now fetches the invoice if it exists to check approval status
  const openModal = async (type, booking) => {
    setModalType(type);
    setSelectedBooking(booking);
    setInvoiceData(null);
    
    if (type === 'checkin') {
      setFormData({ aadhaarNumber: '', actualGuestCount: booking.guestCount, idDocument: null });
    } else if (type === 'checkout') {
      setIsFetchingInvoice(true);
      try {
        // Try to fetch an existing invoice draft
        const response = await api.get(`/billing/${booking.id}/invoice`);
        const invoice = response.data.data;
        setInvoiceData(invoice);

        // Pre-fill form if it was rejected so the clerk can easily fix it
        setFormData({
          electricityUnitsConsumed: invoice.electricityUnitsConsumed || '',
          cleaningCharges: invoice.cleaningCharges || '',
          generatorCharges: invoice.generatorCharges || '',
          penaltyAmount: invoice.damagesAndPenalties?.[0]?.amount || '',
          penaltyReason: invoice.damagesAndPenalties?.[0]?.reason || ''
        });
      } catch (error) {
        // 404 means no draft exists yet (fresh check-out)
        setFormData({ electricityUnitsConsumed: '', cleaningCharges: '', generatorCharges: '', penaltyAmount: '', penaltyReason: '' });
      } finally {
        setIsFetchingInvoice(false);
      }
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(selectedBooking.id);
    
    try {
      if (modalType === 'checkin') {
        const checkInForm = new FormData();
        // checkInForm.append('aadhaarNumber', formData.aadhaarNumber);
        // checkInForm.append('actualGuestCount', Number(formData.actualGuestCount));
        
        if (!formData.idDocument) {
          setIsProcessing(null);
          return toast.warn("Please upload the guest's ID document.");
        }
        
        checkInForm.append('aadharImage', formData.idDocument); 

        await api.patch(`/bookings/${selectedBooking.id}/check-in`, checkInForm, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Check-in successful & Document uploaded to MinIO!');
        
      } else {
        // Check-Out Logic: Works for both fresh drafts and resubmitting rejected drafts!
        const payload = {
          electricityUnitsConsumed: Number(formData.electricityUnitsConsumed || 0),
          cleaningCharges: Number(formData.cleaningCharges || 0),
          generatorCharges: Number(formData.generatorCharges || 0),
          damagesAndPenalties: formData.penaltyAmount > 0 
            ? [{ reason: formData.penaltyReason, amount: Number(formData.penaltyAmount) }] 
            : []
        };
        
        await api.post(`/billing/${selectedBooking.id}/draft-invoice`, payload);
        toast.success('Draft invoice submitted! Sent to Admin for approval.');
      }
      
      setModalType(null);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to complete ${modalType}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/clerk/login');
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return ['CONFIRMED', 'CHECKED_IN'].includes(b.status);
    return b.status === activeTab;
  });

  if (loading) return <div className="p-20 text-center text-xl text-gray-500">Loading clerk workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="font-bold text-xl tracking-wider">
              BhavanBook <span className="text-green-300">| Desk</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Clerk: {user?.fullName}</span>
              <button onClick={handleLogout} className="flex items-center gap-1 hover:text-green-200 transition">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Booking Verification Queue</h1>
          <div className="flex bg-white rounded-lg shadow-sm p-1 border">
            <button onClick={() => setActiveTab('PENDING_CLERK_REVIEW')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'PENDING_CLERK_REVIEW' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}>Needs Verification</button>
            <button onClick={() => setActiveTab('ACTIVE')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>Check-in / Out</button>
            <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'ALL' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>All Bookings</button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <CheckCircle size={48} className="text-green-400 mb-4" />
              <p className="text-lg font-medium">No bookings found for this category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                    <th className="p-4 font-medium">Ref ID</th>
                    <th className="p-4 font-medium">Dates</th>
                    <th className="p-4 font-medium">Details</th>
                    <th className="p-4 font-medium">Financials</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {filteredBookings.map((booking) => {
                    const schedule = booking.schedule || {};
                    const financials = booking.financials || {};

                    const total = Number(financials.calculatedAmount) + Number(financials.securityDeposit);
                    const advance = Number(financials.advanceAmountRequested) || 0;
                    const paid = financials.paymentStatus === 'COMPLETED' ? total : (financials.paymentStatus === 'PARTIAL' ? advance : 0);

                    return(
                      <tr key={booking.id} className="hover:bg-gray-50 transition">
                        <td className="p-4 text-gray-900 font-mono text-xs">{booking.id.substring(0, 8).toUpperCase()}</td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="text-green-700 font-medium">In: {formatDate(schedule.startTime)}</span>
                            <span className="text-red-700 font-medium">Out: {formatDate(schedule.endTime)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">{booking.eventType}</div>
                          <div className="text-gray-500 text-xs mt-1">{booking.guestCount} Guests</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-900">Total: ₹{total ? total.toLocaleString('en-IN') : 0}</div>
                          <div className="text-green-600 font-medium text-xs mt-1">Paid: ₹{paid.toLocaleString('en-IN')}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full block w-max bg-gray-100 text-gray-800`}>
                            {booking.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 flex gap-2">
                          {booking.status === 'PENDING_CLERK_REVIEW' && (
                            <button onClick={() => handleVerify(booking.id)} disabled={isProcessing === booking.id} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs transition">
                              Verify
                            </button>
                          )}
                          
                          {/* CHECK-IN BUTTON WITH PAYMENT GATE */}
                          {booking.status === 'CONFIRMED' && (
                            financials.paymentStatus === 'COMPLETED' ? (
                              <button onClick={() => openModal('checkin', booking)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1">
                                <LogIn size={14}/> Check-In
                              </button>
                            ) : (
                              <div className="group relative flex flex-col items-center">
                                <button disabled className="bg-gray-300 text-gray-500 px-3 py-1.5 rounded text-xs flex items-center gap-1 cursor-not-allowed">
                                  <Clock size={14}/> Awaiting Payment
                                </button>
                                <span className="absolute bottom-full mb-1 hidden group-hover:block w-max bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg">
                                  User must pay balance before Check-In.
                                </span>
                              </div>
                            )
                          )}

                          {booking.status === 'CHECKED_IN' && (
                            <button onClick={() => openModal('checkout', booking)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1">
                              <LogOutIcon size={14}/> Billing / Check-Out
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{modalType === 'checkin' ? 'Guest Check-In' : 'Draft Final Invoice'}</h2>
            
            {modalType === 'checkout' && isFetchingInvoice ? (
               <div className="flex flex-col items-center justify-center py-8">
                 <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
                 <p className="text-gray-500 text-sm">Loading billing records...</p>
               </div>
            ) : modalType === 'checkout' && invoiceData?.approvalStatus === 'PENDING_ADMIN_APPROVAL' ? (
               <div className="text-center py-6">
                 <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
                 <h3 className="text-lg font-bold text-gray-900">Invoice Pending Admin Approval</h3>
                 <p className="text-gray-500 mt-2 text-sm">You have already submitted the billing details. The Admin is reviewing the final refund/deductions. No further action needed.</p>
                 <button onClick={() => setModalType(null)} className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition">Close Window</button>
               </div>
            ) : (
              <form onSubmit={handleActionSubmit} className="space-y-4">
                
                {/* CHECK-IN FIELDS */}
                {modalType === 'checkin' && (
                  <>
                  
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><UploadCloud size={16}/> Upload ID Document</label>
                      <input type="file" required accept="image/*,application/pdf" onChange={(e) => setFormData({...formData, idDocument: e.target.files[0]})} className="w-full border rounded-md bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      <p className="text-xs text-gray-500 mt-1">Accepts PDF, JPG, PNG. (Saved securely to MinIO)</p>
                    </div>
                  </>
                )}

                {/* CHECK-OUT FIELDS */}
                {modalType === 'checkout' && (
                  <>
                    {/* MAKER-CHECKER REJECTION BANNER */}
                    {invoiceData?.approvalStatus === 'REJECTED' && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-md">
                        <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
                          <AlertTriangle size={18} /> Admin Rejected Draft
                        </div>
                        <p className="text-sm text-red-700"><strong>Remarks:</strong> {invoiceData.adminRemarks || "Please correct the billing details and resubmit."}</p>
                      </div>
                    )}

                    <div className="bg-orange-50 p-3 rounded-md border border-orange-100 mb-2">
                      <p className="text-xs text-orange-800 font-semibold mb-2">Note: Electricity is calculated at ₹14/unit automatically.</p>
                      <div className="flex flex-col gap-1">
                          <label className="block text-sm font-bold text-gray-700">Total Electricity Units Consumed</label>
                          <input type="number" required value={formData.electricityUnitsConsumed} onChange={(e) => setFormData({...formData, electricityUnitsConsumed: e.target.value})} className="w-full px-4 py-2 border rounded-md" placeholder="e.g. 50" />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cleaning Chg (₹)</label>
                        <input type="number" value={formData.cleaningCharges} onChange={(e) => setFormData({...formData, cleaningCharges: e.target.value})} className="w-full px-4 py-2 border rounded-md" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Generator Chg (₹)</label>
                        <input type="number" value={formData.generatorCharges} onChange={(e) => setFormData({...formData, generatorCharges: e.target.value})} className="w-full px-4 py-2 border rounded-md" />
                      </div>
                    </div>

                    <div className="p-3 bg-red-50 rounded-md border border-red-100 space-y-3">
                      <h3 className="text-sm font-bold text-red-800">Penalties / Damages (Optional)</h3>
                      <input type="text" placeholder="Reason (e.g. Broken chair)" value={formData.penaltyReason} onChange={(e) => setFormData({...formData, penaltyReason: e.target.value})} className="w-full px-3 py-1.5 border rounded-md text-sm" />
                      <input type="number" placeholder="Amount (₹)" value={formData.penaltyAmount} onChange={(e) => setFormData({...formData, penaltyAmount: e.target.value})} className="w-full px-3 py-1.5 border rounded-md text-sm" />
                    </div>
                  </>
                )}

                <button type="submit" disabled={isProcessing === selectedBooking?.id} className="w-full py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition mt-4 disabled:opacity-50">
                  {isProcessing === selectedBooking?.id ? 'Processing...' : modalType === 'checkin' ? 'Confirm Check-In' : invoiceData?.approvalStatus === 'REJECTED' ? 'Resubmit Draft Invoice' : 'Submit Draft Invoice'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}