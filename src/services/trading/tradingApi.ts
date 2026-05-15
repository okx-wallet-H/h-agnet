import { apiRequest } from '../api/httpClient'
import type { TradeProposal } from './types'

export type CreateTradeProposalInput = {
  intent: string
}

export type TradingApi = {
  createProposal: (input: CreateTradeProposalInput) => Promise<TradeProposal>
  getPendingProposal: () => Promise<TradeProposal | null>
}

export const tradingApi: TradingApi = {
  createProposal(input) {
    return apiRequest('/trading/proposals', {
      method: 'POST',
      body: input,
    })
  },
  getPendingProposal() {
    return apiRequest('/trading/proposals/pending')
  },
}
