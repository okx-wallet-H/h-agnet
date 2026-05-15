const { getAuthStatus } = require('./agentWalletAuthService')
const {
  listEnvironmentRequirements,
  listOkxProviderAdapters,
} = require('../adapters/okxProviderRegistry')

function getOkxIntegrationStatus({ apiPrefix }) {
  const agentWalletStatus = getAuthStatus()
  const agentWalletReady = agentWalletStatus.status === 'ready'
  const providerAdapters = listOkxProviderAdapters()

  return {
    product: 'H Wallet',
    apiPrefix,
    secretsPolicy: {
      frontendSecretsAllowed: false,
      summary:
        'OKX Onchain / OnchainOS 凭证只能放在服务端环境，不允许进入 Expo 前端。',
    },
    officialChannel: {
      id: 'h-wallet-official-okx-onchainos',
      label: 'H Wallet 官方 OKX OnchainOS 通道',
      credentialBoundary: 'h-wallet-official-server',
      credentialUse:
        '服务端 OKX Project/API Key 只用于调用 OKX OnchainOS / OKX API。',
      userAuthorizationRule:
        '真实资产动作仍以用户 Agent Wallet 授权范围为准，服务端 Key 不能替代用户授权。',
    },
    agentWallet: agentWalletStatus,
    domains: [
      {
        id: 'onchain',
        label: 'Onchain / OKX Wallet',
        status: 'active',
        scope: 'Agent Wallet、OnchainOS、DEX Swap、Bridge、Security、Wallet Portfolio',
        rule: '当前 H Wallet 主线，只通过后端 OnchainOS / OKX Wallet 适配层调用。',
      },
      {
        id: 'cex',
        label: 'CEX / OKX 交易所',
        status: 'future-separated',
        scope: '交易所余额、现货 / 合约订单、交易机器人、Earn、交易所账户配置',
        rule: '后续独立模块，不得混入 Agent Wallet 授权、Onchain 钱包资产或 DEX Swap 回执。',
      },
    ],
    serverEnvironment: {
      required: listEnvironmentRequirements(),
    },
    providerAdapters,
    capabilities: [
      {
        id: 'agent-wallet-email-auth',
        label: '邮箱验证码创建 Agent 钱包',
        route: `${apiPrefix}/auth/agent-wallet/request-otp`,
        status: agentWalletReady ? 'ready' : 'not-configured',
        reason: agentWalletReady
          ? '服务端 OnchainOS CLI 适配器已配置。'
          : '等待服务端配置 OnchainOS CLI。',
      },
      {
        id: 'agent-wallet-session',
        label: '恢复 Agent 钱包会话',
        route: `${apiPrefix}/auth/agent-wallet/session`,
        status: agentWalletReady ? 'ready' : 'not-configured',
        reason: agentWalletReady
          ? '可以读取服务端钱包登录状态。'
          : '等待 Agent Wallet 登录配置。',
      },
      {
        id: 'wallet-transfer-card',
        label: '提现 / 转账授权卡',
        route: `${apiPrefix}/wallet/actions/transfer-draft`,
        status: 'ready',
        reason: '当前只生成授权卡，不广播交易。',
      },
      {
        id: 'wallet-transfer-execution',
        label: '真实提现 / 转账执行',
        route: null,
        status: 'blocked',
        reason: '真实执行必须等待用户授权策略、风控和 OnchainOS 执行路径完成。',
      },
      {
        id: 'okx-swap-quote',
        label: 'OKX Swap Quote',
        route: `${apiPrefix}/agent/skill-runtime/invoke`,
        status: getProviderCapabilityStatus(providerAdapters, 'okx-dex-swap'),
        reason:
          'H Wallet 只保留编排入口；真实 quote 必须由服务端 OKX Swap adapter 返回。',
      },
      {
        id: 'okx-swap-execution',
        label: 'OKX Swap 执行',
        route: `${apiPrefix}/agent/skill-runtime/invoke`,
        status: 'blocked',
        reason: '真实执行必须等待 OKX Swap adapter、用户授权策略和交易状态回执。',
      },
      {
        id: 'okx-defi-invest',
        label: 'OKX DeFi 赚币',
        route: `${apiPrefix}/agent/skill-runtime/invoke`,
        status: getProviderCapabilityStatus(providerAdapters, 'okx-defi-invest'),
        reason: '真实 DeFi 存入/领取必须由 okx-defi-invest adapter 返回 calldata 和回执。',
      },
    ],
  }
}

function getProviderCapabilityStatus(providerAdapters, providerId) {
  const provider = providerAdapters.find((item) => item.id === providerId)

  if (!provider) {
    return 'unavailable'
  }

  if (provider.status === 'not-configured') {
    return 'not-configured'
  }

  if (provider.status === 'ready') {
    return 'ready'
  }

  return 'blocked'
}

module.exports = {
  getOkxIntegrationStatus,
}
