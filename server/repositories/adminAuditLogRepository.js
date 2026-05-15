const adminAuditLogs = []

function createAdminAuditLogRepository() {
  return {
    insert(log) {
      adminAuditLogs.unshift(log)

      return log
    },
    list({ limit = 50, resource } = {}) {
      const filteredLogs = resource
        ? adminAuditLogs.filter((log) => log.resource === resource)
        : adminAuditLogs

      return filteredLogs.slice(0, limit)
    },
  }
}

module.exports = {
  adminAuditLogRepository: createAdminAuditLogRepository(),
}
