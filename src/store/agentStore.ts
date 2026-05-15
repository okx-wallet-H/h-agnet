import { create } from 'zustand'

import type { AgentStrategyProposal } from '../services/ai/types'

type AgentStore = {
  sessionId: string | null
  pendingProposal: AgentStrategyProposal | null
  setSessionId: (sessionId: string | null) => void
  setPendingProposal: (proposal: AgentStrategyProposal | null) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  sessionId: null,
  pendingProposal: null,
  setSessionId: (sessionId) => set({ sessionId }),
  setPendingProposal: (pendingProposal) => set({ pendingProposal }),
}))
