import { useState, useEffect } from 'react';
import { CheckCircle, Shield, LogOut, X, Eye } from 'lucide-react';
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING_ADMIN_APPROVAL');
  
  // Modals & Forms
  const [approvingBooking, setApprovingBooking] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState(''); // NEW: For revisedTotalAmount
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const handleOpenApproveModal = (booking) => {
    setApprovingBooking(booking);
    
    // Safely extract financials
    const financials = booking.financials || {};
    const baseCalculated = Number(financials.calculatedAmount) || 0;
    const security = Number(financials.securityDeposit) || 0;
    
    // Pre-fill the current total amount so Admin can edit it
    setTotalAmount(baseCalculated.toString());

    // Suggest a default advance amount (e.g., 20% of base + full security deposit)
    const suggestedAdvance = Math.round((baseCalculated * 0.20) + security);
    setAdvanceAmount(suggestedAdvance.toString());
  };

  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!advanceAmount || Number(advanceAmount) <= 0) {
      return toast.warn('Please enter a valid advance amount.');
    }
    if (Number(totalAmount) < 0) {
      return toast.warn('Total amount cannot be negative.');
    }

    setIsSubmitting(true);
    try {
      // Sending BOTH parameters exactly as your AdminService expects
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
          <div className="flex bg-white rounded-lg shadow-sm p-1 border">
            <button onClick={() => setActiveTab('PENDING_ADMIN_APPROVAL')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'PENDING_ADMIN_APPROVAL' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-50'}`}>Needs Approval</button>
            <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'ALL' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>All Bookings</button>
            <button onClick={() => setActiveTab('STAFF')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'STAFF' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>Staff</button>
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
                            <td className="p-4 flex gap-2">
                              {booking.status === 'PENDING_ADMIN_APPROVAL' && (
                                <button onClick={() => handleOpenApproveModal(booking)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs transition">Approve</button>
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
                <div><span className="text-xs text-gray-500 uppercase font-bold block">User</span><span className="font-semibold">{viewingDetails.user?.fullName} ({viewingDetails.user?.phone})</span></div>
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
                 <div className="flex justify-between text-sm py-1 font-bold text-lg mt-2 pt-2 border-t"><span>Total Value</span><span>₹{Number(viewingDetails.financials?.calculatedAmount) + Number(viewingDetails.financials?.securityDeposit)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN APPROVAL MODAL */}
      {approvingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setApprovingBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Approval</h2>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">Adjust pricing and set required advance payment.</p>
            
            <form onSubmit={handleConfirmApproval} className="space-y-4">
              
              {/* Security Deposit Info (Read Only) */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded border text-sm">
                <span className="font-semibold text-gray-700">Security Deposit:</span>
                <span className="font-bold">₹{approvingBooking.financials?.securityDeposit || 0}</span>
              </div>

              {/* REVISED TOTAL AMOUNT (Editable) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Revised Base Amount (₹)</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  value={totalAmount} 
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md text-lg font-semibold focus:ring-red-500 focus:border-red-500" 
                />
                <p className="text-[10px] text-gray-500 mt-1 uppercase">Modify the calculated quote if giving a discount or adding fees.</p>
              </div>

              {/* ADVANCE AMOUNT (Editable) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Advance Amount Required (₹)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={advanceAmount} 
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md text-lg font-semibold focus:ring-red-500 focus:border-red-500" 
                />
                <p className="text-[10px] text-gray-500 mt-1 uppercase">This amount must be paid by the user to confirm the booking.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setApprovingBooking(null)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}