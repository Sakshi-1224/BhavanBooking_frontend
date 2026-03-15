import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,

      // Unified login function
      login: (userData, token) => set({
        user: userData,
        token: token,
        role: userData.role,
        isAuthenticated: true,
      }),

      logout: () => set({
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
      }),
    }),
    { name: 'bhavan-auth-storage' }
  )
);

export default useAuthStore;