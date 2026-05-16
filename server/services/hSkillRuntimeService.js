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

const tokenRiskLabelMap = {
  isHoneypot: '貔貅盘 / 无法卖出',
  isRubbishAirdrop: '垃圾空投',
  isAirdropScam: 'Gas Mint 诈骗',
  isHasAssetEditAuth: '资产编辑权限',
  isLowLiquidity: '低流动性',
  isDumping: '大额抛售',
  isLiquidityRemoval: '移除流动性',
  isPump: '异常拉盘',
  isWash: '刷量交易',
  isFakeLiquidity: '虚假流动性',
  isWash2: '刷量交易',
  isFundLinkage: '风险资金关联',
  isVeryLowLpBurn: 'LP 销毁比例过低',
  isVeryHighLpHolderProp: 'LP 持仓过度集中',
  isHasBlockingHis: '历史冻结记录',
  isOverIssued: '超发风险',
  isCounterfeit: '仿冒代币',
  isNotOpenSource: '合约未开源',
  isMintable: '可增发',
  isHasFrozenAuth: '冻结权限',
  isNotRenounced: '未放弃所有权',
}

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
        scanType: validation.scanMode ?? 'unknown',
        action: 'block',
        reason: validation.message,
      },
    })
  }

  if (validation.scanMode !== 'token-scan') {
    return recordBlockedInvocation({
      wrapper,
      input,
      code: 'security-tx-scan-adapter-not-connected',
      message:
        '交易级 tx-scan 协议已识别；真实 okx-security tx-scan adapter 尚未接入。扫描失败不能视为安全通过。',
      resultData: {
        riskGate: 'blocked',
        scanType: 'tx-scan',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-security',
      },
    })
  }

  try {
    const requestInput = mapRiskTokenScanInput(input)
    const output = await okxOnchainHttpClient.scanTokens(requestInput)

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-security-token-scan-rejected',
        message:
          'OKX Security Token Scan 未返回成功结果，H Wallet 不把失败扫描当作安全通过。',
        resultData: {
          riskGate: 'blocked',
          scanType: 'token-scan',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    const tokenRisks = normalizeOkxTokenScanResults(
      output.response,
      requestInput.operation,
    )
    const aggregate = summarizeTokenRiskGate(tokenRisks)

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-security-token-scan-completed',
      executionMode: 'risk-gate',
      message: getRiskScanMessage(aggregate),
      resultData: {
        riskGate: aggregate.gate,
        scanType: 'token-scan',
        action: aggregate.action,
        provider: 'okx-security',
        source: 'okx-onchainos-api',
        request: output.request,
        operation: requestInput.operation,
        tokenCount: tokenRisks.length,
        highestRiskLevel: aggregate.highestRiskLevel,
        tokenRisks,
        providerResponse: output.response,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-security-token-scan-error',
      fallbackMessage:
        'OKX Security Token Scan 请求失败。H Wallet 不把失败扫描当作安全通过。',
      error,
      resultData: {
        riskGate: 'blocked',
        scanType: 'token-scan',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-security',
      },
    })
  }
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

  try {
    const requestInput = mapSignalListInput(input)
    const output = await okxOnchainHttpClient.getSignalList(requestInput)

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-dex-signal-list-rejected',
        message:
          'OKX Signal List API 未返回成功结果，H Wallet 不生成自有链上信号。',
        resultData: {
          signalGate: 'blocked',
          signalProvider: 'okx-dex-signal',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    const signals = normalizeOkxSignalList(output.response)

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-dex-signal-list-completed',
      message: signals.length
        ? '已通过 OKX Signal List API 读取真实链上买入信号。'
        : 'OKX Signal List API 已返回成功结果；当前筛选条件下暂无信号。',
      resultData: {
        signalGate: 'completed',
        signalProvider: 'okx-dex-signal',
        action: 'observe',
        provider: 'okx-dex-signal',
        source: 'okx-onchainos-api',
        request: output.request,
        requestContext: requestInput.context,
        signalCount: signals.length,
        signals,
        providerResponse: output.response,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-dex-signal-list-error',
      fallbackMessage:
        'OKX Signal List API 请求失败。H Wallet 不生成自有链上信号。',
      error,
      resultData: {
        signalGate: 'blocked',
        signalProvider: 'okx-dex-signal',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-dex-signal',
      },
    })
  }
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

  try {
    const requestInput = mapTokenAnalysisInput(input)
    const output = await okxOnchainHttpClient.searchTokens(requestInput)

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-dex-token-search-rejected',
        message:
          'OKX Token Search API 未返回成功结果，H Wallet 不生成自有代币画像。',
        resultData: {
          tokenGate: 'blocked',
          tokenProvider: 'okx-dex-token',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    const candidates = normalizeOkxTokenSearchResults(output.response)
    const selection = selectTokenAnalysisCandidate(candidates, requestInput)
    const enrichment = await readTokenAdvancedInfo(selection.selectedToken)
    const warnings = getTokenProfileWarnings(
      selection.selectedToken,
      enrichment.advancedInfo,
    )

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-dex-token-profile-completed',
      message: getTokenAnalysisMessage(selection),
      resultData: {
        tokenGate: 'completed',
        tokenProvider: 'okx-dex-token',
        action: 'observe',
        provider: 'okx-dex-token',
        source: 'okx-onchainos-api',
        analysisBoundary: 'token-search-and-advanced-info-only',
        securityVerdict: 'not-included-use-H.skill.risk.scanTransaction',
        requiredNextGate: selection.selectedToken
          ? 'H.skill.risk.scanTransaction'
          : null,
        request: output.request,
        requestContext: requestInput.context,
        resolutionStatus: selection.resolutionStatus,
        candidateCount: candidates.length,
        selectedToken: selection.selectedToken,
        candidates,
        advancedInfoStatus: enrichment.advancedInfoStatus,
        advancedInfo: enrichment.advancedInfo,
        warnings: warnings.length ? warnings : null,
        providerResponse: {
          search: output.response,
          advancedInfo: enrichment.providerResponse,
        },
        providerError: enrichment.providerError,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-dex-token-profile-error',
      fallbackMessage:
        'OKX Token API 请求失败。H Wallet 不生成自有代币画像。',
      error,
      resultData: {
        tokenGate: 'blocked',
        tokenProvider: 'okx-dex-token',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-dex-token',
      },
    })
  }
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

  try {
    const requestInput = mapMarketTrendInput(input)
    const output = await okxOnchainHttpClient.getHotTokens(requestInput)

    if (!output.ok) {
      return recordBlockedInvocation({
        wrapper,
        input,
        code: 'okx-dex-market-hot-token-rejected',
        message:
          'OKX Hot Token API 未返回成功结果，H Wallet 不生成自有行情或趋势。',
        resultData: {
          marketGate: 'blocked',
          marketProvider: 'okx-dex-market',
          action: 'block',
          failSafe: true,
          providerResponse: output.response,
        },
      })
    }

    const trends = normalizeOkxHotTokenTrends(output.response)

    return recordCompletedInvocation({
      wrapper,
      input,
      code: 'okx-dex-market-hot-token-completed',
      message: trends.length
        ? '已通过 OKX Hot Token API 读取真实 DEX 市场趋势。'
        : 'OKX Hot Token API 已返回成功结果；当前筛选条件下暂无趋势数据。',
      resultData: {
        marketGate: 'completed',
        marketProvider: 'okx-dex-market',
        action: 'observe',
        provider: 'okx-dex-market',
        source: 'okx-onchainos-api',
        request: output.request,
        requestContext: requestInput.context,
        trendCount: trends.length,
        trends,
        providerResponse: output.response,
      },
    })
  } catch (error) {
    return recordProviderErrorInvocation({
      wrapper,
      input,
      code: 'okx-dex-market-hot-token-error',
      fallbackMessage:
        'OKX Hot Token API 请求失败。H Wallet 不生成自有行情或趋势。',
      error,
      resultData: {
        marketGate: 'blocked',
        marketProvider: 'okx-dex-market',
        action: 'block',
        failSafe: true,
        requiredProviderSkill: 'okx-dex-market',
      },
    })
  }
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

  const tokenScanValidation = validateRiskTokenScanInput(input)

  if (tokenScanValidation.ok || tokenScanValidation.hasTokenScanInput) {
    return tokenScanValidation
  }

  const chain = normalizeString(input.chain) || normalizeString(input.chainIndex)
  const transaction = normalizeString(input.transaction)
  const calldata = normalizeString(input.calldata) || normalizeString(input.data)

  if (!chain) {
    return {
      ok: false,
      code: 'risk-scan-chain-required',
      message: '交易级风险扫描需要 chain 或 chainIndex。',
      scanMode: 'tx-scan',
    }
  }

  if (!transaction && !calldata) {
    return {
      ok: false,
      code: 'risk-scan-transaction-required',
      message:
        '风险扫描需要 tokenList / tokenAddress，或 transaction / calldata。',
      scanMode: 'unknown',
    }
  }

  return { ok: true, scanMode: 'tx-scan' }
}

