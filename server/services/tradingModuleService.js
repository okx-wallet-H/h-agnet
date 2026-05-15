const { createCard } = require('./cardsService')

let pendingProposal = null

function createTradeProposal(input) {
  pendingProposal = {
    id: `proposal-${Date.now()}`,
    side: 'swap',
    fromSymbol: '--',
    toSymbol: '--',
    amount: '--',
    estimatedOutput: '--',
    routeLabel: input.intent ? '等待 OKX Swap 返回路线' : '未选择路线',
    networkFee: '等待 OKX Swap 估算',
    slippageTolerance: '未设置',
    status: 'draft',
  }

  createCard({
    type: 'trade-confirmation',
    status: 'draft',
    source: 'okx-onchainos',
    title: 'OKX Swap 意图已捕获',
    summary:
      'H Wallet 已根据用户意图创建草案卡片。真实报价、路线聚合、swap data 和交易状态必须来自 OKX Swap。',
    metrics: [
      { label: 'OKX Quote', value: '待请求', tone: 'gold' },
      { label: 'OKX Swap Data', value: '待生成', tone: 'gold' },
      { label: '执行', value: '已阻止', tone: 'danger' },
      { label: '授权', value: '首次必需', tone: 'gold' },
    ],
    tags: ['trading', 'draft', 'confirmation'],
  })

  return pendingProposal
}

function getPendingTradeProposal() {
  return pendingProposal
}

module.exports = {
  createTradeProposal,
  getPendingTradeProposal,
}
