const { getCardLibraryStats } = require('./cardsService')
const {
  discardSideQuestRuleDraft,
  evaluateSideQuestRules,
  getSideQuestRuleManagementSnapshot,
  listSideQuestRules,
  previewSideQuestRuleChanges,
  publishSideQuestRuleDraft,
  saveSideQuestRuleDraft,
} = require('./sideQuestRulesService')
const {
  discardScoringRuleDraft,
  evaluateCardLibraryScore,
  getScoringRuleManagementSnapshot,
  listScoringRules,
  previewScoringRuleChanges,
  publishScoringRuleDraft,
  saveScoringRuleDraft,
} = require('./scoringRulesService')

function listBoostCampaigns() {
  return []
}

function buildRecommendedActions(stats) {
  const actions = []

  if (stats.confirmations.pending > 0) {
    actions.push({
      id: 'confirm-pending',
      title: '处理待授权卡',
      description: '先授权或取消等待中的卡片，让卡库状态更干净。',
      status: 'ready',
      source: 'confirmations',
    })
  }

  if (stats.activity.boostTasks === 0) {
    actions.push({
      id: 'create-boost-task',
      title: '生成第一张赚币任务卡',
      description: '从 AI 对话里说“帮我找赚币任务”，激活任务评分。',
      status: 'ready',
      source: 'boost',
    })
  }

  if (stats.activity.portfolioInsights === 0) {
    actions.push({
      id: 'create-insight',
      title: '做一次资产分析',
      description: '资产分析卡会帮助后续组合建议更贴近用户。',
      status: 'ready',
      source: 'portfolio',
    })
  }

  if (stats.receipts.pendingExecution > 0) {
    actions.push({
      id: 'wait-execution-layer',
      title: '等待执行层接入',
      description: '已有授权回执，但当前仍未广播，不会记为真实成功。',
      status: 'waiting',
      source: 'execution',
    })
  }

  if (actions.length === 0) {
    actions.push({
      id: 'keep-building',
      title: '继续积累高质量卡片',
      description: '更多授权、任务和分析记录会让会员等级更稳定。',
      status: 'ready',
      source: 'card-library',
    })
  }

  return actions.slice(0, 4)
}

function listSideQuests() {
  const stats = getCardLibraryStats()

  return evaluateSideQuestRules(stats)
}

function previewSideQuestRuleDraft(payload) {
  const stats = getCardLibraryStats()

  return previewSideQuestRuleChanges(stats, payload)
}

function previewScoringRuleDraft(payload) {
  const stats = getCardLibraryStats()

  return previewScoringRuleChanges(stats, payload)
}

function getGrowthSummary() {
  const stats = getCardLibraryStats()
  const scoreResult = evaluateCardLibraryScore(stats)

  return {
    ...scoreResult,
    stats,
    recommendedActions: buildRecommendedActions(stats),
  }
}

module.exports = {
  discardScoringRuleDraft,
  discardSideQuestRuleDraft,
  getGrowthSummary,
  getScoringRuleManagementSnapshot,
  getSideQuestRuleManagementSnapshot,
  listScoringRules,
  listSideQuests,
  listSideQuestRules,
  listBoostCampaigns,
  previewScoringRuleDraft,
  previewSideQuestRuleDraft,
  publishScoringRuleDraft,
  publishSideQuestRuleDraft,
  saveScoringRuleDraft,
  saveSideQuestRuleDraft,
}
