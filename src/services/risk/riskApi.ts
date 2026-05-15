import { apiRequest } from '../api/httpClient'
import type { RiskAssessment } from './types'

export type EvaluateRiskInput = {
  proposalId: string
}

export type RiskApi = {
  evaluateTradeProposal: (
    input: EvaluateRiskInput,
  ) => Promise<RiskAssessment>
}

export const riskApi: RiskApi = {
  evaluateTradeProposal(input) {
    return apiRequest('/risk/trade-proposal', {
      method: 'POST',
      body: input,
    })
  },
}
