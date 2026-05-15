import { okxSwapAdapter } from '../okx/adapters/okxTradingAdapter'
import { tradingApi, type CreateTradeProposalInput } from './tradingApi'

export function getTradingIntegrationStatus() {
  return okxSwapAdapter.getStatus()
}

export function createTradeProposal(input: CreateTradeProposalInput) {
  return tradingApi.createProposal(input)
}

export function getPendingTradeProposal() {
  return tradingApi.getPendingProposal()
}
