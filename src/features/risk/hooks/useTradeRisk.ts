import { useMutation } from '@tanstack/react-query'

import { evaluateTradeProposalRisk } from '../../../services/risk/riskService'

export function useEvaluateTradeProposalRisk() {
  return useMutation({
    mutationFn: evaluateTradeProposalRisk,
  })
}
