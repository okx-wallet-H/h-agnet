import { apiRequest } from '../api/httpClient'
import type {
  AgentRunnerStatus,
  HSkillDryRunResult,
  HSkillInvocationResult,
  HSkillInvocation,
  HSkillRuntimeStatus,
  HSkillWrapper,
  OfficialStrategySkill,
  StartStrategySkillResult,
  StrategyPlanResult,
  StrategyRun,
} from './types'

export type StrategySkillApi = {
  listOfficialStrategies: () => Promise<OfficialStrategySkill[]>
  getOfficialStrategyPlan: (
    strategyId: string,
  ) => Promise<StrategyPlanResult>
  listHSkillWrappers: () => Promise<HSkillWrapper[]>
  getHSkillRuntimeStatus: () => Promise<HSkillRuntimeStatus>
  listHSkillInvocations: () => Promise<HSkillInvocation[]>
  dryRunHSkill: (
    wrapperId: string,
    input?: Record<string, unknown>,
  ) => Promise<HSkillDryRunResult>
  invokeHSkill: (
    wrapperId: string,
    input?: Record<string, unknown>,
  ) => Promise<HSkillInvocationResult>
  getAgentRunnerStatus: () => Promise<AgentRunnerStatus>
  listStrategyRuns: () => Promise<StrategyRun[]>
  startOfficialStrategy: (
    strategyId: string,
  ) => Promise<StartStrategySkillResult>
}

export const strategySkillApi: StrategySkillApi = {
  listOfficialStrategies() {
    return apiRequest('/agent/strategies')
  },
  getOfficialStrategyPlan(strategyId) {
    return apiRequest(`/agent/strategies/${strategyId}/plan`)
  },
  listHSkillWrappers() {
    return apiRequest('/agent/skill-wrappers')
  },
  getHSkillRuntimeStatus() {
    return apiRequest('/agent/skill-runtime')
  },
  listHSkillInvocations() {
    return apiRequest('/agent/skill-runtime/invocations')
  },
  dryRunHSkill(wrapperId, input = {}) {
    return apiRequest('/agent/skill-runtime/dry-run', {
      method: 'POST',
      body: { wrapperId, input },
    })
  },
  invokeHSkill(wrapperId, input = {}) {
    return apiRequest('/agent/skill-runtime/invoke', {
      method: 'POST',
      body: { wrapperId, input },
    })
  },
  getAgentRunnerStatus() {
    return apiRequest('/agent/runner')
  },
  listStrategyRuns() {
    return apiRequest('/agent/runs')
  },
  startOfficialStrategy(strategyId) {
    return apiRequest(`/agent/strategies/${strategyId}/start`, {
      method: 'POST',
    })
  },
}
