const authorizationGrants = []

function createAgentAuthorizationPolicyRepository() {
  return {
    findActiveGrant({ address, scope, userId }) {
      return (
        authorizationGrants.find(
          (grant) =>
            grant.status === 'active' &&
            grant.userId === userId &&
            grant.scope === scope &&
            (!address || grant.address === normalizeAddress(address)),
        ) ?? null
      )
    },
    list({ userId } = {}) {
      if (!userId) {
        return []
      }

      return authorizationGrants.filter((grant) => grant.userId === userId)
    },
    upsertGrant({ address = null, metadata = {}, scope, userId }) {
      const normalizedAddress = normalizeAddress(address)
      const existingGrant = authorizationGrants.find(
        (grant) =>
          grant.userId === userId &&
          grant.scope === scope &&
          grant.address === normalizedAddress,
      )
      const now = new Date().toISOString()

      if (existingGrant) {
        Object.assign(existingGrant, {
          metadata: { ...existingGrant.metadata, ...metadata },
          status: 'active',
          updatedAt: now,
        })

        return existingGrant
      }

      const grant = {
        id: `agent-auth-${Date.now()}-${authorizationGrants.length + 1}`,
        address: normalizedAddress,
        createdAt: now,
        metadata,
        scope,
        status: 'active',
        updatedAt: now,
        userId,
      }

      authorizationGrants.unshift(grant)

      return grant
    },
  }
}

function normalizeAddress(address) {
  return typeof address === 'string' && address.trim()
    ? address.trim().toLowerCase()
    : null
}

module.exports = {
  agentAuthorizationPolicyRepository:
    createAgentAuthorizationPolicyRepository(),
}
