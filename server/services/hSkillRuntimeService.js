const {
  strategySkillRepository,
} = require('../repositories/strategySkillRepository')
const onchainosWalletAdapter = require('../adapters/onchainosWalletAdapter')
const okxOnchainHttpClient = require('../adapters/okxOnchainHttpClient')
const {
  getHSkillBindingStatus,
} = require('../adapters/okxProviderRegistry')
const {
  evaluateAgentAuthorization,
} = require('./agentAuthorizationPolicyService')

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
      mode: 'read-preflight-only',
      reason:
        '当前已接入 OKX quote / simulate 等只读和预检能力；真实资产执行、广播、DeFi 存入仍未开放。',
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

  if (wrapper.id === 'H.skill.strategy.composePlan') {
    return invokeStrategyComposePlan(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.signal.readOnchainSignals') {
    return invokeSignalReadOnchainSignals(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.token.analyzeRisk') {
    return invokeTokenAnalyzeRisk(wrapper, input?.input)
  }

  if (wrapper.id === 'H.skill.market.readDexTrends') {
    return invokeMarketReadDexTrends(wrapper, input?.input)
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

async function invokeStrategyComposePlan(wrapper, input) {
  const strategyId = normalizeString(input?.strategyId)
  const strategy = strategyId
    ? strategySkillRepository.findStrategyById(strategyId)
    : null
  const wrappers = strategy
    ? strategy.requiredSkillWrappers
    : strategySkillRepository.listHSkillWrappers().map((item) => item.id)
  const composition = wrappers.map((wrapperId, index) => {
    const strategyWrapper =
      strategySkillRepository.findHSkillWrapperById(wrapperId)
    const binding = strategyWrapper
      ? getHSkillBindingStatus(strategyWrapper)
      : null

    return {
      order: index + 1,
      hSkillWrapperId: wrapperId,
      hSkillWrapperLabel: strategyWrapper?.label ?? '未注册 H Skill Wrapper',
      okxSkill: strategyWrapper?.providerSkill ?? 'unknown',
      bindingStatus: binding?.status ?? 'blocked',
      providerStatus: binding?.adapterStatus ?? 'unknown',
    }
  })

  return recordCompletedInvocation({
    wrapper,
    input,
    code: 'h-strategy-okx-composition-ready',
    executionMode: 'strategy-composition',
    message:
      '已生成 H Wallet 策略的 OKX skill 组合计划；这是编排计划，不执行资产动作。',
    resultData: {
      compositionGate: 'completed',
      action: 'observe',
      source: 'h-wallet-strategy-registry',
      externalProviderCalled: false,
      strategyId: strategy?.id ?? (strategyId || 'all-wrappers'),
      strategyVersion: strategy?.version ?? null,
      okxSkillCount: new Set(
        composition.map((item) => item.okxSkill).filter(Boolean),
      ).size,
      wrapperCount: composition.length,
      composition,
      rule:
        'H Wallet 负责策略顺序、授权范围、风控门和卡片语义；OKX skill 负责底层能力输出。',
    },
  })
}

async function invokeSignalReadOnchainSignals(wrapper, input) {
  const validation = validateSignalInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        signalGate: 'blocked',
        signalProvider: 'okx-dex-signal',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'dex-signal-adapter-not-connected',
    message:
      '链上信号读取协议已识别；真实 okx-dex-signal adapter 尚未接入。H Wallet 不伪造信号。',
    resultData: {
      signalGate: 'blocked',
      signalProvider: 'okx-dex-signal',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-dex-signal',
    },
  })
}

async function invokeTokenAnalyzeRisk(wrapper, input) {
  const validation = validateTokenAnalysisInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        tokenGate: 'blocked',
        tokenProvider: 'okx-dex-token',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'dex-token-adapter-not-connected',
    message:
      '代币画像协议已识别；真实 okx-dex-token adapter 尚未接入。H Wallet 不伪造风险标签或持仓画像。',
    resultData: {
      tokenGate: 'blocked',
      tokenProvider: 'okx-dex-token',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-dex-token',
    },
  })
}

