import { useState, useEffect } from 'react';
import { LogOut, X, User as UserIcon } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import socket from '../../api/socket';

// Import our new components
import BookingTable from './components/BookingTable';
import CheckInModal from './components/CheckInModal';
import CheckoutModal from './components/CheckoutModal';
import AdvancePaymentModal from './components/AdvancePaymentModal';
import InvoicePrintView from '../../components/InvoicePrintView';
import RemainingPaymentModal from './components/RemainingPaymentModal'; 
import BookingDetailsModal from '../../components/booking/BookingDetailsModal';

export default function ClerkDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING_CLERK_REVIEW');
  const [isProcessing, setIsProcessing] = useState(null);
  
  // UI States
  const [modalType, setModalType] = useState(null); 
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewIdModal, setViewIdModal] = useState(null);
  const [printModal, setPrintModal] = useState(null);

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { 
    fetchBookings(); 
    const autoRefresh = () => fetchBookings();

    // Matching exactly what your backend sends
    socket.on('new_booking_request', autoRefresh);
    socket.on('booking_status_updated', autoRefresh);
    socket.on('invoice_status_updated', autoRefresh); // Refresh when admin approves/rejects their draft

    return () => {
      socket.off('new_booking_request', autoRefresh);
      socket.off('booking_status_updated', autoRefresh);
      socket.off('invoice_status_updated', autoRefresh);
    };
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
  
  const handleLogout = async () => {
    try {
      await api.post('/auth/user/logout');
    } catch (error) {
      console.error("Failed to clear cookie on backend", error);
    } finally {
      logout();
      navigate('/clerk/login');
    }
  };

  const openModal = (type, booking) => {
    setSelectedBooking(booking);
    setModalType(type);
  };

  const closeModalAndRefresh = () => {
    setModalType(null);
    setSelectedBooking(null);
    fetchBookings();
  };

  const handleFetchInvoiceAndPrint = async (booking) => {
    try {
      const response = await api.get(`/billing/${booking.id}/invoice`);
      setPrintModal({ invoice: response.data.data.invoice, booking });
    } catch(err) { 
      toast.error("Invoice not found."); 
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(b.status);
    return b.status === activeTab;
  });

  if (loading) return <div className="p-20 text-center text-xl text-gray-500">Loading clerk workspace...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="font-bold text-xl tracking-wider">BhavanBook <span className="text-green-300">| Desk</span></div>
          <div className="flex items-center gap-6">
            <span className="text-sm hidden sm:block font-medium">Clerk: {user?.fullName || user?.name}</span>
            
            <div className="flex items-center gap-4 border-l border-green-600 pl-4">
              <Link to="/clerk/profile" className="flex items-center gap-1.5 hover:text-green-200 transition font-medium text-sm">
                <UserIcon size={18} /> Profile
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-1.5 hover:text-green-200 transition font-medium text-sm">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Desk Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage Bhavan bookings and desk operations.</p>
          </div>
          
          <div className="flex bg-white rounded-lg shadow-sm p-1.5 border overflow-x-auto">
            <button onClick={() => setActiveTab('PENDING_CLERK_REVIEW')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${activeTab === 'PENDING_CLERK_REVIEW' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}>Needs Verification</button>
            <button onClick={() => setActiveTab('ACTIVE')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${activeTab === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>Check-in / Out</button>
            <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition ${activeTab === 'ALL' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>All Bookings</button>
            <button 
              onClick={() => navigate('/facilities')}
              className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-bold text-sm transition shadow-sm flex items-center gap-1"
            >
              + Offline Booking
            </button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
          <BookingTable 
            bookings={filteredBookings} 
            isProcessing={isProcessing} 
            handleVerify={handleVerify} 
            openModal={openModal} 
            setViewIdModal={setViewIdModal}
            onFetchInvoice={handleFetchInvoiceAndPrint}
          />
        </div>
      </div>

      {/* Modals */}
      {modalType === 'details' && <BookingDetailsModal booking={selectedBooking} onClose={() => setModalType(null)} />}
      {modalType === 'checkin' && <CheckInModal booking={selectedBooking} onClose={() => setModalType(null)} onSuccess={closeModalAndRefresh} />}
      {modalType === 'recordAdvance' && <AdvancePaymentModal booking={selectedBooking} onClose={() => setModalType(null)} onSuccess={closeModalAndRefresh} />}
      {modalType === 'checkout' && <CheckoutModal booking={selectedBooking} onClose={() => setModalType(null)} onSuccess={closeModalAndRefresh} />}
      {modalType === 'recordRemaining' && <RemainingPaymentModal booking={selectedBooking} onClose={() => setModalType(null)} onSuccess={closeModalAndRefresh} />}
  
      {/* Basic ID Viewer Modal */}
      {viewIdModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl relative max-w-4xl w-full p-2">
            <button onClick={() => setViewIdModal(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 transition">
              <X size={36} />
            </button>
            {viewIdModal.toLowerCase().endsWith('.pdf') ? (
              <iframe src={viewIdModal} className="w-full h-[80vh] rounded-lg border-none" title="ID Document" />
            ) : (
              <img src={viewIdModal} alt="ID Document" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
            )}
          </div>
        </div>
      )}

      {printModal && <InvoicePrintView invoice={printModal.invoice} booking={printModal.booking} onClose={() => setPrintModal(null)} />}
    </div>
  );
}