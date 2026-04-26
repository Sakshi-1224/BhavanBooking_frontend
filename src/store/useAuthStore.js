// src/store/useAuthStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../api/auth.service'; 

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      isCheckingAuth: false,

      login: (userData) => set({
        user: userData,
        role: userData.role,
        isAuthenticated: true,
      }),

      logout: () => set({
        user: null,
        role: null,
        isAuthenticated: false,
      }),

      checkAuth: async () => {
        set({ isCheckingAuth: true });
        try {
          const response = await authService.getMyProfile();
          const userData = response.data.data.user; 
          set({
            user: userData,
            role: userData.role,
            isAuthenticated: true,
            isCheckingAuth: false,
          });
        } catch (error) {
          set({
            user: null,
            role: null,
            isAuthenticated: false,
            isCheckingAuth: false,
          });
        }
      }
    }),
    { 
      name: 'bhavan-auth-storage' 
    }
  )
);

export default useAuthStore;