import { useState, useEffect } from 'react';
import { CheckCircle, Shield, LogOut, X, Eye, FileText, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import CreateClerk from './CreateClerk';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('PENDING_ADMIN_APPROVAL');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Initial Booking Approval Modals & Forms
  const [approvingBooking, setApprovingBooking] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Invoice / Checkout Approval Modal
  const [invoiceModal, setInvoiceModal] = useState(null); // holds { booking, invoice }
  const [invoiceRemarks, setInvoiceRemarks] = useState('');

  // Detailed View State
  const [viewingDetails, setViewingDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  // --- 1. INITIAL BOOKING APPROVAL LOGIC ---
  const handleOpenApproveModal = (booking) => {
    setApprovingBooking(booking);
    const financials = booking.financials || {};
    const baseCalculated = Number(financials.calculatedAmount) || 0;
    const security = Number(financials.securityDeposit) || 0;
    
    setTotalAmount(baseCalculated.toString());
    const suggestedAdvance = Math.round((baseCalculated * 0.20) + security);
    setAdvanceAmount(suggestedAdvance.toString());
  };

  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!advanceAmount || Number(advanceAmount) <= 0) return toast.warn('Please enter a valid advance amount.');
    if (Number(totalAmount) < 0) return toast.warn('Total amount cannot be negative.');

    setIsSubmitting(true);
    try {
      await api.patch(`/auth/admin/bookings/${approvingBooking.id}/approve`, {
        advanceAmountRequested: Number(advanceAmount),
        revisedTotalAmount: Number(totalAmount)
      });
      toast.success('Booking approved! User notified to pay advance.');
      setApprovingBooking(null);
      fetchBookings(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 2. INITIAL BOOKING REJECTION LOGIC ---
  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to reject this booking? This cannot be undone.')) return;
    try {
      // Adjusted route to ensure it hits the admin endpoint
      await api.patch(`/bookings/${bookingId}/reject`);
      toast.success('Booking rejected successfully.');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject booking');
    }
  };

  // --- 3. CHECK-OUT / INVOICE APPROVAL LOGIC ---
  const handleOpenInvoiceModal = async (booking) => {
    try {
      // Fetch the draft invoice created by the clerk
      const response = await api.get(`/billing/${booking.id}/invoice`);
      const invoice = response.data.data;
      
      if (invoice.approvalStatus !== 'PENDING_ADMIN_APPROVAL') {
        return toast.info(`This invoice is currently: ${invoice.approvalStatus}`);
      }

      setInvoiceModal({ booking, invoice });
      setInvoiceRemarks('');
    } catch (error) {
      // If 404, the clerk hasn't drafted it yet
      toast.info("No pending draft invoice found. Clerk has not initiated check-out yet.");
    }
  };

  const handleInvoiceAction = async (status) => {
    if (status === 'REJECTED' && !invoiceRemarks.trim()) {
      return toast.warn('Remarks are required when rejecting an invoice back to the clerk.');
    }

    setIsSubmitting(true);
    try {
      const payload = { status, adminRemarks: invoiceRemarks };
      const response = await api.patch(`/billing/invoice/${invoiceModal.invoice.id}/approve`, payload);
      
      toast.success(response.data.message || `Invoice ${status.toLowerCase()} successfully.`);
      setInvoiceModal(null);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 4. DETAILS VIEW LOGIC ---
  const fetchBookingDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const response = await api.get(`/auth/admin/bookings/${id}`);
      setViewingDetails(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch detailed booking info');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    return b.status === activeTab;
  });

  if (loading) return <div className="p-20 text-center text-xl text-gray-500">Loading Admin workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-red-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2 font-bold text-xl tracking-wider">
            <Shield size={24} className="text-red-300" /> BhavanBook <span className="text-red-300">| Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Admin: {user?.fullName}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 hover:text-red-200 transition"><LogOut size={18} /> Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
          <div className="flex bg-white rounded-lg shadow-sm p-1 border overflow-x-auto">
            <button onClick={() => setActiveTab('PENDING_ADMIN_APPROVAL')} className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'PENDING_ADMIN_APPROVAL' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-50'}`}>Needs Approval</button>
            <button onClick={() => setActiveTab('CHECKED_IN')} className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'CHECKED_IN' ? 'bg-orange-100 text-orange-800' : 'text-gray-600 hover:bg-gray-50'}`}>Active / Check-Outs</button>
            <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'ALL' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>All Bookings</button>
            <button onClick={() => setActiveTab('STAFF')} className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'STAFF' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>Staff</button>
          </div>
        </div>

        {activeTab === 'STAFF' ? <CreateClerk /> : (
          <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                      <th className="p-4 font-medium">Ref ID</th>
                      <th className="p-4 font-medium">Dates</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {filteredBookings.length === 0 && (
                      <tr><td colSpan="4" className="p-8 text-center text-gray-500">No bookings found in this category.</td></tr>
                    )}
                    {filteredBookings.map((booking) => {
                       const schedule = booking.schedule || {};
                       return (
                          <tr key={booking.id} className="hover:bg-gray-50 transition">
                            <td className="p-4 text-gray-900 font-mono text-xs">{booking.id.substring(0, 8).toUpperCase()}</td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="text-green-700 font-medium block">In: {formatDate(schedule.startTime)}</span>
                              <span className="text-red-700 font-medium block">Out: {formatDate(schedule.endTime)}</span>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{booking.status.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="p-4 flex flex-wrap gap-2">
                              {booking.status === 'PENDING_ADMIN_APPROVAL' && (
                                <>
                                  <button onClick={() => handleOpenApproveModal(booking)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs transition">Approve</button>
                                  <button onClick={() => handleRejectBooking(booking.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs transition">Reject</button>
                                </>
                              )}
                              
                              {booking.status === 'CHECKED_IN' && (
                                <button onClick={() => handleOpenInvoiceModal(booking)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs transition flex items-center gap-1">
                                  <FileText size={14}/> Review Check-Out
                                </button>
                              )}
                              
                              <button onClick={() => fetchBookingDetails(booking.id)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded text-xs transition flex items-center gap-1"><Eye size={14}/> Details</button>
                            </td>
                          </tr>
                       )
                    })}
                  </tbody>
                </table>
              </div>
          </div>
        )}
      </div>

      {/* DETAILED VIEW MODAL */}
      {viewingDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setViewingDetails(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
              <p className="font-mono text-sm text-gray-500 mt-1">ID: {viewingDetails.id}</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
                <div><span className="text-xs text-gray-500 uppercase font-bold block">User</span><span className="font-semibold">{viewingDetails.user?.fullName} ({viewingDetails.user?.mobile})</span></div>
                <div><span className="text-xs text-gray-500 uppercase font-bold block">Main Facility</span><span className="font-semibold">{viewingDetails.facility?.name}</span></div>
                <div><span className="text-xs text-gray-500 uppercase font-bold block">Event Type</span><span className="font-semibold">{viewingDetails.eventType} ({viewingDetails.guestCount} Guests)</span></div>
                <div><span className="text-xs text-gray-500 uppercase font-bold block">Current Status</span><span className="font-bold text-blue-600">{viewingDetails.status}</span></div>
              </div>

              {viewingDetails.customDetails?.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">Additional Items Requested</h3>
                  <ul className="space-y-1">
                    {viewingDetails.customDetails.map((cf, idx) => (
                      <li key={idx} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                        <span>{cf.name} x {cf.quantity}</span>
                        <span className="font-medium">₹{cf.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                 <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">Financial Overview</h3>
                 <div className="flex justify-between text-sm py-1"><span>Base Amount</span><span>₹{viewingDetails.financials?.calculatedAmount}</span></div>
                 <div className="flex justify-between text-sm py-1"><span>Security Deposit</span><span>₹{viewingDetails.financials?.securityDeposit}</span></div>
                 {(viewingDetails.financials?.advanceRequested || viewingDetails.financials?.advanceAmountRequested) > 0 && (
                   <div className="flex justify-between text-sm py-1 text-blue-600 font-medium">
                     <span>Advance Requested</span>
                     <span>₹{viewingDetails.financials?.advanceRequested || viewingDetails.financials?.advanceAmountRequested}</span>
                   </div>
                 )}
                 <div className="flex justify-between text-sm py-1 font-bold text-lg mt-2 pt-2 border-t"><span>Total Value</span><span>₹{Number(viewingDetails.financials?.calculatedAmount) + Number(viewingDetails.financials?.securityDeposit)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INITIAL BOOKING APPROVAL MODAL */}
      {approvingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setApprovingBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Approval</h2>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">Adjust pricing and set required advance payment.</p>
            
            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded border text-sm">
                <span className="font-semibold text-gray-700">Security Deposit:</span>
                <span className="font-bold">₹{approvingBooking.financials?.securityDeposit || 0}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Revised Base Amount (₹)</label>
                <input type="number" required min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-full px-4 py-2 border rounded-md text-lg font-semibold focus:ring-red-500 focus:border-red-500" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Advance Amount Required (₹)</label>
                <input type="number" required min="1" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} className="w-full px-4 py-2 border rounded-md text-lg font-semibold focus:ring-red-500 focus:border-red-500" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setApprovingBooking(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition disabled:opacity-50">
                  {isSubmitting ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECK-OUT / INVOICE APPROVAL MODAL */}
      {invoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setInvoiceModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Review Draft Invoice</h2>
            <p className="text-sm text-gray-500 mb-4 border-b pb-4">Verify clerk's check-out deductions before finalizing.</p>
            
            <div className="space-y-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Electricity Consumed:</span><span className="font-semibold">{invoiceModal.invoice.electricityUnitsConsumed || 0} units (₹{invoiceModal.invoice.electricityCharges})</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Cleaning Charges:</span><span className="font-semibold">₹{invoiceModal.invoice.cleaningCharges || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Generator Charges:</span><span className="font-semibold">₹{invoiceModal.invoice.generatorCharges || 0}</span></div>
                
                {invoiceModal.invoice.damagesAndPenalties?.length > 0 && (
                  <div className="pt-2 mt-2 border-t">
                    <span className="font-bold text-red-700 flex items-center gap-1"><AlertTriangle size={14}/> Damages/Penalties:</span>
                    <ul className="mt-1 space-y-1">
                      {invoiceModal.invoice.damagesAndPenalties.map((p, i) => (
                        <li key={i} className="flex justify-between text-red-600 bg-red-50 px-2 py-1 rounded">
                          <span>{p.reason}</span><span>₹{p.amount}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex justify-between font-medium mb-1"><span className="text-gray-700">Total Deductions:</span><span>₹{invoiceModal.invoice.totalDeductions}</span></div>
                <div className="flex justify-between font-medium mb-2"><span className="text-gray-700">Security Deposit Held:</span><span>₹{invoiceModal.invoice.securityDepositHeld}</span></div>
                <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-bold text-lg">
                  {invoiceModal.invoice.finalRefundAmount > 0 ? (
                    <><span className="text-green-700">Refund to User:</span><span className="text-green-700">₹{invoiceModal.invoice.finalRefundAmount}</span></>
                  ) : (
                    <><span className="text-red-700">Balance Due (User Owes):</span><span className="text-red-700">₹{invoiceModal.invoice.additionalBalanceDue}</span></>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Admin Remarks / Notes</label>
                <textarea 
                  rows="2" 
                  value={invoiceRemarks} 
                  onChange={(e) => setInvoiceRemarks(e.target.value)} 
                  placeholder="Required if rejecting back to clerk..."
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => handleInvoiceAction('REJECTED')} 
                  disabled={isSubmitting} 
                  className="flex-1 py-2.5 bg-red-100 text-red-700 font-bold rounded-md hover:bg-red-200 transition disabled:opacity-50"
                >
                  Reject to Clerk
                </button>
                <button 
                  type="button" 
                  onClick={() => handleInvoiceAction('APPROVED')} 
                  disabled={isSubmitting} 
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Approve Check-Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}