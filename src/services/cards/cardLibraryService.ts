import type {
  CardLibraryStats,
  ConversationCard,
  TradeExecutionHandoffInput,
  TradeResultVerificationInput,
} from './types'
import {
  cardLibraryApi,
  type CreateConversationCardInput,
} from './cardLibraryApi'

export async function getCardLibrary(): Promise<ConversationCard[]> {
  return cardLibraryApi.listCards()
}

export async function getConversationCards(): Promise<ConversationCard[]> {
  return cardLibraryApi.listConversationCards()
}

export async function getCardLibraryStats(): Promise<CardLibraryStats> {
  return cardLibraryApi.getStats()
}

export async function createConversationCard(
  input: CreateConversationCardInput,
) {
  return cardLibraryApi.createCard(input)
}

export async function archiveConversationCard(cardId: string) {
  return cardLibraryApi.archiveCard(cardId)
}

export async function prepareConversationCardForConfirmation(cardId: string) {
  return cardLibraryApi.prepareCardForConfirmation(cardId)
}

export async function confirmConversationCard(cardId: string) {
  return cardLibraryApi.confirmCard(cardId)
}

export async function recordTradeExecutionHandoff({
  cardId,
  input,
}: {
  cardId: string
  input: TradeExecutionHandoffInput
}) {
  return cardLibraryApi.recordTradeExecutionHandoff(cardId, input)
}

export async function verifyTradeResult({
  cardId,
  input = {},
}: {
  cardId: string
  input?: TradeResultVerificationInput
}) {
  return cardLibraryApi.verifyTradeResult(cardId, input)
}
