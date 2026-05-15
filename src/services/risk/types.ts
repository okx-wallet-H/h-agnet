export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked'

export type RiskAssessment = {
  level: RiskLevel
  reasons: string[]
  requiresConfirmation: boolean
  blockingReason?: string
}
