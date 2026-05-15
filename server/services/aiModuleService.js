const { createCard } = require('./cardsService')

let pendingStrategyProposal = null

function createStrategyProposal(input) {
  pendingStrategyProposal = {
    id: `strategy-${Date.now()}`,
    intentType: 'strategy-request',
    summary: input.prompt
      ? '策略请求已记录，等待真实 AI 后端接入。'
      : '策略指令不能为空。',
    confidence: 'low',
  }

  createCard({
    type: 'portfolio-insight',
    status: 'draft',
    source: 'ai-agent',
    title: '策略请求已捕获',
    summary:
      'AI 策略模块已记录用户意图卡片。资产数据和模型执行能力尚未接入。',
    metrics: [
      { label: 'AI 后端', value: '待接入', tone: 'muted' },
      { label: '资产数据', value: '必需', tone: 'gold' },
      { label: '动作', value: '仅审阅', tone: 'gold' },
    ],
    tags: ['agent', 'strategy', 'portfolio'],
  })

  return pendingStrategyProposal
}

function getPendingStrategyProposal() {
  return pendingStrategyProposal
}

module.exports = {
  createStrategyProposal,
  getPendingStrategyProposal,
}
