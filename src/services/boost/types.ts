import type { CardLibraryStats } from '../cards/types'

export type BoostCampaignStatus = 'pending' | 'active' | 'completed' | 'claimed'

export type BoostCampaign = {
  id: string
  title: string
  status: BoostCampaignStatus
  rewardLabel?: string
}

export type GrowthTierId =
  | 'inactive'
  | 'starter'
  | 'builder'
  | 'advanced'
  | 'elite'

export type GrowthActionStatus = 'ready' | 'waiting'
export type SideQuestRuleSetStatus = 'draft' | 'published'
export type SideQuestStatus = 'locked' | 'active' | 'unlocked'
export type SideQuestCategory =
  | 'boost'
  | 'card-library'
  | 'execution'
  | 'portfolio'
  | 'trading'
  | 'verified-result'
  | 'wallet'

export type GrowthScoreBreakdownItem = {
  id: string
  label: string
  points: number
  maxPoints: number
  description: string
  metricPath?: string
  current?: number
}

export type GrowthRecommendedAction = {
  id: string
  title: string
  description: string
  status: GrowthActionStatus
  source: string
}

export type SideQuest = {
  id: string
  ruleVersion: string
  title: string
  description: string
  category: SideQuestCategory
  rewardLabel: string
  status: SideQuestStatus
  progress: number
  requirement: {
    current: number
    target: number
    unit: string
  }
  source: 'card-library'
}

export type SideQuestRule = {
  id: string
  title: string
  description: string
  category: SideQuestCategory
  rewardLabel: string
  metricPath: string
  target: number
  unit: string
  enabled: boolean
  sortOrder: number
}

export type SideQuestRuleSet = {
  version: string
  status: SideQuestRuleSetStatus
  baseVersion?: string | null
  publishedAt?: string | null
  updatedAt?: string
  updatedBy?: string
  changeNote?: string
  rules: SideQuestRule[]
}

export type ScoringDimension = {
  id: string
  label: string
  minScore: number
  maxScore: number
  sortOrder: number
}

export type ScoringTier = {
  id: string
  label: string
  threshold: number
  sortOrder: number
}

export type ScoringRule = {
  id: string
  dimension: string
  label: string
  description: string
  metricPath: string
  pointsPerUnit: number
  minPoints: number
  maxPoints: number
  sortOrder: number
  enabled: boolean
}

export type ScoringRuleSet = {
  version: string
  status: SideQuestRuleSetStatus
  baseVersion?: string | null
  publishedAt?: string | null
  updatedAt?: string
  updatedBy?: string
  changeNote?: string
  dimensions: ScoringDimension[]
  tiers: ScoringTier[]
  rules: ScoringRule[]
  caveats: string[]
}

export type GrowthScoreDimensionResult = {
  id: string
  label: string
  score: number
  maxScore: number
  items: GrowthScoreBreakdownItem[]
}

export type BoostGrowthSummary = {
  modelVersion: string
  ruleSetVersion: string
  source: 'card-library'
  score: number
  tier: {
    id: GrowthTierId
    label: string
    nextLabel: string | null
    nextThreshold: number | null
    progress: number
  }
  taskScore: number
  trustScore: number
  verifiedResultScore: number
  stats: CardLibraryStats
  breakdown: GrowthScoreBreakdownItem[]
  dimensions: GrowthScoreDimensionResult[]
  recommendedActions: GrowthRecommendedAction[]
  caveats: string[]
}
