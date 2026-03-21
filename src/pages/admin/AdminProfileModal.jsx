import { useState } from 'react';
import { X, ShieldCheck, Key, Image as ImageIcon } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';

export default function AdminProfileModal({ isOpen, onClose }) {
  // --- Signature State ---
  const [signatureFile, setSignatureFile] = useState(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  // --- Password State ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  if (!isOpen) return null;

  // 1. Handle Signature Upload
  const handleUploadSignature = async (e) => {
    e.preventDefault();
    if (!signatureFile) return toast.warn('Please select an image file first.');

    setIsUploadingSignature(true);
    const formData = new FormData();
    formData.append('signature', signatureFile);

    try {
      await api.patch('/auth/admin/upload-signature', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Signature uploaded successfully!');
      setSignatureFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload signature.');
    } finally {
      setIsUploadingSignature(false);
    }
  };

  // 2. Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.warn('New passwords do not match!');
    }
    if (newPassword.length < 6) {
      return toast.warn('New password must be at least 6 characters long.');
    }

    setIsUpdatingPassword(true);
    try {
      await api.patch('/auth/update-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 text-gray-900">
            <ShieldCheck size={24} className="text-red-700" />
            <h2 className="text-xl font-bold">Admin Profile Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* --- SECTION 1: SIGNATURE UPLOAD --- */}
          <section>
            <div className="flex items-center gap-2 mb-2 text-gray-800 border-b pb-2">
              <ImageIcon size={18} className="text-blue-600" />
              <h3 className="font-bold text-lg">Digital Signature</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Upload your signature. This will be automatically attached to user invoices upon approval.
            </p>

            <form onSubmit={handleUploadSignature} className="space-y-3 bg-gray-50 p-4 rounded-lg border">
              <div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => setSignatureFile(e.target.files[0])}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Accepts transparent PNG or JPG format.</p>
              </div>
              <button 
                type="submit" 
                disabled={isUploadingSignature || !signatureFile} 
                className="w-full py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isUploadingSignature ? 'Uploading...' : 'Save Signature'}
              </button>
            </form>
          </section>

          {/* --- SECTION 2: CHANGE PASSWORD --- */}
          <section>
            <div className="flex items-center gap-2 mb-2 text-gray-800 border-b pb-2">
              <Key size={18} className="text-red-600" />
              <h3 className="font-bold text-lg">Change Password</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Ensure your account stays secure by updating your password regularly.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 bg-gray-50 p-4 rounded-lg border">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                    placeholder="New password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                    placeholder="Confirm new"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword} 
                className="w-full py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition disabled:opacity-50 mt-2"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}