const onchainosWalletAdapter = require('./onchainosWalletAdapter')
const okxOnchainHttpClient = require('./okxOnchainHttpClient')
const {
  getHSkillAdapterBinding,
  getReadyProviderMethods,
} = require('./hSkillAdapterRegistry')

const serverOnlyOkxEnv = [
  'OKX_PROJECT_ID',
  'OKX_API_KEY',
  'OKX_SECRET_KEY',
  'OKX_PASSPHRASE',
]

const envAliases = {
  OKX_PROJECT_ID: ['OKX_PROJECT_CODE'],
  OKX_PASSPHRASE: ['OKX_API_PASSPHRASE'],
}

const officialCredentialProfile = {
  credentialBoundary: 'h-wallet-official-server',
  credentialLabel: 'H Wallet 官方接入',
  credentialUse:
    '服务端凭证只用于调用 OKX OnchainOS / OKX API，不代表用户钱包授权。',
}

const providerDefinitions = [
  {
    id: 'okx-agentic-wallet',
    label: 'OKX Agent Wallet',
    domain: 'onchain',
    transport: 'onchainos-cli',
    requiredEnv: ['H_AGENT_ONCHAINOS_AUTH_MODE', 'ONCHAINOS_CLI_PATH'],
    requiredFor: 'Agent Wallet 邮箱验证码登录、会话恢复、资产读取',
    statusResolver: () => ({
      ...onchainosWalletAdapter.getStatus(),
      supportedMethods: getReadyProviderMethods('okx-agentic-wallet'),
    }),
  },
  {
    id: 'okx-dex-swap',
    label: 'OKX DEX Swap',
    domain: 'onchain',
    transport: 'okx-onchainos-adapter',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: 'OKX Swap 报价和执行',
    statusResolver: () =>
      okxOnchainHttpClient.getProviderStatus({
        limitation:
          '当前开放 quote 和 swap data；签名、广播和最终执行仍由授权链路锁定。',
        supportedMethods: getReadyProviderMethods('okx-dex-swap'),
      }),
  },
  {
    id: 'okx-dex-strategy',
    label: 'OKX DEX Strategy',
    domain: 'onchain',
    transport: 'okx-onchainos-skill',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: '链上策略组合、策略信号解释和执行计划辅助',
  },
  {
    id: 'okx-dex-signal',
    label: 'OKX DEX Signal',
    domain: 'onchain',
    transport: 'okx-onchainos-skill',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: '聪明钱、鲸鱼、KOL 和链上买入信号读取',
    statusResolver: () =>
      okxOnchainHttpClient.getProviderStatus({
        limitation:
          '当前开放 signal/list 最新买入方向信号读取；信号只作为策略观察输入，不直接触发交易。',
        supportedMethods: getReadyProviderMethods('okx-dex-signal'),
      }),
  },
  {
    id: 'okx-dex-token',
    label: 'OKX DEX Token',
    domain: 'onchain',
    transport: 'okx-onchainos-skill',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: 'Token 风险、持仓集中度、交易热度和链上画像分析',
    statusResolver: () =>
      okxOnchainHttpClient.getProviderStatus({
        limitation:
          '当前开放 token/search 与 token/advanced-info 只读画像；安全结论仍由 OKX Security token-scan 提供。',
        supportedMethods: getReadyProviderMethods('okx-dex-token'),
      }),
  },
  {
    id: 'okx-dex-market',
    label: 'OKX DEX Market',
    domain: 'onchain',
    transport: 'okx-onchainos-skill',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: 'DEX 行情、K 线、趋势和市场观察',
    statusResolver: () =>
      okxOnchainHttpClient.getProviderStatus({
        limitation:
          '当前开放 Hot Token 只读趋势读取；不会从市场数据直接触发资产动作。',
        supportedMethods: getReadyProviderMethods('okx-dex-market'),
      }),
  },
  {
    id: 'okx-security',
    label: 'OKX Security',
    domain: 'onchain',
    transport: 'okx-onchainos-adapter',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: '交易、签名、Token 和 DApp 风险扫描',
    statusResolver: () =>
      okxOnchainHttpClient.getProviderStatus({
        limitation:
          '当前开放 token-scan 风控输入；tx-scan、sig-scan、dapp-scan 和 approvals 后续独立接入。',
        supportedMethods: getReadyProviderMethods('okx-security'),
      }),
  },
  {
    id: 'okx-onchain-gateway',
    label: 'OKX Onchain Gateway',
    domain: 'onchain',
    transport: 'okx-onchainos-adapter',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: 'gas 估算、交易模拟、广播和状态追踪',
    statusResolver: () =>
      okxOnchainHttpClient.getProviderStatus({
        limitation:
          '当前只开放 simulate 和 DEX txHash 状态追踪；broadcast 仍由授权链路锁定。',
        supportedMethods: getReadyProviderMethods('okx-onchain-gateway'),
      }),
  },
  {
    id: 'okx-defi-invest',
    label: 'OKX DeFi Invest',
    domain: 'onchain',
    transport: 'okx-onchainos-adapter',
    requiredEnv: serverOnlyOkxEnv,
    requiredFor: 'DeFi 产品查询、存入、赎回和收益领取',
  },
]

