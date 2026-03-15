import { useState } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';

export default function CreateClerk() {
  const [formData, setFormData] = useState({ fullName: '', mobile: '', email: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Axios interceptor will automatically attach the Admin's JWT here
      await api.post('/auth/admin/create-clerk', formData);
      toast.success('Clerk created successfully!');
      setFormData({ fullName: '', mobile: '', email: '', password: '' }); // reset form
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create clerk');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Register New Clerk</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input type="text" name="fullName" value={formData.fullName} placeholder="Clerk Name" required onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
        <input type="text" name="mobile" value={formData.mobile} placeholder="Mobile Number" required pattern="[0-9]{10}" onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
        <input type="email" name="email" value={formData.email} placeholder="Email (Optional)" onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
        <input type="text" name="password" value={formData.password} placeholder="Temporary Password" required onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
        <button type="submit" className="w-full py-2 text-white bg-red-600 rounded-md hover:bg-red-700">Create Clerk Account</button>
      </form>
    </div>
  );
}