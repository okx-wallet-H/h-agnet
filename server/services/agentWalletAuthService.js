const onchainosWalletAdapter = require('../adapters/onchainosWalletAdapter')
const {
  authSessionRepository,
} = require('../repositories/authSessionRepository')
const { createAgentWalletCreatedCard } = require('./cardsService')
const {
  bindAgentWalletSession,
  getCurrentUserIdentity,
  markAgentWalletOtpRequested,
  normalizeEmail,
} = require('./userIdentityService')

function getAuthStatus() {
  return {
    ...onchainosWalletAdapter.getStatus(),
    identity: getCurrentUserIdentity(),
  }
}

async function requestAgentWalletOtp(input) {
  const email = normalizeEmail(input.email)
  const session = await onchainosWalletAdapter.requestOtp({
    ...input,
    email,
  })
  const identity = markAgentWalletOtpRequested({
    email,
    requestId: session.requestId,
  })
  const hWalletSession = createHWalletSession(identity.user.id)

  return enrichAgentWalletSession(session, identity, hWalletSession)
}

async function verifyAgentWalletOtp(input) {
  const email = normalizeEmail(input.email)

  if (!input.otpCode || typeof input.otpCode !== 'string') {
    const error = new Error('验证码不能为空。')
    error.statusCode = 400
    throw error
  }

  const session = await onchainosWalletAdapter.verifyOtpAndCreateWallet({
    ...input,
    email,
  })
  const identity = bindAgentWalletSession(session)
  const hWalletSession = createHWalletSession(identity.user.id)
  const enrichedSession = enrichAgentWalletSession(
    session,
    identity,
    hWalletSession,
  )

  return {
    ...enrichedSession,
    walletCreatedCard: createAgentWalletCreatedCard(enrichedSession),
  }
}

async function getAgentWalletSession() {
  const identity = getCurrentUserIdentity()

  if (!identity?.agentWallet || identity.agentWallet.status !== 'connected') {
    return null
  }

  return enrichAgentWalletSession(
    {
      accountId: identity.agentWallet.accountId ?? undefined,
      accountName: identity.agentWallet.accountName ?? undefined,
      email: identity.agentWallet.email ?? identity.user.email,
      evmAddress: identity.agentWallet.evmAddress ?? undefined,
      loginType: identity.agentWallet.loginType ?? 'email',
      solAddress: identity.agentWallet.solAddress ?? undefined,
      step: 'authenticated',
    },
    identity,
  )
}

function getCurrentIdentity() {
  return getCurrentUserIdentity()
}

function createHWalletSession(userId) {
  const { session, token } = authSessionRepository.createSession({ userId })

  return {
    ...session,
    token,
  }
}

function enrichAgentWalletSession(session, identity, hWalletSession = null) {
  return {
    ...session,
    hWalletSession,
    userId: identity.user.id,
    userStatus: identity.user.status,
    walletBindingId: identity.agentWallet?.id,
    walletBindingStatus: identity.agentWallet?.status,
  }
}

module.exports = {
  getCurrentIdentity,
  getAgentWalletSession,
  getAuthStatus,
  requestAgentWalletOtp,
  verifyAgentWalletOtp,
}
