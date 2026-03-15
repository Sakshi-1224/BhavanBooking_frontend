import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ClerkDashboard from './pages/clerk/ClerkDashboard';
// Auth Pages
import UserLogin from './pages/auth/UserLogin';
import UserRegister from './pages/auth/UserRegister';
import AdminLogin from './pages/auth/AdminLogin';
import ClerkLogin from './pages/auth/ClerkLogin';
import Facilities from './pages/Facilities';
// Admin Components
import CreateClerk from './pages/admin/CreateClerk';
import BookingWizard from './pages/BookingWizard';
// Utility Components
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import UserDashboard from './pages/user/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
function App() {
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
          {/* Changed this path from /dashboard to /my-bookings to match the navbar */}
          <Route path="/my-bookings" element={<UserDashboard />} />
        </Route>

<Route path="/book/:facilityId" element={<BookingWizard />} />

        {/* 🔒 Protected Routes for ADMINS */}
<Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          {/* We replace the inline placeholder with the actual component! */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['CLERK']} />}>
          {/* Replace the placeholder with the actual component */}
          <Route path="/clerk/dashboard" element={<ClerkDashboard />} />
        </Route>


        {/* 🔒 Protected Routes for CLERKS */}
        <Route element={<ProtectedRoute allowedRoles={['CLERK']} />}>
          <Route path="/clerk/dashboard" element={<h1 className="p-8 text-2xl font-bold text-green-600">Clerk Dashboard</h1>} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;