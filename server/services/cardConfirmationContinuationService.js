const { cardRepository } = require('../repositories/cardRepository')
const { prepareSwapPipeline } = require('./agentExecutionPipelineService')

async function continueAfterCardConfirmation(card) {
  if (!isQuoteReadyTradeCard(card)) {
    return createContinuationResult()
  }

  if (hasContinuation(card.id)) {
    return createContinuationResult({
      reason: 'confirmation-already-continued',
      stage: 'already-continued',
    })
  }

  const result = await prepareSwapPipeline(createSwapInputFromCard(card))
  const followupCards = result.cards.map((followupCard) =>
    markFollowupCard(followupCard, card),
  )

  return createContinuationResult({
    assistantText: result.assistantText,
    cards: followupCards,
    intent: result.intent,
    stage: result.stage,
  })
}

function isQuoteReadyTradeCard(card) {
  return (
    card?.type === 'trade-confirmation' &&
    card.status === 'confirmed' &&
    readString(card.metadata?.pipeline?.stage) === 'quote-ready'
  )
}

function hasContinuation(parentCardId) {
  return cardRepository
    .list()
    .some((card) => card.tags.includes(`continued-from:${parentCardId}`))
}

function createSwapInputFromCard(card) {
  const intent = isRecord(card.metadata?.pipeline?.intent)
    ? card.metadata.pipeline.intent
    : {}

  return {
    amount: readString(intent.amount),
    authorizationScope: 'trade-autonomy',
    chain: readString(intent.chain),
    fromToken: readString(intent.fromToken),
    fromTokenAddress: readString(intent.fromTokenAddress),
    slippagePercent: readString(intent.slippagePercent),
    toToken: readString(intent.toToken),
    toTokenAddress: readString(intent.toTokenAddress),
    wallet: readString(intent.wallet),
  }
}

function markFollowupCard(followupCard, parentCard) {
  followupCard.metadata = {
    ...followupCard.metadata,
    parentConfirmationCardId: parentCard.id,
  }
  followupCard.tags = [
    ...new Set([
      ...followupCard.tags,
      `continued-from:${parentCard.id}`,
      `parent:${parentCard.id}`,
    ]),
  ]
  cardRepository.persist(followupCard)

  return followupCard
}

function createContinuationResult({
  assistantText = null,
  cards = [],
  intent = null,
  reason = null,
  stage = null,
} = {}) {
  return {
    assistantText,
    cards,
    intent,
    reason,
    stage,
  }
}

function readString(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

module.exports = {
  continueAfterCardConfirmation,
}
