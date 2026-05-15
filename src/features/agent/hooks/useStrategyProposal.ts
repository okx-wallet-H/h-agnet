import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import {
  createStrategyProposal,
  getPendingStrategyProposal,
} from '../../../services/ai/aiStrategyService'

export const strategyProposalKeys = {
  all: ['agent-strategy'] as const,
  pending: () => [...strategyProposalKeys.all, 'pending'] as const,
}

export function usePendingStrategyProposal() {
  return useQuery({
    queryKey: strategyProposalKeys.pending(),
    queryFn: getPendingStrategyProposal,
    enabled: isApiConfigured(),
  })
}

export function useCreateStrategyProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createStrategyProposal,
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: strategyProposalKeys.all,
      })
      void queryClient.invalidateQueries({ queryKey: ['card-library'] })
    },
  })
}