function validateRiskTokenScanInput(input) {
  const tokenList = Array.isArray(input.tokenList) ? input.tokenList : null
  const tokenArray = Array.isArray(input.tokens) ? input.tokens : null
  const tokenPairs =
    typeof input.tokens === 'string' && input.tokens.trim().length > 0
      ? input.tokens.trim()
      : ''
  const tokenAddress =
    normalizeString(input.tokenAddress) ||
    normalizeString(input.contractAddress) ||
    normalizeString(input.address)
  const chain =
    normalizeString(input.chainId) ||
    normalizeString(input.chainIndex) ||
    normalizeString(input.chain)
  const hasTokenScanInput = Boolean(
    tokenList?.length || tokenArray?.length || tokenPairs || tokenAddress,
  )

  if (!hasTokenScanInput) {
    return { ok: false, hasTokenScanInput: false }
  }

  if (tokenAddress && !chain) {
    return {
      ok: false,
      code: 'risk-token-scan-chain-required',
      message: 'Token 风险扫描需要 chain、chainIndex 或 chainId。',
      hasTokenScanInput: true,
      scanMode: 'token-scan',
    }
  }

  const list = tokenList ?? tokenArray

  if (list) {
    if (list.length > 50) {
      return {
        ok: false,
        code: 'risk-token-scan-too-many-tokens',
        message: 'Token 风险扫描一次最多支持 50 个 token。',
        hasTokenScanInput: true,
        scanMode: 'token-scan',
      }
    }

    for (const [index, item] of list.entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return {
          ok: false,
          code: 'risk-token-scan-invalid-token',
          message: `tokenList[${index}] 必须包含 chain 和 contractAddress。`,
          hasTokenScanInput: true,
          scanMode: 'token-scan',
        }
      }

      const itemAddress =
        normalizeString(item.contractAddress) ||
        normalizeString(item.tokenAddress) ||
        normalizeString(item.address)
      const itemChain =
        normalizeString(item.chainId) ||
        normalizeString(item.chainIndex) ||
        normalizeString(item.chain)

      if (!itemAddress || !itemChain) {
        return {
          ok: false,
          code: 'risk-token-scan-token-fields-required',
          message: `tokenList[${index}] 需要 chain 和 contractAddress。`,
          hasTokenScanInput: true,
          scanMode: 'token-scan',
        }
      }
    }
  }

  if (tokenPairs) {
    const pairs = tokenPairs.split(',').map((item) => item.trim())

    if (pairs.length > 50) {
      return {
        ok: false,
        code: 'risk-token-scan-too-many-tokens',
        message: 'Token 风险扫描一次最多支持 50 个 token。',
        hasTokenScanInput: true,
        scanMode: 'token-scan',
      }
    }

    for (const pair of pairs) {
      const [pairChain, pairAddress] = pair.split(':')

      if (!normalizeString(pairChain) || !normalizeString(pairAddress)) {
        return {
          ok: false,
          code: 'risk-token-scan-invalid-pair',
          message: 'tokens 需要使用 chainId:contractAddress 格式。',
          hasTokenScanInput: true,
          scanMode: 'token-scan',
        }
      }
    }
  }

  return { ok: true, hasTokenScanInput: true, scanMode: 'token-scan' }
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
  const chainIndex = normalizeString(input.chainIndex)
  const watchlistId = normalizeString(input.watchlistId)

  if (
    !strategyId &&
    !token &&
    !tokenAddress &&
    !chain &&
    !chainIndex &&
    !watchlistId
  ) {
    return {
      ok: false,
      code: 'signal-context-required',
      message:
        '链上信号读取需要 strategyId、token、tokenAddress、chain、chainIndex 或 watchlistId。',
    }
  }

  if ((token || tokenAddress || watchlistId) && !strategyId && !chain && !chainIndex) {
    return {
      ok: false,
      code: 'signal-chain-required',
      message: '指定 token 或 watchlist 读取信号时需要 chain 或 chainIndex。',
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
  const tokenAddress =
    normalizeString(input.tokenAddress) ||
    normalizeString(input.contractAddress) ||
    normalizeString(input.address)
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

function mapRiskTokenScanInput(input) {
  return {
    operation: normalizeRiskOperation(input.operation ?? input.intent),
    source: 'onchain_os_cli',
    tokenList: getRiskTokenScanList(input),
  }
}

function getRiskTokenScanList(input) {
  if (Array.isArray(input.tokenList)) {
    return input.tokenList.map(mapRiskTokenScanItem)
  }

  if (Array.isArray(input.tokens)) {
    return input.tokens.map(mapRiskTokenScanItem)
  }

  const tokenPairs = normalizeString(input.tokens)

  if (tokenPairs) {
    return tokenPairs.split(',').map((pair) => {
      const [chainId, contractAddress] = pair.split(':')

      return {
        chainId: normalizeString(chainId),
        contractAddress: normalizeString(contractAddress),
      }
    })
  }

  return [
    {
      chain: input.chain,
      chainId: input.chainId,
      chainIndex: input.chainIndex,
      contractAddress:
        input.contractAddress ?? input.tokenAddress ?? input.address,
    },
  ].map(mapRiskTokenScanItem)
}

function mapRiskTokenScanItem(item) {
  return {
    chain:
      normalizeString(item.chainId) ||
      normalizeString(item.chainIndex) ||
      normalizeString(item.chain),
    contractAddress:
      normalizeString(item.contractAddress) ||
      normalizeString(item.tokenAddress) ||
      normalizeString(item.address),
  }
}

function normalizeRiskOperation(input) {
  const value = normalizeString(input).toLowerCase()

  if (
    [
      'sell',
      'from',
      'spend',
      'dispose',
      'withdraw',
      'redeem',
    ].includes(value)
  ) {
    return 'sell'
  }

  if (
    [
      'scan',
      'standalone',
      'observe',
      'portfolio',
      'research',
    ].includes(value)
  ) {
    return 'standalone'
  }

  return 'buy'
}

function normalizeOkxTokenScanResults(response, operation) {
  return getOkxResponseRows(response).map((row, index) =>
    normalizeOkxTokenScanResult(row, index, operation),
  )
}

function normalizeOkxTokenScanResult(row, index, operation) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return {
      listPosition: index + 1,
      isChainSupported: false,
      riskLevel: 'HIGH',
      riskLevelAssumption: 'malformed-risk-row',
      operation,
      action: 'require-confirmation',
      gate: 'requires-confirmation',
      reason: 'OKX Security 返回了无法解析的 token 风险记录。',
      triggeredLabels: [],
    }
  }

  const chainSupported = row?.isChainSupported !== false
  const rawRiskLevel = normalizeString(row?.riskLevel).toUpperCase()
  const riskLevel = isRecognizedRiskLevel(rawRiskLevel) ? rawRiskLevel : 'HIGH'
  const riskLevelAssumption = isRecognizedRiskLevel(rawRiskLevel)
    ? null
    : rawRiskLevel
      ? 'unrecognized-risk-level'
      : 'missing-risk-level'
  const action = getTokenRiskAction({ chainSupported, operation, riskLevel })

  return removeEmptyFields({
    listPosition: index + 1,
    chainId: pickFirst(row, ['chainId', 'chainIndex']),
    tokenAddress: pickFirst(row, [
      'tokenAddress',
      'tokenContractAddress',
      'contractAddress',
    ]),
    isChainSupported: chainSupported,
    riskLevel,
    riskLevelAssumption,
    operation,
    action: action.action,
    gate: action.gate,
    reason: action.reason,
    triggeredLabels: collectTriggeredRiskLabels(row),
    buyTaxes: pickFirst(row, ['buyTaxes', 'buyTax']),
    sellTaxes: pickFirst(row, ['sellTaxes', 'sellTax']),
  })
}

