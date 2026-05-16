const { cardRepository } = require('../repositories/cardRepository')

function recordTradeExecutionHandoff(cardId, input = {}) {
  const card = cardRepository.findById(cardId)

  if (!card) {
    throwHttpError(404, 'not-found', '交易卡不存在。')
  }

  if (card.type !== 'trade-confirmation') {
    throwHttpError(409, 'invalid-card-type', '只有交易过程卡可以接收执行回执。')
  }

  if (card.status !== 'pending-execution') {
    throwHttpError(
      409,
      'invalid-card-state',
      '只有交易中的卡片可以接收执行回执。',
    )
  }

  const handoff = createExecutionHandoff(card, input)
  const existingExecution = readRecord(card.metadata?.execution)
  const existingTxHash = readString(existingExecution?.txHash)

  if (existingTxHash) {
    if (existingTxHash !== handoff.txHash) {
      throwHttpError(
        409,
        'execution-handoff-conflict',
        '该交易卡已经绑定了不同的交易哈希。',
      )
    }

    return {
      card,
      execution: existingExecution,
      status: 'already-recorded',
    }
  }

  card.metadata = {
    ...card.metadata,
    execution: handoff,
    txHash: handoff.txHash,
  }
  card.metrics = mergeExecutionMetrics(card.metrics, handoff)
  card.tags = [
    ...new Set([
      ...card.tags,
      'execution-handoff',
      'broadcasted',
      `tx:${handoff.txHash}`,
    ]),
  ]
  cardRepository.persist(card)

  return {
    card,
    execution: handoff,
    status: 'recorded',
  }
}

function createExecutionHandoff(card, input) {
  const pipelineIntent = readRecord(card.metadata?.pipeline?.intent)
  const chain = readString(input.chain) ?? readString(pipelineIntent?.chain)
  const chainIndex =
    readString(input.chainIndex) ?? readString(pipelineIntent?.chainIndex)
  const txHash = readString(input.txHash)

  if (!chain && !chainIndex) {
    throwHttpError(
      400,
      'chain-required',
      '执行回执需要 chain 或 chainIndex。',
    )
  }

  if (!txHash) {
    throwHttpError(400, 'tx-hash-required', '执行回执需要 txHash。')
  }

  return {
    chain,
    chainIndex,
    executor: readString(input.executor) ?? 'agent-wallet',
    isFromMyProject:
      typeof input.isFromMyProject === 'boolean' ? input.isFromMyProject : true,
    provider: readString(input.provider) ?? 'okx-agent-wallet',
    receivedAt: new Date().toISOString(),
    status: 'broadcasted',
    txHash,
  }
}

function mergeExecutionMetrics(metrics, handoff) {
  const nextMetrics = Array.isArray(metrics) ? [...metrics] : []

  upsertMetric(nextMetrics, {
    label: '执行回执',
    value: '已接收',
    tone: 'gold',
  })
  upsertMetric(nextMetrics, {
    label: '交易哈希',
    value: shortenHash(handoff.txHash),
    tone: 'gold',
  })
  upsertMetric(nextMetrics, {
    label: '链上验证',
    value: '等待 OKX 确认',
    tone: 'gold',
  })

  return nextMetrics
}

function upsertMetric(metrics, nextMetric) {
  const existingIndex = metrics.findIndex(
    (metric) => metric.label === nextMetric.label,
  )

  if (existingIndex >= 0) {
    metrics[existingIndex] = {
      ...metrics[existingIndex],
      ...nextMetric,
    }
    return
  }

  metrics.push(nextMetric)
}

function readRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : {}
}

function readString(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function shortenHash(hash) {
  return hash.length > 12 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash
}

function throwHttpError(statusCode, code, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code

  throw error
}

module.exports = {
  recordTradeExecutionHandoff,
}
