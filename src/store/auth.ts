import { create } from 'zustand'
import type { Profile } from '@/types'

interface AuthState {
  profile: Profile | null
  credits: number | null
  userId: string | null
  setProfile: (profile: Profile | null) => void
  setCredits: (credits: number) => void
  updateCredits: (newBalance: number) => void
  initialize: (userId: string, credits: number) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  credits: null,
  userId: null,

  setProfile: (profile) => set({ profile }),

  setCredits: (credits) => set({ credits }),

  updateCredits: (newBalance) =>
    set((state) => ({
      credits: newBalance,
      profile: state.profile ? { ...state.profile, credits: newBalance } : null,
    })),

  initialize: (userId, credits) => set({ userId, credits }),

  reset: () => set({ profile: null, credits: null, userId: null }),
}))