function isRecognizedRiskLevel(input) {
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(input)
}

function getTokenRiskAction({ chainSupported, operation, riskLevel }) {
  if (!chainSupported) {
    return {
      action: 'warn',
      gate: 'warning',
      reason: '该链暂不支持 token 安全扫描。',
    }
  }

  if (operation === 'sell') {
    return riskLevel === 'LOW'
      ? { action: 'allow', gate: 'passed', reason: '未发现高优先级卖出阻断。' }
      : {
          action: 'warn',
          gate: 'warning',
          reason: '卖出侧发现 token 风险，允许退出但需要展示风险。',
        }
  }

  if (riskLevel === 'CRITICAL') {
    return {
      action: 'block',
      gate: 'blocked',
      reason: '买入侧触发 CRITICAL token 风险。',
    }
  }

  if (riskLevel === 'HIGH') {
    return {
      action: 'require-confirmation',
      gate: 'requires-confirmation',
      reason: '买入侧触发 HIGH token 风险，需要显式确认。',
    }
  }

  if (riskLevel === 'MEDIUM') {
    return {
      action: 'warn',
      gate: 'warning',
      reason: '检测到中等 token 风险，需要向用户展示。',
    }
  }

  return { action: 'allow', gate: 'passed', reason: '未检测到 token 风险标签。' }
}

