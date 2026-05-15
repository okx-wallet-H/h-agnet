const { execFile } = require('node:child_process')

const cliPath = process.env.ONCHAINOS_CLI_PATH
const configured =
  process.env.H_AGENT_ONCHAINOS_AUTH_MODE === 'cli' && Boolean(cliPath)

function getStatus() {
  return {
    provider: 'onchainos',
    status: configured ? 'ready' : 'not-configured',
    authMode: process.env.H_AGENT_ONCHAINOS_AUTH_MODE ?? 'disabled',
    reason: configured
      ? 'OnchainOS CLI 适配器已配置。'
      : '请设置 H_AGENT_ONCHAINOS_AUTH_MODE=cli 和 ONCHAINOS_CLI_PATH，以启用服务端 Agent Wallet 认证。',
  }
}

function parseJsonOutput(output) {
  const trimmed = output.trim()

  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    return match ? JSON.parse(match[0]) : null
  }
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {}
  }

  if (payload.data && typeof payload.data === 'object') {
    return payload.data
  }

  return payload
}

function runOnchainos(args) {
  if (!configured || !cliPath) {
    throw new Error(
      '后端尚未配置 OnchainOS CLI。请设置 H_AGENT_ONCHAINOS_AUTH_MODE=cli 和 ONCHAINOS_CLI_PATH。',
    )
  }

  return new Promise((resolve, reject) => {
    execFile(
      cliPath,
      args,
      {
        timeout: 60_000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr.trim() ||
                stdout.trim() ||
                'OnchainOS CLI 命令执行失败。',
            ),
          )
          return
        }

        resolve({
          raw: stdout,
          payload: normalizePayload(parseJsonOutput(stdout)),
        })
      },
    )
  })
}

async function requestOtp(input) {
  const locale = input.locale ?? 'zh-CN'
  const result = await runOnchainos([
    'wallet',
    'login',
    input.email,
    '--locale',
    locale,
  ])

  return {
    email: input.email,
    requestId: result.payload.requestId,
    step: 'okx-otp-requested',
    loginType: 'email',
  }
}

async function verifyOtpAndCreateWallet(input) {
  const verifyResult = await runOnchainos(['wallet', 'verify', input.otpCode])
  const verifyPayload = verifyResult.payload
  const balanceResult = await runOnchainos(['wallet', 'balance'])
  const balancePayload = balanceResult.payload

  return {
    email: input.email,
    requestId: input.requestId,
    accountId: verifyPayload.accountId ?? verifyPayload.currentAccountId,
    accountName: verifyPayload.accountName ?? verifyPayload.currentAccountName,
    evmAddress: balancePayload.evmAddress,
    solAddress: balancePayload.solAddress,
    loginType: 'email',
    step: 'authenticated',
  }
}

async function getSession() {
  if (!configured) {
    return null
  }

  const statusResult = await runOnchainos(['wallet', 'status'])
  const statusPayload = statusResult.payload

  if (!statusPayload.loggedIn) {
    return null
  }

  const balanceResult = await runOnchainos(['wallet', 'balance']).catch(
    () => ({ payload: {} }),
  )
  const balancePayload = balanceResult.payload

  return {
    email: statusPayload.email,
    accountId: statusPayload.currentAccountId,
    accountName: statusPayload.currentAccountName,
    evmAddress: balancePayload.evmAddress,
    solAddress: balancePayload.solAddress,
    loginType: statusPayload.loginType ?? 'email',
    step: 'authenticated',
  }
}

async function getBalance() {
  const balanceResult = await runOnchainos(['wallet', 'balance'])
  const balancePayload = balanceResult.payload

  return {
    provider: 'onchainos',
    command: 'wallet balance',
    portfolio: normalizeBalancePayload(balancePayload),
  }
}

function normalizeBalancePayload(payload) {
  const assetCandidates = [
    payload?.assets,
    payload?.tokens,
    payload?.balances,
    payload?.tokenList,
    payload?.assetList,
    payload?.list,
  ]
  const assets = assetCandidates.find(Array.isArray) ?? []

  return {
    evmAddress: normalizeOptionalString(payload?.evmAddress),
    solAddress: normalizeOptionalString(payload?.solAddress),
    totalValueUsd: normalizeOptionalString(
      payload?.totalValueUsd ??
        payload?.totalUsdValue ??
        payload?.totalValue ??
        payload?.totalBalanceUsd,
    ),
    assetCount: assets.length,
    assets: assets.slice(0, 20).map(normalizeAsset),
    payloadKeys: Object.keys(payload ?? {}),
  }
}

function normalizeAsset(asset) {
  if (!asset || typeof asset !== 'object') {
    return {
      symbol: 'UNKNOWN',
      balance: '待识别',
      valueUsd: null,
      chain: null,
      tokenAddress: null,
    }
  }

  return {
    symbol: normalizeOptionalString(asset.symbol ?? asset.tokenSymbol) ?? 'UNKNOWN',
    balance: normalizeOptionalString(
      asset.balance ?? asset.amount ?? asset.quantity,
    ),
    valueUsd: normalizeOptionalString(
      asset.valueUsd ?? asset.usdValue ?? asset.tokenValue,
    ),
    chain: normalizeOptionalString(
      asset.chain ?? asset.chainName ?? asset.chainIndex,
    ),
    tokenAddress: normalizeOptionalString(
      asset.tokenAddress ?? asset.tokenContractAddress ?? asset.address,
    ),
  }
}

function normalizeOptionalString(input) {
  if (input === null || input === undefined || input === '') {
    return null
  }

  return String(input)
}

module.exports = {
  getBalance,
  getSession,
  getStatus,
  requestOtp,
  verifyOtpAndCreateWallet,
}
