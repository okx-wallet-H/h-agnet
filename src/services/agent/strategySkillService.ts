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

export function listHSkillInvocations() {
  return strategySkillApi.listHSkillInvocations()
}

export function dryRunHSkill(
  wrapperId: string,
  input?: Record<string, unknown>,
) {
  return strategySkillApi.dryRunHSkill(wrapperId, input)
}

export function invokeHSkill(
  wrapperId: string,
  input?: Record<string, unknown>,
) {
  return strategySkillApi.invokeHSkill(wrapperId, input)
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
