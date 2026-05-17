#!/usr/bin/env node

const assert = require('node:assert/strict')

const { cardRepository } = require('../server/repositories/cardRepository')
const {
  agentAuthorizationPolicyRepository,
} = require('../server/repositories/agentAuthorizationPolicyRepository')
const {
  agentConversationRepository,
} = require('../server/repositories/agentConversationRepository')
const {
  strategySkillRepository,
} = require('../server/repositories/strategySkillRepository')
const { executeAgentCommand } = require('../server/agent/agentCommandPipeline')
const { userRepository } = require('../server/repositories/userRepository')
const {
  archiveCard,
  confirmCardReview,
  createCard,
  createClientConversationCard,
  getCardLibraryStats,
  listCards,
  listConversationCards,
  prepareCardForConfirmation,
} = require('../server/services/cardsService')
const {
  attachCardToConversationTurn,
  listAgentConversationMessages,
  listAgentConversationTurns,
  sendAgentConversationMessage,
} = require('../server/services/agentConversationService')
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
const {
  getHSkillRuntimeStatus,
} = require('../server/services/hSkillRuntimeService')
const { requireExecutionRequest } = require('../server/http/executionAuth')
const {
  getGrowthSummary,
  listSideQuests,
} = require('../server/services/boostModuleService')
const {
  getAgentRunnerStatus,
  listStrategyRuns,
  runOfficialStrategyPreflight,
  startOfficialStrategySkill,
} = require('../server/services/strategySkillService')

async function main() {
  const conversationBoundary = await smokeConversationBoundary()
  const clientCardBoundary = smokeClientCardBoundary()
  const cardOwnershipBoundary = await smokeCardOwnershipBoundary()
  const anonymousReadBoundary = await smokeAnonymousReadBoundary()
  const conversationOwnershipBoundary = await smokeConversationOwnershipBoundary()
  const conversationTurnLinking = await smokeConversationTurnLinking()
  const authorizedBlockedPipeline = await smokeAuthorizedBlockedPipeline()
  const executionHandoff = smokeExecutionHandoff()
  const verificationBoundary = await smokeVerificationBoundary()
  const verificationOwnershipBoundary = await smokeVerificationOwnershipBoundary()
  const hSkillRuntimeBoundary = smokeHSkillRuntimeBoundary()
  const executionAuthBoundary = smokeExecutionAuthBoundary()
  const cardLibraryGrowthBoundary = await smokeCardLibraryGrowthBoundary()
  const strategyRunOwnershipBoundary = await smokeStrategyRunOwnershipBoundary()

  console.log(
    JSON.stringify(
      {
        ok: true,
        authorizedBlockedPipeline,
        anonymousReadBoundary,
        cardOwnershipBoundary,
        cardLibraryGrowthBoundary,
        clientCardBoundary,
        conversationBoundary,
        conversationOwnershipBoundary,
        conversationTurnLinking,
        executionAuthBoundary,
        executionHandoff,
        hSkillRuntimeBoundary,
        strategyRunOwnershipBoundary,
        verificationBoundary,
        verificationOwnershipBoundary,
      },
      null,
      2,
    ),
  )
}

async function smokeAnonymousReadBoundary() {
  resetMemoryState()

  createCard({
    type: 'trade-confirmation',
    status: 'pending-execution',
    source: 'ai-agent',
    title: '登录用户交易卡',
    summary: '未登录状态不能读到这张卡。',
    metrics: [{ label: '状态', value: '交易中', tone: 'gold' }],
    metadata: {},
    tags: ['conversation', 'trading'],
  })
  await sendAgentConversationMessage({
    content: '登录用户的一条对话。',
  })

  userRepository.hydrate([], null)

  assert.equal(listCards().length, 0)
  assert.equal(listConversationCards().length, 0)
  assert.equal(getCardLibraryStats().totalCards, 0)
  assert.equal(listAgentConversationTurns().length, 0)
  assert.equal(listAgentConversationMessages().length, 0)

  return {
    anonymousCards: listCards().length,
    anonymousConversationTurns: listAgentConversationTurns().length,
  }
}

