import { strategySkillApi } from './strategySkillApi'

export function listOfficialStrategies() {
  return strategySkillApi.listOfficialStrategies()
}

export function getOfficialStrategyPlan(strategyId: string) {
  return strategySkillApi.getOfficialStrategyPlan(strategyId)
}

export function listHSkillWrappers() {
  return strategySkillApi.listHSkillWrappers()
}

export function getHSkillRuntimeStatus() {
  return strategySkillApi.getHSkillRuntimeStatus()
}

export function getAgentRunnerStatus() {
  return strategySkillApi.getAgentRunnerStatus()
}

export function listStrategyRuns() {
  return strategySkillApi.listStrategyRuns()
}

export function startOfficialStrategy(strategyId: string) {
  return strategySkillApi.startOfficialStrategy(strategyId)
}

export function runStrategyPreflight(
  runId: string,
  input?: Record<string, unknown>,
) {
  return strategySkillApi.runStrategyPreflight(runId, input)
}
