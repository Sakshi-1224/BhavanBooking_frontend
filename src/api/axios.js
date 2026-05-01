import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};


api.interceptors.request.use(
  (config) => {
    const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
    
    if (stateChangingMethods.includes(config.method)) {
      const csrfToken = getCookie('csrfToken');
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken; 
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      
      originalRequest._retry = true;

      try {
        await axios.post(`${BASE_URL}/auth/refresh`, {}, {
          withCredentials: true 
        });

        return api(originalRequest);

      } catch (refreshError) {
        const currentRole = useAuthStore.getState().role;
        
        useAuthStore.getState().logout();
        
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login')) {
          if (currentRole === 'ADMIN') {
            window.location.href = '/admin-login';
          } else if (currentRole === 'CLERK') {
            window.location.href = '/clerk-login';
          } else {
            window.location.href = '/user/login';
          }
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;