const { createHash, randomBytes } = require('node:crypto')
const { persistAuthSession } = require('../database/persistence')

const sessions = []
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000

const authSessionRepository = {
  createSession({ source = 'agent-wallet-auth', userId }) {
    if (!userId) {
      throw new Error('userId is required to create a H Wallet session.')
    }

    const now = new Date()
    const token = createSessionToken()
    const session = {
      id: `h-wallet-session-${Date.now()}-${sessions.length + 1}`,
      userId,
      tokenHash: hashSessionToken(token),
      source,
      status: 'active',
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + sessionTtlMs).toISOString(),
    }

    sessions.unshift(session)
    persistAuthSession(session)

    return {
      session: toPublicSession(session),
      token,
    }
  },

  resolveSessionToken(token) {
    if (typeof token !== 'string' || !token.trim()) {
      return null
    }

    const tokenHash = hashSessionToken(token.trim())
    const session = sessions.find((item) => item.tokenHash === tokenHash)

    if (!session || session.status !== 'active' || isExpired(session)) {
      return null
    }

    session.lastSeenAt = new Date().toISOString()
    persistAuthSession(session)

    return toPublicSession(session)
  },

  hydrate(nextSessions = []) {
    sessions.splice(0, sessions.length, ...nextSessions.map(clone))
  },
}

function createSessionToken() {
  return `hws_${randomBytes(32).toString('base64url')}`
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function isExpired(session) {
  return new Date(session.expiresAt).getTime() <= Date.now()
}

function toPublicSession(session) {
  return {
    id: session.id,
    userId: session.userId,
    source: session.source,
    status: session.status,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
  }
}

function clone(input) {
  return JSON.parse(JSON.stringify(input))
}

module.exports = {
  authSessionRepository,
}
