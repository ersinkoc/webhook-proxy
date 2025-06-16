import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@webhook-proxy/shared';
import { api } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (apiKey: string) => Promise<void>;
  logout: () => void;
  setAuth: (user: AuthUser, token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (apiKey: string) => {
        const response = await api.post('/api/auth/login', { apiKey });
        const { user, token } = response.data.data;
        
        set({
          user,
          token,
          isAuthenticated: true,
        });
        
        // Set token for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        
        delete api.defaults.headers.common['Authorization'];
      },
      
      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
    }),
    {
      name: 'webhook-proxy-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);