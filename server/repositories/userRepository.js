const users = []
let currentUserId = null
const {
  persistCurrentUserId,
  persistUser,
} = require('../database/persistence')

function createUserRepository() {
  return {
    findByEmail(email) {
      return users.find((user) => user.email === email) ?? null
    },
    findById(userId) {
      return users.find((user) => user.id === userId) ?? null
    },
    getCurrentUser() {
      return currentUserId
        ? users.find((user) => user.id === currentUserId) ?? null
        : null
    },
    list() {
      return users
    },
    hydrate(nextUsers = [], nextCurrentUserId = null) {
      users.splice(0, users.length, ...nextUsers)
      currentUserId = nextCurrentUserId
    },
    setCurrentUserId(userId) {
      currentUserId = userId
      persistCurrentUserId(userId)
    },
    upsertByEmail(email, patch = {}) {
      const existingUser = users.find((user) => user.email === email)
      const now = new Date().toISOString()

      if (existingUser) {
        Object.assign(existingUser, patch, { updatedAt: now })
        persistUser(existingUser)

        return existingUser
      }

      const user = {
        id: `user-${Date.now()}-${users.length + 1}`,
        email,
        displayName: patch.displayName ?? email.split('@')[0],
        status: patch.status ?? 'pending-agent-wallet',
        createdAt: now,
        updatedAt: now,
      }

      users.unshift(user)
      persistUser(user)

      return user
    },
  }
}

module.exports = {
  userRepository: createUserRepository(),
}
