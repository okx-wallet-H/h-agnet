const onchainosWalletAdapter = require('../adapters/onchainosWalletAdapter')
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

  return enrichAgentWalletSession(session, identity)
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
  const enrichedSession = enrichAgentWalletSession(session, identity)

  return {
    ...enrichedSession,
    walletCreatedCard: createAgentWalletCreatedCard(enrichedSession),
  }
}

async function getAgentWalletSession() {
  const session = await onchainosWalletAdapter.getSession()

  if (!session) {
    return null
  }

  const identity = bindAgentWalletSession(session)

  return enrichAgentWalletSession(session, identity)
}

function getCurrentIdentity() {
  return getCurrentUserIdentity()
}

function enrichAgentWalletSession(session, identity) {
  return {
    ...session,
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
