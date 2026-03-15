import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';

export default function ClerkLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({ mobile: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/admin/clerk/login', formData);
      const { clerkAccessToken, user } = response.data.data;
      
      login(user, clerkAccessToken);
      toast.success('Clerk access granted.');
      navigate('/clerk/dashboard'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Access denied');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-200">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md border-t-4 border-green-600">
        <h2 className="text-2xl font-bold text-center text-green-700">Clerk Portal</h2>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input type="text" name="mobile" placeholder="Clerk Mobile" required onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
          <input type="password" name="password" placeholder="Password" required onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
          <button type="submit" className="w-full py-2 text-white bg-green-600 rounded-md hover:bg-green-700">Login to Desk</button>
        </form>
      </div>
    </div>
  );
}