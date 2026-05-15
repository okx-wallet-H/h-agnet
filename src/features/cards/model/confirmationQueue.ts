import type { ConversationCard } from '../../../services/cards/types'

export const confirmationQueueStatuses = [
  'draft',
  'requires-confirmation',
  'confirmed',
  'blocked',
] as const

export function isConfirmationQueueCard(card: ConversationCard) {
  return confirmationQueueStatuses.includes(
    card.status as (typeof confirmationQueueStatuses)[number],
  )
}

export function getConfirmationQueueCards(cards: ConversationCard[]) {
  return cards.filter(isConfirmationQueueCard)
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
    blocked: 5,
    completed: 6,
    archived: 7,
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

  if (status === 'blocked') {
    return '风险或上下文不完整，当前卡片禁止进入执行层。'
  }

  return '这张卡片当前不需要授权动作。'
}
