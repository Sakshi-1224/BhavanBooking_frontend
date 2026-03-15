import { useState, useEffect } from 'react';
import { CheckCircle, Shield, LogOut, X } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import CreateClerk from './CreateClerk';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING_ADMIN_APPROVAL'); // Tabs: PENDING_ADMIN_APPROVAL, ALL, STAFF
  
  // Modal State for Approval
  const [approvingBooking, setApprovingBooking] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Suggest a default advance amount (e.g., 20% of calculated amount + full security deposit)
    const suggestedAdvance = Math.round((Number(booking.calculatedAmount) * 0.20) + Number(booking.securityDeposit));
    setAdvanceAmount(suggestedAdvance.toString());
  };

  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!advanceAmount || Number(advanceAmount) <= 0) {
      return toast.warn('Please enter a valid advance amount.');
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/auth/admin/bookings/${approvingBooking.id}/approve`, {
        advanceAmountRequested: Number(advanceAmount)
      });
      toast.success('Booking approved! User notified to pay advance.');
      setApprovingBooking(null);
      fetchBookings(); // Refresh the grid
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve booking');
    } finally {
      setIsSubmitting(false);
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
      {/* Top Navbar */}
      <nav className="bg-red-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 font-bold text-xl tracking-wider">
              <Shield size={24} className="text-red-300" />
              BhavanBook <span className="text-red-300">| Admin</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Admin: {user?.fullName}</span>
              <button onClick={handleLogout} className="flex items-center gap-1 hover:text-red-200 transition">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
          
          <div className="flex bg-white rounded-lg shadow-sm p-1 border">
            <button 
              onClick={() => setActiveTab('PENDING_ADMIN_APPROVAL')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'PENDING_ADMIN_APPROVAL' ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Needs Approval
            </button>
            <button 
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'ALL' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              All Bookings
            </button>
            <button 
              onClick={() => setActiveTab('STAFF')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'STAFF' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Staff Management
            </button>
          </div>
        </div>

        {/* Dynamic Content based on Tabs */}
        {activeTab === 'STAFF' ? (
          <CreateClerk /> 
        ) : (
          <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <CheckCircle size={48} className="text-red-300 mb-4" />
                <p className="text-lg font-medium">No bookings waiting for approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                      <th className="p-4 font-medium">Ref ID</th>
                      <th className="p-4 font-medium">Dates</th>
                      <th className="p-4 font-medium">Details</th>
                      {/* Updated Header */}
                      <th className="p-4 font-medium">Financials</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {filteredBookings.map((booking) => {
                      // Financial Calculations for Admin UI
                      const total = Number(booking.calculatedAmount) + Number(booking.securityDeposit);
                      const advance = Number(booking.advanceAmountRequested) || 0;
                      const isPartial = booking.paymentStatus === 'PARTIAL';
                      const isCompleted = booking.paymentStatus === 'COMPLETED';
                      
                      const paid = isCompleted ? total : (isPartial ? advance : 0);
                      const due = total - paid;

                      return(
                        <tr key={booking.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 text-gray-900 font-mono text-xs">{booking.id.substring(0, 8).toUpperCase()}</td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="text-green-700 font-medium">In: {formatDate(booking.startTime)}</span>
                              <span className="text-red-700 font-medium">Out: {formatDate(booking.endTime)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-gray-900">{booking.eventType}</div>
                            <div className="text-gray-500 text-xs mt-1">{booking.guestCount} Guests</div>
                          </td>

                          {/* Updated Financials Column */}
                          <td className="p-4">
                            <div className="font-bold text-gray-900">Total: ₹{total.toLocaleString('en-IN')}</div>
                            {booking.advanceAmountRequested ? (
                              <div className="mt-1 text-xs">
                                <div className="text-green-600 font-medium">Paid: ₹{paid.toLocaleString('en-IN')}</div>
                                <div className="text-red-600 font-medium">Due: ₹{due.toLocaleString('en-IN')}</div>
                              </div>
                            ) : (
                              <div className="text-gray-400 text-xs italic mt-1">Advance not set</div>
                            )}
                          </td>

                          {/* Updated Status Column with Payment Badge */}
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full block w-max ${
                              booking.status === 'PENDING_ADMIN_APPROVAL' ? 'bg-orange-100 text-orange-800' :
                              booking.status === 'PENDING_ADVANCE_PAYMENT' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status.replace(/_/g, ' ')}
                            </span>
                            
                            {booking.paymentStatus !== 'PENDING' && (
                               <span className={`mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full block w-max uppercase border ${
                                  booking.paymentStatus === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                               }`}>
                                 Pay: {booking.paymentStatus}
                               </span>
                            )}
                          </td>
                          <td className="p-4">
                            {booking.status === 'PENDING_ADMIN_APPROVAL' ? (
                              <button
                                onClick={() => handleOpenApproveModal(booking)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-xs transition shadow-sm"
                              >
                                Review & Approve
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs italic">View Only</span>
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
        )}

      </div>

      {/* APPROVAL MODAL */}
      {approvingBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button onClick={() => setApprovingBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-4">Set Advance Requirement</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm space-y-2 border">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Quote:</span>
                <span className="font-semibold">₹{parseInt(approvingBooking.calculatedAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Security Deposit:</span>
                <span className="font-semibold">₹{parseInt(approvingBooking.securityDeposit).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4">
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
                <p className="text-xs text-gray-500 mt-2">
                  This amount will be requested from the user. Once paid, the booking becomes CONFIRMED.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setApprovingBooking(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition disabled:opacity-50"
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