import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  refreshToken: string | null
  expiresAt: number | null
  userId: string | null
  role: string | null
  login: (token: string, refreshToken: string, expiresAt: number, userId: string, role: string) => void
  setTokens: (token: string, refreshToken: string, expiresAt: number) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      userId: null,
      role: null,
      login: (token, refreshToken, expiresAt, userId, role) =>
        set({ token, refreshToken, expiresAt, userId, role }),
      setTokens: (token, refreshToken, expiresAt) =>
        set({ token, refreshToken, expiresAt }),
      logout: () => set({ token: null, refreshToken: null, expiresAt: null, userId: null, role: null }),
      isAuthenticated: () => get().token !== null,
    }),
    {
      name: 'wargapos-auth',
    }
  )
)
