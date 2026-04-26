import api from './axios';

export const adminService = {
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  clerkLogin: (credentials) => api.post('/auth/admin/clerk/login', credentials),
  logoutAdmin: () => api.post('/auth/admin/logout'),

  createClerk: (clerkData) => api.post('/auth/admin/create-clerk', clerkData),
  
  uploadSignature: (file) => {
    const formData = new FormData();
    formData.append('signature', file);
    return api.patch('/auth/admin/upload-signature', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },


  getAllBookings: () => api.get('/auth/admin/bookings'),
  getBookingDetails: (bookingId) => api.get(`/auth/admin/bookings/${bookingId}`),


  verifyByClerk: (bookingId) => api.patch(`/auth/admin/bookings/${bookingId}/verify`),


  approveBooking: (bookingId, approvalData) => 
    api.patch(`/auth/admin/bookings/${bookingId}/approve`, approvalData),
};