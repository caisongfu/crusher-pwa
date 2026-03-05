import { create } from 'zustand'
import type { Profile } from '@/types'

interface AuthStore {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  updateCredits: (newBalance: number) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateCredits: (newBalance) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, credits: newBalance } : null,
    })),
}))
