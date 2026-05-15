const users = []
let currentUserId = null

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
    setCurrentUserId(userId) {
      currentUserId = userId
    },
    upsertByEmail(email, patch = {}) {
      const existingUser = users.find((user) => user.email === email)
      const now = new Date().toISOString()

      if (existingUser) {
        Object.assign(existingUser, patch, { updatedAt: now })

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

      return user
    },
  }
}

module.exports = {
  userRepository: createUserRepository(),
}
