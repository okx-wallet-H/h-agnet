const adminAuditLogs = []
const { persistAdminAuditLog } = require('../database/persistence')

function createAdminAuditLogRepository() {
  return {
    insert(log) {
      adminAuditLogs.unshift(log)
      persistAdminAuditLog(log)

      return log
    },
    hydrate(logs = []) {
      adminAuditLogs.splice(0, adminAuditLogs.length, ...logs)
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