function collectTriggeredRiskLabels(row) {
  if (!row || typeof row !== 'object') {
    return []
  }

  return Object.entries(tokenRiskLabelMap)
    .filter(([field]) => row[field] === true)
    .map(([field, label]) => ({ field, label }))
}

function summarizeTokenRiskGate(tokenRisks) {
  if (tokenRisks.length === 0) {
    return {
      action: 'block',
      gate: 'blocked',
      highestRiskLevel: 'UNKNOWN',
      priority: 4,
    }
  }

  const aggregate = tokenRisks.reduce(
    (current, item) => {
      const priority = getRiskActionPriority(item.action)

      if (priority > current.priority) {
        return {
          action: item.action,
          gate: item.gate,
          highestRiskLevel: item.riskLevel,
          priority,
        }
      }

      return current
    },
    {
      action: 'allow',
      gate: 'passed',
      highestRiskLevel: 'LOW',
      priority: 0,
    },
  )

  return aggregate
}

function getRiskActionPriority(action) {
  const priorityMap = {
    allow: 0,
    warn: 1,
    'require-confirmation': 2,
    block: 3,
  }

  return priorityMap[action] ?? 3
}

function getRiskScanMessage(aggregate) {
  if (aggregate.action === 'block') {
    return 'OKX Security 已完成 Token Scan，发现阻断级风险。'
  }

  if (aggregate.action === 'require-confirmation') {
    return 'OKX Security 已完成 Token Scan，发现高风险，需要用户显式确认。'
  }

  if (aggregate.action === 'warn') {
    return 'OKX Security 已完成 Token Scan，发现需展示的风险提醒。'
  }

  return 'OKX Security 已完成 Token Scan，未发现阻断级 token 风险。'
}

function mapTokenAnalysisInput(input) {
  const tokenAddress =
    normalizeString(input.tokenAddress) ||
    normalizeString(input.contractAddress) ||
    normalizeString(input.address)
  const token = normalizeString(input.token)
  const chain = normalizeString(input.chain)
  const chainIndex = normalizeString(input.chainIndex)
  const chains =
    normalizeString(input.chains) ||
    normalizeString(input.chainIndexes) ||
    chainIndex ||
    chain

  return {
    chains,
    search: tokenAddress || token,
    cursor: normalizeString(input.cursor),
    limit: normalizeString(input.limit) || '20',
    tokenAddress,
    context: {
      tokenInputType: tokenAddress ? 'token-address' : 'token',
      token: token || null,
      tokenAddress: tokenAddress || null,
      chain: chain || null,
      chainIndex: chainIndex || null,
      chains,
    },
  }
}

