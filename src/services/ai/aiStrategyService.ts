import type { AgentStrategyProposal } from './types'
import {
  aiStrategyApi,
  type CreateStrategyProposalInput,
} from './aiStrategyApi'

export async function createStrategyProposal(
  input: CreateStrategyProposalInput,
) {
  return aiStrategyApi.createStrategyProposal(input)
}

export async function getPendingStrategyProposal(): Promise<AgentStrategyProposal | null> {
  return aiStrategyApi.getPendingStrategyProposal()
}
