import { apiRequest } from '../api/httpClient'
import type {
  AgentRunnerStatus,
  HSkillRuntimeStatus,
  HSkillWrapper,
  OfficialStrategySkill,
  StrategyPreflightResult,
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
  getAgentRunnerStatus: () => Promise<AgentRunnerStatus>
  listStrategyRuns: () => Promise<StrategyRun[]>
  startOfficialStrategy: (
    strategyId: string,
  ) => Promise<StartStrategySkillResult>
  runStrategyPreflight: (
    runId: string,
    input?: Record<string, unknown>,
  ) => Promise<StrategyPreflightResult>
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
  runStrategyPreflight(runId, input = {}) {
    return apiRequest(`/agent/runs/${runId}/preflight`, {
      method: 'POST',
      body: { input },
    })
  },
}