function normalizeOkxTokenSearchResults(response) {
  return getOkxResponseRows(response)
    .map((row, index) => normalizeOkxTokenSearchResult(row, index))
    .filter(Boolean)
}

function normalizeOkxTokenSearchResult(row, index) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null
  }

  const tagList =
    row.tagList && typeof row.tagList === 'object' && !Array.isArray(row.tagList)
      ? row.tagList
      : null
  const communityRecognized =
    tagList?.communityRecognized ??
    pickFirst(row, ['communityRecognized', 'isCommunityRecognized'])

  return removeEmptyFields({
    listPosition: index + 1,
    chainIndex: pickFirst(row, ['chainIndex', 'chainId']),
    tokenName: pickFirst(row, ['tokenName', 'name']),
    tokenSymbol: pickFirst(row, ['tokenSymbol', 'symbol']),
    tokenAddress: pickFirst(row, [
      'tokenContractAddress',
      'tokenAddress',
      'contractAddress',
      'address',
    ]),
    decimal: pickFirst(row, ['decimal', 'decimals']),
    explorerUrl: pickFirst(row, ['explorerUrl']),
    cursor: pickFirst(row, ['cursor']),
    tokenLogoUrl: pickFirst(row, ['tokenLogoUrl', 'logoUrl', 'logo']),
    priceUsd: pickFirst(row, ['price', 'priceUsd']),
    priceChange24hPercent: pickFirst(row, [
      'change',
      'priceChange24H',
      'priceChange24h',
    ]),
    holders: pickFirst(row, ['holders', 'holderCount']),
    liquidityUsd: pickFirst(row, ['liquidity', 'liquidityUsd']),
    marketCapUsd: pickFirst(row, ['marketCap', 'marketCapUsd']),
    tagList,
    communityRecognized,
  })
}

function selectTokenAnalysisCandidate(candidates, requestInput) {
  if (candidates.length === 0) {
    return {
      resolutionStatus: 'not-found',
      selectedToken: null,
    }
  }

  const exactMatch = requestInput.tokenAddress
    ? candidates.find((candidate) =>
        sameTokenAddress(candidate.tokenAddress, requestInput.tokenAddress),
      )
    : null

  if (exactMatch) {
    return {
      resolutionStatus: 'exact-address-match',
      selectedToken: exactMatch,
    }
  }

  if (candidates.length === 1) {
    return {
      resolutionStatus: 'single-candidate',
      selectedToken: candidates[0],
    }
  }

  return {
    resolutionStatus: 'multiple-candidates',
    selectedToken: null,
  }
}

async function readTokenAdvancedInfo(selectedToken) {
  if (!selectedToken?.chainIndex || !selectedToken?.tokenAddress) {
    return {
      advancedInfo: null,
      advancedInfoStatus: 'not-requested',
      providerError: null,
      providerResponse: null,
    }
  }

  try {
    const output = await okxOnchainHttpClient.getTokenAdvancedInfo({
      chainIndex: selectedToken.chainIndex,
      tokenContractAddress: selectedToken.tokenAddress,
    })

    if (!output.ok) {
      return {
        advancedInfo: null,
        advancedInfoStatus: 'provider-rejected',
        providerError: null,
        providerResponse: output.response,
      }
    }

    const advancedInfo = normalizeOkxTokenAdvancedInfo(output.response)

    return {
      advancedInfo,
      advancedInfoStatus: advancedInfo ? 'completed' : 'empty',
      providerError: null,
      providerResponse: output.response,
    }
  } catch (error) {
    return {
      advancedInfo: null,
      advancedInfoStatus: 'provider-error',
      providerError: getProviderErrorData(error),
      providerResponse: null,
    }
  }
}

function normalizeOkxTokenAdvancedInfo(response) {
  const row = getOkxResponseRecord(response)

  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null
  }

  const riskControlLevel = pickFirst(row, ['riskControlLevel'])

  return removeEmptyFields({
    chainIndex: pickFirst(row, ['chainIndex', 'chainId']),
    tokenAddress: pickFirst(row, [
      'tokenContractAddress',
      'tokenAddress',
      'contractAddress',
    ]),
    riskControlLevel,
    riskControlLabel: normalizeTokenRiskControlLevel(riskControlLevel),
    tokenTags: pickFirst(row, ['tokenTags']),
    createTime: pickFirst(row, ['createTime']),
    creatorAddress: pickFirst(row, ['creatorAddress']),
    devCreateTokenCount: pickFirst(row, ['devCreateTokenCount']),
    devLaunchedTokenCount: pickFirst(row, ['devLaunchedTokenCount']),
    devRugPullTokenCount: pickFirst(row, ['devRugPullTokenCount']),
    top10HoldPercent: pickFirst(row, ['top10HoldPercent']),
    devHoldingPercent: pickFirst(row, ['devHoldingPercent']),
    bundleHoldingPercent: pickFirst(row, ['bundleHoldingPercent']),
    suspiciousHoldingPercent: pickFirst(row, ['suspiciousHoldingPercent']),
    sniperHoldingPercent: pickFirst(row, ['sniperHoldingPercent']),
    snipersClearAddressCount: pickFirst(row, ['snipersClearAddressCount']),
    snipersTotal: pickFirst(row, ['snipersTotal']),
    lpBurnedPercent: pickFirst(row, ['lpBurnedPercent']),
    isInternal: pickFirst(row, ['isInternal']),
    protocolId: pickFirst(row, ['protocolId']),
    progress: pickFirst(row, ['progress']),
    totalFee: pickFirst(row, ['totalFee']),
  })
}

