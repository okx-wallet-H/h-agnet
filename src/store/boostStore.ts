import { create } from 'zustand'

type BoostStore = {
  activeCampaignId: string | null
  setActiveCampaignId: (campaignId: string | null) => void
}

export const useBoostStore = create<BoostStore>((set) => ({
  activeCampaignId: null,
  setActiveCampaignId: (activeCampaignId) => set({ activeCampaignId }),
}))
