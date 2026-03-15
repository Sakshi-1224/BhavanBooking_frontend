import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Search, LogOut } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

// Helper to format dates nicely
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
};

export default function ClerkDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING_CLERK_REVIEW');
  const [isVerifying, setIsVerifying] = useState(null);

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      // The backend route for admins/clerks to get all bookings
      const response = await api.get('/auth/admin/bookings');
      setBookings(response.data.data);
    } catch (error) {
      toast.error('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (bookingId) => {
    setIsVerifying(bookingId);
    try {
      // Hit the clerk verification endpoint
      await api.patch(`/auth/admin/bookings/${bookingId}/verify`);
      toast.success('Booking verified and sent to Admin!');
      fetchBookings(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify booking');
    } finally {
      setIsVerifying(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/clerk/login');
  };

  // Filter bookings based on the active tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    return b.status === activeTab;
  });

  if (loading) return <div className="p-20 text-center text-xl text-gray-500">Loading clerk workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navbar */}
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
        
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Booking Verification Queue</h1>
          
          <div className="flex bg-white rounded-lg shadow-sm p-1 border">
            <button 
              onClick={() => setActiveTab('PENDING_CLERK_REVIEW')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'PENDING_CLERK_REVIEW' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Needs Verification
            </button>
            <button 
              onClick={() => setActiveTab('PENDING_ADMIN_APPROVAL')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'PENDING_ADMIN_APPROVAL' ? 'bg-orange-100 text-orange-800' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Awaiting Admin
            </button>
            <button 
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'ALL' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              All Bookings
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <CheckCircle size={48} className="text-green-400 mb-4" />
              <p className="text-lg font-medium">No bookings found for this category.</p>
              <p className="text-sm">You're all caught up!</p>
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
                    // Financial Calculations for Clerk UI
                    const total = Number(booking.calculatedAmount) + Number(booking.securityDeposit);
                    const advance = Number(booking.advanceAmountRequested) || 0;
                    const isPartial = booking.paymentStatus === 'PARTIAL';
                    const isCompleted = booking.paymentStatus === 'COMPLETED';
                    
                    const paid = isCompleted ? total : (isPartial ? advance : 0);
                    const due = total - paid;

                    return(
                      <tr key={booking.id} className="hover:bg-gray-50 transition">
                        
                        {/* Booking ID Snippet */}
                        <td className="p-4 text-gray-900 font-mono text-xs">
                          {booking.id.substring(0, 8).toUpperCase()}
                        </td>

                        {/* Dates */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="text-green-700 font-medium">In: {formatDate(booking.startTime)}</span>
                            <span className="text-red-700 font-medium">Out: {formatDate(booking.endTime)}</span>
                          </div>
                        </td>

                        {/* Details */}
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
                            booking.status === 'PENDING_CLERK_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
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

                        {/* Actions */}
                        <td className="p-4">
                          {booking.status === 'PENDING_CLERK_REVIEW' ? (
                            <button
                              onClick={() => handleVerify(booking.id)}
                              disabled={isVerifying === booking.id}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-xs transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {isVerifying === booking.id ? 'Verifying...' : <><CheckCircle size={14}/> Verify</>}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No action</span>
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
    </div>
  );
}