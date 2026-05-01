import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import ErrorBoundary from './components/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';


import useAuthStore from './store/useAuthStore';
import api from './api/axios';
import socket from './api/socket';
import useSettingsStore from './store/useSettingsStore';


import ProtectedRoute from './components/ProtectedRoute';
import Facilities from './pages/Facilities'; 


const UserLogin = React.lazy(() => import('./pages/auth/UserLogin'));
const UserRegister = React.lazy(() => import('./pages/auth/UserRegister'));
const AdminLogin = React.lazy(() => import('./pages/auth/AdminLogin'));
const ClerkLogin = React.lazy(() => import('./pages/auth/ClerkLogin'));


const Unauthorized = React.lazy(() => import('./pages/Unauthorized'));
const BookingWizard = React.lazy(() => import('./pages/BookingWizard'));


const UserDashboard = React.lazy(() => import('./pages/user/UserDashboard'));
const UserProfile = React.lazy(() => import('./pages/user/UserProfile'));

const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const CreateClerk = React.lazy(() => import('./pages/admin/CreateClerk'));


const ClerkDashboard = React.lazy(() => import('./pages/clerk/ClerkDashboard'));
const ClerkProfile = React.lazy(() => import('./pages/clerk/ClerkProfile'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
);

function App() {
  const { login, logout, isAuthenticated, user } = useAuthStore();
  const { fetchSettings } = useSettingsStore();


  useEffect(() => {
    fetchSettings(); 
  }, [fetchSettings]);
  
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

  useEffect(() => {
    if (isAuthenticated && user) {
      socket.connect();

      
      socket.on('connect', () => {
        console.log('🔌 Connected to real-time server:', socket.id);
        
        socket.emit('join_room', `user_${user.id}`);
        
      
        if (user.role === 'ADMIN' || user.role === 'CLERK') {
          socket.emit('join_room', 'admin-notifications');
        }
      });

    
      const handleGlobalNotification = (data) => {
        toast.info(data.message || 'You have a new notification!', {
          position: "bottom-right",
          autoClose: 5000,
        });
      };
      socket.on('notification', handleGlobalNotification);

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

    } else {
      socket.disconnect();
    }

    return () => {
      socket.off('connect');
      socket.off('notification');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, [isAuthenticated, user]);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/facilities" replace />} />
          <Route path="/facilities" element={<Facilities />} />
          
          
          <Route path="/user/login" element={<UserLogin />} />
          <Route path="/user/register" element={<UserRegister />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/clerk/login" element={<ClerkLogin />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

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
            <Route path="/clerk/profile" element={<ClerkProfile />} />
          </Route>
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;