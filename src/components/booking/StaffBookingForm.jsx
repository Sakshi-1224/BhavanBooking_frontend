import React from 'react';
import { User, Phone, Mail, MapPin } from 'lucide-react';

export default function StaffBookingForm({ 
  customerData, 
  setCustomerData 
}) {
  
  const handleChange = (e) => {
    setCustomerData({ ...customerData, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border p-6 mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <User size={24} className="text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Walk-in Guest Details (Staff Only)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-3 text-gray-400"/>
            <input 
              type="text" name="fullName" required
              value={customerData.fullName} onChange={handleChange} 
              className="w-full border p-3 pl-10 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" 
              placeholder="e.g. Rahul Sharma"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone size={18} className="absolute left-3 top-3 text-gray-400"/>
            <input 
              type="tel" name="mobile" required pattern="[0-9]{10}"
              value={customerData.mobile} onChange={handleChange} 
              className="w-full border p-3 pl-10 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" 
              placeholder="10-digit mobile number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-3 text-gray-400"/>
            <input 
              type="email" name="email" 
              value={customerData.email} onChange={handleChange} 
              className="w-full border p-3 pl-10 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" 
              placeholder="Optional but recommended"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-3 text-gray-400"/>
            <input 
              type="text" name="address" 
              value={customerData.address} onChange={handleChange} 
              className="w-full border p-3 pl-10 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50" 
              placeholder="City, State"
            />
          </div>
        </div>
      </div>
    </div>
  );
}