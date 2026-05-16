import { apiRequest } from '../api/httpClient'
import type {
  CardConfirmationResult,
  CardLibraryStats,
  CardMetric,
  ConversationCard,
  TradeResultVerificationInput,
  TradeResultVerificationResult,
} from './types'

type ClientConversationCardType = Extract<
  ConversationCard['type'],
  'portfolio-insight' | 'side-quest' | 'system-status'
>

export type CreateConversationCardInput = {
  type: ClientConversationCardType
  status: 'draft'
  source: 'user-action'
  title: string
  summary: string
  metrics: CardMetric[]
  metadata?: Record<string, unknown>
  tags: string[]
}

export type CardLibraryApi = {
  listCards: () => Promise<ConversationCard[]>
  listConversationCards: () => Promise<ConversationCard[]>
  getStats: () => Promise<CardLibraryStats>
  createCard: (
    input: CreateConversationCardInput,
  ) => Promise<ConversationCard>
  archiveCard: (cardId: string) => Promise<{ archived: boolean }>
  prepareCardForConfirmation: (cardId: string) => Promise<ConversationCard>
  confirmCard: (cardId: string) => Promise<CardConfirmationResult>
  verifyTradeResult: (
    cardId: string,
    input?: TradeResultVerificationInput,
  ) => Promise<TradeResultVerificationResult>
}

export const cardLibraryApi: CardLibraryApi = {
  listCards() {
    return apiRequest('/cards')
  },
  listConversationCards() {
    return apiRequest('/cards/conversation')
  },
  getStats() {
    return apiRequest('/cards/stats')
  },
  createCard(input) {
    return apiRequest('/cards', {
      method: 'POST',
      body: input,
    })
  },
  archiveCard(cardId) {
    return apiRequest(`/cards/${cardId}/archive`, {
      method: 'POST',
    })
  },
  prepareCardForConfirmation(cardId) {
    return apiRequest(`/cards/${cardId}/prepare-confirmation`, {
      method: 'POST',
    })
  },
  confirmCard(cardId) {
    return apiRequest(`/cards/${cardId}/confirm`, {
      method: 'POST',
    })
  },
  verifyTradeResult(cardId, input = {}) {
    return apiRequest(`/cards/${cardId}/verify-trade`, {
      method: 'POST',
      body: input,
    })
  },
}
