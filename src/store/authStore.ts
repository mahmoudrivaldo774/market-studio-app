import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types'

interface AuthState {
  user: User | null
  setSupabaseUser: (user: User) => void
  setUser: (user: User | null) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setSupabaseUser: (user) => set({ user }),
      setUser: (user) => set({ user }),
      logout: () => {
        set({ user: null })
        localStorage.removeItem('market-auth-storage')
      },
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'market-auth-storage',
    }
  )
)
