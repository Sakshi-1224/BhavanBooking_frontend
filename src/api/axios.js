import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true
});

export default api;