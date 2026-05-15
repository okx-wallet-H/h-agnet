import type { TradeProposal } from '../trading/types'
import type { ConversationCard } from '../cards/types'

export type AgentIntentType =
  | 'portfolio-question'
  | 'market-analysis'
  | 'strategy-request'
  | 'trade-proposal'

export type AgentConversationIntent =
  | AgentIntentType
  | 'earning-agent'
  | 'wallet-action'
  | 'boost-action'
  | 'unknown'

export type AgentConversationRole = 'user' | 'assistant'

export type AgentConversationMessage = {
  id: string
  role: AgentConversationRole
  content: string
  createdAt: string
}

export type AgentConversationProcessStep = {
  id: string
  title: string
  detail: string
  status: 'done' | 'waiting' | 'blocked'
}

export type AgentConversationExecutionPlan = {
  pipelineVersion: string
  intent: AgentConversationIntent
  actionLabel: string
  adapterRequirement: string
  authorizationGrantId?: string | null
  authorizationStatus:
    | 'agent-authorized'
    | 'authorization-required'
    | 'identity-required'
    | 'not-required'
  policyReason: string
  policyVersion: string
  requiredConfirmation: boolean
  requiredUserAuthorization: boolean
  scope: string
  executionMode: 'record-only' | 'review-card-only'
    | 'authorization-required'
    | 'agent-authorized-pending-adapter'
  safetyGate:
    | 'agent-policy-authorized'
    | 'identity-and-user-authorization-required'
    | 'no-asset-action'
    | 'user-authorization-required'
  userFacingComplexity: 'simple-card'
}

export type AgentConversationResponse = {
  id: string
  createdAt: string
  intent: AgentConversationIntent
  confidence: 'low' | 'medium' | 'high'
  userMessage: AgentConversationMessage
  assistantMessage: AgentConversationMessage
  processSteps: AgentConversationProcessStep[]
  cards: ConversationCard[]
  executionPlan?: AgentConversationExecutionPlan
}

export type AgentConversationTurn = AgentConversationResponse

export type AgentStrategyProposal = {
  id: string
  intentType: AgentIntentType
  summary: string
  confidence: 'low' | 'medium' | 'high'
  tradeProposal?: TradeProposal
}
