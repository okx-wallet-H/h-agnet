const {
  authSessionRepository,
} = require('../repositories/authSessionRepository')

function resolveRequestUserId(request) {
  const token = readBearerToken(request.headers.authorization)
  const session = authSessionRepository.resolveSessionToken(token)

  return session?.userId ?? null
}

function readBearerToken(header) {
  if (typeof header !== 'string') {
    return null
  }

  const match = header.match(/^Bearer\s+(.+)$/i)

  return match ? match[1].trim() : null
}

module.exports = {
  resolveRequestUserId,
}
