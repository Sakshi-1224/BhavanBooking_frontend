import React, { useState, useEffect } from 'react';
import { authService } from '../../api/auth.service';
import useAuthStore from '../../store/useAuthStore';

const UserProfile = () => {
  // Store the profile data fetched from the backend
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for updating password
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch Profile on Component Mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authService.getMyProfile();
        // Adjust this path based on your exact backend JSON response structure
        setProfile(response.data.data.user); 
      } catch (error) {
        console.error("Failed to fetch profile", error);
        setMessage({ type: 'error', text: 'Failed to load profile data.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle Input Changes for Password Form
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  // 2. Handle Password Update Submission
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      return setMessage({ type: 'error', text: 'New passwords do not match!' });
    }

    setIsUpdating(true);
    try {
      await authService.updateMyPassword(passwordData);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      
      // Clear the form after success
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update password.' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-600">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>

      {message.text && (
        <div className={`p-4 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Profile Information Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Personal Information</h2>
        {profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-800">{profile.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone / Identifier</p>
              <p className="font-medium text-gray-800">{profile.mobile || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-800">{profile.email || 'N/A'}</p>
            </div>
           
          </div>
        ) : (
          <p className="text-gray-500">No profile data available.</p>
        )}
      </div>

      {/* Update Password Section */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Update Password</h2>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              name="oldPassword"
              value={passwordData.oldPassword}
              onChange={handlePasswordChange}
              required
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              minLength="8"
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              name="confirmNewPassword"
              value={passwordData.confirmNewPassword}
              onChange={handlePasswordChange}
              required
              minLength="8"
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className={`w-full py-2 px-4 rounded text-white font-medium ${
              isUpdating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;