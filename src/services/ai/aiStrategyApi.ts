import { apiRequest } from '../api/httpClient'
import type { AgentStrategyProposal } from './types'

export type CreateStrategyProposalInput = {
  prompt: string
}

export type AiStrategyApi = {
  createStrategyProposal: (
    input: CreateStrategyProposalInput,
  ) => Promise<AgentStrategyProposal>
  getPendingStrategyProposal: () => Promise<AgentStrategyProposal | null>
}

export const aiStrategyApi: AiStrategyApi = {
  createStrategyProposal(input) {
    return apiRequest('/ai/strategy/proposals', {
      method: 'POST',
      body: input,
    })
  },
  getPendingStrategyProposal() {
    return apiRequest('/ai/strategy/proposals/pending')
  },
}
