const { timingSafeEqual } = require('node:crypto')

function requireExecutionRequest(request) {
  const configuredToken = process.env.H_WALLET_EXECUTION_TOKEN

  if (!configuredToken) {
    throwAuthError(
      503,
      'execution-auth-not-configured',
      '执行回执权限未配置。请先在后端环境设置 H_WALLET_EXECUTION_TOKEN。',
    )
  }

  const authHeader = request.headers.authorization ?? ''
  const expectedHeader = `Bearer ${configuredToken}`

  if (!safeEqual(authHeader, expectedHeader)) {
    throwAuthError(401, 'execution-unauthorized', '缺少有效的执行回执授权。')
  }

  return {
    id: normalizeRunnerId(request.headers['x-h-wallet-runner-id']),
    role: 'execution-runner',
  }
}

function normalizeRunnerId(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'h-wallet-runner'
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
  requireExecutionRequest,
}
