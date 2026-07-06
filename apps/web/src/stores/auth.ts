import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface AuthUser {
  id: string
  email: string
  name: string | null
}

interface AuthState {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: async () => {
        await api.post('/auth/logout', {}).catch(() => {})
        set({ user: null })
      },
    }),
    { name: 'finsight-auth' },
  ),
)
