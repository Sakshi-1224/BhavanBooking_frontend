import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import useAuthStore from '../../store/useAuthStore';

export default function UserLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({ mobile: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/user/login', formData);
      const { userAccessToken, user } = response.data.data;
      
      login(user, userAccessToken);
      toast.success('Logged in successfully!');
      navigate('/facilities'); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800">User Login</h2>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input type="text" name="mobile" placeholder="Mobile Number" required pattern="[0-9]{10}" onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
          <input type="password" name="password" placeholder="Password" required onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
          <button type="submit" className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Log in</button>
        </form>
        <div className="mt-4 text-sm text-center">
          Don't have an account? <Link to="/user/register" className="text-blue-600 hover:underline">Sign up</Link>
        </div>
        <div className="mt-4 text-xs text-center text-gray-500 space-x-4">
            <Link to="/admin/login" className="hover:underline">Admin Login</Link>
            <Link to="/clerk/login" className="hover:underline">Clerk Login</Link>
        </div>
      </div>
    </div>
  );
}