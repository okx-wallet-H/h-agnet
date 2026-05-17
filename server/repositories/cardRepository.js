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
    list(options = undefined) {
      if (!options || !Object.hasOwn(options, 'userId')) {
        return cards
      }

      const userId = normalizeUserId(options.userId)

      if (!userId) {
        return []
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

function normalizeUserId(userId) {
  return typeof userId === 'string' && userId.length > 0 ? userId : null
}

module.exports = {
  cardRepository: createCardRepository(),
}
