import { create } from 'zustand'

import type { ConversationCard } from '../services/cards/types'

type CardStore = {
  cards: ConversationCard[]
  selectedCardId: string | null
  setCards: (cards: ConversationCard[]) => void
  addCard: (card: ConversationCard) => void
  setSelectedCardId: (cardId: string | null) => void
}

export const useCardStore = create<CardStore>((set) => ({
  cards: [],
  selectedCardId: null,
  setCards: (cards) => set({ cards }),
  addCard: (card) => set((state) => ({ cards: [card, ...state.cards] })),
  setSelectedCardId: (selectedCardId) => set({ selectedCardId }),
}))
