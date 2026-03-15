import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

// Automatically attach token to requests
api.interceptors.request.use((config) => {
  // Read the token directly from Zustand's state
  const token = useAuthStore.getState().token;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;