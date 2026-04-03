import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,

      // Unified login function - strictly for user metadata
      login: (userData) => set({
        user: userData,
        role: userData.role,
        isAuthenticated: true,
      }),

      // Unified logout function - clears metadata
      logout: () => set({
        user: null,
        role: null,
        isAuthenticated: false,
      }),
    }),
    { 
      // This saves the user details to localStorage so they persist on refresh,
      // but it does NOT save the highly sensitive JWT.
      name: 'bhavan-auth-storage' 
    }
  )
);

export default useAuthStore;