import { apiRequest } from '../api/httpClient'
import type {
  CardConfirmationResult,
  CardLibraryStats,
  ConversationCard,
  TradeExecutionHandoffInput,
  TradeExecutionHandoffResult,
  TradeResultVerificationInput,
  TradeResultVerificationResult,
} from './types'

export type CreateConversationCardInput = Omit<
  ConversationCard,
  'id' | 'createdAt'
>

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
  recordTradeExecutionHandoff: (
    cardId: string,
    input: TradeExecutionHandoffInput,
  ) => Promise<TradeExecutionHandoffResult>
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
  recordTradeExecutionHandoff(cardId, input) {
    return apiRequest(`/cards/${cardId}/execution-handoff`, {
      method: 'POST',
      body: input,
    })
  },
  verifyTradeResult(cardId, input = {}) {
    return apiRequest(`/cards/${cardId}/verify-trade`, {
      method: 'POST',
      body: input,
    })
  },
}
