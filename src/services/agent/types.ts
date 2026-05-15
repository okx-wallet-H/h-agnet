import type { ConversationCard } from '../cards/types'

export type StrategySkillStatus = 'draft' | 'active' | 'paused' | 'retired'

export type StrategyRiskLevel = 'low' | 'medium' | 'high'

export type HSkillWrapperStatus =
  | 'contract-ready'
  | 'blocked-until-adapter'
  | 'disabled'

export type AgentRunnerState =
  | 'idle'
  | 'starting'
  | 'planning'
  | 'waiting-authorization'
  | 'executing'
  | 'completed'
  | 'blocked'
  | 'paused'

export type AgentRunnerStepStatus = 'done' | 'waiting' | 'blocked'

export type AgentExecutionPlanStatus = 'ready' | 'blocked'

export type AgentRunnerStateDescriptor = {
  id: AgentRunnerState
  label: string
  description: string
}

export type AgentRunnerStep = {
  id: AgentRunnerState
  label: string
  status: AgentRunnerStepStatus
  detail: string
}

export type AgentExecutionPlanStep = {
  adapterStatus?: string
  bindingStatus?: 'ready' | 'blocked' | 'unknown'
  credentialBoundary?: string
  credentialLabel?: string
  requiredProviderMethod?: string | null
  id: string
  order: number
  wrapperId: string
  label: string
  providerSkill: string
  stage: string
  status: AgentExecutionPlanStatus
  required: boolean
  detail: string
  wrapperStatus?: HSkillWrapperStatus
}

export type AgentAuthorizationStatus =
  | 'agent-authorized'
  | 'authorization-required'
  | 'identity-required'
  | 'not-required'

export type AgentAuthorizationResult = {
  policyVersion: string
  authorizationGrantId: string | null
  authorizationStatus: AgentAuthorizationStatus
  executionMode:
    | 'record-only'
    | 'authorization-required'
    | 'agent-authorized-pending-adapter'
  policyReason: string
  requiredUserAuthorization: boolean
  safetyGate:
    | 'agent-policy-authorized'
    | 'identity-and-user-authorization-required'
    | 'no-asset-action'
    | 'user-authorization-required'
  scope: string
  userId?: string | null
}

export type HSkillWrapper = {
  id: string
  domain: 'onchain'
  label: string
  providerSkill: string
  status: HSkillWrapperStatus
  description: string
}

export type HSkillInvocation = {
  id: string
  wrapperId: string
  providerSkill: string
  status: 'blocked' | 'completed'
  executionMode: 'dry-run-only' | 'read-only-adapter'
  createdAt: string
  inputSummary: Record<string, string>
  result:
    | {
        ok: false
        code: string
        message: string
        data?: unknown
      }
    | {
        ok: true
        code: string
        message: string
        data: unknown
      }
}

export type HSkillRuntimeStatus = {
  status: 'contract-ready'
  realExecutionEnabled: boolean
  hSkillBindings: Array<{
    adapterStatus: string
    credentialBoundary?: string
    credentialLabel?: string
    hSkillWrapperId: string
    requiredProviderMethod?: string | null
    providerSkill: string
    providerLabel?: string
    reason: string
    status: 'ready' | 'blocked' | 'unknown'
    wrapperStatus?: HSkillWrapperStatus
  }>
  wrapperCount: number
  invocationCount: number
  lastInvocation: HSkillInvocation | null
  policy: {
    mode: 'dry-run-only' | 'read-preflight-only'
    reason: string
  }
}

export type HSkillDryRunResult = {
  invocation: HSkillInvocation
  wrapper: HSkillWrapper
}

export type HSkillInvocationResult = {
  invocation: HSkillInvocation
  wrapper: HSkillWrapper
}

export type OfficialStrategySkill = {
  id: string
  version: string
  status: StrategySkillStatus
  name: string
  summary: string
  riskLevel: StrategyRiskLevel
  supportedChains: string[]
  supportedAssets: string[]
  requiredSkillWrappers: string[]
  authorizationScope: string
  stopConditions: string[]
  cardTemplates: {
    progress: string
    blocked: string
    result: string
  }
}

export type StrategyRun = {
  id: string
  strategyId: string
  strategyVersion: string
  status: AgentRunnerState
  createdAt: string
  executionMode: 'draft-only'
  requiredSkillWrappers: string[]
  executionPlan: AgentExecutionPlanStep[]
  authorization: AgentAuthorizationResult
  stateLabel: string
  blockReason?: string
  nextStep: string
  steps: AgentRunnerStep[]
}

export type StartStrategySkillResult = {
  run: StrategyRun
  strategy: OfficialStrategySkill
  card: ConversationCard
}

export type AgentRunnerStatus = {
  state: AgentRunnerState
  currentRun: StrategyRun | null
  stateOrder: AgentRunnerStateDescriptor[]
  summary: string
  executionPolicy: {
    realExecutionEnabled: boolean
    reason: string
  }
}

export type StrategyPlanResult = {
  strategy: OfficialStrategySkill
  plan: AgentExecutionPlanStep[]
  summary: string
  executionPolicy: {
    realExecutionEnabled: boolean
    reason: string
  }
}
