import { apiRequest } from '../api/httpClient'
import type {
  BoostCampaign,
  BoostGrowthSummary,
  ScoringRuleSet,
  SideQuest,
  SideQuestRuleSet,
} from './types'

export type BoostApi = {
  listCampaigns: () => Promise<BoostCampaign[]>
  getGrowthSummary: () => Promise<BoostGrowthSummary>
  listScoringRules: () => Promise<ScoringRuleSet>
  listSideQuests: () => Promise<SideQuest[]>
  listSideQuestRules: () => Promise<SideQuestRuleSet>
}

export const boostApi: BoostApi = {
  listCampaigns() {
    return apiRequest('/boost/campaigns')
  },
  getGrowthSummary() {
    return apiRequest('/boost/growth-summary')
  },
  listScoringRules() {
    return apiRequest('/boost/scoring-rules')
  },
  listSideQuests() {
    return apiRequest('/boost/side-quests')
  },
  listSideQuestRules() {
    return apiRequest('/boost/side-quest-rules')
  },
}
