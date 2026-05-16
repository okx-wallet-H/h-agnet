const fs = require('node:fs/promises')
const path = require('node:path')
const { Pool } = require('pg')

let pool = null
let schemaReady = false

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

function getDatabaseStatus() {
  return {
    configured: isDatabaseConfigured(),
    ready: schemaReady,
    provider: 'postgresql',
  }
}

function getPool() {
  if (!isDatabaseConfigured()) {
    return null
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: getSslConfig(),
    })
  }

  return pool
}

async function query(sql, params = []) {
  const activePool = getPool()

  if (!activePool) {
    throw new Error('DATABASE_URL 未配置，PostgreSQL 持久化未启用。')
  }

  return activePool.query(sql, params)
}

async function initializeSchema() {
  if (!isDatabaseConfigured()) {
    return getDatabaseStatus()
  }

  const schemaPath = path.resolve(
    process.cwd(),
    'docs/database/001_initial_schema.sql',
  )
  const schema = await fs.readFile(schemaPath, 'utf8')

  await query(schema)
  schemaReady = true

  return getDatabaseStatus()
}

function getSslConfig() {
  if (process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false }
  }

  return false
}

module.exports = {
  getDatabaseStatus,
  initializeSchema,
  isDatabaseConfigured,
  query,
}
