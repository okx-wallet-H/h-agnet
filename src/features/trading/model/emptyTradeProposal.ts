import type { TradeConfirmationState, TradeProposal } from '../../../services/trading/types'

export const emptyTradeProposal: TradeProposal = {
  id: 'draft-trade-proposal',
  side: 'swap',
  fromSymbol: '--',
  toSymbol: '--',
  amount: '--',
  estimatedOutput: '--',
  routeLabel: '等待 OKX Swap 路线',
  networkFee: '等待 OKX Swap 估算',
  slippageTolerance: '未设置',
  status: 'draft',
}

export const emptyTradeConfirmationState: TradeConfirmationState =
  'missing-wallet'
