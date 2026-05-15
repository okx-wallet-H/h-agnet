const {
  strategySkillRepository,
} = require('../repositories/strategySkillRepository')
const onchainosWalletAdapter = require('../adapters/onchainosWalletAdapter')
const {
  getHSkillBindingStatus,
} = require('../adapters/okxProviderRegistry')

function getHSkillRuntimeStatus() {
  const wrappers = strategySkillRepository.listHSkillWrappers()
  const invocations = strategySkillRepository.listHSkillInvocations()

  return {
    status: 'contract-ready',
    realExecutionEnabled: false,
    hSkillBindings: wrappers.map(getHSkillBindingStatus),
    wrapperCount: wrappers.length,
    invocationCount: invocations.length,
    lastInvocation: invocations[0] ?? null,
    policy: {
      mode: 'dry-run-only',
      reason: '当前阶段只验证 H Skill 调用协议，不调用真实 OKX OnchainOS 能力。',
    },
  }
}

function createHSkillDryRun(input) {
  const wrapperId = validateText(input?.wrapperId, 'wrapperId')
  const wrapper = strategySkillRepository.findHSkillWrapperById(wrapperId)

  if (!wrapper) {
    const error = new Error('H Skill Wrapper 不存在。')
    error.statusCode = 404
    error.code = 'h-skill-wrapper-not-found'
    throw error
  }

  const invocation = {
    id: `h-skill-invocation-${Date.now()}`,
    wrapperId: wrapper.id,
    providerSkill: wrapper.providerSkill,
    status: 'blocked',
    executionMode: 'dry-run-only',
    createdAt: new Date().toISOString(),
    inputSummary: summarizeInput(input?.input),
    result: {
      ok: false,
      code: 'provider-adapter-not-connected',
      message: 'H Skill Wrapper 协议已识别，但真实 provider adapter 尚未接入。',
    },
  }

  return {
    invocation: strategySkillRepository.insertHSkillInvocation(invocation),
    wrapper,
  }
}

async function invokeHSkill(input) {
  const wrapperId = validateText(input?.wrapperId, 'wrapperId')
  const wrapper = strategySkillRepository.findHSkillWrapperById(wrapperId)

  if (!wrapper) {
    const error = new Error('H Skill Wrapper 不存在。')
    error.statusCode = 404
    error.code = 'h-skill-wrapper-not-found'
    throw error
  }

  if (wrapper.id === 'H.skill.wallet.getPortfolio') {
    return invokeWalletPortfolio(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.risk.scanTransaction') {
    return invokeRiskScanTransaction(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.gateway.simulate') {
    return invokeGatewaySimulate(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.swap.quote') {
    return invokeSwapQuote(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.swap.execute') {
    return invokeSwapExecute(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.gateway.broadcast') {
    return invokeGatewayBroadcast(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.gateway.trackOrder') {
    return invokeGatewayTrackOrder(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.defi.deposit') {
    return invokeDefiDeposit(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.defi.claim') {
    return invokeDefiClaim(wrapper, input?.input)
  }

  return recordBlockedInvocation({
    wrapper,
    input: input?.input,
    code: 'provider-adapter-not-connected',
    message: '这个 H Skill Wrapper 尚未接入真实 provider adapter。',
  })
}

function listHSkillInvocations() {
  return strategySkillRepository.listHSkillInvocations()
}

async function invokeWalletPortfolio(wrapper, input) {
  const adapterStatus = onchainosWalletAdapter.getStatus()

  if (adapterStatus.status !== 'ready') {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: 'provider-adapter-not-configured',
      message: adapterStatus.reason,
    })
  }

  try {
    const output = await onchainosWalletAdapter.getBalance()
    const invocation = {
      id: `h-skill-invocation-${Date.now()}`,
      wrapperId: wrapper.id,
      providerSkill: wrapper.providerSkill,
      status: 'completed',
      executionMode: 'read-only-adapter',
      createdAt: new Date().toISOString(),
      inputSummary: summarizeInput(input),
      result: {
        ok: true,
        code: 'wallet-portfolio-read',
        message: '已通过 OnchainOS 读取 Agent Wallet 资产快照。',
        data: output,
      },
    }

    return {
      invocation: strategySkillRepository.insertHSkillInvocation(invocation),
      wrapper,
    }
  } catch (error) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: 'provider-adapter-error',
      message:
        error instanceof Error
          ? error.message
          : '读取 Agent Wallet 资产失败。',
    })
  }
}

async function invokeRiskScanTransaction(wrapper, input) {
  const validation = validateRiskScanInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        riskGate: 'blocked',
        scanType: 'tx-scan',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'security-adapter-not-connected',
    message:
      '交易风险扫描协议已识别；真实 okx-security tx-scan adapter 尚未接入。扫描失败不能视为安全通过。',
    resultData: {
      riskGate: 'blocked',
      scanType: 'tx-scan',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-security',
    },
  })
}

async function invokeGatewaySimulate(wrapper, input) {
  const validation = validateGatewaySimulateInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        simulationGate: 'blocked',
        simulationType: 'gateway-simulate',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'gateway-adapter-not-connected',
    message:
      '链上模拟协议已识别；真实 okx-onchain-gateway simulate adapter 尚未接入。模拟失败不能视为可执行。',
    resultData: {
      simulationGate: 'blocked',
      simulationType: 'gateway-simulate',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-onchain-gateway',
    },
  })
}

