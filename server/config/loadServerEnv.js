const fs = require('node:fs')
const path = require('node:path')

const envFileNames = ['.env.local', '.env']

function loadServerEnv() {
  for (const fileName of envFileNames) {
    const filePath = path.resolve(process.cwd(), fileName)

    if (!fs.existsSync(filePath)) {
      continue
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const entries = parseEnv(content)

    for (const [key, value] of Object.entries(entries)) {
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map(parseEnvLine)
      .filter(Boolean),
  )
}

function parseEnvLine(line) {
  const separatorIndex = line.indexOf('=')

  if (separatorIndex === -1) {
    return null
  }

  const key = line.slice(0, separatorIndex).trim()
  const rawValue = line.slice(separatorIndex + 1).trim()

  if (!key) {
    return null
  }

  return [key, unwrapValue(rawValue)]
}

function unwrapValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

module.exports = {
  loadServerEnv,
}
