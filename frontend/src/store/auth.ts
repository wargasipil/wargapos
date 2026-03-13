import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  userId: string | null
  role: string | null
  login: (token: string, userId: string, role: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      role: null,
      login: (token, userId, role) => set({ token, userId, role }),
      logout: () => set({ token: null, userId: null, role: null }),
      isAuthenticated: () => get().token !== null,
    }),
    {
      name: 'wargapos-auth',
    }
  )
)
