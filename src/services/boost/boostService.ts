import type {
  BoostCampaign,
  BoostGrowthSummary,
  ScoringRuleSet,
  SideQuest,
  SideQuestRuleSet,
} from './types'
import { boostApi } from './boostApi'

export async function getBoostCampaigns(): Promise<BoostCampaign[]> {
  return boostApi.listCampaigns()
}

export async function getBoostGrowthSummary(): Promise<BoostGrowthSummary> {
  return boostApi.getGrowthSummary()
}

export async function getScoringRules(): Promise<ScoringRuleSet> {
  return boostApi.listScoringRules()
}

export async function getSideQuests(): Promise<SideQuest[]> {
  return boostApi.listSideQuests()
}

export async function getSideQuestRules(): Promise<SideQuestRuleSet> {
  return boostApi.listSideQuestRules()
}
