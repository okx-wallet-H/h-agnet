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
        turns.find((turn) => Array.isArray(turn.cardIds) && turn.cardIds.includes(cardId)) ??
        null
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
    listMessages() {
      return [...messages]
    },
    listTurns() {
      return [...turns]
    },
    persistTurn(turn) {
      persistAgentConversationTurn(turn)
    },
  }
}

module.exports = {
  agentConversationRepository: createAgentConversationRepository(),
}
