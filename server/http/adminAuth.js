const { timingSafeEqual } = require('node:crypto')

function requireAdminRequest(request) {
  const configuredToken = process.env.H_WALLET_ADMIN_TOKEN

  if (!configuredToken) {
    throwAuthError(
      503,
      'admin-auth-not-configured',
      '管理后台权限未配置。请先在后端环境设置 H_WALLET_ADMIN_TOKEN。',
    )
  }

  const authHeader = request.headers.authorization ?? ''
  const expectedHeader = `Bearer ${configuredToken}`

  if (!safeEqual(authHeader, expectedHeader)) {
    throwAuthError(401, 'admin-unauthorized', '缺少有效的管理后台授权。')
  }

  return {
    id: normalizeActorId(request.headers['x-h-wallet-admin-id']),
    role: 'admin',
  }
}

function normalizeActorId(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'admin'
  }

  return value.trim().slice(0, 64)
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function throwAuthError(statusCode, code, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code

  throw error
}

module.exports = {
  requireAdminRequest,
}
