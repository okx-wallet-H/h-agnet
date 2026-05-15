const {
  evaluateAgentAuthorization,
} = require('./agentAuthorizationPolicyService')
const { createCard } = require('./cardsService')
const { invokeHSkill } = require('./hSkillRuntimeService')

const tokenRegistry = {
  ethereum: {
    ETH: {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      decimals: 18,
      symbol: 'ETH',
    },
    USDC: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      symbol: 'USDC',
    },
    USDT: {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      symbol: 'USDT',
    },
  },
}

async function prepareSwapPipeline(input) {
  const intent = normalizeSwapIntent(input)
  const authorization = evaluateAgentAuthorization({
    requiresAssetAction: true,
    scope: intent.authorizationScope,
  })
  const missingFields = getMissingSwapFields(intent)

  if (missingFields.length > 0) {
    return createBlockedSwapPipeline({
      authorization,
      code: 'swap-intent-incomplete',
      intent,
      message: `还缺少 ${missingFields.join('、')}，我不会继续生成交易数据。`,
      reason: '交易意图不完整',
      stage: 'intent',
    })
  }

  const quoteResult = await invokeHSkill({
    input: {
      amount: intent.amountRaw,
      chain: intent.chain,
      fromTokenAddress: intent.fromTokenAddress,
      swapMode: 'exactIn',
      toTokenAddress: intent.toTokenAddress,
    },
    wrapperId: 'H.skill.swap.quote',
  })

  if (!quoteResult.invocation.result.ok) {
    return createBlockedSwapPipeline({
      authorization,
      code: quoteResult.invocation.result.code,
      intent,
      invocation: quoteResult.invocation,
      message: quoteResult.invocation.result.message,
      reason: 'OKX Quote 未通过',
      stage: 'quote',
    })
  }

  if (authorization.requiredUserAuthorization) {
    return createQuoteReadySwapPipeline({
      authorization,
      intent,
      quoteInvocation: quoteResult.invocation,
    })
  }

  const swapDataResult = await invokeHSkill({
    input: {
      amount: intent.amountRaw,
      authorizationScope: intent.authorizationScope,
      chain: intent.chain,
      fromTokenAddress: intent.fromTokenAddress,
      slippagePercent: intent.slippagePercent,
      swapMode: 'exactIn',
      toTokenAddress: intent.toTokenAddress,
      userWalletAddress: intent.wallet,
      wallet: intent.wallet,
    },
    wrapperId: 'H.skill.swap.execute',
  })

  if (!swapDataResult.invocation.result.ok) {
    return createBlockedSwapPipeline({
      authorization,
      code: swapDataResult.invocation.result.code,
      intent,
      invocation: swapDataResult.invocation,
      message: swapDataResult.invocation.result.message,
      quoteInvocation: quoteResult.invocation,
      reason: 'OKX Swap Data 未通过',
      stage: 'swap-data',
    })
  }

  const tx = extractSwapTransaction(swapDataResult.invocation.result.data)
  const simulateResult = tx
    ? await invokeHSkill({
        input: {
          chain: intent.chain,
          fromAddress: intent.wallet,
          inputData: tx.data,
          toAddress: tx.to,
          txAmount: tx.value ?? '0',
        },
        wrapperId: 'H.skill.gateway.simulate',
      })
    : null

  if (!simulateResult?.invocation.result.ok) {
    return createBlockedSwapPipeline({
      authorization,
      code:
        simulateResult?.invocation.result.code ??
        'swap-transaction-data-missing',
      intent,
      invocation: simulateResult?.invocation ?? swapDataResult.invocation,
      message:
        simulateResult?.invocation.result.message ??
        'OKX Swap 响应缺少可模拟的交易数据。',
      quoteInvocation: quoteResult.invocation,
      reason: '交易模拟未通过',
      stage: 'simulate',
      swapDataInvocation: swapDataResult.invocation,
    })
  }

  return createPreparedSwapPipeline({
    authorization,
    intent,
    quoteInvocation: quoteResult.invocation,
    simulateInvocation: simulateResult.invocation,
    swapDataInvocation: swapDataResult.invocation,
  })
}

function normalizeSwapIntent(input) {
  const chain = normalizeText(input?.chain) || 'ethereum'
  const fromToken = normalizeTokenSymbol(input?.fromToken)
  const toToken = normalizeTokenSymbol(input?.toToken)
  const amount = normalizeText(input?.amount)
  const slippagePercent = normalizeText(input?.slippagePercent) || '0.5'
  const wallet = normalizeText(input?.wallet ?? input?.userWalletAddress)
  const fromTokenInfo = resolveToken({ chain, token: fromToken })
  const toTokenInfo = resolveToken({ chain, token: toToken })

  return {
    amount,
    amountRaw: amount ? toBaseUnit(amount, fromTokenInfo?.decimals) : '',
    authorizationScope: normalizeText(input?.authorizationScope) || 'trade-autonomy',
    chain,
    fromToken,
    fromTokenAddress: normalizeText(input?.fromTokenAddress) || fromTokenInfo?.address,
    fromTokenDecimals: fromTokenInfo?.decimals,
    slippagePercent,
    toToken,
    toTokenAddress: normalizeText(input?.toTokenAddress) || toTokenInfo?.address,
    wallet,
  }
}

function getMissingSwapFields(intent) {
  return [
    ['出售资产', intent.fromTokenAddress],
    ['目标资产', intent.toTokenAddress],
    ['金额', intent.amountRaw],
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label)
}

