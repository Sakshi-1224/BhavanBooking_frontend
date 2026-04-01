import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { Monitor, ArrowLeft } from 'lucide-react';

export default function ClerkLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({ mobile: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/admin/clerk/login', formData);
      const { user } = response.data.data;
      
      login(user); // Cookie auth handles token automatically
      toast.success('Clerk access granted.');
      navigate('/clerk/dashboard'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Access denied');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
      
      <div className="w-full max-w-md relative z-10 p-4">
        <Link to="/user/login" className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition text-sm font-medium">
          <ArrowLeft size={16} /> Public Site
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border-t-8 border-green-600">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
            <div className="bg-green-100 p-3 rounded-lg">
              <Monitor size={24} className="text-green-700" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Front Desk</h2>
              <p className="text-gray-500 text-sm">Clerk Operations Portal</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Clerk ID (Mobile)</label>
              <input 
                type="text" required onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition" 
                placeholder="Enter registered mobile"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Passcode</label>
              <input 
                type="password" required onChange={(e) => setFormData({...formData, password: e.target.value})} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition" 
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="w-full py-3.5 mt-2 text-white font-bold bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-70 shadow-md"
            >
              {isLoading ? 'Connecting...' : 'Login to Desk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}