import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({ mobile: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/admin/login', formData);
      const { user } = response.data.data;
      
      login(user); // Cookie auth handles token automatically
      toast.success('Admin access granted.');
      navigate('/admin/dashboard'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Access denied');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      
      <div className="w-full max-w-md">
        <Link to="/user/login" className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition text-sm font-medium">
          <ArrowLeft size={16} /> Back to Public Site
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
          <div className="bg-red-600 p-6 flex flex-col items-center justify-center">
            <div className="bg-white/20 p-3 rounded-full mb-3">
              <ShieldAlert size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Admin Control</h2>
            <p className="text-red-100 text-sm mt-1">Authorized Personnel Only</p>
          </div>

          <div className="p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Admin Mobile</label>
                <input 
                  type="text" required onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition font-medium" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Security Key</label>
                <input 
                  type="password" required onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition font-medium" 
                />
              </div>

              <button 
                type="submit" disabled={isLoading}
                className="w-full py-3.5 mt-4 text-white font-bold bg-gray-900 rounded-lg hover:bg-black focus:ring-2 focus:ring-red-500 transition-all disabled:opacity-70 shadow-lg"
              >
                {isLoading ? 'Authenticating...' : 'Secure Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}