function listOkxProviderAdapters() {
  return providerDefinitions.map(createProviderStatus)
}

function getOkxProviderAdapter(providerId) {
  const provider = providerDefinitions.find((item) => item.id === providerId)

  return provider ? createProviderStatus(provider) : null
}

function getHSkillBindingStatus(wrapper) {
  const provider = getOkxProviderAdapter(wrapper.providerSkill)
  const binding = getHSkillAdapterBinding(wrapper.id)

  if (!provider) {
    return {
      adapterStatus: 'unknown',
      hSkillWrapperId: wrapper.id,
      providerSkill: wrapper.providerSkill,
      reason: 'H Skill Wrapper 指向的 provider 未注册。',
      status: 'blocked',
    }
  }

  if (!binding) {
    return {
      adapterStatus: 'unknown',
      credentialBoundary: provider.credentialBoundary,
      credentialLabel: provider.credentialLabel,
      hSkillWrapperId: wrapper.id,
      providerSkill: wrapper.providerSkill,
      providerLabel: provider.label,
      reason: 'H Skill Wrapper 尚未注册 provider adapter binding。',
      status: 'blocked',
      wrapperStatus: wrapper.status,
    }
  }

  const contractReady = wrapper.status === 'contract-ready'
  const localRuntimeReady = getLocalRuntimeStatus(wrapper)

  if (localRuntimeReady) {
    return {
      adapterStatus: localRuntimeReady.adapterStatus,
      credentialBoundary: provider.credentialBoundary,
      credentialLabel: provider.credentialLabel,
      hSkillWrapperId: wrapper.id,
      requiredProviderMethod: binding.providerMethod,
      providerSkill: wrapper.providerSkill,
      providerLabel: provider.label,
      reason: localRuntimeReady.reason,
      status: contractReady ? 'ready' : 'blocked',
      wrapperStatus: wrapper.status,
    }
  }

  const requiredProviderMethod = binding.providerMethod
  const bindingReady = binding.adapterStatus === 'ready'
  const methodReady =
    !requiredProviderMethod ||
    !Array.isArray(provider.supportedMethods) ||
    provider.supportedMethods.includes(requiredProviderMethod)
  const providerReady = provider.status === 'ready'
  const adapterReady = providerReady && methodReady && bindingReady
  const ready = contractReady && adapterReady

  return {
    adapterStatus: binding.adapterStatus,
    adapterExecutionMode: binding.executionMode,
    adapterFailStrategy: binding.failStrategy,
    adapterUserVisibleMode: binding.userVisibleMode,
    credentialBoundary: provider.credentialBoundary,
    credentialLabel: provider.credentialLabel,
    hSkillWrapperId: wrapper.id,
    requiredProviderMethod,
    providerConnectionStatus: provider.status,
    providerSkill: wrapper.providerSkill,
    providerLabel: provider.label,
    reason: ready
      ? 'Provider adapter 已就绪。'
      : !contractReady
        ? `H Skill Wrapper 当前状态为 ${wrapper.status}，产品执行面还未开放。`
        : !bindingReady
          ? getBindingBlockedReason(binding)
          : methodReady
            ? provider.reason
            : `Provider adapter 已接入，但 ${requiredProviderMethod} 方法仍未开放。`,
    status: ready ? 'ready' : 'blocked',
    wrapperStatus: wrapper.status,
  }
}

