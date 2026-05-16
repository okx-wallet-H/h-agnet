const { executeAgentCommand } = require('../agent/agentCommandPipeline')
const { createCard } = require('./cardsService')
const {
  prepareSwapPipeline,
} = require('./agentExecutionPipelineService')
const {
  runOfficialStrategyPreflight,
  startOfficialStrategySkill,
} = require('./strategySkillService')

const messages = []
const turns = []

function nowIso() {
  return new Date().toISOString()
}

function createMessage(role, content) {
  const message = {
    id: `message-${Date.now()}-${messages.length + 1}`,
    role,
    content,
    createdAt: nowIso(),
  }

  messages.push(message)

  return message
}

async function sendAgentConversationMessage(input) {
  const commandResult = await executeAgentCommand(input, {
    createCard,
    prepareSwap: prepareSwapPipeline,
    runStrategyPreflight: runOfficialStrategyPreflight,
    startOfficialStrategy: startOfficialStrategySkill,
  })
  const userMessage = createMessage('user', commandResult.content)
  const assistantMessage = createMessage(
    'assistant',
    commandResult.assistantText,
  )
  const turn = {
    id: `turn-${Date.now()}-${turns.length + 1}`,
    createdAt: nowIso(),
    intent: commandResult.intent,
    confidence: commandResult.confidence,
    userMessage,
    assistantMessage,
    processSteps: commandResult.processSteps,
    cards: commandResult.cards,
    executionPlan: commandResult.executionPlan,
  }

  turns.push(turn)

  return turn
}

function listAgentConversationMessages() {
  return [...messages]
}

function listAgentConversationTurns() {
  return [...turns]
}

function attachCardToConversationTurn(parentCardId, card) {
  const turn = turns.find((item) =>
    item.cards.some((turnCard) => turnCard.id === parentCardId),
  )

  if (!turn || turn.cards.some((turnCard) => turnCard.id === card.id)) {
    return
  }

  turn.cards.push(card)
}

module.exports = {
  attachCardToConversationTurn,
  listAgentConversationMessages,
  listAgentConversationTurns,
  sendAgentConversationMessage,
}
