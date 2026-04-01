import { useState, useEffect } from 'react';
import { CheckCircle, Shield, LogOut, X, Eye, FileText, AlertTriangle, Settings, Plus } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import CreateClerk from './CreateClerk';
import InvoicePrintView from '../../components/InvoicePrintView';
import AdminProfileModal from './AdminProfileModal'; 
import ReportsView from './ReportsView';
import AdminFacilitiesView from './AdminFacilitiesView';
import BookingDetailsModal from '../../components/booking/BookingDetailsModal';
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

export default function AdminDashboard() {
  const [printModal, setPrintModal] = useState(null); 
  const [activeTab, setActiveTab] = useState('PENDING_ADMIN_APPROVAL');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [approvingBooking, setApprovingBooking] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceRemarks, setInvoiceRemarks] = useState('');

  const [viewingDetails, setViewingDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);

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

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to reject this booking? This cannot be undone.')) return;
    try {
      await api.patch(`/bookings/${bookingId}/reject`);
      toast.success('Booking rejected successfully.');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject booking');
    }
  };

  const handleOpenInvoiceModal = async (booking) => {
    try {
      const response = await api.get(`/billing/${booking.id}/invoice`);
      const invoice = response.data.data.invoice;
      
      if (invoice.approvalStatus !== 'PENDING_ADMIN_APPROVAL') {
        return toast.info(`This invoice is currently: ${invoice.approvalStatus}`);
      }

      setInvoiceModal({ booking, invoice });
      setInvoiceRemarks('');
    } catch (error) {
      toast.info("No pending draft invoice found. Clerk has not initiated check-out yet.");
    }
  };

  const handleInvoiceAction = async (status) => {
    if (status === 'REJECTED' && !invoiceRemarks.trim()) {
      return toast.warn('Remarks are required when rejecting an invoice back to the clerk.');
    }

    setIsSubmitting(true);
    try {
      const payload = { approvalStatus: status, adminRemarks: invoiceRemarks };
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

 const handleLogout = async () => {
    try {
      // 1. Tell the backend to destroy the httpOnly cookie
      await api.post('/auth/user/logout'); 
    } catch (error) {
      console.error("Failed to clear cookie on backend", error);
    } finally {
      // 2. Clear frontend state and redirect regardless of API success
      logout();
      navigate('/admin/login');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CHECKED_IN') return b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT';
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
          <div className="flex items-center gap-6">
            <span className="text-sm hidden sm:inline">Admin: {user?.fullName}</span>
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-1 hover:text-red-200 transition">
              <Settings size={18} /> Profile
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1 hover:text-red-200 transition">
              <LogOut size={18} /> Logout
            </button>
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
            <button onClick={() => setActiveTab('REPORTS')} className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'REPORTS' ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600 hover:bg-gray-50'}`}>Reports & Analytics</button>
            <button 
  onClick={() => setActiveTab('FACILITIES')} 
  className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${activeTab === 'FACILITIES' ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-gray-50'}`}
>
  Manage Facilities
</button>
          </div>
        </div>

        {activeTab === 'STAFF' ? (
          <CreateClerk />
        ) : activeTab === 'REPORTS' ? (
          <ReportsView />
        ) : activeTab === 'FACILITIES' ? (
  <AdminFacilitiesView />  
): (
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

                              {booking.status === 'CHECKED_OUT' && (
                                <button 
                                  onClick={async () => {
                                    try {
                                      const response = await api.get(`/billing/${booking.id}/invoice`);
                                      setPrintModal({ invoice: response.data.data.invoice, booking });
                                    } catch(err) { toast.error("Invoice not found."); }
                                  }} 
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs transition flex items-center gap-1">
                                  <FileText size={14}/> View Bill
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

      <AdminProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />

   {/* DETAILED VIEW MODAL (Now using the shared component!) */}
      {viewingDetails && (
        <BookingDetailsModal 
          booking={viewingDetails} 
          onClose={() => setViewingDetails(null)} 
        />
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

      {/* UPDATED: CHECK-OUT / INVOICE APPROVAL MODAL (TWO COLUMN LAYOUT) */}
      {invoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setInvoiceModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Review Draft Invoice</h2>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">Verify clerk's check-out deductions and final bill before approving.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* LEFT COLUMN: CLERK'S ENTRIES & ADMIN ACTIONS */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border space-y-3 text-sm">
                  <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                    <CheckCircle size={16} className="text-blue-600" /> Clerk's Data Entry
                  </h3>
                  
                  <div className="flex justify-between"><span className="text-gray-600">Electricity Consumed:</span><span className="font-semibold">{invoiceModal.invoice.electricityUnitsConsumed || 0} units (₹{invoiceModal.invoice.electricityCharges})</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Cleaning Charges:</span><span className="font-semibold">₹{invoiceModal.invoice.cleaningCharges || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Generator Charges:</span><span className="font-semibold">₹{invoiceModal.invoice.generatorCharges || 0}</span></div>
                  
                  {invoiceModal.invoice.additionalItems?.length > 0 && (
                    <div className="pt-2 mt-2 border-t">
                      <span className="font-bold text-blue-700 flex items-center gap-1"><Plus size={14}/> Extra Items Added:</span>
                      <ul className="mt-1 space-y-1">
                        {invoiceModal.invoice.additionalItems.map((item, i) => (
                          <li key={i} className="flex justify-between text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            <span>{item.name}</span><span>₹{item.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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

                  {invoiceModal.invoice.discountAmount > 0 && (
                    <div className="pt-2 mt-2 border-t flex justify-between font-bold text-green-700">
                      <span>Discount Applied:</span><span>- ₹{invoiceModal.invoice.discountAmount}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Admin Remarks / Notes</label>
                  <textarea 
                    rows="3" 
                    value={invoiceRemarks} 
                    onChange={(e) => setInvoiceRemarks(e.target.value)} 
                    placeholder="Required if rejecting back to clerk. Otherwise optional."
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  ></textarea>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => handleInvoiceAction('REJECTED')} 
                    disabled={isSubmitting} 
                    className="flex-1 py-3 bg-red-100 text-red-700 font-bold rounded-md hover:bg-red-200 transition disabled:opacity-50 shadow-sm"
                  >
                    Reject to Clerk
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleInvoiceAction('APPROVED')} 
                    disabled={isSubmitting} 
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition disabled:opacity-50 shadow-md"
                  >
                    {isSubmitting ? 'Processing...' : 'Approve Check-Out'}
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: BILL PREVIEW */}
              <div className="bg-gray-900 text-white p-6 rounded-xl shadow-inner flex flex-col justify-between h-full">
                {(() => {
                  const inv = invoiceModal.invoice;
                  const base = Number(inv.baseAmount) || 0;
                  const extras = Number(inv.totalAdditionalAmount) || 0;
                  const discount = Number(inv.discountAmount) || 0;
                  const taxable = base + extras - discount;

                  const cgst = Number(inv.cgstAmount || 0);
const sgst = Number(inv.sgstAmount || 0);
const taxes = cgst + sgst;

               const cgstRate = taxable > 0 ? Number(((cgst / taxable) * 100).toFixed(2)) : 0;
const sgstRate = taxable > 0 ? Number(((sgst / taxable) * 100).toFixed(2)) : 0;
const totalGstRate = cgstRate + sgstRate;

const totalInvoiceAmount = Number(inv.totalAmount) || 0;

                  const utilities = Number(inv.electricityCharges || 0) + Number(inv.cleaningCharges || 0) + Number(inv.generatorCharges || 0);
                  const penalties = inv.damagesAndPenalties?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
                  const totalDeductions = Number(inv.totalDeductions) || 0;

                  const grandTotalCost = totalInvoiceAmount + totalDeductions;
                  const paid = base + Number(inv.securityDepositHeld || 0);
                  
                  const refundDue = Number(inv.finalRefundAmount) || 0;
                  const balanceDue = Number(inv.additionalBalanceDue) || 0;

                  return (
                    <>
                      <div>
                        <h3 className="font-bold text-xl border-b border-gray-700 pb-3 mb-5 text-blue-300">Final Bill Preview</h3>
                        <div className="space-y-3 text-sm text-gray-300">
                          <div className="flex justify-between"><span>Base Booking:</span><span>₹{base.toLocaleString('en-IN')}</span></div>
                          {extras > 0 && <div className="flex justify-between text-blue-200"><span>Extra Items Added:</span><span>+ ₹{extras.toLocaleString('en-IN')}</span></div>}
                          {discount > 0 && <div className="flex justify-between text-green-400 font-bold"><span>Discount Applied:</span><span>- ₹{discount.toLocaleString('en-IN')}</span></div>}
                          
                          <div className="flex justify-between font-semibold text-white pt-2 border-t border-gray-700 mt-2"><span>Total Taxable Amount:</span><span>₹{taxable.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between"><span>Taxes ({totalGstRate}% GST):</span><span>+ ₹{taxes.toLocaleString('en-IN')}</span></div>
                          
                          <div className="border-t border-gray-700 my-4"></div>
                          
                          <div className="flex justify-between text-orange-300"><span>Utilities (Elec/Clean/Gen):</span><span>+ ₹{utilities.toLocaleString('en-IN')}</span></div>
                          {penalties > 0 && <div className="flex justify-between text-red-400"><span>Penalties/Damages:</span><span>+ ₹{penalties.toLocaleString('en-IN')}</span></div>}
                          
                          <div className="border-t border-gray-700 my-4"></div>

                          <div className="flex justify-between font-bold text-lg text-white"><span>Grand Total Event Cost:</span><span>₹{grandTotalCost.toLocaleString('en-IN')}</span></div>
                          <div className="flex justify-between font-bold text-green-400 mt-2"><span>Total Paid Upfront:</span><span>₹{paid.toLocaleString('en-IN')}</span></div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t-2 border-gray-700 text-center">
                        {refundDue > 0 ? (
                           <div className="bg-green-900/40 text-green-400 p-4 rounded-xl border border-green-700/50 shadow-inner flex flex-col items-center">
                             <span className="block text-xs uppercase tracking-wider mb-1 font-bold text-green-500">To be refunded</span>
                             <span className="text-3xl font-extrabold">₹{refundDue.toLocaleString('en-IN')}</span>
                             <span className="mt-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-green-800/50 text-green-200 border border-green-600/50">
                               Mode: {inv.settlementMode || 'ONLINE'}{invoiceModal.booking?.bookingSource === 'WALK_IN' ? '(Walk-in)' : ''}
                             </span>
                           </div>
                        ) : balanceDue > 0 ? (
                           <div className="bg-red-900/40 text-red-400 p-4 rounded-xl border border-red-700/50 shadow-inner flex flex-col items-center">
                             <span className="block text-xs uppercase tracking-wider mb-1 font-bold text-red-500">Balance Due (User Pays)</span>
                             <span className="text-3xl font-extrabold">₹{balanceDue.toLocaleString('en-IN')}</span>
                             <span className="mt-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-red-800/50 text-red-200 border border-red-600/50">
                               Mode: {inv.settlementMode || 'ONLINE'}{invoiceModal.booking?.bookingSource === 'WALK_IN' ? '(Walk-in)' : ''}
                             </span>
                           </div>
                        ) : (
                           <div className="bg-gray-800 text-gray-300 p-4 rounded-xl border border-gray-600 shadow-inner flex flex-col items-center">
                             <span className="block text-xs uppercase tracking-wider mb-1 font-bold">Settlement</span>
                             <span className="text-2xl font-bold">Fully Settled (₹0)</span>
                           </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            
          </div>
        </div>
      )}
      
      {printModal && (
        <InvoicePrintView 
          invoice={printModal.invoice} 
          booking={printModal.booking} 
          onClose={() => setPrintModal(null)} 
        />
      )}

    </div>
  );
}