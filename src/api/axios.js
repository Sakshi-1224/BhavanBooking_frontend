import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
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
  (error) => {
    if (error.response && error.response.status === 401) {
      
      const currentRole = useAuthStore.getState().role;
      
      useAuthStore.getState().logout();
      
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        if (currentRole === 'ADMIN') {
          window.location.href = '/admin/login';
        } else if (currentRole === 'CLERK') {
          window.location.href = '/clerk/login';
        } else {
          window.location.href = '/user/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;