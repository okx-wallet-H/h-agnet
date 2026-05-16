const adapterDefinitions = [
  {
    wrapperId: 'H.skill.wallet.getPortfolio',
    providerSkill: 'okx-agentic-wallet',
    providerMethod: 'walletBalance',
    adapterStatus: 'ready',
    executionMode: 'read-only-adapter',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'collapsible-process',
  },
  {
    wrapperId: 'H.skill.strategy.composePlan',
    providerSkill: 'okx-dex-strategy',
    providerMethod: 'localComposePlan',
    adapterStatus: 'local-runtime',
    executionMode: 'strategy-composition',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'collapsible-process',
  },
  {
    wrapperId: 'H.skill.market.readDexTrends',
    providerSkill: 'okx-dex-market',
    providerMethod: 'hotToken',
    adapterStatus: 'ready',
    executionMode: 'read-only-adapter',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'collapsible-process',
    docs: [
      {
        label: 'OKX OnchainOS Hot Token API',
        url: 'https://web3.okx.com/zh-hans/onchainos/dev-docs/market/market-token-hot-token',
      },
    ],
  },
  {
    wrapperId: 'H.skill.signal.readOnchainSignals',
    providerSkill: 'okx-dex-signal',
    providerMethod: 'signalList',
    adapterStatus: 'ready',
    executionMode: 'read-only-adapter',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'collapsible-process',
    docs: [
      {
        label: 'OKX OnchainOS Signal List API',
        url: 'https://web3.okx.com/zh-hans/onchainos/dev-docs/market/market-signal-list',
      },
    ],
  },
  {
    wrapperId: 'H.skill.token.analyzeRisk',
    providerSkill: 'okx-dex-token',
    providerMethod: 'tokenSearch',
    adapterStatus: 'ready',
    executionMode: 'read-only-adapter',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'collapsible-process',
    docs: [
      {
        label: 'OKX OnchainOS Token Search API',
        url: 'https://web3.okx.com/zh-hans/onchainos/dev-docs/market/market-token-search',
      },
      {
        label: 'OKX OnchainOS Token Advanced Info API',
        url: 'https://web3.okx.com/zh-hans/onchainos/dev-docs/market/market-token-advanced-info',
      },
    ],
  },
  {
    wrapperId: 'H.skill.swap.quote',
    providerSkill: 'okx-dex-swap',
    providerMethod: 'quote',
    adapterStatus: 'ready',
    executionMode: 'read-only-adapter',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'card-output',
  },
  {
    wrapperId: 'H.skill.risk.scanTransaction',
    providerSkill: 'okx-security',
    providerMethod: 'tokenScan',
    adapterStatus: 'ready',
    executionMode: 'risk-gate',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'collapsible-process',
    docs: [
      {
        label: 'OKX Agentic Wallet Security Detection',
        url: 'https://web3.okx.com/onchainos/dev-docs/wallet/agentic-wallet-skills',
      },
    ],
  },
  {
    wrapperId: 'H.skill.gateway.simulate',
    providerSkill: 'okx-onchain-gateway',
    providerMethod: 'simulate',
    adapterStatus: 'ready',
    executionMode: 'simulation-gate',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'collapsible-process',
  },
  {
    wrapperId: 'H.skill.swap.execute',
    providerSkill: 'okx-dex-swap',
    providerMethod: 'swapData',
    adapterStatus: 'ready',
    executionMode: 'transaction-build-adapter',
    assetImpact: 'prepare-transaction',
    failStrategy: 'block-on-error',
    userVisibleMode: 'card-output',
  },
  {
    wrapperId: 'H.skill.gateway.broadcast',
    providerSkill: 'okx-onchain-gateway',
    providerMethod: 'broadcast',
    adapterStatus: 'blocked-until-authorization-runtime',
    executionMode: 'broadcast-gate',
    assetImpact: 'broadcast-transaction',
    failStrategy: 'block-on-error',
    userVisibleMode: 'card-output',
  },
  {
    wrapperId: 'H.skill.gateway.trackOrder',
    providerSkill: 'okx-onchain-gateway',
    providerMethod: 'trackOrder',
    adapterStatus: 'ready',
    executionMode: 'verification-gate',
    assetImpact: 'none',
    failStrategy: 'block-on-error',
    userVisibleMode: 'card-output',
  },
  {
    wrapperId: 'H.skill.defi.deposit',
    providerSkill: 'okx-defi-invest',
    providerMethod: 'deposit',
    adapterStatus: 'adapter-shell',
    executionMode: 'earning-action',
    assetImpact: 'asset-changing',
    failStrategy: 'block-on-error',
    userVisibleMode: 'card-output',
  },
  {
    wrapperId: 'H.skill.defi.claim',
    providerSkill: 'okx-defi-invest',
    providerMethod: 'claim',
    adapterStatus: 'adapter-shell',
    executionMode: 'earning-action',
    assetImpact: 'asset-changing',
    failStrategy: 'block-on-error',
    userVisibleMode: 'card-output',
  },
]

function listHSkillAdapterBindings() {
  return adapterDefinitions.map(clone)
}

function getHSkillAdapterBinding(wrapperId) {
  const binding = adapterDefinitions.find((item) => item.wrapperId === wrapperId)

  return binding ? clone(binding) : null
}

function getProviderMethods(providerSkill) {
  return adapterDefinitions
    .filter((item) => item.providerSkill === providerSkill)
    .map((item) => ({
      adapterStatus: item.adapterStatus,
      assetImpact: item.assetImpact,
      executionMode: item.executionMode,
      failStrategy: item.failStrategy,
      providerMethod: item.providerMethod,
      wrapperId: item.wrapperId,
    }))
}

function getReadyProviderMethods(providerSkill) {
  return getProviderMethods(providerSkill)
    .filter((item) => item.adapterStatus === 'ready')
    .map((item) => item.providerMethod)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

module.exports = {
  getHSkillAdapterBinding,
  getProviderMethods,
  getReadyProviderMethods,
  listHSkillAdapterBindings,
}
