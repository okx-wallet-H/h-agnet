const {
  agentAuthorizationPolicyRepository,
} = require('../repositories/agentAuthorizationPolicyRepository')
const { getCurrentUserId } = require('./userIdentityService')

const policyVersion = 'agent-authorization-policy-v1'

function getAgentAuthorizationPolicySummary() {
  const userId = getCurrentUserId()

  return {
    policyVersion,
    userId,
    status: userId ? 'active' : 'identity-required',
    grants: agentAuthorizationPolicyRepository.list({ userId }),
    rules: [
      {
        id: 'trade-autonomy',
        description: '用户完成第一次交易授权后，同类交易可进入 Agent 自主执行通道。',
      },
      {
        id: 'trusted-withdrawal-address',
        description: '提现或转账地址首次授权后可复用；地址变化时必须重新授权。',
      },
      {
        id: 'strategy-autonomy',
        description: '官方赚币策略按版本授权；授权范围之外或策略版本变化时需要重新授权。',
      },
    ],
  }
}

function evaluateAgentAuthorization(request = {}) {
  const userId = getCurrentUserId()

  if (!request.requiresAssetAction) {
    return createAuthorizationResult({
      authorizationStatus: 'not-required',
      executionMode: 'record-only',
      policyReason: '当前指令不会触发资产动作。',
      requiredUserAuthorization: false,
      safetyGate: 'no-asset-action',
      scope: 'none',
      userId,
    })
  }

  if (!userId) {
    return createAuthorizationResult({
      authorizationStatus: 'identity-required',
      executionMode: 'authorization-required',
      policyReason: '需要先完成 H Wallet 登录与 Agent Wallet 绑定。',
      requiredUserAuthorization: true,
      safetyGate: 'identity-and-user-authorization-required',
      scope: request.scope,
      userId,
    })
  }

  if (request.scope === 'trade-autonomy') {
    const grant = agentAuthorizationPolicyRepository.findActiveGrant({
      scope: 'trade-autonomy',
      userId,
    })

    return grant
      ? createAuthorizedResult({
          grant,
          policyReason: '已完成交易自主执行授权。',
          scope: 'trade-autonomy',
          userId,
        })
      : createAuthorizationResult({
          authorizationStatus: 'authorization-required',
          executionMode: 'authorization-required',
          policyReason: '首次交易需要用户授权，之后可在授权范围内自主执行。',
          requiredUserAuthorization: true,
          safetyGate: 'user-authorization-required',
          scope: 'trade-autonomy',
          userId,
        })
  }

  if (request.scope === 'trusted-withdrawal-address') {
    if (!request.address) {
      return createAuthorizationResult({
        authorizationStatus: 'authorization-required',
        executionMode: 'authorization-required',
        policyReason: '提现/转账地址不完整，需要用户补充并授权。',
        requiredUserAuthorization: true,
        safetyGate: 'user-authorization-required',
        scope: 'trusted-withdrawal-address',
        userId,
      })
    }

    const grant = agentAuthorizationPolicyRepository.findActiveGrant({
      address: request.address,
      scope: 'trusted-withdrawal-address',
      userId,
    })

    return grant
      ? createAuthorizedResult({
          grant,
          policyReason: '该提现地址已被用户授权，可进入 Agent 自主执行通道。',
          scope: 'trusted-withdrawal-address',
          userId,
        })
      : createAuthorizationResult({
          authorizationStatus: 'authorization-required',
          executionMode: 'authorization-required',
          policyReason: '这是新的提现/转账地址，需要用户授权后才能自主执行。',
          requiredUserAuthorization: true,
          safetyGate: 'user-authorization-required',
          scope: 'trusted-withdrawal-address',
          userId,
        })
  }

  if (isStrategyAuthorizationScope(request.scope)) {
    const grant = agentAuthorizationPolicyRepository.findActiveGrant({
      scope: request.scope,
      userId,
    })

    return grant
      ? createAuthorizedResult({
          grant,
          policyReason: '该官方赚币策略已完成授权，可进入 Agent 自主执行通道。',
          scope: request.scope,
          userId,
        })
      : createAuthorizationResult({
          authorizationStatus: 'authorization-required',
          executionMode: 'authorization-required',
          policyReason:
            '首次启动这个赚币策略需要用户授权；授权后 Agent 可在该策略版本范围内推进。',
          requiredUserAuthorization: true,
          safetyGate: 'user-authorization-required',
          scope: request.scope,
          userId,
        })
  }

  return createAuthorizationResult({
    authorizationStatus: 'authorization-required',
    executionMode: 'authorization-required',
    policyReason: '当前资产动作需要用户授权。',
    requiredUserAuthorization: true,
    safetyGate: 'user-authorization-required',
    scope: request.scope,
    userId,
  })
}

function applyAuthorizationGrantFromCard(card) {
  const userId = getCurrentUserId()

  if (!userId) {
    return null
  }

  if (card.type === 'trade-confirmation') {
    return agentAuthorizationPolicyRepository.upsertGrant({
      metadata: {
        cardId: card.id,
        source: 'card-confirmation',
      },
      scope: 'trade-autonomy',
      userId,
    })
  }

  if (card.type === 'wallet-confirmation') {
    const walletAction = getMetricValue(card, '要做的事')
    const address = card.metadata?.recipientAddress

    if (!['提现', '转账'].includes(walletAction) || !address) {
      return null
    }

    return agentAuthorizationPolicyRepository.upsertGrant({
      address,
      metadata: {
        cardId: card.id,
        source: 'card-confirmation',
        walletAction,
      },
      scope: 'trusted-withdrawal-address',
      userId,
    })
  }

  if (
    card.type === 'system-status' &&
    card.tags.includes('official-strategy') &&
    isStrategyAuthorizationScope(card.metadata?.authorizationScope)
  ) {
    return agentAuthorizationPolicyRepository.upsertGrant({
      metadata: {
        cardId: card.id,
        source: 'card-confirmation',
        strategyId: card.metadata.strategyId,
        strategyVersion: card.metadata.strategyVersion,
      },
      scope: card.metadata.authorizationScope,
      userId,
    })
  }

  return null
}

function createAuthorizedResult({ grant, policyReason, scope, userId }) {
  return createAuthorizationResult({
    authorizationGrantId: grant.id,
    authorizationStatus: 'agent-authorized',
    executionMode: 'agent-authorized-pending-adapter',
    policyReason,
    requiredUserAuthorization: false,
    safetyGate: 'agent-policy-authorized',
    scope,
    userId,
  })
}

function createAuthorizationResult(input) {
  return {
    policyVersion,
    authorizationGrantId: input.authorizationGrantId ?? null,
    authorizationStatus: input.authorizationStatus,
    executionMode: input.executionMode,
    policyReason: input.policyReason,
    requiredUserAuthorization: input.requiredUserAuthorization,
    safetyGate: input.safetyGate,
    scope: input.scope,
    userId: input.userId,
  }
}

function getMetricValue(card, label) {
  return card.metrics.find((metric) => metric.label === label)?.value
}

function isStrategyAuthorizationScope(scope) {
  return typeof scope === 'string' && scope.startsWith('strategy:')
}

module.exports = {
  applyAuthorizationGrantFromCard,
  evaluateAgentAuthorization,
  getAgentAuthorizationPolicySummary,
}