function normalizeTokenRiskControlLevel(input) {
  const value = normalizeString(input)
  const labelMap = {
    '0': 'undefined',
    '1': 'low',
    '2': 'medium',
    '3': 'medium-high',
    '4': 'high',
    '5': 'high-manual',
  }

  return labelMap[value] ?? null
}

function getTokenProfileWarnings(selectedToken, advancedInfo) {
  if (!selectedToken) {
    return []
  }

  const warnings = []

  if (selectedToken.communityRecognized === false) {
    warnings.push({
      code: 'token-not-community-recognized',
      message: '该代币未显示为社区认可，后续交易必须以合约地址复核。',
    })
  }

  const liquidity = parseNumberish(selectedToken.liquidityUsd)

  if (Number.isFinite(liquidity) && liquidity < 10000) {
    warnings.push({
      code: liquidity < 1000 ? 'very-low-liquidity' : 'low-liquidity',
      message:
        liquidity < 1000
          ? 'OKX 搜索结果显示流动性低于 1,000 美元，交易可能产生严重滑点。'
          : 'OKX 搜索结果显示流动性低于 10,000 美元，交易前需要展示滑点风险。',
    })
  }

  const tokenTags = Array.isArray(advancedInfo?.tokenTags)
    ? advancedInfo.tokenTags
    : []

  if (tokenTags.includes('honeypot')) {
    warnings.push({
      code: 'advanced-info-honeypot-tag',
      message:
        'OKX 高级画像返回 honeypot 标签，必须继续执行 OKX Security Token Scan，不能直接进入交易。',
    })
  }

  if (tokenTags.includes('lowLiquidity')) {
    warnings.push({
      code: 'advanced-info-low-liquidity-tag',
      message: 'OKX 高级画像返回低流动性标签，交易卡片必须提示滑点风险。',
    })
  }

  if (['4', '5'].includes(normalizeString(advancedInfo?.riskControlLevel))) {
    warnings.push({
      code: 'advanced-info-high-risk-control-level',
      message:
        'OKX 高级画像返回高风控等级，必须继续执行 OKX Security Token Scan 和用户确认。',
    })
  }

  return warnings
}

function getTokenAnalysisMessage(selection) {
  if (selection.resolutionStatus === 'not-found') {
    return 'OKX Token Search 已返回成功结果；当前条件下未找到匹配代币。'
  }

  if (selection.resolutionStatus === 'multiple-candidates') {
    return 'OKX Token Search 返回多个候选代币；需要用合约地址确认后再继续。'
  }

  if (selection.resolutionStatus === 'single-candidate') {
    return '已通过 OKX Token Search 找到唯一候选代币，并尝试读取高级画像。'
  }

  return '已通过 OKX Token Search 精确匹配代币，并尝试读取高级画像。'
}

function sameTokenAddress(left, right) {
  const normalizedLeft = normalizeString(left)
  const normalizedRight = normalizeString(right)

  if (!normalizedLeft || !normalizedRight) {
    return false
  }

  if (isLikelyTokenAddress(normalizedLeft) && isLikelyTokenAddress(normalizedRight)) {
    return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
  }

  return normalizedLeft === normalizedRight
}

function parseNumberish(input) {
  const value = normalizeString(input).replace(/,/g, '')
  const number = Number(value)

  return Number.isFinite(number) ? number : Number.NaN
}

function mapSignalListInput(input) {
  const strategyId = normalizeString(input.strategyId)
  const strategy = strategyId
    ? strategySkillRepository.findStrategyById(strategyId)
    : null
  const requestedChain = normalizeString(input.chain)
  const requestedChainIndex = normalizeString(input.chainIndex)
  const strategyDefaultChain =
    !requestedChain && !requestedChainIndex
      ? getStrategyDefaultSignalChain(strategy)
      : ''
  const chain = requestedChain || strategyDefaultChain

  return {
    chain,
    chainIndex: requestedChainIndex,
    cursor: normalizeString(input.cursor),
    limit: normalizeString(input.limit) || '20',
    maxAddressCount: input.maxAddressCount,
    maxAmountUsd: input.maxAmountUsd,
    maxLiquidityUsd: input.maxLiquidityUsd,
    maxMarketCapUsd: input.maxMarketCapUsd,
    minAddressCount: input.minAddressCount,
    minAmountUsd: input.minAmountUsd,
    minLiquidityUsd: input.minLiquidityUsd,
    minMarketCapUsd: input.minMarketCapUsd,
    tokenAddress: normalizeString(input.tokenAddress),
    walletType: normalizeSignalWalletType(input.walletType),
    context: {
      defaultChainApplied: Boolean(strategyDefaultChain),
      signalInputType: getSignalInputType(input),
      strategyId: strategy?.id ?? (strategyId || null),
      strategyVersion: strategy?.version ?? null,
      token: normalizeString(input.token) || null,
      tokenAddress: normalizeString(input.tokenAddress) || null,
      walletType: normalizeSignalWalletType(input.walletType),
      chain: chain || null,
      chainIndex: requestedChainIndex || null,
    },
  }
}

