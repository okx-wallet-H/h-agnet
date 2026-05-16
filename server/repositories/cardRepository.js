const cards = []
const { persistCard } = require('../database/persistence')

function createCardRepository() {
  return {
    findById(cardId) {
      return cards.find((card) => card.id === cardId) ?? null
    },
    findFirst(predicate) {
      return cards.find(predicate) ?? null
    },
    insert(card) {
      cards.unshift(card)
      persistCard(card)

      return card
    },
    list({ userId } = {}) {
      if (!userId) {
        return cards
      }

      return cards.filter((card) => card.userId === userId)
    },
    hydrate(nextCards = []) {
      cards.splice(0, cards.length, ...nextCards)
    },
    persist(card) {
      persistCard(card)
    },
  }
}

module.exports = {
  cardRepository: createCardRepository(),
}
