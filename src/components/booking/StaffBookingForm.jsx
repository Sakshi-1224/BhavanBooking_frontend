import { UserPlus } from 'lucide-react';

export default function StaffBookingForm({ customerData, setCustomerData }) {
  return (
    <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
        <UserPlus size={20} /> Staff: Booking on Behalf
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-blue-800 mb-1">Guest Full Name <span className="text-red-500">*</span></label>
          <input required type="text" name="fullName" value={customerData.fullName} onChange={(e) => setCustomerData({...customerData, fullName: e.target.value})} className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Rahul Sharma" />
        </div>
        <div>
          <label className="block text-sm font-bold text-blue-800 mb-1">Guest Mobile <span className="text-red-500">*</span></label>
          <input required type="tel" pattern="[6-9][0-9]{9}" name="mobile" value={customerData.mobile} onChange={(e) => setCustomerData({...customerData, mobile: e.target.value})} className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="10-digit number" />
        </div>
        <div>
          <label className="block text-sm font-bold text-blue-800 mb-1">Guest Email</label>
          <input type="email" name="email" value={customerData.email} onChange={(e) => setCustomerData({...customerData, email: e.target.value})} className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-bold text-blue-800 mb-1">Guest Address</label>
          <input type="text" name="address" value={customerData.address} onChange={(e) => setCustomerData({...customerData, address: e.target.value})} className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500" placeholder="Optional" />
        </div>
      </div>
    </div>
  );
}