import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function UserRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', mobile: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/user/register', formData);
      toast.success('Account created successfully! Please sign in.');
      navigate('/user/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        <Link to="/user/login" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition">
          <ArrowLeft size={16} /> Back to Login
        </Link>
        
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Create an Account</h2>
            <p className="text-gray-500 mt-2">Join BhavanBook to start booking facilities.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <input type="text" name="fullName" required onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="John Doe" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
              <input type="text" name="mobile" required pattern="[0-9]{10}" onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="10-digit number" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="email" name="email" onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="john@example.com" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input type="password" name="password" required onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Strong password" />
            </div>

            <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 py-3.5 mt-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70">
              {isLoading ? 'Creating Account...' : <><UserPlus size={18} /> Register Now</>}
            </button>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-blue-50 relative items-center justify-center overflow-hidden">
         <img 
          src="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=1200" 
          alt="Bhavan Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
      </div>
    </div>
  );
}