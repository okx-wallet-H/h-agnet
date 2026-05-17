const { cardRepository } = require('../repositories/cardRepository')
const { createCard } = require('./cardsService')
const { invokeHSkill } = require('./hSkillRuntimeService')
const { getCurrentUserId } = require('./userIdentityService')

async function verifyTradeResult(cardId, input = {}) {
  const card = cardRepository.findById(cardId)

  if (!card) {
    throwHttpError(404, 'not-found', '交易卡不存在。')
  }
  assertCurrentUserCard(card)

  if (card.type !== 'trade-confirmation') {
    throwHttpError(409, 'invalid-card-type', '只有交易过程卡可以验证结果。')
  }

  if (card.status !== 'pending-execution') {
    throwHttpError(
      409,
      'invalid-card-state',
      '只有交易中的卡片可以验证链上结果。',
    )
  }

  const trackingInput = createTrackingInput(card, input)
  const existingSuccessCard = findExistingSuccessCard(card, trackingInput.txHash)

  if (existingSuccessCard) {
    return {
      card,
      status: 'success',
      successCard: existingSuccessCard,
      tracking: null,
    }
  }

  const tracking = await invokeHSkill({
    input: trackingInput,
    wrapperId: 'H.skill.gateway.trackOrder',
  })
  const trackingStatus = normalizeStatus(tracking.invocation.result.data?.status)

  if (!tracking.invocation.result.ok) {
    return {
      card,
      status: 'unverified',
      successCard: null,
      tracking: tracking.invocation,
    }
  }

  if (trackingStatus === 'success') {
    const successCard = createTradeSuccessCard({
      card,
      tracking: tracking.invocation,
      trackingInput,
    })
    markParentCompleted(card, trackingInput.txHash)

    return {
      card,
      status: 'success',
      successCard,
      tracking: tracking.invocation,
    }
  }

  if (trackingStatus === 'fail') {
    markParentBlocked(card, trackingInput.txHash)
  }

  return {
    card,
    status: trackingStatus || 'pending',
    successCard: null,
    tracking: tracking.invocation,
  }
}

function assertCurrentUserCard(card) {
  const currentUserId = getCurrentUserId()

  if (!card.userId || (currentUserId && card.userId === currentUserId)) {
    return
  }

  throwHttpError(404, 'not-found', '交易卡不存在。')
}

function createTrackingInput(card, input) {
  const pipelineIntent = isRecord(card.metadata?.pipeline?.intent)
    ? card.metadata.pipeline.intent
    : {}
  const execution = isRecord(card.metadata?.execution)
    ? card.metadata.execution
    : {}
  const chain =
    readString(input.chain) ??
    readString(execution.chain) ??
    readString(pipelineIntent.chain)
  const chainIndex =
    readString(input.chainIndex) ??
    readString(execution.chainIndex) ??
    readString(pipelineIntent.chainIndex)
  const txHash =
    readString(input.txHash) ??
    readString(execution.txHash) ??
    readString(card.metadata?.txHash)

  if (!chain && !chainIndex) {
    throwHttpError(400, 'chain-required', '验证交易结果需要 chain 或 chainIndex。')
  }

  if (!txHash) {
    throwHttpError(400, 'tx-hash-required', '验证交易结果需要 txHash。')
  }

  return {
    chain,
    chainIndex,
    isFromMyProject:
      typeof input.isFromMyProject === 'boolean'
        ? input.isFromMyProject
        : typeof execution.isFromMyProject === 'boolean'
          ? execution.isFromMyProject
          : true,
    txHash,
  }
}

function findExistingSuccessCard(card, txHash) {
  return cardRepository.findFirst(
    (candidate) =>
      isSameCardOwner(candidate, card) &&
      candidate.type === 'trade-success' &&
      candidate.status === 'completed' &&
      (candidate.tags.includes(`parent:${card.id}`) ||
        candidate.tags.includes(`tx:${txHash}`)),
  )
}

function isSameCardOwner(candidate, parentCard) {
  if (parentCard.userId) {
    return candidate.userId === parentCard.userId
  }

  const currentUserId = getCurrentUserId()

  if (currentUserId) {
    return !candidate.userId || candidate.userId === currentUserId
  }

  return !candidate.userId
}

function createTradeSuccessCard({ card, tracking, trackingInput }) {
  const intent = isRecord(card.metadata?.pipeline?.intent)
    ? card.metadata.pipeline.intent
    : {}

  return createCard({
    type: 'trade-success',
    status: 'completed',
    source: 'okx-onchainos',
    userId: card.userId ?? getCurrentUserId(),
    title: '交易成功',
    summary:
      'OKX DEX History 已验证这笔交易成功。H Wallet 已把结果写入交易卡库。',
    completedAt: new Date().toISOString(),
    metrics: [
      { label: '验证来源', value: 'OKX DEX History', tone: 'gold' },
      { label: '网络', value: trackingInput.chain ?? trackingInput.chainIndex, tone: 'gold' },
      { label: '交易哈希', value: shortenHash(trackingInput.txHash), tone: 'gold' },
      {
        label: '卖出',
        value: formatIntentSide(intent.amount, intent.fromToken),
        tone: 'default',
      },
      { label: '买入', value: readString(intent.toToken) ?? '已成交资产', tone: 'default' },
      { label: '当前状态', value: '交易成功', tone: 'success' },
    ],
    metadata: {
      parentConfirmationCardId: card.id,
      pipeline: card.metadata?.pipeline ?? null,
      trackingInvocationId: tracking.id,
      trackingStatus: tracking.result.data?.status ?? null,
      txHash: trackingInput.txHash,
    },
    tags: [
      'trade',
      'trade-success',
      'verified-result',
      'okx-dex-history',
      `parent:${card.id}`,
      `tx:${trackingInput.txHash}`,
    ],
  })
}

function markParentCompleted(card, txHash) {
  card.status = 'completed'
  card.metadata = {
    ...card.metadata,
    txHash,
    verificationStatus: 'success',
  }
  upsertMetric(card, {
    label: '当前状态',
    value: '交易成功',
    tone: 'success',
  })
  cardRepository.persist(card)
}

function markParentBlocked(card, txHash) {
  card.status = 'blocked'
  card.metadata = {
    ...card.metadata,
    txHash,
    verificationStatus: 'fail',
  }
  upsertMetric(card, {
    label: '当前状态',
    value: '交易失败',
    tone: 'danger',
  })
  cardRepository.persist(card)
}

function upsertMetric(card, nextMetric) {
  const existingMetric = card.metrics.find(
    (metric) => metric.label === nextMetric.label,
  )

  if (existingMetric) {
    existingMetric.value = nextMetric.value
    existingMetric.tone = nextMetric.tone
    return
  }

  card.metrics.push(nextMetric)
}

function normalizeStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase()

  if (normalized === 'success') {
    return 'success'
  }

  if (normalized === 'fail' || normalized === 'failed') {
    return 'fail'
  }

  if (normalized === 'pending') {
    return 'pending'
  }

  return normalized || 'unknown'
}

function formatIntentSide(amount, token) {
  const normalizedAmount = readString(amount)
  const normalizedToken = readString(token)

  if (normalizedAmount && normalizedToken) {
    return `${normalizedAmount} ${normalizedToken}`
  }

  return normalizedToken ?? normalizedAmount ?? '已成交资产'
}

function shortenHash(hash) {
  return hash.length > 18 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash
}

function readString(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function throwHttpError(statusCode, code, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code

  throw error
}

module.exports = {
  verifyTradeResult,
}
