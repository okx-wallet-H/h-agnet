const cards = []

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

      return card
    },
    list({ userId } = {}) {
      if (!userId) {
        return cards
      }

      return cards.filter((card) => card.userId === userId)
    },
  }
}

module.exports = {
  cardRepository: createCardRepository(),
}
