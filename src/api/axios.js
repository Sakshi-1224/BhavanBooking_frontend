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

// Request Interceptor: Attach the CSRF token to state-changing requests
api.interceptors.request.use(
  (config) => {
    // Methods that change state
    const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
    
    if (stateChangingMethods.includes(config.method)) {
      const csrfToken = getCookie('csrfToken');
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken; // Matches backend CSRF_HEADER_NAME
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;