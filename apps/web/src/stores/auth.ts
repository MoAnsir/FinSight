import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setToken, clearToken } from '@/lib/api'

interface AuthState {
  token: string | null
  user: { id: string; email: string; name: string | null } | null
  login: (token: string, user: AuthState['user']) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => {
        setToken(token)
        set({ token, user })
      },
      logout: () => {
        clearToken()
        set({ token: null, user: null })
      },
    }),
    { name: 'finsight-auth' },
  ),
)
