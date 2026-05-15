import { useQuery } from '@tanstack/react-query'

import { isApiConfigured } from '../../../services/api/httpClient'
import {
  getBoostGrowthSummary,
  getScoringRules,
  getSideQuestRules,
  getSideQuests,
} from '../../../services/boost/boostService'

export const boostGrowthKeys = {
  all: ['boost-growth'] as const,
  scoringRules: () => [...boostGrowthKeys.all, 'scoring-rules'] as const,
  summary: () => [...boostGrowthKeys.all, 'summary'] as const,
  sideQuestRules: () => [...boostGrowthKeys.all, 'side-quest-rules'] as const,
  sideQuests: () => [...boostGrowthKeys.all, 'side-quests'] as const,
}

export function useBoostGrowthSummary() {
  return useQuery({
    queryKey: boostGrowthKeys.summary(),
    queryFn: getBoostGrowthSummary,
    enabled: isApiConfigured(),
  })
}

export function useScoringRules() {
  return useQuery({
    queryKey: boostGrowthKeys.scoringRules(),
    queryFn: getScoringRules,
    enabled: isApiConfigured(),
  })
}

export function useSideQuests() {
  return useQuery({
    queryKey: boostGrowthKeys.sideQuests(),
    queryFn: getSideQuests,
    enabled: isApiConfigured(),
  })
}

export function useSideQuestRules() {
  return useQuery({
    queryKey: boostGrowthKeys.sideQuestRules(),
    queryFn: getSideQuestRules,
    enabled: isApiConfigured(),
  })
}
