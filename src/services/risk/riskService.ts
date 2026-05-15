import { riskApi, type EvaluateRiskInput } from './riskApi'

export function evaluateTradeProposalRisk(input: EvaluateRiskInput) {
  return riskApi.evaluateTradeProposal(input)
}
