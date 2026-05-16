const {
  persistAgentConversationMessage,
  persistAgentConversationTurn,
} = require('../database/persistence')

const messages = []
const turns = []

function createAgentConversationRepository() {
  return {
    findMessageById(messageId) {
      return messages.find((message) => message.id === messageId) ?? null
    },
    findTurnByCardId(cardId) {
      return (
        turns.find(
          (turn) => Array.isArray(turn.cardIds) && turn.cardIds.includes(cardId),
        ) ?? null
      )
    },
    hydrate(nextMessages = [], nextTurns = []) {
      messages.splice(0, messages.length, ...nextMessages)
      turns.splice(0, turns.length, ...nextTurns)
    },
    insertMessage(message) {
      messages.push(message)
      persistAgentConversationMessage(message)

      return message
    },
    insertTurn(turn) {
      turns.push(turn)
      persistAgentConversationTurn(turn)

      return turn
    },
    listMessages({ userId } = {}) {
      if (userId !== undefined) {
        return messages.filter(
          (message) => normalizeUserId(message.userId) === userId,
        )
      }

      return [...messages]
    },
    listTurns({ userId } = {}) {
      if (userId !== undefined) {
        return turns.filter((turn) => normalizeUserId(turn.userId) === userId)
      }

      return [...turns]
    },
    persistTurn(turn) {
      persistAgentConversationTurn(turn)
    },
  }
}

function normalizeUserId(userId) {
  return typeof userId === 'string' && userId.length > 0 ? userId : null
}

module.exports = {
  agentConversationRepository: createAgentConversationRepository(),
}
