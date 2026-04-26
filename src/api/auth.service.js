// src/api/auth.service.js
import api from './axios';

export const authService = {

  registerUser: (userData) => api.post('/auth/user/register', userData),
  loginUser: (credentials) => api.post('/auth/user/login', credentials),
  logoutUser: () => api.post('/auth/user/logout'),

  getMyProfile: () => api.get('/auth/me'),
  updateMyPassword: (passwordData) => api.patch('/auth/update-password', passwordData),
  
};