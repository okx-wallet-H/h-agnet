const { cardRepository } = require('../repositories/cardRepository')
const {
  applyAuthorizationGrantFromCard,
} = require('./agentAuthorizationPolicyService')
const { evaluateCardLibraryScore } = require('./scoringRulesService')
const { getCurrentUserId } = require('./userIdentityService')

const cardTypes = new Set([
  'wallet-confirmation',
  'trade-confirmation',
  'trade-success',
  'recharge-success',
  'withdrawal-success',
  'execution-receipt',
  'portfolio-insight',
  'membership-score',
  'side-quest',
  'system-status',
])

const cardStatuses = new Set([
  'draft',
  'agent-authorized',
  'requires-confirmation',
  'confirmed',
  'completed',
  'blocked',
  'archived',
])

const cardSources = new Set([
  'ai-agent',
  'okx-onchainos',
  'wallet-service',
  'trading-service',
  'boost-service',
  'user-action',
])

const metricTones = new Set([
  'default',
  'gold',
  'success',
  'danger',
  'muted',
])

const confirmationCardTypes = new Set([
  'wallet-confirmation',
  'trade-confirmation',
])

const walletActionCardTypes = new Set([
  'wallet-confirmation',
  'recharge-success',
  'withdrawal-success',
])

const successCardTypes = new Set([
  'trade-success',
  'recharge-success',
  'withdrawal-success',
])

function nowIso() {
  return new Date().toISOString()
}

function createHttpError(statusCode, code, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code

  return error
}

function getCardStatusMetric(status) {
  const statusMetricMap = {
    draft: { value: '未授权', tone: 'danger' },
    'agent-authorized': { value: 'Agent 已授权', tone: 'gold' },
    'requires-confirmation': { value: '待授权', tone: 'gold' },
    confirmed: { value: '已授权', tone: 'gold' },
    completed: { value: '已完成', tone: 'success' },
    blocked: { value: '已阻止', tone: 'danger' },
    archived: { value: '已归档', tone: 'muted' },
  }

  return statusMetricMap[status]
}

function updateCardStatus(card, status) {
  card.status = status

  const statusMetric = getCardStatusMetric(status)
  const existingMetric = card.metrics.find(
    (metric) => metric.label === '当前状态',
  )

  if (existingMetric) {
    existingMetric.value = statusMetric.value
    existingMetric.tone = statusMetric.tone
    return
  }

  card.metrics.push({
    label: '当前状态',
    value: statusMetric.value,
    tone: statusMetric.tone,
  })
}

function getMetricValue(card, label, fallback = '待同步') {
  return card.metrics.find((metric) => metric.label === label)?.value ?? fallback
}

function findExecutionReceipt(cardId) {
  return cardRepository.findFirst(
    (card) =>
      card.type === 'execution-receipt' &&
      card.tags.includes(`parent:${cardId}`),
  )
}

function getExecutionReceiptSource(card) {
  if (card.type === 'wallet-confirmation') {
    return 'wallet-service'
  }

  if (card.type === 'trade-confirmation') {
    return 'okx-onchainos'
  }

  if (card.type === 'side-quest') {
    return 'boost-service'
  }

  return card.source
}

function createExecutionReceiptCard(card) {
  const existingReceipt = findExecutionReceipt(card.id)

  if (existingReceipt) {
    return existingReceipt
  }

  const actionLabel = getMetricValue(card, '要做的事', '授权动作')
  const assetLabel = getMetricValue(card, '资产', '')
  const amountLabel = getMetricValue(card, '金额', '')
  const chainLabel = getMetricValue(card, '网络', '')
  const metrics = [
    { label: '回执类型', value: '授权回执', tone: 'gold' },
    { label: '关联动作', value: actionLabel, tone: 'gold' },
    assetLabel ? { label: '资产', value: assetLabel, tone: 'gold' } : null,
    amountLabel ? { label: '金额', value: amountLabel, tone: 'default' } : null,
    chainLabel ? { label: '网络', value: chainLabel, tone: 'muted' } : null,
    { label: '执行状态', value: '未广播', tone: 'danger' },
    { label: '链上哈希', value: '未生成', tone: 'muted' },
    { label: '下一步', value: '等待执行层', tone: 'gold' },
    { label: '当前状态', value: '已授权', tone: 'gold' },
  ].filter(Boolean)

  return createCard({
    type: 'execution-receipt',
    status: 'confirmed',
    source: getExecutionReceiptSource(card),
    userId: card.userId,
    title: `${actionLabel}授权回执`,
    summary: getExecutionReceiptSummary(card),
    metrics,
    tags: [
      'receipt',
      'execution',
      'not-broadcast',
      'card-library',
      `parent:${card.id}`,
    ],
  })
}

