import type { CardLibraryStats, ConversationCard } from './types'
import {
  cardLibraryApi,
  type CreateConversationCardInput,
} from './cardLibraryApi'

export async function getCardLibrary(): Promise<ConversationCard[]> {
  return cardLibraryApi.listCards()
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
