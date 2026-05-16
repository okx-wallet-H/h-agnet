#!/usr/bin/env node

const assert = require('node:assert/strict')

const { cardRepository } = require('../server/repositories/cardRepository')
const {
  agentAuthorizationPolicyRepository,
} = require('../server/repositories/agentAuthorizationPolicyRepository')
const { executeAgentCommand } = require('../server/agent/agentCommandPipeline')
const { userRepository } = require('../server/repositories/userRepository')
const {
  createCard,
  getCardLibraryStats,
  listCards,
  listConversationCards,
} = require('../server/services/cardsService')
const {
  continueAfterCardConfirmation,
} = require('../server/services/cardConfirmationContinuationService')
const {
  prepareSwapPipeline,
} = require('../server/services/agentExecutionPipelineService')
const {
  verifyTradeResult,
} = require('../server/services/tradeResultVerificationService')
const {
  recordTradeExecutionHandoff,
} = require('../server/services/tradeExecutionHandoffService')

async function main() {
  const conversationBoundary = await smokeConversationBoundary()
  const authorizedBlockedPipeline = await smokeAuthorizedBlockedPipeline()
  const executionHandoff = smokeExecutionHandoff()
  const verificationBoundary = await smokeVerificationBoundary()

  console.log(
    JSON.stringify(
      {
        ok: true,
        authorizedBlockedPipeline,
        conversationBoundary,
        executionHandoff,
        verificationBoundary,
      },
      null,
      2,
    ),
  )
}

async function smokeAuthorizedBlockedPipeline() {
  const user = resetMemoryState()

  agentAuthorizationPolicyRepository.upsertGrant({
    metadata: {
      source: 'smoke-card-logic',
    },
    scope: 'trade-autonomy',
    userId: user.id,
  })

  const result = await executeAgentCommand(
    {
      content: '帮我把 ETH 兑换成 USDC',
    },
    {
      createCard,
      prepareSwap: prepareSwapPipeline,
    },
  )
  const card = result.cards[0]

  assert.equal(card.type, 'trade-confirmation')
  assert.equal(card.status, 'blocked')
  assert.equal(
    card.metadata.agentAuthorization.authorizationStatus,
    'agent-authorized',
  )
  assert.equal(listCards().length, 0)

  return {
    authorizationStatus: card.metadata.agentAuthorization.authorizationStatus,
    cardLibraryCards: listCards().length,
    cardStatus: card.status,
  }
}

async function smokeConversationBoundary() {
  resetMemoryState()

  const quoteReadyParent = createTradeConfirmationCard({
    status: 'confirmed',
    title: 'Quote ready parent',
    metadata: {
      pipeline: {
        intent: {
          chain: 'ethereum',
          fromToken: 'ETH',
          toToken: 'USDC',
        },
        stage: 'quote-ready',
      },
    },
    tags: ['conversation', 'trading', 'quote', 'confirmation'],
  })

  assert.equal(listCards().length, 0)

  const continuation = await continueAfterCardConfirmation(quoteReadyParent)
  assert.equal(continuation.stage, 'intent')
  assert.equal(continuation.cards.length, 1)
  assert.equal(continuation.cards[0].status, 'blocked')
  assert.equal(listCards().length, 0)
  assert.equal(listConversationCards().length, 2)

  return {
    cardLibraryCards: listCards().length,
    conversationCards: listConversationCards().length,
    followupStatus: continuation.cards[0].status,
  }
}

function smokeExecutionHandoff() {
  resetMemoryState()

  const pendingExecutionCard = createTradeConfirmationCard({
    status: 'pending-execution',
    title: 'Prepared trade data',
    metadata: {
      pipeline: {
        intent: {
          chain: 'ethereum',
          fromToken: 'ETH',
          toToken: 'USDC',
        },
        stage: 'prepared',
      },
    },
    tags: ['conversation', 'trading', 'swap-data', 'simulation'],
  })

  assert.deepEqual(
    listCards().map((card) => card.id),
    [pendingExecutionCard.id],
  )

  const handoff = recordTradeExecutionHandoff(pendingExecutionCard.id, {
    chain: 'ethereum',
    provider: 'okx-agent-wallet',
    txHash: '0x1111222233334444555566667777888899990000',
  })

  assert.equal(handoff.status, 'recorded')
  assert.equal(handoff.execution.status, 'broadcasted')
  assert.equal(
    handoff.card.metadata.txHash,
    '0x1111222233334444555566667777888899990000',
  )
  assert.ok(
    handoff.card.tags.includes(
      'tx:0x1111222233334444555566667777888899990000',
    ),
  )

  const repeatedHandoff = recordTradeExecutionHandoff(pendingExecutionCard.id, {
    chain: 'ethereum',
    txHash: '0x1111222233334444555566667777888899990000',
  })
  assert.equal(repeatedHandoff.status, 'already-recorded')

  assert.throws(
    () =>
      recordTradeExecutionHandoff(pendingExecutionCard.id, {
        chain: 'ethereum',
        txHash: '0x9999000088887777666655554444333322221111',
      }),
    (error) => error.code === 'execution-handoff-conflict',
  )

  const successCard = createCard({
    type: 'trade-success',
    status: 'completed',
    source: 'okx-onchainos',
    title: 'Verified trade success',
    summary: 'Verified by provider tracking.',
    metrics: [
      { label: 'Status', value: 'Success', tone: 'success' },
    ],
    metadata: {
      txHash: '0xverified',
    },
    tags: ['conversation', 'trading', 'verified-result'],
  })

  assert.deepEqual(
    listCards().map((card) => card.id),
    [successCard.id, pendingExecutionCard.id],
  )

  const stats = getCardLibraryStats()
  assert.equal(stats.totalCards, 2)
  assert.equal(stats.completedTrades, 1)
  assert.equal(stats.confirmations.pendingExecution, 1)

  return {
    cardLibraryCards: listCards().length,
    completedTrades: stats.completedTrades,
    handoffStatus: handoff.status,
    pendingExecution: stats.confirmations.pendingExecution,
  }
}

async function smokeVerificationBoundary() {
  resetMemoryState()

  const pendingExecutionCard = createTradeConfirmationCard({
    status: 'pending-execution',
    title: 'Prepared trade without tx hash',
    metadata: {
      pipeline: {
        intent: {
          chain: 'ethereum',
          fromToken: 'ETH',
          toToken: 'USDC',
        },
        stage: 'prepared',
      },
    },
    tags: ['conversation', 'trading', 'swap-data', 'simulation'],
  })

  await assert.rejects(
    () => verifyTradeResult(pendingExecutionCard.id, { chain: 'ethereum' }),
    (error) => error.code === 'tx-hash-required',
  )
  assert.equal(listCards().length, 1)

  return {
    cardLibraryCards: listCards().length,
    rejectedMissingTxHash: true,
  }
}

function resetMemoryState() {
  cardRepository.hydrate([])
  agentAuthorizationPolicyRepository.hydrate([])
  userRepository.hydrate([], null)

  const user = userRepository.upsertByEmail('smoke-card-logic@h-wallet.local', {
    displayName: 'Smoke Card Logic',
    status: 'active',
  })
  userRepository.setCurrentUserId(user.id)

  return user
}

function createTradeConfirmationCard(overrides) {
  return createCard({
    type: 'trade-confirmation',
    status: 'draft',
    source: 'ai-agent',
    title: 'Trade confirmation',
    summary: 'Card logic smoke test.',
    metrics: [
      { label: 'Action', value: 'Swap', tone: 'gold' },
    ],
    metadata: {},
    tags: ['conversation', 'trading'],
    ...overrides,
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
