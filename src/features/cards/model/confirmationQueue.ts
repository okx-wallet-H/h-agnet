import type { ConversationCard } from '../../../services/cards/types'

export const confirmationQueueStatuses = [
  'draft',
  'requires-confirmation',
  'confirmed',
  'pending-execution',
  'blocked',
] as const

const authorizationCardTypes = new Set<ConversationCard['type']>([
  'wallet-confirmation',
  'trade-confirmation',
])

export function isConfirmationQueueCard(card: ConversationCard) {
  return (
    isAuthorizationFlowCard(card) &&
    confirmationQueueStatuses.includes(
      card.status as (typeof confirmationQueueStatuses)[number],
    )
  )
}

export function isAuthorizationFlowCard(card: ConversationCard) {
  const authorizationStatus = getAuthorizationStatus(card)

  if (authorizationStatus === 'not-required') {
    return false
  }

  return (
    authorizationCardTypes.has(card.type) ||
    card.tags.includes('official-strategy') ||
    authorizationStatus === 'authorization-required' ||
    authorizationStatus === 'identity-required'
  )
}

export function getConfirmationQueueCards(cards: ConversationCard[]) {
  const authorizedScopes = new Set(
    cards
      .filter(isAuthorizedStrategyCard)
      .map(getAuthorizationScope)
      .filter((scope): scope is string => Boolean(scope)),
  )

  return cards.filter((card) => {
    if (!isConfirmationQueueCard(card)) {
      return false
    }

    if (
      ['draft', 'requires-confirmation'].includes(card.status) &&
      authorizedScopes.has(getAuthorizationScope(card) ?? '')
    ) {
      return false
    }

    return true
  })
}

export function getConfirmationQueueStats(cards: ConversationCard[]) {
  const queueCards = getConfirmationQueueCards(cards)

  return {
    blockedCount: queueCards.filter((card) => card.status === 'blocked').length,
    draftCount: queueCards.filter((card) => card.status === 'draft').length,
    readyCount: queueCards.filter(
      (card) => card.status === 'requires-confirmation',
    ).length,
    totalCount: queueCards.length,
  }
}

export function getCardStatusRank(status: ConversationCard['status']) {
  const ranks: Record<ConversationCard['status'], number> = {
    draft: 1,
    'agent-authorized': 2,
    'requires-confirmation': 3,
    confirmed: 4,
    'pending-execution': 5,
    blocked: 6,
    completed: 7,
    archived: 8,
  }

  return ranks[status]
}

export function getDisplayCardSnapshot(
  serverCard: ConversationCard,
  optimisticCard: ConversationCard | null,
) {
  if (!optimisticCard || optimisticCard.id !== serverCard.id) {
    return serverCard
  }

  if (
    getCardStatusRank(optimisticCard.status) >=
    getCardStatusRank(serverCard.status)
  ) {
    return optimisticCard
  }

  return serverCard
}

function getAuthorizationStatus(card: ConversationCard) {
  const directStatus = readString(card.metadata?.authorizationStatus)

  if (directStatus) {
    return directStatus
  }

  const agentAuthorization = card.metadata?.agentAuthorization

  if (!isRecord(agentAuthorization)) {
    return null
  }

  return readString(agentAuthorization.authorizationStatus)
}

function getAuthorizationScope(card: ConversationCard) {
  const directScope = readString(card.metadata?.authorizationScope)

  if (directScope) {
    return directScope
  }

  const agentAuthorization = card.metadata?.agentAuthorization

  if (!isRecord(agentAuthorization)) {
    return null
  }

  return readString(agentAuthorization.scope)
}

function isAuthorizedStrategyCard(card: ConversationCard) {
  return (
    card.tags.includes('official-strategy') &&
    ['agent-authorized', 'confirmed', 'pending-execution'].includes(card.status) &&
    Boolean(getAuthorizationScope(card))
  )
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getCardActionTitle(status: ConversationCard['status']) {
  if (status === 'draft') {
    return '草案待审阅'
  }

  if (status === 'requires-confirmation') {
    return '等待用户授权'
  }

  if (status === 'agent-authorized') {
    return 'Agent 已授权'
  }

  if (status === 'confirmed') {
    return '已授权，等待执行层'
  }

  if (status === 'pending-execution') {
    return '交易数据已准备'
  }

  if (status === 'blocked') {
    return '执行已阻止'
  }

  return '无需处理'
}

export function getCardActionStatus(status: ConversationCard['status']) {
  if (status === 'draft') {
    return '草案'
  }

  if (status === 'requires-confirmation') {
    return '待授权'
  }

  if (status === 'agent-authorized') {
    return '已授权'
  }

  if (status === 'confirmed') {
    return '已授权'
  }

  if (status === 'pending-execution') {
    return '待执行'
  }

  if (status === 'blocked') {
    return '已阻止'
  }

  return '已处理'
}

export function getCardActionCopy(status: ConversationCard['status']) {
  if (status === 'draft') {
    return '草案只代表意图已被记录。送入授权队列后，仍然不会执行任何链上动作。'
  }

  if (status === 'requires-confirmation') {
    return '卡片已进入授权队列。真实 Swap 需要后端 OKX Swap quote、swap data、风控和交易状态回执。'
  }

  if (status === 'agent-authorized') {
    return '用户已完成一次授权，后续可由 Agent 在授权范围内推进；执行数据仍必须由 OKX Swap 返回。'
  }

  if (status === 'confirmed') {
    return '用户授权已记录，但当前版本没有开放真实执行层。'
  }

  if (status === 'pending-execution') {
    return 'OKX 已返回交易数据，卡片进入待执行状态；仍需签名、广播和回执验证后才算成功。'
  }

  if (status === 'blocked') {
    return '风险或上下文不完整，当前卡片禁止进入执行层。'
  }

  return '这张卡片当前不需要授权动作。'
}