function getExecutionReceiptSummary(card) {
  if (card.tags.includes('official-strategy')) {
    return '你的策略授权已经记录。当前版本不会广播链上交易，也不会伪造收益；后续需要 H Skill Wrapper、OKX OnchainOS adapter、风控和执行回执全部完成。'
  }

  if (card.type === 'wallet-confirmation') {
    return '你的钱包动作授权已经记录。当前版本不会广播链上交易，也不会生成真实交易哈希；后续需要 OnchainOS 执行路径、风控和状态回执全部完成。'
  }

  if (card.type === 'trade-confirmation') {
    return '你的交易授权已经记录。当前版本不会广播链上交易，也不会生成真实交易哈希；后续需要 OKX Swap 报价、swap data、风控结果和执行回执。'
  }

  return '你的授权已经记录。当前版本不会广播链上交易，也不会生成真实交易哈希；后续结果必须来自后端验证回执。'
}

function validateString(input, fieldName) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw createHttpError(
      400,
      'bad-request',
      `${fieldName} 必须是非空字符串。`,
    )
  }

  return input.trim()
}

function validateEnum(input, fieldName, allowedValues) {
  const value = validateString(input, fieldName)

  if (!allowedValues.has(value)) {
    throw createHttpError(400, 'bad-request', `${fieldName} 暂不支持。`)
  }

  return value
}

function validateMetrics(input) {
  if (!Array.isArray(input)) {
    return []
  }

  return input.map((metric, index) => {
    if (!metric || typeof metric !== 'object') {
      throw createHttpError(
        400,
        'bad-request',
        `metrics[${index}] 必须是对象。`,
      )
    }

    const nextMetric = {
      label: validateString(metric.label, `metrics[${index}].label`),
      value: validateString(metric.value, `metrics[${index}].value`),
    }

    if (metric.tone !== undefined) {
      nextMetric.tone = validateEnum(
        metric.tone,
        `metrics[${index}].tone`,
        metricTones,
      )
    }

    return nextMetric
  })
}

function validateTags(input) {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
    .map((tag) => tag.trim())
}

function validateMetadata(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  return { ...input }
}

function createCard(input) {
  if (!input || typeof input !== 'object') {
    throw createHttpError(400, 'bad-request', '卡片输入必须是对象。')
  }

  const card = {
    id: `card-${Date.now()}-${cardRepository.list().length + 1}`,
    userId: input.userId ?? getCurrentUserId(),
    type: validateEnum(input.type, 'type', cardTypes),
    status: validateEnum(input.status, 'status', cardStatuses),
    source: validateEnum(input.source, 'source', cardSources),
    title: validateString(input.title, 'title'),
    summary: validateString(input.summary, 'summary'),
    createdAt: nowIso(),
    metrics: validateMetrics(input.metrics),
    metadata: validateMetadata(input.metadata),
    tags: validateTags(input.tags),
  }

  if (typeof input.completedAt === 'string') {
    card.completedAt = input.completedAt
  }

  return cardRepository.insert(card)
}

function listCards() {
  return [...cardRepository.list({ userId: getCurrentUserId() })]
}

function isVerifiedResultCard(card) {
  return card.status === 'completed' && successCardTypes.has(card.type)
}