function getStrategyDefaultSignalChain(strategy) {
  if (!strategy || !Array.isArray(strategy.supportedChains)) {
    return ''
  }

  const preferredChains = ['solana', 'x layer', 'base', 'ethereum']

  for (const preferred of preferredChains) {
    const match = strategy.supportedChains.find(
      (chain) => normalizeString(chain).toLowerCase() === preferred,
    )

    if (match) {
      return match
    }
  }

  return strategy.supportedChains[0] || ''
}

function getSignalInputType(input) {
  if (normalizeString(input.strategyId)) {
    return 'strategy'
  }

  if (normalizeString(input.tokenAddress)) {
    return 'token-address'
  }

  if (normalizeString(input.token)) {
    return 'token'
  }

  if (normalizeString(input.watchlistId)) {
    return 'watchlist'
  }

  if (normalizeString(input.chain) || normalizeString(input.chainIndex)) {
    return 'chain'
  }

  return 'unknown'
}

function normalizeSignalWalletType(input) {
  if (Array.isArray(input)) {
    return input.map(String).map((item) => item.trim()).filter(Boolean).join(',')
  }

  return normalizeString(input) || '1,2,3'
}

function normalizeOkxSignalList(response) {
  return getOkxResponseRows(response)
    .map((row, index) => normalizeOkxSignal(row, index))
    .filter(Boolean)
}

function normalizeOkxSignal(row, index) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null
  }

  const token = row.token && typeof row.token === 'object' ? row.token : {}
  const soldRatioPercent = pickFirst(row, ['soldRatioPercent'])

  return removeEmptyFields({
    listPosition: index + 1,
    timestamp: pickFirst(row, ['timestamp', 'requestTime']),
    chainIndex: pickFirst(row, ['chainIndex', 'chainId']),
    walletType: normalizeOkxSignalWalletType(row.walletType),
    walletTypeRaw: pickFirst(row, ['walletType']),
    triggerWalletCount: pickFirst(row, ['triggerWalletCount']),
    triggerWalletSample: getWalletAddressSample(row.triggerWalletAddress),
    amountUsd: pickFirst(row, ['amountUsd']),
    priceUsd: pickFirst(row, ['price', 'priceUsd']),
    soldRatioPercent,
    holdingBias: getSignalHoldingBias(soldRatioPercent),
    cursor: pickFirst(row, ['cursor']),
    token: removeEmptyFields({
      tokenAddress: pickFirst(token, ['tokenAddress', 'tokenContractAddress']),
      symbol: pickFirst(token, ['symbol', 'tokenSymbol']),
      name: pickFirst(token, ['name', 'tokenName']),
      logo: pickFirst(token, ['logo', 'tokenLogoUrl']),
      marketCapUsd: pickFirst(token, ['marketCapUsd', 'marketCap']),
      holders: pickFirst(token, ['holders', 'holderCount']),
      top10HolderPercent: pickFirst(token, [
        'top10HolderPercent',
        'top10HoldPercent',
      ]),
    }),
  })
}

function normalizeOkxSignalWalletType(input) {
  const value = normalizeString(input)
  const map = {
    '1': 'Smart Money',
    '2': 'KOL / Influencer',
    '3': 'Whale',
    SMART_MONEY: 'Smart Money',
    INFLUENCER: 'KOL / Influencer',
    KOL: 'KOL / Influencer',
    WHALE: 'Whale',
  }

  return map[value] ?? value
}

function getWalletAddressSample(input) {
  const value = normalizeString(input)

  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map(truncateAddress)
}

function truncateAddress(input) {
  if (input.length <= 12) {
    return input
  }

  return `${input.slice(0, 6)}...${input.slice(-4)}`
}

function getSignalHoldingBias(input) {
  const value = Number(input)

  if (!Number.isFinite(value)) {
    return null
  }

  if (value < 35) {
    return 'still-holding'
  }

  if (value < 70) {
    return 'partially-sold'
  }

  return 'mostly-sold'
}

