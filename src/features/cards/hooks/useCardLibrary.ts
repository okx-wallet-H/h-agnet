import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import {
  archiveConversationCard,
  confirmConversationCard,
  createConversationCard,
  getConversationCards,
  getCardLibrary,
  getCardLibraryStats,
  prepareConversationCardForConfirmation,
  recordTradeExecutionHandoff,
  verifyTradeResult,
} from '../../../services/cards/cardLibraryService'
import type { CardLibraryStats } from '../../../services/cards/types'

export const cardLibraryKeys = {
  all: ['card-library'] as const,
  cards: () => [...cardLibraryKeys.all, 'cards'] as const,
  conversationCards: () =>
    [...cardLibraryKeys.all, 'conversation-cards'] as const,
  stats: () => [...cardLibraryKeys.all, 'stats'] as const,
}

const agentConversationQueryKey = ['agent-conversation'] as const

const emptyStats: CardLibraryStats = {
  activeCards: 0,
  totalCards: 0,
  completedTrades: 0,
  completedRewards: 0,
  pendingConfirmations: 0,
  walletActions: 0,
  portfolioInsights: 0,
  archivedCards: 0,
  membershipScore: null,
  confirmations: {
    blocked: 0,
    confirmed: 0,
    draft: 0,
    pending: 0,
    total: 0,
  },
  receipts: {
    nonBroadcast: 0,
    pendingExecution: 0,
    total: 0,
    verified: 0,
  },
  activity: {
    boostTasks: 0,
    membershipCards: 0,
    portfolioInsights: 0,
    systemCards: 0,
    tradeCards: 0,
    walletActions: 0,
  },
  completion: {
    blockedCards: 0,
    completedCards: 0,
    confirmedCards: 0,
    draftCards: 0,
    verifiedResults: 0,
  },
}

function invalidateCardStateQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: cardLibraryKeys.all })
  void queryClient.invalidateQueries({ queryKey: agentConversationQueryKey })
}

export function useCardLibrary() {
  const enabled = isApiConfigured()
  const cardsQuery = useQuery({
    queryKey: cardLibraryKeys.cards(),
    queryFn: getCardLibrary,
    enabled,
  })
  const statsQuery = useQuery({
    queryKey: cardLibraryKeys.stats(),
    queryFn: getCardLibraryStats,
    enabled,
  })

  return {
    cards: cardsQuery.data ?? [],
    error: cardsQuery.error ?? statsQuery.error,
    isBackendConfigured: enabled,
    isError: cardsQuery.isError || statsQuery.isError,
    isLoading: cardsQuery.isLoading || statsQuery.isLoading,
    stats: statsQuery.data ?? emptyStats,
  }
}

export function useConversationCards() {
  const enabled = isApiConfigured()
  const cardsQuery = useQuery({
    queryKey: cardLibraryKeys.conversationCards(),
    queryFn: getConversationCards,
    enabled,
  })

  return {
    cards: cardsQuery.data ?? [],
    error: cardsQuery.error,
    isBackendConfigured: enabled,
    isError: cardsQuery.isError,
    isLoading: cardsQuery.isLoading,
  }
}

export function useCreateConversationCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createConversationCard,
    onSuccess() {
      invalidateCardStateQueries(queryClient)
    },
  })
}

export function useArchiveConversationCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: archiveConversationCard,
    onSuccess() {
      invalidateCardStateQueries(queryClient)
    },
  })
}

export function usePrepareConversationCardForConfirmation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: prepareConversationCardForConfirmation,
    onSuccess() {
      invalidateCardStateQueries(queryClient)
    },
  })
}

export function useConfirmConversationCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: confirmConversationCard,
    onSuccess() {
      invalidateCardStateQueries(queryClient)
    },
  })
}

export function useRecordTradeExecutionHandoff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recordTradeExecutionHandoff,
    onSuccess() {
      invalidateCardStateQueries(queryClient)
    },
  })
}

export function useVerifyTradeResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyTradeResult,
    onSuccess() {
      invalidateCardStateQueries(queryClient)
    },
  })
}
