const {
  agentWalletRepository,
} = require('../repositories/agentWalletRepository')
const { userRepository } = require('../repositories/userRepository')

function createOrUpdateEmailUser(email, patch = {}) {
  const normalizedEmail = normalizeEmail(email)
  const user = userRepository.upsertByEmail(normalizedEmail, patch)

  userRepository.setCurrentUserId(user.id)

  return user
}

function getCurrentUserIdentity() {
  const user = userRepository.getCurrentUser()

  if (!user) {
    return null
  }

  return buildIdentity(user)
}

function getCurrentUserId() {
  return userRepository.getCurrentUser()?.id ?? null
}

function markAgentWalletOtpRequested({ email, requestId }) {
  const user = createOrUpdateEmailUser(email, {
    status: 'otp-requested',
  })
  const walletBinding = agentWalletRepository.upsertForUser(user.id, {
    email: user.email,
    metadata: {
      requestId: requestId ?? null,
    },
    status: 'otp-requested',
  })

  return buildIdentity(user, walletBinding)
}

function bindAgentWalletSession(session) {
  const user = createOrUpdateEmailUser(session.email, {
    status: 'active',
  })
  const walletBinding = agentWalletRepository.upsertForUser(user.id, {
    accountId: session.accountId ?? null,
    accountName: session.accountName ?? null,
    email: user.email,
    evmAddress: session.evmAddress ?? null,
    loginType: session.loginType ?? 'email',
    metadata: {
      requestId: session.requestId ?? null,
    },
    solAddress: session.solAddress ?? null,
    status: 'connected',
    walletId: session.accountId ?? null,
  })

  return buildIdentity(user, walletBinding)
}

function buildIdentity(user, walletBinding = agentWalletRepository.findByUserId(user.id)) {
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    agentWallet: walletBinding
      ? {
          id: walletBinding.id,
          provider: walletBinding.provider,
          status: walletBinding.status,
          walletId: walletBinding.walletId,
          accountId: walletBinding.accountId,
          accountName: walletBinding.accountName,
          email: walletBinding.email,
          evmAddress: walletBinding.evmAddress,
          solAddress: walletBinding.solAddress,
          loginType: walletBinding.loginType,
          createdAt: walletBinding.createdAt,
          updatedAt: walletBinding.updatedAt,
        }
      : null,
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string' || !email.trim()) {
    throwBadRequest('邮箱不能为空。')
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throwBadRequest('邮箱格式不正确。')
  }

  return normalizedEmail
}

function throwBadRequest(message) {
  const error = new Error(message)
  error.statusCode = 400
  error.code = 'bad-request'

  throw error
}

module.exports = {
  bindAgentWalletSession,
  createOrUpdateEmailUser,
  getCurrentUserId,
  getCurrentUserIdentity,
  markAgentWalletOtpRequested,
  normalizeEmail,
}