function mapMarketTrendInput(input) {
  const strategyId = normalizeString(input.strategyId)
  const strategy = strategyId
    ? strategySkillRepository.findStrategyById(strategyId)
    : null
  const requestedChain = normalizeString(input.chain)
  const requestedChainIndex = normalizeString(input.chainIndex)
  const strategyDefaultChain =
    !requestedChain && !requestedChainIndex
      ? getStrategyDefaultMarketChain(strategy)
      : ''
  const chain = requestedChain || strategyDefaultChain

  return {
    chain,
    chainIndex: requestedChainIndex,
    cursor: normalizeString(input.cursor),
    limit: normalizeString(input.limit) || '10',
    liquidityMax: input.liquidityMax,
    liquidityMin: input.liquidityMin,
    marketCapMax: input.marketCapMax,
    marketCapMin: input.marketCapMin,
    priceChangePercentMax: input.priceChangePercentMax,
    priceChangePercentMin: input.priceChangePercentMin,
    rankingTimeFrame: normalizeString(input.rankingTimeFrame) || '2',
    rankingType: normalizeString(input.rankingType) || '4',
    riskFilter:
      typeof input.riskFilter === 'boolean' ? input.riskFilter : true,
    stableTokenFilter:
      typeof input.stableTokenFilter === 'boolean'
        ? input.stableTokenFilter
        : true,
    tradeAmountMax: input.tradeAmountMax,
    tradeAmountMin: input.tradeAmountMin,
    txsMax: input.txsMax,
    txsMin: input.txsMin,
    uniqueTraderMax: input.uniqueTraderMax,
    uniqueTraderMin: input.uniqueTraderMin,
    volumeMax: input.volumeMax,
    volumeMin: input.volumeMin,
    context: {
      defaultChainApplied: Boolean(strategyDefaultChain),
      marketInputType: getMarketInputType(input),
      strategyId: strategy?.id ?? (strategyId || null),
      strategyVersion: strategy?.version ?? null,
      token: normalizeString(input.token) || null,
      tokenAddress: normalizeString(input.tokenAddress) || null,
      chain: chain || null,
      chainIndex: requestedChainIndex || null,
    },
  }
}

function getStrategyDefaultMarketChain(strategy) {
  if (!strategy || !Array.isArray(strategy.supportedChains)) {
    return ''
  }

  const xLayer = strategy.supportedChains.find(
    (chain) => normalizeString(chain).toLowerCase() === 'x layer',
  )

  return xLayer || strategy.supportedChains[0] || ''
}

function getMarketInputType(input) {
  if (normalizeString(input.strategyId)) {
    return 'strategy'
  }

  if (normalizeString(input.tokenAddress)) {
    return 'token-address'
  }

  if (normalizeString(input.token)) {
    return 'token'
  }

  if (normalizeString(input.chain) || normalizeString(input.chainIndex)) {
    return 'chain'
  }

  return 'unknown'
}

function normalizeOkxHotTokenTrends(response) {
  return getOkxResponseRows(response)
    .map((row, index) => normalizeOkxHotTokenTrend(row, index))
    .filter(Boolean)
}

function normalizeOkxHotTokenTrend(row, index) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null
  }

  return removeEmptyFields({
    listPosition: index + 1,
    chainIndex: pickFirst(row, ['chainIndex', 'chainId']),
    chainName: pickFirst(row, ['chainName', 'networkName']),
    tokenSymbol: pickFirst(row, [
      'tokenSymbol',
      'symbol',
      'ticker',
      'baseTokenSymbol',
    ]),
    tokenName: pickFirst(row, ['tokenName', 'name', 'baseTokenName']),
    tokenAddress: pickFirst(row, [
      'tokenContractAddress',
      'tokenAddress',
      'contractAddress',
      'address',
    ]),
    priceUsd: pickFirst(row, ['priceUsd', 'price', 'tokenPrice', 'lastPrice']),
    priceChangePercent: pickFirst(row, [
      'priceChangePercent',
      'priceChange24h',
      'changePercent',
      'priceChange',
      'change',
    ]),
    volumeUsd: pickFirst(row, [
      'volumeUsd',
      'volume',
      'volume24h',
      'txVolumeUsd',
      'tradeVolume',
    ]),
    liquidityUsd: pickFirst(row, ['liquidityUsd', 'liquidity']),
    marketCapUsd: pickFirst(row, ['marketCapUsd', 'marketCap']),
    holderCount: pickFirst(row, ['holderCount', 'holders']),
    inflowUsd: pickFirst(row, ['inflowUsd', 'netInflowUsd']),
    firstTradeTime: pickFirst(row, ['firstTradeTime']),
    tokenLogoUrl: pickFirst(row, ['tokenLogoUrl', 'logoUrl']),
    top10HoldPercent: pickFirst(row, ['top10HoldPercent']),
    txBuyCount: pickFirst(row, ['txsBuy', 'txBuyCount']),
    txSellCount: pickFirst(row, ['txsSell', 'txSellCount']),
    transactionCount: pickFirst(row, ['transactionCount', 'txCount', 'txs']),
    uniqueTraderCount: pickFirst(row, [
      'uniqueTraderCount',
      'uniqueTrader',
      'uniqueTraders',
    ]),
    riskControlLevel: pickFirst(row, [
      'riskControlLevel',
      'riskLevelControl',
      'riskLevel',
    ]),
    tags: pickFirst(row, ['tokenTags', 'tags']),
  })
}

function getOkxResponseRows(response) {
  const data = response?.data

  if (Array.isArray(data)) {
    return data
  }

  if (!data || typeof data !== 'object') {
    return []
  }

  const listKeys = [
    'data',
    'list',
    'tokens',
    'tokenList',
    'hotTokenList',
    'items',
    'rankings',
  ]

  for (const key of listKeys) {
    if (Array.isArray(data[key])) {
      return data[key]
    }
  }

  return []
}

function pickFirst(source, keys) {
  for (const key of keys) {
    const value = source[key]

    if (value !== null && value !== undefined && value !== '') {
      return value
    }
  }

  return null
}

function removeEmptyFields(input) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false
      }

      return typeof value !== 'string' || value.trim().length > 0
    }),
  )
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
