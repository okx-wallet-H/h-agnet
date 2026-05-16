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

  if (stats.activeCards === 0) {
    actions.push({
      id: 'start-first-agent-trade',
      title: '启动第一笔 Agent 交易',
      description: '回到 AI 对话启动 Agent，交易进入执行通道后会点亮卡库。',
      status: 'ready',
      source: 'card-library',
    })
  }

  if (stats.receipts.pendingExecution > 0) {
    actions.push({
      id: 'wait-execution-layer',
      title: '等待执行回执',
      description: '已有交易进入执行通道，但未验证成功前不会记为真实战绩。',
      status: 'waiting',
      source: 'execution',
    })
  }

  if (stats.completion.verifiedResults === 0) {
    actions.push({
      id: 'complete-first-trade',
      title: '完成首个真实战绩',
      description: '只有 OKX / OnchainOS 与后端验证过的交易成功会进入战绩。',
      status: 'ready',
      source: 'card-library',
    })
  }

  if (actions.length === 0) {
    actions.push({
      id: 'keep-building',
      title: '继续积累高质量交易卡',
      description: '更多交易中和交易成功记录会让会员等级更稳定。',
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
