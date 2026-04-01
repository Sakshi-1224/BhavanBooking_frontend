import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { LogIn, ArrowRight, ArrowLeft } from 'lucide-react';

export default function UserLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({ mobile: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/user/login', formData);
      const { user } = response.data.data; // Ensure token is not passed
      
      login(user); 
      toast.success('Welcome back!');
      navigate('/facilities'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/40 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200" 
          alt="Bhavan Background" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
        />
        <div className="relative z-20 text-center text-white px-12">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">Bhavan<span className="text-orange-400">Book</span></h1>
          <p className="text-xl text-blue-100 font-medium">Your premium platform for booking events, halls, and stays.</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-white">
        
        {/* 👈 NEW: BACK TO HOME BUTTON */}
        <Link 
          to="/facilities" 
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="w-full max-w-md mt-6 lg:mt-0">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 mt-2">Please enter your details to sign in.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
              <input 
                type="text" name="mobile" required pattern="[0-9]{10}" onChange={handleChange} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                placeholder="Enter 10-digit mobile"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input 
                type="password" name="password" required onChange={handleChange} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
            >
              {isLoading ? 'Signing in...' : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-gray-500">Don't have an account? </span>
            <Link to="/user/register" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
              Create an account <ArrowRight size={14} className="inline ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}