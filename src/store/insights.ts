import { create } from 'zustand'
import type { Insight } from '@/types'

interface InsightsStore {
  insights: Insight[]
  isLoading: boolean
  setInsights: (insights: Insight[]) => void
  prependInsight: (insight: Insight) => void
}

export const useInsightsStore = create<InsightsStore>((set) => ({
  insights: [],
  isLoading: false,
  setInsights: (insights) => set({ insights }),
  prependInsight: (insight) =>
    set((state) => ({ insights: [insight, ...state.insights] })),
}))
