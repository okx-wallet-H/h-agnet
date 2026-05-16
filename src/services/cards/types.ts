export type ConversationCardType =
  | 'wallet-created'
  | 'wallet-confirmation'
  | 'trade-confirmation'
  | 'trade-success'
  | 'recharge-success'
  | 'withdrawal-success'
  | 'execution-receipt'
  | 'portfolio-insight'
  | 'membership-score'
  | 'side-quest'
  | 'system-status'

export type ConversationCardStatus =
  | 'draft'
  | 'agent-authorized'
  | 'requires-confirmation'
  | 'confirmed'
  | 'pending-execution'
  | 'completed'
  | 'blocked'
  | 'archived'

export type CardDataSource =
  | 'ai-agent'
  | 'okx-onchainos'
  | 'wallet-service'
  | 'trading-service'
  | 'boost-service'
  | 'user-action'

export type CardMetric = {
  label: string
  value: string
  tone?: 'default' | 'gold' | 'success' | 'danger' | 'muted'
}

export type ConversationCard = {
  id: string
  userId?: string | null
  type: ConversationCardType
  status: ConversationCardStatus
  source: CardDataSource
  title: string
  summary: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, unknown>
  metrics: CardMetric[]
  tags: string[]
}

export type CardConfirmationResult = {
  authorizationGrant?: {
    id: string
    scope: string
    address?: string | null
    status: string
  } | null
  card: ConversationCard
  receiptCard: ConversationCard
  runnerStatus?: {
    id: string
    status: string
    stateLabel: string
    blockReason?: string
    nextStep?: string
    steps?: Array<Record<string, unknown>>
  } | null
}

export type CardLibraryStats = {
  totalCards: number
  activeCards: number
  completedTrades: number
  completedRewards: number
  pendingConfirmations: number
  walletActions: number
  portfolioInsights: number
  archivedCards: number
  membershipScore: number | null
  latestCardAt?: string
  confirmations: {
    total: number
    draft: number
    pending: number
    confirmed: number
    pendingExecution?: number
    blocked: number
  }
  receipts: {
    total: number
    nonBroadcast: number
    pendingExecution: number
    verified: number
  }
  activity: {
    walletActions: number
    tradeCards: number
    boostTasks: number
    portfolioInsights: number
    membershipCards: number
    systemCards: number
  }
  completion: {
    completedCards: number
    confirmedCards: number
    pendingExecutionCards?: number
    draftCards: number
    blockedCards: number
    verifiedResults: number
  }
}