function getLocalRuntimeStatus(wrapper) {
  if (wrapper.id === 'H.skill.strategy.composePlan') {
    return {
      adapterStatus: 'local-runtime',
      reason:
        'H Wallet 本地策略组合运行时已就绪；这里只生成 OKX Skill 调用计划，不执行资产动作。',
    }
  }

  return null
}

function listEnvironmentRequirements() {
  const requirementMap = new Map()

  for (const provider of providerDefinitions) {
    for (const envName of provider.requiredEnv) {
      const existing = requirementMap.get(envName)
      const requiredFor = existing
        ? `${existing.requiredFor}；${provider.requiredFor}`
        : provider.requiredFor

      requirementMap.set(envName, {
        name: envName,
        requiredFor,
        expected: getExpectedValue(envName),
        configured: isEnvConfigured(envName),
      })
    }
  }

  return Array.from(requirementMap.values())
}

function createProviderStatus(provider) {
  if (provider.statusResolver) {
    const status = provider.statusResolver()

    return {
      id: provider.id,
      label: provider.label,
      domain: provider.domain,
      transport: provider.transport,
      requiredEnv: provider.requiredEnv,
      requiredFor: provider.requiredFor,
      serverOnly: true,
      ...officialCredentialProfile,
      limitation: status.limitation,
      status: status.status,
      supportedMethods: status.supportedMethods,
      reason: status.reason,
    }
  }

  const configured = provider.requiredEnv.every(isEnvConfigured)

  return {
    id: provider.id,
    label: provider.label,
    domain: provider.domain,
    transport: provider.transport,
    requiredEnv: provider.requiredEnv,
    requiredFor: provider.requiredFor,
    serverOnly: true,
    ...officialCredentialProfile,
    status: configured ? 'adapter-shell' : 'not-configured',
    reason: configured
      ? '服务端密钥已配置，但真实 provider adapter 仍需接入命令/HTTP 调用。'
      : `等待服务端配置 ${provider.requiredEnv.join(' / ')}。`,
  }
}

function isEnvConfigured(envName) {
  if (envName === 'H_AGENT_ONCHAINOS_AUTH_MODE') {
    return process.env.H_AGENT_ONCHAINOS_AUTH_MODE === 'cli'
  }

  return Boolean(process.env[envName]) || getEnvAliases(envName).some(Boolean)
}

function getEnvAliases(envName) {
  return (envAliases[envName] ?? []).map((alias) => process.env[alias])
}

function getExpectedValue(envName) {
  if (envName === 'H_AGENT_ONCHAINOS_AUTH_MODE') {
    return 'cli'
  }

  if (envName === 'ONCHAINOS_CLI_PATH') {
    return '/absolute/path/to/onchainos'
  }

  return 'server-only'
}

function getBindingBlockedReason(binding) {
  if (binding.adapterStatus === 'adapter-shell') {
    return 'H Skill Adapter binding 已注册，但真实 provider adapter 调用仍未接入。'
  }

  if (binding.adapterStatus === 'blocked-until-authorization-runtime') {
    return 'H Skill Adapter binding 已注册，但必须等待授权运行时和执行回执链路开放。'
  }

  return `H Skill Adapter binding 状态为 ${binding.adapterStatus}，暂不能执行。`
}

module.exports = {
  getHSkillBindingStatus,
  getOkxProviderAdapter,
  listEnvironmentRequirements,
  listOkxProviderAdapters,
}
