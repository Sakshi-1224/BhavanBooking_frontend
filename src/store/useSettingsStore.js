import { create } from 'zustand';
import api from '../api/axios';

const useSettingsStore = create((set) => ({
  settings: null,
  isLoading: true,
  error: null,
  
  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      // Assuming your backend exposes a unified settings endpoint
      const response = await api.get('/settings'); 
      const data = response.data?.data || response.data;
      
      set({ 
        settings: data, 
        isLoading: false 
      });
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
      set({ 
        error: error.response?.data?.message || 'Failed to load settings', 
        isLoading: false 
      });
    }
  }
}));

export default useSettingsStore;