async function smokeCardOwnershipBoundary() {
  const owner = resetMemoryState()
  const ownedCard = createCard({
    type: 'system-status',
    status: 'draft',
    source: 'ai-agent',
    title: '本人卡片',
    summary: '本人可以归档自己的卡片。',
    metrics: [{ label: '资产影响', value: '无', tone: 'gold' }],
    metadata: {},
    tags: ['conversation', 'system', 'ownership'],
  })
  const otherCard = createCard({
    type: 'trade-confirmation',
    status: 'pending-execution',
    source: 'ai-agent',
    title: '他人交易卡',
    summary: '不能验证不属于当前用户的交易卡。',
    metrics: [{ label: '状态', value: '交易中', tone: 'gold' }],
    metadata: {
      txHash: '0x1111222233334444555566667777888899990000',
      pipeline: {
        intent: {
          chain: 'ethereum',
        },
        stage: 'prepared',
      },
    },
    tags: ['conversation', 'trading'],
  })

  otherCard.userId = 'user-other'
  cardRepository.persist(otherCard)

  assert.deepEqual(archiveCard(otherCard.id), { archived: false })
  await assert.rejects(
    () => verifyTradeResult(otherCard.id, { chain: 'ethereum' }),
    (error) => error.code === 'not-found',
  )
  assert.equal(ownedCard.userId, owner.id)
  assert.deepEqual(archiveCard(ownedCard.id), { archived: true })

  return {
    blockedCrossUserArchive: true,
    blockedCrossUserVerify: true,
    currentUserId: owner.id,
  }
}

async function smokeConversationOwnershipBoundary() {
  const firstUser = resetMemoryState()

  const firstTurn = await sendAgentConversationMessage({
    content: '第一位用户的记录。',
  })

  const secondUser = userRepository.upsertByEmail('smoke-second@h-wallet.local', {
    displayName: 'Smoke Second User',
    status: 'active',
  })
  userRepository.setCurrentUserId(secondUser.id)

  await sendAgentConversationMessage({
    content: '第二位用户的记录。',
  })
  const secondUserCard = createCard({
    type: 'portfolio-insight',
    status: 'draft',
    source: 'ai-agent',
    title: '第二位用户的组合卡',
    summary: '这张卡不能挂进第一位用户的对话。',
    metrics: [{ label: '资产影响', value: '无', tone: 'gold' }],
    metadata: {},
    tags: ['conversation', 'portfolio', 'ownership'],
  })

  attachCardToConversationTurn(firstTurn.cards[0].id, secondUserCard)

  assert.equal(listAgentConversationTurns().length, 1)
  assert.equal(listAgentConversationMessages().length, 2)
  assert.equal(
    listAgentConversationTurns()[0].userMessage.content,
    '第二位用户的记录。',
  )

  userRepository.setCurrentUserId(firstUser.id)

  assert.equal(listAgentConversationTurns().length, 1)
  assert.equal(listAgentConversationMessages().length, 2)
  assert.equal(listAgentConversationTurns()[0].cards.length, 1)
  assert.equal(
    listAgentConversationTurns()[0].userMessage.content,
    '第一位用户的记录。',
  )

  return {
    blockedCrossUserCardAttach: true,
    firstUserTurns: 1,
    secondUserTurns: 1,
  }
}

