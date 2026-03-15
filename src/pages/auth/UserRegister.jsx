import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';

export default function UserRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', mobile: '', email: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/user/register', formData);
      toast.success('Registration successful! Please login.');
      navigate('/user/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800">User Registration</h2>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input type="text" name="fullName" placeholder="Full Name" required onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
          <input type="text" name="mobile" placeholder="10-digit Mobile Number" required pattern="[0-9]{10}" onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
          <input type="email" name="email" placeholder="Email (Optional)" onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
          <input type="password" name="password" placeholder="Password (e.g., Pass@1234)" required onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
          <button type="submit" className="w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Register</button>
        </form>
        <div className="mt-4 text-sm text-center">
          Already have an account? <Link to="/user/login" className="text-blue-600 hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}