import { create } from 'zustand'

import type {
  TradeConfirmationState,
  TradeProposal,
} from '../services/trading/types'

type TradingStore = {
  pendingProposal: TradeProposal | null
  confirmationState: TradeConfirmationState
  setPendingProposal: (proposal: TradeProposal | null) => void
  setConfirmationState: (state: TradeConfirmationState) => void
}

export const useTradingStore = create<TradingStore>((set) => ({
  pendingProposal: null,
  confirmationState: 'missing-wallet',
  setPendingProposal: (pendingProposal) => set({ pendingProposal }),
  setConfirmationState: (confirmationState) => set({ confirmationState }),
}))