function getCardLibraryStats() {
  const cards = cardRepository.list({ userId: getCurrentUserId() })
  const activeCards = cards.filter((card) => card.status !== 'archived')
  const archivedCards = cards.filter((card) => card.status === 'archived')
  const latestCard = cards[0]
  const confirmationCards = activeCards.filter(isConfirmationCard)
  const draftCards = activeCards.filter((card) => card.status === 'draft')
  const pendingCards = activeCards.filter(
    (card) => card.status === 'requires-confirmation',
  )
  const confirmedCards = activeCards.filter((card) => card.status === 'confirmed')
  const blockedCards = activeCards.filter((card) => card.status === 'blocked')
  const completedCards = activeCards.filter((card) => card.status === 'completed')
  const walletActionCards = activeCards.filter((card) =>
    walletActionCardTypes.has(card.type),
  )
  const executionReceipts = activeCards.filter(
    (card) => card.type === 'execution-receipt',
  )
  const nonBroadcastReceipts = executionReceipts.filter((card) =>
    card.tags.includes('not-broadcast'),
  )
  const verifiedResults = activeCards.filter(isVerifiedResultCard)
  const portfolioInsights = activeCards.filter(
    (card) => card.type === 'portfolio-insight',
  )
  const membershipCards = activeCards.filter(
    (card) => card.type === 'membership-score',
  )
  const sideQuestCards = activeCards.filter((card) => card.type === 'side-quest')
  const tradeCards = activeCards.filter((card) =>
    ['trade-confirmation', 'trade-success'].includes(card.type),
  )
  const systemCards = activeCards.filter((card) => card.type === 'system-status')
  const stats = {
    totalCards: activeCards.length,
    activeCards: activeCards.length,
    completedTrades: activeCards.filter(
      (card) => card.type === 'trade-success' && card.status === 'completed',
    ).length,
    completedRewards: activeCards.filter(
      (card) => card.type === 'side-quest' && card.status === 'completed',
    ).length,
    pendingConfirmations: pendingCards.length,
    walletActions: walletActionCards.length,
    portfolioInsights: portfolioInsights.length,
    archivedCards: archivedCards.length,
    membershipScore: null,
    latestCardAt: latestCard?.createdAt,
    confirmations: {
      total: confirmationCards.length,
      draft: confirmationCards.filter((card) => card.status === 'draft').length,
      pending: confirmationCards.filter(
        (card) => card.status === 'requires-confirmation',
      ).length,
      confirmed: confirmationCards.filter(
        (card) => card.status === 'confirmed',
      ).length,
      blocked: confirmationCards.filter(
        (card) => card.status === 'blocked',
      ).length,
    },
    receipts: {
      total: executionReceipts.length,
      nonBroadcast: nonBroadcastReceipts.length,
      pendingExecution: nonBroadcastReceipts.length,
      verified: executionReceipts.filter(
        (card) => card.status === 'completed',
      ).length,
    },
    activity: {
      walletActions: walletActionCards.length,
      tradeCards: tradeCards.length,
      boostTasks: sideQuestCards.length,
      portfolioInsights: portfolioInsights.length,
      membershipCards: membershipCards.length,
      systemCards: systemCards.length,
    },
    completion: {
      completedCards: completedCards.length,
      confirmedCards: confirmedCards.length,
      draftCards: draftCards.length,
      blockedCards: blockedCards.length,
      verifiedResults: verifiedResults.length,
    },
  }

  stats.membershipScore =
    activeCards.length > 0 ? evaluateCardLibraryScore(stats).score : null

  return stats
}

function isConfirmationCard(card) {
  return (
    confirmationCardTypes.has(card.type) ||
    card.tags.includes('official-strategy')
  )
}

function archiveCard(cardId) {
  const card = cardRepository.findById(cardId)

  if (!card) {
    return { archived: false }
  }

  updateCardStatus(card, 'archived')

  return { archived: true }
}

function prepareCardForConfirmation(cardId) {
  const card = cardRepository.findById(cardId)

  if (!card) {
    throw createHttpError(404, 'not-found', '卡片不存在。')
  }

  if (card.status === 'archived') {
    throw createHttpError(409, 'invalid-card-state', '已归档卡片不能进入授权队列。')
  }

  if (card.status === 'blocked') {
    throw createHttpError(409, 'invalid-card-state', '已阻止卡片不能进入授权队列。')
  }

  if (card.status === 'completed') {
    throw createHttpError(409, 'invalid-card-state', '已完成卡片不能进入授权队列。')
  }

  if (card.status === 'agent-authorized') {
    throw createHttpError(
      409,
      'invalid-card-state',
      '已授权卡片不需要进入授权队列。',
    )
  }

  if (card.status === 'draft') {
    updateCardStatus(card, 'requires-confirmation')
  }

  return card
}

function confirmCardReview(cardId) {
  const card = cardRepository.findById(cardId)

  if (!card) {
    throw createHttpError(404, 'not-found', '卡片不存在。')
  }

  if (card.status === 'archived') {
    throw createHttpError(409, 'invalid-card-state', '已归档卡片不能授权。')
  }

  if (card.status === 'blocked') {
    throw createHttpError(409, 'invalid-card-state', '已阻止卡片不能授权。')
  }

  if (card.status === 'completed') {
    throw createHttpError(409, 'invalid-card-state', '已完成卡片不能重复授权。')
  }

  if (card.status === 'agent-authorized') {
    throw createHttpError(
      409,
      'invalid-card-state',
      '这张卡已匹配授权范围，不需要再次授权。',
    )
  }

  if (card.metadata?.authorizationStatus === 'identity-required') {
    throw createHttpError(
      409,
      'identity-required',
      '请先完成 H Wallet 登录与 Agent Wallet 绑定，再进行授权。',
    )
  }

  if (card.status === 'confirmed') {
    return {
      authorizationGrant: applyAuthorizationGrantFromCard(card),
      card,
      receiptCard: createExecutionReceiptCard(card),
    }
  }

  if (card.status !== 'requires-confirmation') {
    throw createHttpError(
      409,
      'invalid-card-state',
      '请先生成授权卡，再进行授权。',
    )
  }

  updateCardStatus(card, 'confirmed')

  return {
    authorizationGrant: applyAuthorizationGrantFromCard(card),
    card,
    receiptCard: createExecutionReceiptCard(card),
  }
}

module.exports = {
  archiveCard,
  confirmCardReview,
  createCard,
  getCardLibraryStats,
  listCards,
  prepareCardForConfirmation,
}
