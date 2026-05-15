const {
  adminAuditLogRepository,
} = require('../repositories/adminAuditLogRepository')

function recordAdminAuditLog({
  action,
  actor,
  metadata = {},
  request,
  resource,
  resourceVersion = null,
  summary,
}) {
  const log = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    action: normalizeText(action, 'unknown'),
    actorId: normalizeText(actor?.id, 'admin'),
    actorRole: normalizeText(actor?.role, 'admin'),
    createdAt: new Date().toISOString(),
    metadata,
    request: buildRequestSnapshot(request),
    resource: normalizeText(resource, 'unknown'),
    resourceVersion,
    summary: normalizeText(summary, '管理后台操作。'),
  }

  return adminAuditLogRepository.insert(log)
}

function listAdminAuditLogs(query = {}) {
  return adminAuditLogRepository.list({
    limit: normalizeLimit(query.limit),
    resource: normalizeOptionalText(query.resource),
  })
}

function buildRequestSnapshot(request) {
  if (!request) {
    return null
  }

  return {
    method: request.method,
    userAgent: request.headers['user-agent'] ?? null,
  }
}

function normalizeLimit(value) {
  const limit = Number(value ?? 50)

  if (!Number.isFinite(limit)) {
    return 50
  }

  return Math.max(1, Math.min(Math.round(limit), 100))
}

function normalizeOptionalText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

module.exports = {
  listAdminAuditLogs,
  recordAdminAuditLog,
}
