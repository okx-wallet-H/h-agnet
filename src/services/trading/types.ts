export type TradeSide = 'buy' | 'sell' | 'swap'

export type TradeProposalStatus = 'draft' | 'risk-review' | 'awaiting-confirmation'

export type TradeProposal = {
  id: string
  side: TradeSide
  fromSymbol: string
  toSymbol: string
  amount: string
  estimatedOutput?: string
  routeLabel?: string
  networkFee?: string
  slippageTolerance?: string
  status: TradeProposalStatus
}

export type TradeConfirmationState =
  | 'missing-wallet'
  | 'missing-quote'
  | 'risk-blocked'
  | 'ready'
  | 'executing'
