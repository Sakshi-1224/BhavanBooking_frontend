import { useState, useEffect } from 'react';
import { X, ShieldCheck, Key, Image as ImageIcon, ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-toastify';

export default function AdminProfileModal({ isOpen, onClose }) {
  // --- Signature State ---
  const [signatureFile, setSignatureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // Local preview for the new file
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [currentSignatureUrl, setCurrentSignatureUrl] = useState(null);

  // --- Password State ---
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Fetch the current profile when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMyProfile();
      setSignatureFile(null); // Reset file input when opening
      setPreviewUrl(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!signatureFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(signatureFile);
    setPreviewUrl(objectUrl);
    
    // Cleanup to avoid memory leaks
    return () => URL.revokeObjectURL(objectUrl);
  }, [signatureFile]);

  const fetchMyProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.data?.user?.signatureUrl) {
        setCurrentSignatureUrl(response.data.data.user.signatureUrl);
      }
    } catch (error) {
      console.error("Could not fetch profile details", error);
    }
  };

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
      toast.success('Signature updated successfully!');
      
      // Clear the file input and re-fetch to update the "Current Signature"
      setSignatureFile(null);
      fetchMyProfile();
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload signature.');
    } finally {
      setIsUploadingSignature(false);
    }
  };

  // 2. Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      return toast.warn('New passwords do not match!');
    }

    setIsUpdatingPassword(true);
    try {
      await api.patch('/auth/update-password', {
        oldPassword,
        newPassword,
        confirmNewPassword
      });
      
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl relative max-h-[90vh] overflow-y-auto">
        
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

            {/* --- VISUAL COMPARISON BOX --- */}
            <div className="flex items-center gap-4 mb-4">
              
              {/* CURRENT SIGNATURE */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center shadow-inner h-28">
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2">Current Signature</p>
                {currentSignatureUrl ? (
                  <div className="bg-white p-2 rounded border shadow-sm w-full flex justify-center h-14">
                    <img src={currentSignatureUrl} alt="Current" className="h-full object-contain" />
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No signature saved.</p>
                )}
              </div>

              {previewUrl && (
                <ArrowRight className="text-gray-300" size={24} />
              )}

              {/* NEW PREVIEW */}
              {previewUrl && (
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col items-center justify-center shadow-inner h-28 relative">
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">NEW</div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-blue-600 mb-2">New Preview</p>
                  <div className="bg-white p-2 rounded border border-blue-200 shadow-sm w-full flex justify-center h-14">
                    <img src={previewUrl} alt="Preview" className="h-full object-contain" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleUploadSignature} className="space-y-3 bg-gray-50 p-4 rounded-lg border">
              <div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => setSignatureFile(e.target.files[0])}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Accepts transparent PNG or JPG format. Crop closely for best results.</p>
              </div>
              <button 
                type="submit" 
                disabled={isUploadingSignature || !signatureFile} 
                className="w-full py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
              >
                {isUploadingSignature ? 'Uploading...' : 'Save New Signature'}
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
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
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
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
                    placeholder="Confirm new"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500">Must be 8+ chars, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.</p>

              <button 
                type="submit" 
                disabled={isUpdatingPassword || !oldPassword || !newPassword || !confirmNewPassword} 
                className="w-full py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition disabled:opacity-50 shadow-sm mt-2"
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