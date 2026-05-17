const { executeAgentCommand } = require('../agent/agentCommandPipeline')
const {
  agentConversationRepository,
} = require('../repositories/agentConversationRepository')
const { cardRepository } = require('../repositories/cardRepository')
const { createCard } = require('./cardsService')
const { getCurrentUserId } = require('./userIdentityService')
const {
  prepareSwapPipeline,
} = require('./agentExecutionPipelineService')
const {
  runOfficialStrategyPreflight,
  startOfficialStrategySkill,
} = require('./strategySkillService')
const {
  getGrowthSummary,
  listSideQuests,
} = require('./boostModuleService')

function nowIso() {
  return new Date().toISOString()
}

function createMessage(role, content) {
  const messages = agentConversationRepository.listMessages()
  const message = {
    id: `message-${Date.now()}-${messages.length + 1}`,
    userId: getCurrentUserId(),
    role,
    content,
    createdAt: nowIso(),
  }

  return agentConversationRepository.insertMessage(message)
}

async function sendAgentConversationMessage(input) {
  const commandResult = await executeAgentCommand(input, {
    createCard,
    getGrowthSummary,
    listSideQuests,
    prepareSwap: prepareSwapPipeline,
    runStrategyPreflight: runOfficialStrategyPreflight,
    startOfficialStrategy: startOfficialStrategySkill,
  })
  const userMessage = createMessage('user', commandResult.content)
  const assistantMessage = createMessage(
    'assistant',
    commandResult.assistantText,
  )
  const turns = agentConversationRepository.listTurns()
  const turnRecord = {
    id: `turn-${Date.now()}-${turns.length + 1}`,
    userId: getCurrentUserId(),
    createdAt: nowIso(),
    intent: commandResult.intent,
    confidence: commandResult.confidence,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    processSteps: commandResult.processSteps,
    cardIds: commandResult.cards.map((card) => card.id),
    executionPlan: commandResult.executionPlan,
  }

  agentConversationRepository.insertTurn(turnRecord)

  return hydrateTurn(turnRecord)
}

function listAgentConversationMessages() {
  const userId = getCurrentUserId()

  return userId ? agentConversationRepository.listMessages({ userId }) : []
}

function listAgentConversationTurns() {
  const userId = getCurrentUserId()

  return userId
    ? agentConversationRepository.listTurns({ userId }).map(hydrateTurn)
    : []
}

function attachCardToConversationTurn(parentCardId, card) {
  const turn = agentConversationRepository.findTurnByCardId(parentCardId)

  if (!turn || turn.cardIds.includes(card.id)) {
    return
  }

  turn.cardIds.push(card.id)
  agentConversationRepository.persistTurn(turn)
}

function hydrateTurn(turnRecord) {
  return {
    id: turnRecord.id,
    createdAt: turnRecord.createdAt,
    intent: turnRecord.intent,
    confidence: turnRecord.confidence,
    userMessage:
      agentConversationRepository.findMessageById(turnRecord.userMessageId) ??
      createMissingMessage(turnRecord.userMessageId, 'user'),
    assistantMessage:
      agentConversationRepository.findMessageById(turnRecord.assistantMessageId) ??
      createMissingMessage(turnRecord.assistantMessageId, 'assistant'),
    processSteps: turnRecord.processSteps,
    cards: (turnRecord.cardIds ?? [])
      .map((cardId) => cardRepository.findById(cardId))
      .filter(Boolean),
    executionPlan: turnRecord.executionPlan,
  }
}

function createMissingMessage(messageId, role) {
  return {
    id: messageId,
    role,
    content: '',
    createdAt: nowIso(),
  }
}

module.exports = {
  attachCardToConversationTurn,
  listAgentConversationMessages,
  listAgentConversationTurns,
  sendAgentConversationMessage,
}
