const crypto = require('node:crypto')

const defaultBaseUrl = 'https://web3.okx.com'

const chainIndexByAlias = {
  '1': '1',
  eth: '1',
  ethereum: '1',
  mainnet: '1',
  '56': '56',
  bnb: '56',
  bsc: '56',
  '137': '137',
  polygon: '137',
  matic: '137',
  '196': '196',
  xlayer: '196',
  'x layer': '196',
  okb: '196',
  '8453': '8453',
  base: '8453',
  '42161': '42161',
  arb: '42161',
  arbitrum: '42161',
  '501': '501',
  sol: '501',
  solana: '501',
}

function getStatus() {
  const credentials = getCredentials()
  const configured = Boolean(
    credentials.apiKey &&
      credentials.secretKey &&
      credentials.passphrase &&
      credentials.projectId,
  )

  return {
    baseUrl: getBaseUrl(),
    configured,
    projectConfigured: Boolean(credentials.projectId),
    status: configured ? 'ready' : 'not-configured',
    reason: configured
      ? 'OKX OnchainOS HTTP adapter 已配置，可执行只读和预检请求。'
      : '等待服务端配置 OKX_PROJECT_ID / OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE。',
  }
}

function getProviderStatus({ limitation, supportedMethods }) {
  const status = getStatus()

  return {
    ...status,
    limitation,
    supportedMethods,
  }
}

async function getSwapQuote(input) {
  return request('GET', '/api/v6/dex/aggregator/quote', {
    amount: normalizeRequiredText(input.amount, 'amount'),
    chainIndex: normalizeChainIndex(input.chainIndex ?? input.chain),
    fromTokenAddress: normalizeRequiredText(
      input.fromTokenAddress,
      'fromTokenAddress',
    ),
    toTokenAddress: normalizeRequiredText(input.toTokenAddress, 'toTokenAddress'),
    swapMode: input.swapMode ?? 'exactIn',
    dexIds: input.dexIds,
    excludeDexIds: input.excludeDexIds,
    excludePoolAddresses: input.excludePoolAddresses,
    directRoute: input.directRoute,
    singleRouteOnly: input.singleRouteOnly,
    singlePoolPerHop: input.singlePoolPerHop,
  })
}

async function simulateTransaction(input) {
  return request('POST', '/api/v6/dex/pre-transaction/simulate', {
    chainIndex: normalizeChainIndex(input.chainIndex ?? input.chain),
    fromAddress: normalizeRequiredText(
      input.fromAddress ?? input.from,
      'fromAddress',
    ),
    toAddress: normalizeRequiredText(input.toAddress ?? input.to, 'toAddress'),
    txAmount: normalizeOptionalText(input.txAmount ?? input.value) ?? '0',
    extJson: {
      inputData: normalizeRequiredText(
        input.inputData ?? input.data,
        'extJson.inputData',
      ),
    },
    gasPrice: input.gasPrice,
    priorityFee: input.priorityFee,
  })
}

async function getSwapHistory(input) {
  return request('GET', '/api/v6/dex/aggregator/history', {
    chainIndex: normalizeChainIndex(input.chainIndex ?? input.chain),
    txHash: normalizeRequiredText(input.txHash, 'txHash'),
    isFromMyProject:
      typeof input.isFromMyProject === 'boolean'
        ? String(input.isFromMyProject)
        : 'true',
  })
}

async function request(method, path, payload) {
  const status = getStatus()

  if (status.status !== 'ready') {
    const error = new Error(status.reason)
    error.code = 'okx-onchainos-not-configured'
    throw error
  }

  const cleanPayload = compactObject(payload)
  const queryString =
    method === 'GET' ? new URLSearchParams(cleanPayload).toString() : ''
  const requestPath = queryString ? `${path}?${queryString}` : path
  const body = method === 'POST' ? JSON.stringify(cleanPayload) : ''
  const headers = createHeaders({ body, method, requestPath })
  const response = await fetch(`${getBaseUrl()}${requestPath}`, {
    body: method === 'POST' ? body : undefined,
    headers,
    method,
  })
  const text = await response.text()
  const data = parseJson(text)

  if (!response.ok) {
    const error = new Error(`OKX OnchainOS 请求失败：HTTP ${response.status}`)
    error.code = 'okx-onchainos-http-error'
    error.statusCode = response.status
    error.data = data ?? { text }
    throw error
  }

  return {
    ok: data?.code === '0',
    request: {
      method,
      path,
      requestPath,
    },
    response: data,
  }
}

function createHeaders({ body, method, requestPath }) {
  const credentials = getCredentials()
  const timestamp = new Date().toISOString()
  const signature = sign(
    `${timestamp}${method}${requestPath}${method === 'POST' ? body : ''}`,
    credentials.secretKey,
  )
  const headers = {
    'Content-Type': 'application/json',
    'OK-ACCESS-KEY': credentials.apiKey,
    'OK-ACCESS-PASSPHRASE': credentials.passphrase,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
  }

  if (credentials.projectId) {
    headers['OK-ACCESS-PROJECT'] = credentials.projectId
  }

  return headers
}

function sign(message, secretKey) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64')
}

function getCredentials() {
  return {
    apiKey: process.env.OKX_API_KEY,
    passphrase: process.env.OKX_PASSPHRASE ?? process.env.OKX_API_PASSPHRASE,
    projectId: process.env.OKX_PROJECT_ID ?? process.env.OKX_PROJECT_CODE,
    secretKey: process.env.OKX_SECRET_KEY,
  }
}

function getBaseUrl() {
  return process.env.OKX_ONCHAINOS_BASE_URL ?? defaultBaseUrl
}

function normalizeChainIndex(input) {
  const value = normalizeRequiredText(input, 'chainIndex').toLowerCase()
  const chainIndex = chainIndexByAlias[value]

  if (!chainIndex) {
    const error = new Error(`暂不支持的 chainIndex：${input}`)
    error.code = 'okx-chain-index-unsupported'
    throw error
  }

  return chainIndex
}

function normalizeRequiredText(input, fieldName) {
  const value = normalizeOptionalText(input)

  if (!value) {
    const error = new Error(`${fieldName} 不能为空。`)
    error.code = 'okx-input-required'
    throw error
  }

  return value
}

function normalizeOptionalText(input) {
  if (input === null || input === undefined) {
    return undefined
  }

  if (typeof input === 'boolean') {
    return String(input)
  }

  const value = String(input).trim()

  return value.length > 0 ? value : undefined
}

function compactObject(input) {
  const output = {}

  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    ) {
      output[key] = value
      continue
    }

    if (typeof value !== 'object') {
      output[key] = value
    }
  }

  return output
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

module.exports = {
  getProviderStatus,
  getStatus,
  getSwapHistory,
  getSwapQuote,
  normalizeChainIndex,
  simulateTransaction,
}
