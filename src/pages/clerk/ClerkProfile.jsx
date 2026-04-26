import React, { useState, useEffect } from 'react';
import { authService } from '../../api/auth.service';
import { toast } from 'react-toastify';
import { User as UserIcon, Shield, Phone, Key } from 'lucide-react';

const ClerkProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authService.getMyProfile();
        setProfile(response.data.data.user);
      } catch (error) {
        toast.error("Failed to load clerk profile.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      return toast.error('New passwords do not match!');
    }

    setIsUpdatingPassword(true);
    try {
      await authService.updateMyPassword(passwordData);
      toast.success('Password updated successfully! Please log in again.');
      setPasswordData({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
      // The Axios interceptor will handle the 401 logout if the session drops, 
      // otherwise they can continue working.
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading profile data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <div className="p-3 bg-blue-100 rounded-full">
          <UserIcon className="text-blue-600" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Desk Profile</h1>
          <p className="text-sm text-gray-500">Manage your clerk credentials and details</p>
        </div>
      </div>

      {/* Staff Information Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
          <Shield size={18} className="text-gray-400" /> Authorized Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Full Name</p>
            <p className="text-base font-medium text-gray-900">{profile?.fullName || 'N/A'}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Phone size={12} /> Registered Phone
            </p>
            <p className="text-base font-medium text-gray-900">{profile?.phone || profile?.mobile || 'N/A'}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 md:col-span-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">System Role</p>
            <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
              {profile?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Security Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
          <Key size={18} className="text-gray-400" /> Security
        </h2>
        
        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <input
              type="password"
              name="oldPassword"
              required
              value={passwordData.oldPassword}
              onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter current password"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                name="newPassword"
                required
                minLength="8"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input
                type="password"
                name="confirmNewPassword"
                required
                minLength="8"
                value={passwordData.confirmNewPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmNewPassword: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Match new password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition-colors ${
                isUpdatingPassword 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isUpdatingPassword ? 'Updating Credentials...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClerkProfile;