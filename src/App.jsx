import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Store and API
import useAuthStore from './store/useAuthStore';
import api from './api/axios';

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

function App() {
  const { login, logout } = useAuthStore();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // This GET request sets the 'csrfToken' cookie if it's missing
        // and restores the user session if they refresh the page
        const response = await api.get('/auth/me');
        
        // Safely extract the user object depending on your exact backend response format
        const userData = response.data.data?.user || response.data.user;
        
        if (userData) {
          login(userData);
        } else {
          logout();
        }
      } catch (error) {
        // If 401 Unauthorized or request fails, clear the local auth state
        logout(); 
      }
    };
    
    fetchUser();
  }, [login, logout]);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/facilities" replace />} />

        <Route path="/facilities" element={<Facilities />} />
        
        {/* Public Routes */}
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/clerk/login" element={<ClerkLogin />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 🔒 Protected Routes for USERS */}
        <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
          <Route path="/my-bookings" element={<UserDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN', 'CLERK']} />}>
          <Route path="/book/:facilityId" element={<BookingWizard />} />
        </Route>

        {/* 🔒 Protected Routes for ADMINS */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* 🔒 Protected Routes for CLERKS */}
        <Route element={<ProtectedRoute allowedRoles={['CLERK']} />}>
          <Route path="/clerk/dashboard" element={<ClerkDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;