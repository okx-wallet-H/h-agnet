import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import {
  createTradeProposal,
  getPendingTradeProposal,
} from '../../../services/trading/tradingService'

export const tradeProposalKeys = {
  all: ['trade-proposal'] as const,
  pending: () => [...tradeProposalKeys.all, 'pending'] as const,
}

export function usePendingTradeProposal() {
  return useQuery({
    queryKey: tradeProposalKeys.pending(),
    queryFn: getPendingTradeProposal,
    enabled: isApiConfigured(),
  })
}

export function useCreateTradeProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTradeProposal,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: tradeProposalKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['card-library'] })
    },
  })
}
