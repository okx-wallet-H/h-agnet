const { cardRepository } = require('../repositories/cardRepository')
const {
  applyAuthorizationGrantFromCard,
} = require('./agentAuthorizationPolicyService')
const { evaluateCardLibraryScore } = require('./scoringRulesService')
const { getCurrentUserId } = require('./userIdentityService')
const {
  strategySkillRepository,
} = require('../repositories/strategySkillRepository')

const cardTypes = new Set([
  'wallet-created',
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
  'pending-execution',
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

const clientCreatableCardTypes = new Set([
  'portfolio-insight',
  'side-quest',
  'system-status',
])

const cardLibraryTradeInProgressStatuses = new Set([
  'pending-execution',
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
    'pending-execution': { value: '待执行', tone: 'gold' },
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
    cardRepository.persist(card)
    return
  }

  card.metrics.push({
    label: '当前状态',
    value: statusMetric.value,
    tone: statusMetric.tone,
  })
  cardRepository.persist(card)
}

function getMetricValue(card, label, fallback = '待同步') {
  return card.metrics.find((metric) => metric.label === label)?.value ?? fallback
}

function createAgentWalletCreatedCard(session) {
  const walletBindingTag = session.walletBindingId
    ? `wallet-binding:${session.walletBindingId}`
    : null
  const existingCard = walletBindingTag
    ? cardRepository.findFirst(
        (card) =>
          card.type === 'wallet-created' &&
          card.tags.includes(walletBindingTag),
      )
    : null

  if (existingCard) {
    return existingCard
  }

  const primaryAddress = session.evmAddress ?? session.solAddress ?? null

  return createCard({
    type: 'wallet-created',
    status: 'completed',
    source: 'wallet-service',
    userId: session.userId,
    title: 'Agent 钱包创建成功',
    summary:
      '邮箱验证码已通过，OKX Agent Wallet 会话已建立。后续充值、提现、交易和赚币都会通过 H Wallet 卡片继续。',
    completedAt: nowIso(),
    metrics: [
      { label: '登录方式', value: '邮箱验证码', tone: 'gold' },
      { label: '钱包状态', value: '已登录', tone: 'success' },
      {
        label: '账户',
        value: session.accountName ?? session.accountId ?? '等待同步',
        tone: session.accountName || session.accountId ? 'gold' : 'muted',
      },
      {
        label: 'EVM 地址',
        value: shortenAddressMetric(session.evmAddress),
        tone: session.evmAddress ? 'gold' : 'muted',
      },
      {
        label: 'Solana 地址',
        value: shortenAddressMetric(session.solAddress),
        tone: session.solAddress ? 'gold' : 'muted',
      },
      { label: '授权策略', value: '一次授权范围', tone: 'gold' },
      { label: '当前状态', value: '已完成', tone: 'success' },
    ],
    metadata: {
      accountId: session.accountId ?? null,
      accountName: session.accountName ?? null,
      email: session.email,
      evmAddress: session.evmAddress ?? null,
      loginType: session.loginType ?? 'email',
      primaryAddress,
      solAddress: session.solAddress ?? null,
      walletBindingId: session.walletBindingId ?? null,
      walletBindingStatus: session.walletBindingStatus ?? null,
    },
    tags: [
      'wallet',
      'agent-wallet',
      'wallet-created',
      'verified-session',
      walletBindingTag,
      session.accountId ? `account:${session.accountId}` : null,
    ].filter(Boolean),
  })
}

function shortenAddressMetric(address) {
  if (!address) {
    return '等待同步'
  }

  if (address.length <= 18) {
    return address
  }

  return `${address.slice(0, 8)}...${address.slice(-8)}`
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

function createExecutionReceiptCard(card, context = {}) {
  const existingReceipt = findExecutionReceipt(card.id)

  if (existingReceipt) {
    return existingReceipt
  }

  if (isOfficialStrategyCard(card)) {
    return createStrategyRunnerReceiptCard(card, context.runnerStatus)
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
      `parent:${card.id}`,
    ],
  })
}

function createStrategyRunnerReceiptCard(card, runnerStatus) {
  const actionLabel = getMetricValue(card, '要做的事', '启动赚币 Agent')
  const strategyName =
    getMetadataString(card, 'strategyName') ??
    card.title.replace(/\s*启动草案$/, '')
  const runId = getMetadataString(card, 'runId')
  const blockedPlanCount = getMetadataNumber(card, 'blockedPlanCount')
  const readyPlanCount = getMetadataNumber(card, 'readyPlanCount')
  const planTotal =
    runnerStatus?.executionPlan?.length ??
    (blockedPlanCount !== undefined && readyPlanCount !== undefined
      ? blockedPlanCount + readyPlanCount
      : undefined)
  const planReady =
    runnerStatus?.executionPlan?.filter((step) => step.status === 'ready')
      .length ?? readyPlanCount
  const nextStep =
    runnerStatus?.nextStep ?? '等待 H Skill Runner 接入真实执行回执。'
  const blockReason =
    runnerStatus?.blockReason ?? '当前阶段不会执行真实链上操作。'

  return createCard({
    type: 'execution-receipt',
    status: 'confirmed',
    source: getExecutionReceiptSource(card),
    userId: card.userId,
    title: `${strategyName} Runner 状态`,
    summary:
      '策略授权已经记录。Agent 已进入 Runner 状态检查；当前不会广播链上交易，也不会伪造收益。',
    metrics: [
      { label: '回执类型', value: 'Agent 启动回执', tone: 'gold' },
      { label: '关联动作', value: actionLabel, tone: 'gold' },
      { label: 'Agent 状态', value: runnerStatus?.stateLabel ?? '已授权', tone: 'gold' },
      {
        label: 'H Skill',
        value:
          planTotal && planReady !== undefined
            ? `${planReady}/${planTotal} 就绪`
            : '等待检查',
        tone: planTotal === planReady ? 'gold' : 'muted',
      },
      { label: '暂停原因', value: blockReason, tone: 'muted' },
      { label: '执行状态', value: '未广播', tone: 'danger' },
      { label: '链上哈希', value: '未生成', tone: 'muted' },
      { label: '下一步', value: nextStep, tone: 'gold' },
      { label: '当前状态', value: '已授权', tone: 'gold' },
    ],
    metadata: {
      runnerStatus: runnerStatus
        ? {
            blockReason: runnerStatus.blockReason ?? null,
            nextStep: runnerStatus.nextStep,
            runId: runnerStatus.id,
            state: runnerStatus.status,
            stateLabel: runnerStatus.stateLabel,
            steps: runnerStatus.steps,
          }
        : null,
      strategyId: getMetadataString(card, 'strategyId') ?? null,
      strategyName,
      strategyVersion: getMetadataString(card, 'strategyVersion') ?? null,
    },
    tags: [
      'receipt',
      'execution',
      'not-broadcast',
      'agent',
      'earning-agent',
      'runner-status',
      runId ? `run:${runId}` : null,
      `parent:${card.id}`,
    ].filter(Boolean),
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

function syncStrategyRunAfterAuthorization(card, authorizationGrant) {
  if (!isOfficialStrategyCard(card)) {
    return null
  }

  const runId = getMetadataString(card, 'runId')

  if (!runId) {
    return null
  }

  const run = strategySkillRepository.findRunById(runId)

  if (!run) {
    return null
  }

  const blockedStep = run.executionPlan.find((step) => step.status === 'blocked')
  const nextStatus = blockedStep ? 'blocked' : 'planning'
  const nextStateLabel = blockedStep ? '已暂停' : '已授权'
  const blockReason = blockedStep
    ? `等待 ${blockedStep.stage} 的真实 OKX / OnchainOS adapter。`
    : '真实执行回执链路尚未开放。'
  const nextStep = blockedStep
    ? `优先接入 ${blockedStep.wrapperId}。`
    : '等待 H Skill Runner 接入真实执行回执。'

  return strategySkillRepository.updateRun(runId, (currentRun) => ({
    ...currentRun,
    authorization: {
      ...currentRun.authorization,
      authorizationGrantId:
        authorizationGrant?.id ??
        currentRun.authorization.authorizationGrantId ??
        null,
      authorizationStatus: 'agent-authorized',
      executionMode: 'agent-authorized-pending-adapter',
      policyReason: '策略授权已记录。',
      requiredUserAuthorization: false,
      safetyGate: 'agent-policy-authorized',
    },
    blockReason,
    nextStep,
    stateLabel: nextStateLabel,
    status: nextStatus,
    steps: currentRun.steps.map((step) => {
      if (step.id === 'waiting-authorization') {
        return {
          ...step,
          detail: '策略授权已记录。',
          status: 'done',
        }
      }

      if (step.id === 'executing') {
        return {
          ...step,
          detail: blockReason,
          status: blockedStep ? 'blocked' : 'waiting',
        }
      }

      return step
    }),
    updatedAt: nowIso(),
  }))
}

function isOfficialStrategyCard(card) {
  return (
    card.type === 'system-status' &&
    card.tags.includes('official-strategy') &&
    typeof card.metadata?.authorizationScope === 'string'
  )
}

function getMetadataString(card, key) {
  const value = card.metadata?.[key]

  return typeof value === 'string' && value.trim().length > 0
    ? value
    : null
}

function getMetadataNumber(card, key) {
  const value = card.metadata?.[key]

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
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

function createClientConversationCard(input) {
  if (!input || typeof input !== 'object') {
    throw createHttpError(400, 'bad-request', '卡片输入必须是对象。')
  }

  if (!clientCreatableCardTypes.has(input.type)) {
    throw createHttpError(
      403,
      'client-card-type-forbidden',
      '普通客户端只能创建非证明类草稿记录卡。',
    )
  }

  if (input.status !== 'draft') {
    throw createHttpError(
      403,
      'client-card-status-forbidden',
      '普通客户端只能创建草稿状态的记录卡。',
    )
  }

  if (input.source !== 'user-action') {
    throw createHttpError(
      403,
      'client-card-source-forbidden',
      '普通客户端不能声明后端服务或 OKX 来源。',
    )
  }

  return createCard({
    type: input.type,
    status: 'draft',
    source: 'user-action',
    title: input.title,
    summary: input.summary,
    metrics: input.metrics,
    metadata: input.metadata,
    tags: input.tags,
  })
}

function listCards() {
  return cardRepository
    .list({ userId: getCurrentUserId() })
    .filter(isCardLibraryCard)
}

function listConversationCards() {
  return [...cardRepository.list({ userId: getCurrentUserId() })]
}

function isVerifiedResultCard(card) {
  return card.type === 'trade-success' && card.status === 'completed'
}

function isTradingInProgressCard(card) {
  return (
    card.type === 'trade-confirmation' &&
    cardLibraryTradeInProgressStatuses.has(card.status)
  )
}

function isCardLibraryCard(card) {
  return (
    card.status !== 'archived' &&
    (isTradingInProgressCard(card) || isVerifiedResultCard(card))
  )
}

function getCardLibraryStats() {
  const allCards = cardRepository.list({ userId: getCurrentUserId() })
  const libraryCards = allCards.filter(isCardLibraryCard)
  const archivedCards = allCards.filter(
    (card) =>
      card.status === 'archived' &&
      ['trade-confirmation', 'trade-success'].includes(card.type),
  )
  const latestCard = libraryCards[0]
  const confirmationCards = libraryCards.filter(
    (card) => card.type === 'trade-confirmation',
  )
  const confirmedCards = confirmationCards.filter(
    (card) => card.status === 'confirmed',
  )
  const pendingExecutionCards = confirmationCards.filter(
    (card) => card.status === 'pending-execution',
  )
  const agentAuthorizedCards = confirmationCards.filter(
    (card) => card.status === 'agent-authorized',
  )
  const verifiedResults = libraryCards.filter(isVerifiedResultCard)
  const stats = {
    totalCards: libraryCards.length,
    activeCards: libraryCards.length,
    completedTrades: verifiedResults.length,
    completedRewards: 0,
    pendingConfirmations: 0,
    walletActions: 0,
    portfolioInsights: 0,
    archivedCards: archivedCards.length,
    membershipScore: null,
    latestCardAt: latestCard?.createdAt,
    confirmations: {
      total: confirmationCards.length,
      draft: 0,
      pending: 0,
      confirmed: confirmedCards.length + agentAuthorizedCards.length,
      pendingExecution: pendingExecutionCards.length,
      blocked: 0,
    },
    receipts: {
      total: 0,
      nonBroadcast: 0,
      pendingExecution: pendingExecutionCards.length,
      verified: verifiedResults.length,
    },
    activity: {
      walletActions: 0,
      tradeCards: libraryCards.length,
      boostTasks: 0,
      portfolioInsights: 0,
      membershipCards: 0,
      systemCards: 0,
    },
    completion: {
      completedCards: verifiedResults.length,
      confirmedCards: confirmedCards.length + agentAuthorizedCards.length,
      pendingExecutionCards: pendingExecutionCards.length,
      draftCards: 0,
      blockedCards: 0,
      verifiedResults: verifiedResults.length,
    },
  }

  stats.membershipScore =
    libraryCards.length > 0 ? evaluateCardLibraryScore(stats).score : null

  return stats
}

function isConfirmationCard(card) {
  return (
    confirmationCardTypes.has(card.type) ||
    card.tags.includes('official-strategy') ||
    isAuthorizationRequired(card)
  )
}

function isAuthorizationFlowCard(card) {
  if (getAuthorizationStatus(card) === 'not-required') {
    return false
  }

  return (
    confirmationCardTypes.has(card.type) ||
    card.tags.includes('official-strategy') ||
    isAuthorizationRequired(card)
  )
}

function isAuthorizationRequired(card) {
  return ['authorization-required', 'identity-required'].includes(
    getAuthorizationStatus(card),
  )
}

function getAuthorizationStatus(card) {
  return (
    readString(card.metadata?.authorizationStatus) ??
    readString(card.metadata?.agentAuthorization?.authorizationStatus) ??
    null
  )
}

function readString(value) {
  return typeof value === 'string' ? value : null
}

function archiveCard(cardId) {
  const card = cardRepository.findById(cardId)

  if (!card || !isCurrentUserCard(card)) {
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
  assertCurrentUserCard(card)

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

  if (!isAuthorizationFlowCard(card)) {
    throw createHttpError(
      409,
      'authorization-not-required',
      '这张卡只是记录信息，不需要授权。',
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
  assertCurrentUserCard(card)

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

  if (!isAuthorizationFlowCard(card)) {
    throw createHttpError(
      409,
      'authorization-not-required',
      '这张卡只是记录信息，不需要授权。',
    )
  }

  if (card.status === 'confirmed') {
    return createConfirmationResult(card)
  }

  if (card.status !== 'requires-confirmation') {
    throw createHttpError(
      409,
      'invalid-card-state',
      '请先生成授权卡，再进行授权。',
    )
  }

  updateCardStatus(card, 'confirmed')

  return createConfirmationResult(card)
}

function assertCurrentUserCard(card) {
  if (isCurrentUserCard(card)) {
    return
  }

  throw createHttpError(404, 'not-found', '卡片不存在。')
}

function isCurrentUserCard(card) {
  const currentUserId = getCurrentUserId()

  if (!card.userId) {
    return true
  }

  return Boolean(currentUserId) && card.userId === currentUserId
}

function createConfirmationResult(card) {
  const authorizationGrant = applyAuthorizationGrantFromCard(card)
  const runnerStatus = syncStrategyRunAfterAuthorization(card, authorizationGrant)
  syncRelatedStrategyCardsAfterAuthorization(card, authorizationGrant)

  return {
    authorizationGrant,
    card,
    receiptCard: createExecutionReceiptCard(card, { runnerStatus }),
    runnerStatus,
  }
}

function syncRelatedStrategyCardsAfterAuthorization(card, authorizationGrant) {
  if (!isOfficialStrategyCard(card) || !authorizationGrant || !card.userId) {
    return
  }

  const authorizationScope = getMetadataString(card, 'authorizationScope')

  if (!authorizationScope) {
    return
  }

  cardRepository
    .list({ userId: card.userId })
    .filter(
      (candidate) =>
        candidate.id !== card.id &&
        isOfficialStrategyCard(candidate) &&
        getMetadataString(candidate, 'authorizationScope') ===
          authorizationScope &&
        ['draft', 'requires-confirmation'].includes(candidate.status),
    )
    .forEach((candidate) => {
      const agentAuthorization =
        candidate.metadata?.agentAuthorization &&
        typeof candidate.metadata.agentAuthorization === 'object' &&
        !Array.isArray(candidate.metadata.agentAuthorization)
          ? candidate.metadata.agentAuthorization
          : {}

      candidate.metadata = {
        ...candidate.metadata,
        agentAuthorization: {
          ...agentAuthorization,
          authorizationGrantId: authorizationGrant.id,
          authorizationStatus: 'agent-authorized',
          policyReason: '该官方赚币策略已完成授权，可进入 Agent 自主执行通道。',
          scope: authorizationScope,
        },
        authorizationStatus: 'agent-authorized',
      }
      updateCardStatus(candidate, 'agent-authorized')
    })
}

module.exports = {
  archiveCard,
  confirmCardReview,
  createAgentWalletCreatedCard,
  createCard,
  createClientConversationCard,
  getCardLibraryStats,
  listConversationCards,
  listCards,
  prepareCardForConfirmation,
}