async function invokeSwapQuote(wrapper, input) {
  const validation = validateSwapQuoteInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        swapGate: 'blocked',
        quoteProvider: 'okx-dex-swap',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'okx-swap-adapter-not-connected',
    message:
      'OKX Swap 报价协议已识别；真实 okx-dex-swap quote adapter 尚未接入。H Wallet 不生成自有报价或路线。',
    resultData: {
      swapGate: 'blocked',
      quoteProvider: 'okx-dex-swap',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-dex-swap',
    },
  })
}

async function invokeSwapExecute(wrapper, input) {
  const validation = validateSwapExecuteInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        swapGate: 'blocked',
        executionProvider: 'okx-dex-swap',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'okx-swap-execute-adapter-not-connected',
    message:
      'OKX Swap 执行协议已识别；真实 okx-dex-swap execute adapter 尚未接入。H Wallet 不签名、不广播、不自建交易执行。',
    resultData: {
      swapGate: 'blocked',
      executionProvider: 'okx-dex-swap',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-dex-swap',
      executionOwner: 'OKX',
    },
  })
}

async function invokeGatewayBroadcast(wrapper, input) {
  const validation = validateGatewayBroadcastInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        broadcastGate: 'blocked',
        broadcastProvider: 'okx-onchain-gateway',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'gateway-broadcast-adapter-not-connected',
    message:
      '链上广播协议已识别；真实 okx-onchain-gateway broadcast adapter 尚未接入。H Wallet 不自行广播交易。',
    resultData: {
      broadcastGate: 'blocked',
      broadcastProvider: 'okx-onchain-gateway',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-onchain-gateway',
    },
  })
}

async function invokeGatewayTrackOrder(wrapper, input) {
  const validation = validateGatewayTrackOrderInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        trackingGate: 'blocked',
        trackingProvider: 'okx-onchain-gateway',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'gateway-orders-adapter-not-connected',
    message:
      '交易状态追踪协议已识别；真实 okx-onchain-gateway orders adapter 尚未接入。H Wallet 不伪造交易状态。',
    resultData: {
      trackingGate: 'blocked',
      trackingProvider: 'okx-onchain-gateway',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-onchain-gateway',
    },
  })
}

async function invokeDefiDeposit(wrapper, input) {
  const validation = validateDefiDepositInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        defiGate: 'blocked',
        defiProvider: 'okx-defi-invest',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'defi-invest-adapter-not-connected',
    message:
      'DeFi 存入协议已识别；真实 okx-defi-invest adapter 尚未接入。H Wallet 不选择收益产品、不生成 calldata、不执行链上存入。',
    resultData: {
      defiGate: 'blocked',
      defiProvider: 'okx-defi-invest',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-defi-invest',
      requiredPrechecks: [
        'fresh-product-detail',
        'wallet-balance-check',
        'risk-scan',
        'gateway-simulation',
        'authorization-scope',
      ],
    },
  })
}

async function invokeDefiClaim(wrapper, input) {
  const validation = validateDefiClaimInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        defiGate: 'blocked',
        defiProvider: 'okx-defi-invest',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'defi-claim-adapter-not-connected',
    message:
      'DeFi 收益领取协议已识别；真实 okx-defi-invest collect adapter 尚未接入。H Wallet 不伪造收益、不伪造领取状态。',
    resultData: {
      defiGate: 'blocked',
      defiProvider: 'okx-defi-invest',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-defi-invest',
      requiredPrechecks: [
        'fresh-position-detail',
        'risk-scan',
        'gateway-simulation',
        'authorization-scope',
      ],
    },
  })
}

function recordBlockedInvocation({ wrapper, input, code, message, resultData }) {
  const invocation = {
    id: `h-skill-invocation-${Date.now()}`,
    wrapperId: wrapper.id,
    providerSkill: wrapper.providerSkill,
    status: 'blocked',
    executionMode: 'read-only-adapter',
    createdAt: new Date().toISOString(),
    inputSummary: summarizeInput(input),
    result: {
      ok: false,
      code,
      message,
      data: resultData,
    },
  }

  return {
    invocation: strategySkillRepository.insertHSkillInvocation(invocation),
    wrapper,
  }
}

function validateRiskScanInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'risk-scan-input-required',
      message: '风险扫描需要交易上下文输入。',
    }
  }

  const chain = typeof input.chain === 'string' ? input.chain.trim() : ''
  const transaction =
    typeof input.transaction === 'string' ? input.transaction.trim() : ''
  const calldata =
    typeof input.calldata === 'string' ? input.calldata.trim() : ''

  if (!chain) {
    return {
      ok: false,
      code: 'risk-scan-chain-required',
      message: '风险扫描需要 chain。',
    }
  }

  if (!transaction && !calldata) {
    return {
      ok: false,
      code: 'risk-scan-transaction-required',
      message: '风险扫描需要 transaction 或 calldata。',
    }
  }

  return { ok: true }
}

function validateGatewaySimulateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'gateway-simulate-input-required',
      message: '链上模拟需要交易上下文输入。',
    }
  }

  const chain = typeof input.chain === 'string' ? input.chain.trim() : ''
  const from = typeof input.from === 'string' ? input.from.trim() : ''
  const to = typeof input.to === 'string' ? input.to.trim() : ''
  const data = typeof input.data === 'string' ? input.data.trim() : ''

  if (!chain) {
    return {
      ok: false,
      code: 'gateway-simulate-chain-required',
      message: '链上模拟需要 chain。',
    }
  }

  if (!from) {
    return {
      ok: false,
      code: 'gateway-simulate-from-required',
      message: '链上模拟需要 from 地址。',
    }
  }

  if (!to) {
    return {
      ok: false,
      code: 'gateway-simulate-to-required',
      message: '链上模拟需要 to 地址。',
    }
  }

  if (!data) {
    return {
      ok: false,
      code: 'gateway-simulate-data-required',
      message: '链上模拟需要 data。',
    }
  }

  return { ok: true }
}

function validateSwapQuoteInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'swap-quote-input-required',
      message: 'OKX Swap 报价需要交易意图输入。',
    }
  }

  const chain = typeof input.chain === 'string' ? input.chain.trim() : ''
  const fromToken =
    typeof input.fromToken === 'string' ? input.fromToken.trim() : ''
  const toToken = typeof input.toToken === 'string' ? input.toToken.trim() : ''
  const amount = typeof input.amount === 'string' ? input.amount.trim() : ''

  if (!chain) {
    return {
      ok: false,
      code: 'swap-quote-chain-required',
      message: 'OKX Swap 报价需要 chain。',
    }
  }

  if (!fromToken) {
    return {
      ok: false,
      code: 'swap-quote-from-token-required',
      message: 'OKX Swap 报价需要 fromToken。',
    }
  }

  if (!toToken) {
    return {
      ok: false,
      code: 'swap-quote-to-token-required',
      message: 'OKX Swap 报价需要 toToken。',
    }
  }

  if (!amount) {
    return {
      ok: false,
      code: 'swap-quote-amount-required',
      message: 'OKX Swap 报价需要 amount。',
    }
  }

  return { ok: true }
}

function validateSwapExecuteInput(input) {
  const quoteValidation = validateSwapQuoteInput(input)

  if (!quoteValidation.ok) {
    return {
      ...quoteValidation,
      code: quoteValidation.code.replace('swap-quote', 'swap-execute'),
      message: quoteValidation.message.replace('报价', '执行'),
    }
  }

  const wallet = typeof input.wallet === 'string' ? input.wallet.trim() : ''
  const authorizationScope =
    typeof input.authorizationScope === 'string'
      ? input.authorizationScope.trim()
      : ''

  if (!wallet) {
    return {
      ok: false,
      code: 'swap-execute-wallet-required',
      message: 'OKX Swap 执行需要 wallet。',
    }
  }

  if (!authorizationScope) {
    return {
      ok: false,
      code: 'swap-execute-authorization-required',
      message: 'OKX Swap 执行需要授权范围。',
    }
  }

  return { ok: true }
}

function validateGatewayBroadcastInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'gateway-broadcast-input-required',
      message: '链上广播需要交易上下文输入。',
    }
  }

  const chain = typeof input.chain === 'string' ? input.chain.trim() : ''
  const signedTx =
    typeof input.signedTx === 'string' ? input.signedTx.trim() : ''
  const address = typeof input.address === 'string' ? input.address.trim() : ''
  const authorizationScope =
    typeof input.authorizationScope === 'string'
      ? input.authorizationScope.trim()
      : ''

  if (!chain) {
    return {
      ok: false,
      code: 'gateway-broadcast-chain-required',
      message: '链上广播需要 chain。',
    }
  }

  if (!signedTx) {
    return {
      ok: false,
      code: 'gateway-broadcast-signed-tx-required',
      message: '链上广播需要 signedTx。',
    }
  }

  if (!address) {
    return {
      ok: false,
      code: 'gateway-broadcast-address-required',
      message: '链上广播需要 address。',
    }
  }

  if (!authorizationScope) {
    return {
      ok: false,
      code: 'gateway-broadcast-authorization-required',
      message: '链上广播需要授权范围。',
    }
  }

  return { ok: true }
}

function validateGatewayTrackOrderInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'gateway-track-input-required',
      message: '交易状态追踪需要查询上下文输入。',
    }
  }

  const chain = typeof input.chain === 'string' ? input.chain.trim() : ''
  const address = typeof input.address === 'string' ? input.address.trim() : ''

  if (!chain) {
    return {
      ok: false,
      code: 'gateway-track-chain-required',
      message: '交易状态追踪需要 chain。',
    }
  }

  if (!address) {
    return {
      ok: false,
      code: 'gateway-track-address-required',
      message: '交易状态追踪需要 address。',
    }
  }

  return { ok: true }
}

function validateDefiDepositInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'defi-deposit-input-required',
      message: 'DeFi 存入需要策略产品和钱包上下文输入。',
    }
  }

  const chain = typeof input.chain === 'string' ? input.chain.trim() : ''
  const address = typeof input.address === 'string' ? input.address.trim() : ''
  const investmentId =
    typeof input.investmentId === 'string' ? input.investmentId.trim() : ''
  const token = typeof input.token === 'string' ? input.token.trim() : ''
  const amount = typeof input.amount === 'string' ? input.amount.trim() : ''
  const authorizationScope =
    typeof input.authorizationScope === 'string'
      ? input.authorizationScope.trim()
      : ''

  if (!chain) {
    return {
      ok: false,
      code: 'defi-deposit-chain-required',
      message: 'DeFi 存入需要 chain。',
    }
  }

  if (!address) {
    return {
      ok: false,
      code: 'defi-deposit-address-required',
      message: 'DeFi 存入需要 Agent Wallet 地址。',
    }
  }

  if (!investmentId) {
    return {
      ok: false,
      code: 'defi-deposit-investment-id-required',
      message: 'DeFi 存入需要后端策略选择出的 investmentId。',
    }
  }

  if (!token) {
    return {
      ok: false,
      code: 'defi-deposit-token-required',
      message: 'DeFi 存入需要 token。',
    }
  }

  if (!amount) {
    return {
      ok: false,
      code: 'defi-deposit-amount-required',
      message: 'DeFi 存入需要 amount。',
    }
  }

  if (!authorizationScope) {
    return {
      ok: false,
      code: 'defi-deposit-authorization-required',
      message: 'DeFi 存入需要授权范围。',
    }
  }

  return { ok: true }
}

function validateDefiClaimInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'defi-claim-input-required',
      message: 'DeFi 收益领取需要持仓和钱包上下文输入。',
    }
  }

  const chain = typeof input.chain === 'string' ? input.chain.trim() : ''
  const address = typeof input.address === 'string' ? input.address.trim() : ''
  const rewardType =
    typeof input.rewardType === 'string' ? input.rewardType.trim() : ''
  const positionDetailRef =
    typeof input.positionDetailRef === 'string'
      ? input.positionDetailRef.trim()
      : ''
  const authorizationScope =
    typeof input.authorizationScope === 'string'
      ? input.authorizationScope.trim()
      : ''

  if (!chain) {
    return {
      ok: false,
      code: 'defi-claim-chain-required',
      message: 'DeFi 收益领取需要 chain。',
    }
  }

  if (!address) {
    return {
      ok: false,
      code: 'defi-claim-address-required',
      message: 'DeFi 收益领取需要 Agent Wallet 地址。',
    }
  }

  if (!rewardType) {
    return {
      ok: false,
      code: 'defi-claim-reward-type-required',
      message: 'DeFi 收益领取需要 rewardType。',
    }
  }

  if (!positionDetailRef) {
    return {
      ok: false,
      code: 'defi-claim-position-detail-required',
      message: 'DeFi 收益领取需要最新 positionDetailRef，不能用过期持仓数据领取。',
    }
  }

  if (!authorizationScope) {
    return {
      ok: false,
      code: 'defi-claim-authorization-required',
      message: 'DeFi 收益领取需要授权范围。',
    }
  }

  return { ok: true }
}

function validateText(input, fieldName) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    const error = new Error(`${fieldName} 必须是非空字符串。`)
    error.statusCode = 400
    error.code = 'bad-request'
    throw error
  }

  return input.trim()
}

function summarizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.slice(0, 80) : typeof value,
    ]),
  )
}

module.exports = {
  createHSkillDryRun,
  getHSkillRuntimeStatus,
  invokeHSkill,
  listHSkillInvocations,
}
