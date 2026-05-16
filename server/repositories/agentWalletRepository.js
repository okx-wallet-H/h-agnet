const agentWalletBindings = []
const { persistAgentWallet } = require('../database/persistence')

function createAgentWalletRepository() {
  return {
    findByUserId(userId) {
      return (
        agentWalletBindings.find((binding) => binding.userId === userId) ?? null
      )
    },
    hydrate(bindings = []) {
      agentWalletBindings.splice(0, agentWalletBindings.length, ...bindings)
    },
    upsertForUser(userId, patch = {}) {
      const existingBinding = agentWalletBindings.find(
        (binding) => binding.userId === userId,
      )
      const now = new Date().toISOString()

      if (existingBinding) {
        Object.assign(existingBinding, patch, { updatedAt: now })
        persistAgentWallet(existingBinding)

        return existingBinding
      }

      const binding = {
        id: `agent-wallet-${Date.now()}-${agentWalletBindings.length + 1}`,
        userId,
        provider: patch.provider ?? 'okx-agent-wallet',
        status: patch.status ?? 'otp-requested',
        walletId: patch.walletId ?? null,
        accountId: patch.accountId ?? null,
        accountName: patch.accountName ?? null,
        email: patch.email ?? null,
        evmAddress: patch.evmAddress ?? null,
        solAddress: patch.solAddress ?? null,
        loginType: patch.loginType ?? 'email',
        metadata: patch.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      }

      agentWalletBindings.unshift(binding)
      persistAgentWallet(binding)

      return binding
    },
  }
}

module.exports = {
  agentWalletRepository: createAgentWalletRepository(),
}
