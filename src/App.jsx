import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Store, API, and Socket
import useAuthStore from './store/useAuthStore';
import api from './api/axios';
import socket from './api/socket';

// Pages & Components
import ClerkDashboard from './pages/clerk/ClerkDashboard';
import UserLogin from './pages/auth/UserLogin';
import UserRegister from './pages/auth/UserRegister';
import AdminLogin from './pages/auth/AdminLogin';
import ClerkLogin from './pages/auth/ClerkLogin';
import Facilities from './pages/Facilities';
import CreateClerk from './pages/admin/CreateClerk';
import BookingWizard from './pages/BookingWizard';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import UserDashboard from './pages/user/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserProfile from './pages/user/UserProfile';
import ClerkProfile from './pages/clerk/ClerkProfile';
function App() {
  const { login, logout, isAuthenticated, user } = useAuthStore();

  // 1. Initial Authentication & CSRF Bootstrapping
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/auth/me');
        const userData = response.data.data?.user || response.data.user;
        
        if (userData) {
          login(userData);
        } else {
          logout();
        }
      } catch (error) {
        logout(); 
      }
    };
    
    fetchUser();
  }, [login, logout]);

  // 2. Real-Time Socket Lifecycle Management
  useEffect(() => {
    // Only connect if the user is verified and logged in
    if (isAuthenticated && user) {
      socket.connect();

      // Listen for a successful connection
      socket.on('connect', () => {
        console.log('🔌 Connected to real-time server:', socket.id);
        
        // Let the backend know who this is by joining a specific user room
        socket.emit('join_room', `user_${user.id}`);
        
        // If they are an Admin or Clerk, join the staff room for global notifications
        if (user.role === 'ADMIN' || user.role === 'CLERK') {
          socket.emit('join_room', 'admin-notifications');
        }
      });

      // Global Notification Listener (Handles popups globally across the whole app)
      const handleGlobalNotification = (data) => {
        toast.info(data.message || 'You have a new notification!', {
          position: "bottom-right",
          autoClose: 5000,
        });
      };
      socket.on('notification', handleGlobalNotification);

      // Handle connection errors (like if the token expires)
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

    } else {
      // Disconnect if user logs out
      socket.disconnect();
    }

    // Cleanup listeners when App unmounts or auth state changes
    return () => {
      socket.off('connect');
      socket.off('notification');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, [isAuthenticated, user]);

  return (
    <Router>
      {/* Toast container handles the global socket alerts */}
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<Navigate to="/facilities" replace />} />
        <Route path="/facilities" element={<Facilities />} />
        
        {/* Public Routes */}
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/clerk/login" element={<ClerkLogin />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
          <Route path="/my-bookings" element={<UserDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN', 'CLERK']} />}>
         <Route path="/profile" element={<UserProfile />} />
          <Route path="/book/:facilityId" element={<BookingWizard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/create-clerk" element={<CreateClerk />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['CLERK']} />}>
          <Route path="/clerk/dashboard" element={<ClerkDashboard />} />
          <Route path="/clerk/profile" element={<ClerkProfile />} /> {/* ADD THIS LINE */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;