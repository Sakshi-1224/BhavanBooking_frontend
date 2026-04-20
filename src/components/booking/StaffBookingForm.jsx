import React from 'react';
import { User, Phone, Mail, MapPin, Clock, ShieldAlert } from 'lucide-react';

export default function StaffBookingForm({ 
  customerData, 
  setCustomerData, 
  holdData, 
  setHoldData 
}) {
  
  const handleChange = (e) => {
    setCustomerData({ ...customerData, [e.target.name]: e.target.value });
  };

  const handleHoldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setHoldData({
      ...holdData,
      [name]: type === 'checkbox' ? checked : Number(value)
    });
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

      {/* 🚨 NEW: Hold Booking Configuration Section 🚨 */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            name="isHoldingAllowed"
            checked={holdData?.isHoldingAllowed || false}
            onChange={handleHoldChange}
            className="w-5 h-5 text-orange-600 rounded border-orange-300 focus:ring-orange-500"
          />
          <span className="font-bold text-orange-900 text-lg flex items-center gap-2">
            <ShieldAlert size={20} /> Allow Hold Booking (Partial Advance)
          </span>
        </label>

        {holdData?.isHoldingAllowed && (
          <div className="mt-5 pl-8 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            <div>
               <label className="block text-xs font-bold text-orange-800 mb-1">Advance Required (%)</label>
               <input 
                 type="number" 
                 name="holdingPercentage"
                 min="10" max="100"
                 value={holdData.holdingPercentage}
                 onChange={handleHoldChange}
                 className="w-full border-orange-300 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-orange-800 mb-1 flex items-center gap-1">
                 <Clock size={14}/> Validity (Days to pay rest)
               </label>
               <input 
                 type="number" 
                 name="holdingValidityDays"
                 min="1" max="30"
                 value={holdData.holdingValidityDays}
                 onChange={handleHoldChange}
                 className="w-full border-orange-300 p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
               />
            </div>
            
            <div className="sm:col-span-2 bg-white/60 p-3 rounded-lg border border-orange-200 text-sm text-orange-800 mt-2">
              <strong>Note:</strong> The guest must pay {holdData.holdingPercentage}% now to secure the booking. They will have {holdData.holdingValidityDays} days to pay the remaining balance, otherwise the booking will be automatically cancelled.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}