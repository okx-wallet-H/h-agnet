const {
  getPersistenceStatus,
  initializePostgresPersistence,
  loadPersistedState,
} = require('./persistence')
const { adminAuditLogRepository } = require('../repositories/adminAuditLogRepository')
const {
  agentAuthorizationPolicyRepository,
} = require('../repositories/agentAuthorizationPolicyRepository')
const {
  agentWalletRepository,
} = require('../repositories/agentWalletRepository')
const { cardRepository } = require('../repositories/cardRepository')
const {
  strategySkillRepository,
} = require('../repositories/strategySkillRepository')
const { userRepository } = require('../repositories/userRepository')

async function bootstrapPersistence() {
  await initializePostgresPersistence()

  if (!getPersistenceStatus().ready) {
    return getPersistenceStatus()
  }

  const state = await loadPersistedState()

  userRepository.hydrate(state.users, state.currentUserId)
  agentWalletRepository.hydrate(state.agentWallets)
  cardRepository.hydrate(state.cards)
  agentAuthorizationPolicyRepository.hydrate(state.authorizationGrants)
  strategySkillRepository.hydrateRuns(state.strategyRuns)
  strategySkillRepository.hydrateHSkillInvocations(state.hSkillInvocations)
  adminAuditLogRepository.hydrate(state.adminAuditLogs)

  return getPersistenceStatus()
}

module.exports = {
  bootstrapPersistence,
  getPersistenceStatus,
}