function smokeClientCardBoundary() {
  resetMemoryState()

  const noteCard = createClientConversationCard({
    completedAt: '2099-01-01T00:00:00.000Z',
    type: 'system-status',
    status: 'draft',
    source: 'user-action',
    title: '客户端草稿记录',
    summary: '普通客户端只能创建非证明类草稿记录。',
    metrics: [{ label: '资产影响', value: '无', tone: 'gold' }],
    metadata: {},
    tags: ['conversation', 'system', 'client-note'],
    userId: 'user-attacker',
  })

  assert.equal(noteCard.status, 'draft')
  assert.equal(noteCard.userId !== 'user-attacker', true)
  assert.equal(noteCard.completedAt, undefined)
  assert.equal(listCards().length, 0)

  assert.throws(
    () =>
      createClientConversationCard({
        type: 'trade-success',
        status: 'completed',
        source: 'okx-onchainos',
        title: '伪造交易成功',
        summary: '普通客户端不能创建这类证明卡。',
        metrics: [],
        metadata: {},
        tags: ['conversation', 'trading'],
      }),
    (error) => error.code === 'client-card-type-forbidden',
  )

  return {
    clientDraftCreated: true,
    forgedTradeSuccessRejected: true,
    ignoredClientOwnership: true,
    cardLibraryCards: listCards().length,
  }
}