async function invokeMarketReadDexTrends(wrapper, input) {
  const validation = validateMarketTrendInput(input)

  if (!validation.ok) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: validation.code,
      message: validation.message,
      resultData: {
        marketGate: 'blocked',
        marketProvider: 'okx-dex-market',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  return recordBlockedInvocation({
    wrapper,
    input,
    code: 'dex-market-adapter-not-connected',
    message:
      'DEX 市场趋势协议已识别；真实 okx-dex-market adapter 尚未接入。H Wallet 不伪造行情或趋势。',
    resultData: {
      marketGate: 'blocked',
      marketProvider: 'okx-dex-market',
      action: 'block',
      failSafe: true,
      requiredProviderSkill: 'okx-dex-market',
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

  try {
    const output = await okxOnchainHttpClient.simulateTransaction(
      mapGatewaySimulateInput(input),
    )

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-gateway-simulate-rejected',
        message:
          'OKX Transaction API 未返回成功模拟结果，当前交易不能进入执行状态。',
        resultData: {
          simulationGate: 'blocked',
          simulationType: 'gateway-simulate',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-gateway-simulation-completed',
      message: '已通过 OKX Transaction API 完成交易模拟。',
      resultData: {
        simulationGate: 'completed',
        simulationType: 'gateway-simulate',
        action: 'observe',
        provider: 'okx-onchain-gateway',
        source: 'okx-onchainos-api',
        providerResponse: output.response,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-gateway-simulate-error',
      fallbackMessage:
        'OKX Transaction API 模拟请求失败，模拟失败不能视为可执行。',
      error,
      resultData: {
        simulationGate: 'blocked',
        simulationType: 'gateway-simulate',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-onchain-gateway',
      },
    })
  }
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

  try {
    const output = await okxOnchainHttpClient.getSwapQuote(
      mapSwapQuoteInput(input),
    )

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-swap-quote-rejected',
        message:
          'OKX Swap 未返回成功报价，H Wallet 不生成自有报价或路线。',
        resultData: {
          swapGate: 'blocked',
          quoteProvider: 'okx-dex-swap',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-swap-quote-completed',
      message: '已通过 OKX DEX Swap API 获取真实报价。',
      resultData: {
        swapGate: 'quote-ready',
        quoteProvider: 'okx-dex-swap',
        action: 'observe',
        provider: 'okx-dex-swap',
        source: 'okx-onchainos-api',
        providerResponse: output.response,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-swap-quote-error',
      fallbackMessage:
        'OKX Swap 报价请求失败。H Wallet 不生成自有报价或路线。',
      error,
      resultData: {
        swapGate: 'blocked',
        quoteProvider: 'okx-dex-swap',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-dex-swap',
      },
    })
  }
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

  const authorization = evaluateAgentAuthorization({
    requiresAssetAction: true,
    scope: input.authorizationScope,
  })

  if (authorization.requiredUserAuthorization) {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: 'swap-execute-authorization-required',
      message: authorization.policyReason,
      resultData: {
        authorization,
        swapGate: 'blocked',
        executionProvider: 'okx-dex-swap',
        action: 'block',
        failSafe: true,
      },
    })
  }

  try {
    const output = await okxOnchainHttpClient.getSwapData(
      mapSwapExecutionInput(input),
    )

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-swap-data-rejected',
        message:
          'OKX Swap 未返回成功交易数据，H Wallet 不生成自有 calldata。',
        resultData: {
          authorization,
          swapGate: 'blocked',
          executionProvider: 'okx-dex-swap',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    if (!hasOkxSwapTransactionData(output.response)) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-swap-data-missing-transaction',
        message:
          'OKX Swap 响应缺少交易数据，H Wallet 不会进入签名或广播。',
        resultData: {
          authorization,
          swapGate: 'blocked',
          executionProvider: 'okx-dex-swap',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-swap-data-ready',
      executionMode: 'transaction-build-adapter',
      message:
        '已通过 OKX DEX Swap API 生成交易数据；尚未签名、广播或执行。',
      resultData: {
        authorization,
        swapGate: 'transaction-data-ready',
        executionProvider: 'okx-dex-swap',
        executionStatus: 'not-signed-not-broadcast',
        action: 'prepare',
        provider: 'okx-dex-swap',
        source: 'okx-onchainos-api',
        requiresSignature: true,
        requiresBroadcast: true,
        providerResponse: output.response,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-swap-data-error',
      fallbackMessage:
        'OKX Swap 交易数据请求失败。H Wallet 不生成自有 calldata。',
      error,
      resultData: {
        authorization,
        swapGate: 'blocked',
        executionProvider: 'okx-dex-swap',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-dex-swap',
      },
    })
  }
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

  try {
    const output = await okxOnchainHttpClient.getSwapHistory(
      mapGatewayTrackOrderInput(input),
    )

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-gateway-track-order-rejected',
        message:
          'OKX DEX History 未返回成功状态，H Wallet 不伪造交易结果。',
        resultData: {
          trackingGate: 'blocked',
          trackingProvider: 'okx-onchain-gateway',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    if (!hasOkxHistoryRecord(output.response)) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-gateway-track-order-not-found',
        message:
          'OKX DEX History 未找到交易记录，H Wallet 不会把空结果当作交易成功。',
        resultData: {
          trackingGate: 'blocked',
          trackingProvider: 'okx-onchain-gateway',
          action: 'observe',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-gateway-track-order-completed',
      message: '已通过 OKX DEX History 查询交易状态。',
      resultData: {
        trackingGate: 'completed',
        trackingProvider: 'okx-onchain-gateway',
        action: 'observe',
        provider: 'okx-dex-swap-history',
        source: 'okx-onchainos-api',
        status: extractOkxHistoryStatus(output.response),
        providerResponse: output.response,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-gateway-track-order-error',
      fallbackMessage:
        'OKX DEX History 查询失败。H Wallet 不伪造交易状态。',
      error,
      resultData: {
        trackingGate: 'blocked',
        trackingProvider: 'okx-onchain-gateway',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-onchain-gateway',
      },
    })
  }
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

function recordCompletedInvocation({
  wrapper,
  input,
  code,
  executionMode = 'read-only-adapter',
  message,
  resultData,
}) {
  const invocation = {
    id: `h-skill-invocation-${Date.now()}`,
    wrapperId: wrapper.id,
    providerSkill: wrapper.providerSkill,
    status: 'completed',
    executionMode,
    createdAt: new Date().toISOString(),
    inputSummary: summarizeInput(input),
    result: {
      ok: true,
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

function recordProviderErrorInvocation({
  wrapper,
  input,
  code,
  fallbackMessage,
  error,
  resultData,
}) {
  return recordBlockedInvocation({
    wrapper,
    input,
    code,
    message:
      error instanceof Error && error.message
        ? error.message
        : fallbackMessage,
    resultData: {
      ...resultData,
      providerError: getProviderErrorData(error),
    },
  })
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

function validateSignalInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'signal-input-required',
      message: '链上信号读取需要策略或市场上下文输入。',
    }
  }

  const strategyId = normalizeString(input.strategyId)
  const token = normalizeString(input.token)
  const tokenAddress = normalizeString(input.tokenAddress)
  const chain = normalizeString(input.chain)
  const watchlistId = normalizeString(input.watchlistId)

  if (!strategyId && !token && !tokenAddress && !chain && !watchlistId) {
    return {
      ok: false,
      code: 'signal-context-required',
      message:
        '链上信号读取需要 strategyId、token、tokenAddress、chain 或 watchlistId。',
    }
  }

  return { ok: true }
}

function validateTokenAnalysisInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'token-analysis-input-required',
      message: '代币画像分析需要 token 上下文输入。',
    }
  }

  const token = normalizeString(input.token)
  const tokenAddress = normalizeString(input.tokenAddress)
  const chain = normalizeString(input.chain)
  const chainIndex = normalizeString(input.chainIndex)

  if (!token && !tokenAddress) {
    return {
      ok: false,
      code: 'token-analysis-token-required',
      message: '代币画像分析需要 token 或 tokenAddress。',
    }
  }

  if (!chain && !chainIndex) {
    return {
      ok: false,
      code: 'token-analysis-chain-required',
      message: '代币画像分析需要 chain 或 chainIndex。',
    }
  }

  return { ok: true }
}

function validateMarketTrendInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      code: 'market-trend-input-required',
      message: 'DEX 市场趋势读取需要市场上下文输入。',
    }
  }

  const strategyId = normalizeString(input.strategyId)
  const token = normalizeString(input.token)
  const tokenAddress = normalizeString(input.tokenAddress)
  const chain = normalizeString(input.chain)
  const chainIndex = normalizeString(input.chainIndex)

  if (!strategyId && !token && !tokenAddress && !chain && !chainIndex) {
    return {
      ok: false,
      code: 'market-trend-context-required',
      message:
        'DEX 市场趋势读取需要 strategyId、token、tokenAddress、chain 或 chainIndex。',
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
  const chainIndex =
    typeof input.chainIndex === 'string' ? input.chainIndex.trim() : ''
  const from =
    typeof input.from === 'string'
      ? input.from.trim()
      : typeof input.fromAddress === 'string'
        ? input.fromAddress.trim()
        : ''
  const to =
    typeof input.to === 'string'
      ? input.to.trim()
      : typeof input.toAddress === 'string'
        ? input.toAddress.trim()
        : ''
  const data =
    typeof input.data === 'string'
      ? input.data.trim()
      : typeof input.inputData === 'string'
        ? input.inputData.trim()
        : ''

  if (!chain && !chainIndex) {
    return {
      ok: false,
      code: 'gateway-simulate-chain-required',
      message: '链上模拟需要 chain 或 chainIndex。',
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
  const fromTokenAddress =
    typeof input.fromTokenAddress === 'string'
      ? input.fromTokenAddress.trim()
      : ''
  const toToken = typeof input.toToken === 'string' ? input.toToken.trim() : ''
  const toTokenAddress =
    typeof input.toTokenAddress === 'string'
      ? input.toTokenAddress.trim()
      : ''
  const amount = typeof input.amount === 'string' ? input.amount.trim() : ''

  const chainIndex =
    typeof input.chainIndex === 'string' ? input.chainIndex.trim() : ''

  if (!chain && !chainIndex) {
    return {
      ok: false,
      code: 'swap-quote-chain-required',
      message: 'OKX Swap 报价需要 chain 或 chainIndex。',
    }
  }

  if (!fromToken && !fromTokenAddress) {
    return {
      ok: false,
      code: 'swap-quote-from-token-required',
      message: 'OKX Swap 报价需要 fromToken 或 fromTokenAddress。',
    }
  }

  if (!toToken && !toTokenAddress) {
    return {
      ok: false,
      code: 'swap-quote-to-token-required',
      message: 'OKX Swap 报价需要 toToken 或 toTokenAddress。',
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
  const userWalletAddress =
    typeof input.userWalletAddress === 'string'
      ? input.userWalletAddress.trim()
      : ''
  const slippagePercent =
    typeof input.slippagePercent === 'string'
      ? input.slippagePercent.trim()
      : ''
  const authorizationScope =
    typeof input.authorizationScope === 'string'
      ? input.authorizationScope.trim()
      : ''

  if (!wallet && !userWalletAddress) {
    return {
      ok: false,
      code: 'swap-execute-wallet-required',
      message: 'OKX Swap 执行需要 wallet 或 userWalletAddress。',
    }
  }

  if (!slippagePercent) {
    return {
      ok: false,
      code: 'swap-execute-slippage-required',
      message: 'OKX Swap 执行需要 slippagePercent。',
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
  const chainIndex =
    typeof input.chainIndex === 'string' ? input.chainIndex.trim() : ''
  const txHash = typeof input.txHash === 'string' ? input.txHash.trim() : ''

  if (!chain && !chainIndex) {
    return {
      ok: false,
      code: 'gateway-track-chain-required',
      message: '交易状态追踪需要 chain 或 chainIndex。',
    }
  }

  if (!txHash) {
    return {
      ok: false,
      code: 'gateway-track-tx-hash-required',
      message: '交易状态追踪需要 txHash。',
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

function mapSwapQuoteInput(input) {
  const fromTokenAddress = getTokenAddress(input, 'fromToken')
  const toTokenAddress = getTokenAddress(input, 'toToken')

  return {
    amount: input.amount,
    chain: input.chain,
    chainIndex: input.chainIndex,
    dexIds: input.dexIds,
    directRoute: input.directRoute,
    excludeDexIds: input.excludeDexIds,
    excludePoolAddresses: input.excludePoolAddresses,
    fromTokenAddress,
    singlePoolPerHop: input.singlePoolPerHop,
    singleRouteOnly: input.singleRouteOnly,
    swapMode: input.swapMode,
    toTokenAddress,
  }
}

function mapSwapExecutionInput(input) {
  return {
    ...mapSwapQuoteInput(input),
    approveAmount: input.approveAmount,
    approveTransaction: input.approveTransaction,
    assetAwareRouting: input.assetAwareRouting,
    autoSlippage: input.autoSlippage,
    callDataMemo: input.callDataMemo,
    computeUnitLimit: input.computeUnitLimit,
    computeUnitPrice: input.computeUnitPrice,
    disableRFQ: input.disableRFQ,
    feePercent: input.feePercent,
    forJitoBundle: input.forJitoBundle,
    fromTokenReferrerWalletAddress: input.fromTokenReferrerWalletAddress,
    gasLevel: input.gasLevel,
    gasLimit: input.gasLimit,
    maxAccounts: input.maxAccounts,
    maxAutoSlippagePercent: input.maxAutoSlippagePercent,
    maxCalldataSize: input.maxCalldataSize,
    priceImpactProtectionPercent: input.priceImpactProtectionPercent,
    slippagePercent: input.slippagePercent,
    swapReceiverAddress: input.swapReceiverAddress,
    tips: input.tips,
    toTokenReferrerWalletAddress: input.toTokenReferrerWalletAddress,
    userWalletAddress: input.userWalletAddress ?? input.wallet,
    wallet: input.wallet,
  }
}

function mapGatewaySimulateInput(input) {
  return {
    chain: input.chain,
    chainIndex: input.chainIndex,
    data: input.data,
    from: input.from,
    fromAddress: input.fromAddress,
    gasPrice: input.gasPrice,
    inputData: input.inputData,
    priorityFee: input.priorityFee,
    to: input.to,
    toAddress: input.toAddress,
    txAmount: input.txAmount,
    value: input.value,
  }
}

function mapGatewayTrackOrderInput(input) {
  return {
    chain: input.chain,
    chainIndex: input.chainIndex,
    isFromMyProject: input.isFromMyProject,
    txHash: input.txHash,
  }
}

function extractOkxHistoryStatus(response) {
  const data = response?.data
  const record = Array.isArray(data) ? data[0] : data

  return typeof record?.status === 'string' ? record.status : 'unknown'
}

function hasOkxHistoryRecord(response) {
  const data = response?.data

  if (Array.isArray(data)) {
    return data.length > 0
  }

  return Boolean(data && typeof data === 'object')
}

function hasOkxSwapTransactionData(response) {
  const record = getOkxResponseRecord(response)

  return Boolean(record?.tx?.to && record?.tx?.data)
}

function getOkxResponseRecord(response) {
  const data = response?.data

  return Array.isArray(data) ? data[0] : data
}

function getTokenAddress(input, tokenField) {
  const addressField =
    tokenField === 'fromToken' ? 'fromTokenAddress' : 'toTokenAddress'
  const directAddress = normalizeString(input[addressField])

  if (directAddress) {
    return directAddress
  }

  const token = normalizeString(input[tokenField])

  if (isLikelyTokenAddress(token)) {
    return token
  }

  const error = new Error(
    `真实 OKX Swap Quote 需要 ${addressField}，不能只传 token symbol。`,
  )
  error.code = 'okx-token-address-required'
  throw error
}

function isLikelyTokenAddress(input) {
  if (!input) {
    return false
  }

  return /^0x[a-fA-F0-9]{40}$/.test(input)
}

function normalizeString(input) {
  return typeof input === 'string' && input.trim().length > 0
    ? input.trim()
    : ''
}

function getProviderErrorData(error) {
  if (!error || typeof error !== 'object') {
    return null
  }

  return {
    code: error.code ?? 'provider-error',
    data: error.data,
    statusCode: error.statusCode,
  }
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