function createQuoteReadySwapPipeline({ authorization, intent, quoteInvocation }) {
  const card = createCard({
    type: 'trade-confirmation',
    status: 'draft',
    source: 'ai-agent',
    title: 'OKX 报价已准备好',
    summary:
      '我已经通过 OKX 获取报价。首次交易授权前，我不会生成签名交易，也不会广播。',
    metrics: [
      { label: '操作', value: '兑换', tone: 'gold' },
      { label: '卖出', value: formatTokenAmount(intent), tone: 'gold' },
      { label: '买入', value: intent.toToken || '目标资产', tone: 'gold' },
      { label: '报价来源', value: 'OKX DEX', tone: 'gold' },
      { label: '当前状态', value: '等待授权', tone: 'danger' },
      { label: '下一步', value: '授权后生成交易数据', tone: 'gold' },
    ],
    metadata: {
      agentAuthorization: authorization,
      pipeline: createPipelineMetadata({
        intent,
        quoteInvocation,
        stage: 'quote-ready',
      }),
    },
    tags: ['conversation', 'trading', 'quote', 'okx-dex', 'confirmation'],
  })

  return {
    assistantText:
      '我已经通过 OKX 拿到报价。你只需要看卡片确认；没有授权前，我不会继续生成可签名交易。',
    cards: [card],
    intent,
    stage: 'quote-ready',
  }
}

function createPreparedSwapPipeline({
  authorization,
  intent,
  quoteInvocation,
  simulateInvocation,
  swapDataInvocation,
}) {
  const card = createCard({
    type: 'trade-confirmation',
    status: 'pending-execution',
    source: 'ai-agent',
    title: '交易数据已准备好',
    summary:
      'OKX 已返回交易数据，并完成模拟预检。当前仍未签名、未广播，等待 Agent Wallet 执行链路。',
    metrics: [
      { label: '操作', value: '兑换', tone: 'gold' },
      { label: '卖出', value: formatTokenAmount(intent), tone: 'gold' },
      { label: '买入', value: intent.toToken || '目标资产', tone: 'gold' },
      { label: '交易数据', value: 'OKX 已生成', tone: 'gold' },
      { label: '模拟预检', value: '已通过', tone: 'gold' },
      { label: '广播状态', value: '未广播', tone: 'danger' },
    ],
    metadata: {
      agentAuthorization: authorization,
      pipeline: createPipelineMetadata({
        intent,
        quoteInvocation,
        simulateInvocation,
        stage: 'prepared',
        swapDataInvocation,
      }),
    },
    tags: ['conversation', 'trading', 'swap-data', 'simulation', 'okx-dex'],
  })

  return {
    assistantText:
      'OKX 已生成交易数据并完成模拟预检。现在仍未签名、未广播，我会等 Agent Wallet 执行链路准备好再继续。',
    cards: [card],
    intent,
    stage: 'prepared',
  }
}

function createBlockedSwapPipeline({
  authorization,
  code,
  intent,
  invocation,
  message,
  quoteInvocation,
  reason,
  simulateInvocation,
  stage,
  swapDataInvocation,
}) {
  const card = createCard({
    type: 'trade-confirmation',
    status: 'blocked',
    source: 'ai-agent',
    title: '交易已暂停',
    summary: message,
    metrics: [
      { label: '暂停原因', value: reason, tone: 'danger' },
      { label: '当前步骤', value: stage, tone: 'muted' },
      { label: '安全处理', value: '不会执行', tone: 'gold' },
    ],
    metadata: {
      agentAuthorization: authorization,
      pipeline: createPipelineMetadata({
        intent,
        invocation,
        quoteInvocation,
        simulateInvocation,
        stage,
        swapDataInvocation,
      }),
      providerCode: code,
    },
    tags: ['conversation', 'trading', 'blocked', 'okx-dex'],
  })

  return {
    assistantText: `这笔交易我先暂停了：${message}`,
    cards: [card],
    intent,
    stage,
  }
}

function createPipelineMetadata({
  intent,
  invocation,
  quoteInvocation,
  simulateInvocation,
  stage,
  swapDataInvocation,
}) {
  return {
    intent: {
      amount: intent.amount,
      chain: intent.chain,
      fromToken: intent.fromToken,
      slippagePercent: intent.slippagePercent,
      toToken: intent.toToken,
    },
    invocationIds: {
      current: invocation?.id ?? null,
      quote: quoteInvocation?.id ?? null,
      simulate: simulateInvocation?.id ?? null,
      swapData: swapDataInvocation?.id ?? null,
    },
    stage,
    version: 'agent-execution-pipeline-v1',
  }
}

function extractSwapTransaction(resultData) {
  const response = resultData?.providerResponse
  const data = response?.data
  const record = Array.isArray(data) ? data[0] : data

  return record?.tx ?? null
}

function resolveToken({ chain, token }) {
  return tokenRegistry[chain.toLowerCase()]?.[token]
}

function toBaseUnit(amount, decimals) {
  if (!amount || typeof decimals !== 'number') {
    return ''
  }

  const [integerPart, fractionPart = ''] = amount.split('.')
  const paddedFraction = fractionPart.padEnd(decimals, '0').slice(0, decimals)
  const normalized = `${integerPart}${paddedFraction}`.replace(/^0+(?=\d)/, '')

  return normalized || '0'
}

function normalizeText(input) {
  return typeof input === 'string' ? input.trim() : ''
}

function normalizeTokenSymbol(input) {
  return normalizeText(input).toUpperCase()
}

function formatTokenAmount(intent) {
  if (!intent.amount || !intent.fromToken) {
    return '待补充'
  }

  return `${intent.amount} ${intent.fromToken}`
}

module.exports = {
  prepareSwapPipeline,
}