async function smokeConversationTurnLinking() {
  resetMemoryState()

  const turn = await sendAgentConversationMessage({
    content: '先帮我记录一下，今晚不要执行任何交易。',
  })
  const parentCard = turn.cards[0]
  const receiptCard = createCard({
    type: 'execution-receipt',
    status: 'completed',
    source: 'ai-agent',
    title: '记录回执',
    summary: '这只是服务层关联烟测，不代表链上执行。',
    metrics: [{ label: '资产影响', value: '无', tone: 'gold' }],
    metadata: {},
    tags: ['conversation', 'receipt', 'smoke-test'],
  })

  attachCardToConversationTurn(parentCard.id, receiptCard)
  archiveCard(parentCard.id)

  const turns = listAgentConversationTurns()
  const hydratedTurn = turns.find((item) => item.id === turn.id)

  assert.equal(turns.length, 1)
  assert.equal(hydratedTurn.cards.length, 2)
  assert.equal(hydratedTurn.cards[0].status, 'archived')
  assert.equal(hydratedTurn.cards[1].id, receiptCard.id)
  assert.equal(listCards().length, 0)

  return {
    attachedCards: hydratedTurn.cards.length,
    cardLibraryCards: listCards().length,
    parentStatus: hydratedTurn.cards[0].status,
  }
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

async function smokeVerificationOwnershipBoundary() {
  const owner = resetMemoryState()
  const turn = await sendAgentConversationMessage({
    content: '记录这笔交易后续结果',
  })
  const parentConversationCard = turn.cards[0]
  const pendingExecutionCard = createTradeConfirmationCard({
    status: 'pending-execution',
    title: 'Prepared trade with existing success',
    metadata: {
      pipeline: {
        intent: {
          chain: 'ethereum',
          fromToken: 'ETH',
          toToken: 'USDC',
        },
        stage: 'prepared',
      },
      txHash: '0x111122223333444455556666777788889999abcd',
    },
    tags: ['conversation', 'trading', 'swap-data', 'simulation'],
  })
  attachCardToConversationTurn(parentConversationCard.id, pendingExecutionCard)

  const ownerSuccessCard = createCard({
    type: 'trade-success',
    status: 'completed',
    source: 'okx-onchainos',
    title: 'Owner verified trade success',
    summary: 'Owner verified by provider tracking.',
    metrics: [{ label: 'Status', value: 'Success', tone: 'success' }],
    metadata: {
      txHash: '0x111122223333444455556666777788889999abcd',
    },
    tags: [
      'conversation',
      'trading',
      'verified-result',
      'tx:0x111122223333444455556666777788889999abcd',
    ],
  })

  const otherUser = userRepository.upsertByEmail('smoke-other@h-wallet.local', {
    displayName: 'Smoke Other User',
    status: 'active',
  })
  userRepository.setCurrentUserId(otherUser.id)
  const otherSuccessCard = createCard({
    type: 'trade-success',
    status: 'completed',
    source: 'okx-onchainos',
    title: 'Other verified trade success',
    summary: 'Other user success with same tx hash must not be reused.',
    metrics: [{ label: 'Status', value: 'Success', tone: 'success' }],
    metadata: {
      txHash: '0x111122223333444455556666777788889999abcd',
    },
    tags: [
      'conversation',
      'trading',
      'verified-result',
      'tx:0x111122223333444455556666777788889999abcd',
    ],
  })

  userRepository.setCurrentUserId(owner.id)

  const result = await verifyTradeResult(pendingExecutionCard.id, {
    chain: 'ethereum',
    txHash: '0x111122223333444455556666777788889999abcd',
  })

  assert.equal(result.status, 'success')
  assert.equal(result.successCard.id, ownerSuccessCard.id)
  assert.equal(result.successCard.userId, owner.id)
  assert.notEqual(result.successCard.id, otherSuccessCard.id)

  const hydratedTurn = listAgentConversationTurns().find(
    (item) => item.id === turn.id,
  )
  assert.ok(
    hydratedTurn.cards.some((card) => card.id === pendingExecutionCard.id),
  )
  assert.ok(hydratedTurn.cards.some((card) => card.id === ownerSuccessCard.id))

  return {
    attachedSuccessCardToConversation: true,
    ignoredCrossUserSuccessCard: true,
    successCardUserId: result.successCard.userId,
  }
}

function smokeHSkillRuntimeBoundary() {
  resetMemoryState()

  strategySkillRepository.insertHSkillInvocation({
    id: 'h-skill-invocation-sensitive-smoke',
    wrapperId: 'H.skill.swap.quote',
    providerSkill: 'okx-dex-swap',
    status: 'completed',
    executionMode: 'read-only-adapter',
    createdAt: '2026-05-17T00:00:00.000Z',
    inputSummary: {
      walletAddress: '0xsensitivewalletaddress',
      reason: 'sensitive user intent',
    },
    result: {
      ok: true,
      code: 'quote-read',
      message: '已读取报价。',
      data: {
        providerResponse: {
          raw: 'sensitive provider payload',
        },
        walletAddress: '0xsensitivewalletaddress',
      },
    },
  })

  const status = getHSkillRuntimeStatus()
  const serializedStatus = JSON.stringify(status)

  assert.equal(status.invocationCount, 1)
  assert.equal(status.lastInvocation, null)
  assert.equal(serializedStatus.includes('providerResponse'), false)
  assert.equal(serializedStatus.includes('sensitive provider payload'), false)
  assert.equal(serializedStatus.includes('0xsensitivewalletaddress'), false)
  assert.equal(serializedStatus.includes('walletAddress'), false)
  assert.equal(serializedStatus.includes('quote-read'), false)

  return {
    invocationCount: status.invocationCount,
    lastInvocationHidden: true,
    rawProviderPayloadHidden: true,
    rawInputValuesHidden: true,
  }
}

function smokeExecutionAuthBoundary() {
  const originalToken = process.env.H_WALLET_EXECUTION_TOKEN

  try {
    delete process.env.H_WALLET_EXECUTION_TOKEN

    assert.throws(
      () => requireExecutionRequest({ headers: {} }),
      (error) => error.code === 'execution-auth-not-configured',
    )

    process.env.H_WALLET_EXECUTION_TOKEN = 'smoke-execution-token'

    assert.throws(
      () =>
        requireExecutionRequest({
          headers: { authorization: 'Bearer wrong-token' },
        }),
      (error) => error.code === 'execution-unauthorized',
    )

    const runner = requireExecutionRequest({
      headers: {
        authorization: 'Bearer smoke-execution-token',
        'x-h-wallet-runner-id': 'smoke-runner',
      },
    })

    assert.deepEqual(runner, {
      id: 'smoke-runner',
      role: 'execution-runner',
    })

    return {
      missingTokenRejected: true,
      wrongTokenRejected: true,
      validRunnerAccepted: true,
    }
  } finally {
    if (originalToken === undefined) {
      delete process.env.H_WALLET_EXECUTION_TOKEN
    } else {
      process.env.H_WALLET_EXECUTION_TOKEN = originalToken
    }
  }
}

async function smokeStrategyRunOwnershipBoundary() {
  resetMemoryState()

  const firstUser = userRepository.upsertByEmail(
    'runner-owner-a@h-wallet.local',
    { displayName: 'Runner A', status: 'active' },
  )
  const secondUser = userRepository.upsertByEmail(
    'runner-owner-b@h-wallet.local',
    { displayName: 'Runner B', status: 'active' },
  )

  userRepository.setCurrentUserId(firstUser.id)
  const firstLaunch = startOfficialStrategySkill({
    strategyId: 'official-stable-earn',
  })

  userRepository.setCurrentUserId(secondUser.id)
  const secondLaunch = startOfficialStrategySkill({
    strategyId: 'official-smart-rebalance',
  })

  const secondUserRuns = listStrategyRuns()
  const secondRunner = getAgentRunnerStatus()

  assert.equal(secondUserRuns.length, 1)
  assert.equal(secondUserRuns[0].id, secondLaunch.run.id)
  assert.equal(secondRunner.currentRun.id, secondLaunch.run.id)
  assert.equal(
    secondUserRuns.some((run) => run.id === firstLaunch.run.id),
    false,
  )

  await assert.rejects(
    () => runOfficialStrategyPreflight({ runId: firstLaunch.run.id }),
    (error) => error.code === 'strategy-run-not-found',
  )

  userRepository.setCurrentUserId(firstUser.id)
  const firstUserRuns = listStrategyRuns()

  assert.equal(firstUserRuns.length, 1)
  assert.equal(firstUserRuns[0].id, firstLaunch.run.id)

  return {
    blockedCrossUserPreflight: true,
    firstUserRuns: firstUserRuns.length,
    secondUserRuns: secondUserRuns.length,
  }
}

async function smokeCardLibraryGrowthBoundary() {
  resetMemoryState()

  createCard({
    type: 'wallet-created',
    status: 'completed',
    source: 'wallet-service',
    title: '钱包创建记录',
    summary: '钱包记录不能进入交易卡库评分。',
    metrics: [{ label: '钱包状态', value: '已登录', tone: 'success' }],
    metadata: {},
    tags: ['wallet', 'agent-wallet'],
  })
  createCard({
    type: 'portfolio-insight',
    status: 'draft',
    source: 'ai-agent',
    title: '组合建议草稿',
    summary: '组合建议不能作为交易卡库输入。',
    metrics: [{ label: '建议', value: '观察', tone: 'muted' }],
    metadata: {},
    tags: ['conversation', 'portfolio'],
  })
  createCard({
    type: 'side-quest',
    status: 'draft',
    source: 'boost-service',
    title: '支线任务提示',
    summary: '支线任务卡不能反向污染支线任务评分。',
    metrics: [{ label: '任务', value: '观察', tone: 'gold' }],
    metadata: {},
    tags: ['conversation', 'boost', 'quest'],
  })
  createTradeConfirmationCard({
    status: 'confirmed',
    title: '已授权但未执行交易',
  })
  createCard({
    type: 'execution-receipt',
    status: 'confirmed',
    source: 'okx-onchainos',
    title: '授权回执',
    summary: '授权回执不是交易卡库记录。',
    metrics: [{ label: '执行状态', value: '未广播', tone: 'danger' }],
    metadata: {},
    tags: ['receipt', 'execution'],
  })
  createTradeConfirmationCard({
    status: 'pending-execution',
    title: '交易中卡',
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
  createCard({
    type: 'trade-success',
    status: 'completed',
    source: 'okx-onchainos',
    title: '交易成功卡',
    summary: '只有真实验证成功的交易结果才能进入成功统计。',
    metrics: [{ label: '当前状态', value: '交易成功', tone: 'success' }],
    metadata: { txHash: '0xverified-card-library-growth' },
    tags: ['conversation', 'trading', 'verified-result'],
  })

  const stats = getCardLibraryStats()
  const growth = getGrowthSummary()
  const sideQuests = listSideQuests()
  const tradeMasterQuest = sideQuests.find((quest) => quest.id === 'trade-master')
  const verifiedQuest = sideQuests.find((quest) => quest.id === 'verified-record')

  assert.equal(stats.totalCards, 2)
  assert.equal(stats.activity.tradeCards, 2)
  assert.equal(stats.completedTrades, 1)
  assert.equal(stats.confirmations.pendingExecution, 1)
  assert.equal(stats.walletActions, 0)
  assert.equal(stats.portfolioInsights, 0)
  assert.equal(growth.source, 'card-library')
  assert.equal(growth.stats.totalCards, 2)
  assert.equal(growth.score, stats.membershipScore)
  assert.equal(tradeMasterQuest.requirement.current, 2)
  assert.equal(tradeMasterQuest.status, 'active')
  assert.equal(verifiedQuest.requirement.current, 1)
  assert.equal(verifiedQuest.status, 'unlocked')

  const boostTurn = await sendAgentConversationMessage({
    content: '看看我的支线任务和会员成长',
  })
  const boostCard = boostTurn.cards.find((card) => card.type === 'side-quest')

  assert.equal(boostTurn.intent, 'boost-action')
  assert.equal(boostTurn.processSteps[0].id, 'read-card-library')
  assert.equal(boostCard.metadata.cardLibrary.totalCards, 2)
  assert.equal(boostCard.metadata.cardLibrary.completedTrades, 1)
  assert.equal(boostCard.metadata.cardLibrary.pendingExecution, 1)
  assert.equal(boostCard.metadata.nextQuest.id, 'trade-master')
  assert.equal(boostCard.metadata.nextQuest.status, 'active')
  assert.equal(boostCard.metadata.growth.score, growth.score)
  assert.throws(
    () => prepareCardForConfirmation(boostCard.id),
    (error) => error.code === 'authorization-not-required',
  )
  assert.throws(
    () => confirmCardReview(boostCard.id),
    (error) => error.code === 'authorization-not-required',
  )

  const portfolioTurn = await sendAgentConversationMessage({
    content: '帮我分析一下资产组合风险',
  })
  const portfolioCard = portfolioTurn.cards.find(
    (card) => card.type === 'portfolio-insight',
  )

  assert.equal(portfolioTurn.intent, 'portfolio-question')
  assert.equal(portfolioTurn.processSteps[0].id, 'read-card-library')
  assert.equal(portfolioCard.metadata.cardLibrary.totalCards, 2)
  assert.equal(portfolioCard.metadata.cardLibrary.completedTrades, 1)
  assert.equal(portfolioCard.metadata.cardLibrary.pendingExecution, 1)
  assert.equal(portfolioCard.metadata.growth.score, growth.score)
  assert.equal(portfolioCard.metadata.portfolioAdvice.id, 'keep-small-steps')
  assert.throws(
    () => prepareCardForConfirmation(portfolioCard.id),
    (error) => error.code === 'authorization-not-required',
  )
  assert.throws(
    () => confirmCardReview(portfolioCard.id),
    (error) => error.code === 'authorization-not-required',
  )
  assert.equal(listCards().length, 2)

  return {
    cardLibraryCards: stats.totalCards,
    conversationBoostCardUsesCardLibrary: true,
    conversationPortfolioCardUsesCardLibrary: true,
    completedTrades: stats.completedTrades,
    growthScore: growth.score,
    ignoredNonTradeCards: true,
    pendingExecution: stats.confirmations.pendingExecution,
    tradeMasterStatus: tradeMasterQuest.status,
    verifiedQuestStatus: verifiedQuest.status,
  }
}

function resetMemoryState() {
  cardRepository.hydrate([])
  agentConversationRepository.hydrate([], [])
  agentAuthorizationPolicyRepository.hydrate([])
  strategySkillRepository.hydrateRuns([])
  strategySkillRepository.hydrateHSkillInvocations([])
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
