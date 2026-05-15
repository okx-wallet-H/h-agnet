const {
  detectChain,
  detectTradeChain,
  detectTradeAction,
  detectWalletAction,
  extractAddress,
  extractAmountToken,
  extractTradeTokens,
  getTradeTargetToken,
  getWalletActionTag,
  shortenAddress,
} = require('./commandParsers')

async function createTradeCommand({ content, createCard, prepareSwap }) {
  const { amount, tokenSymbol } = extractAmountToken(content)
  const tradeAction = detectTradeAction(content)
  const tradeTokens = extractTradeTokens(content)

  if (tradeAction === '兑换' && typeof prepareSwap === 'function') {
    const result = await prepareSwap({
      amount: amount === '待补充' ? '' : amount,
      authorizationScope: 'trade-autonomy',
      chain: detectTradeChain(content),
      fromToken: tradeTokens.fromToken || tokenSymbol,
      toToken: tradeTokens.toToken || getTradeTargetToken(content),
    })

    return {
      actionLabel: tradeAction,
      adapterRequirement: 'agent-execution-pipeline',
      assistantText: result.assistantText,
      authorizationRequest: {
        requiresAssetAction: true,
        scope: 'trade-autonomy',
      },
      cards: result.cards,
      pipelineStage: result.stage,
      requiredConfirmation: true,
    }
  }

  const card = createCard({
    type: 'trade-confirmation',
    status: 'draft',
    source: 'ai-agent',
    title: 'OKX Swap 授权卡已准备好',
    summary:
      '我已把你的交易想法整理成 OKX Swap 授权卡。H Wallet 不自建交易引擎，报价、路线和 swap data 都由 OKX Swap 返回。',
    metrics: [
      { label: '要做的事', value: tradeAction, tone: 'gold' },
      { label: '资产', value: tokenSymbol, tone: 'gold' },
      { label: '金额', value: amount, tone: amount === '待补充' ? 'muted' : 'default' },
      { label: '目标资产', value: getTradeTargetToken(content), tone: 'muted' },
      { label: '当前状态', value: '未授权', tone: 'danger' },
      { label: '下一步', value: '首次授权', tone: 'gold' },
    ],
    tags: ['conversation', 'trading', 'confirmation'],
  })

  return {
    actionLabel: tradeAction,
    adapterRequirement: 'okx-swap-adapter',
    authorizationRequest: {
      requiresAssetAction: true,
      scope: 'trade-autonomy',
    },
    assistantText:
      amount !== '待补充'
        ? `我已经把 ${amount} ${tokenSymbol} 的交易想法整理成 OKX Swap 授权卡。首次授权前，我不会帮你下单。`
        : '我已经把交易想法整理成 OKX Swap 授权卡。首次授权前，我不会帮你下单。',
    cards: [card],
    requiredConfirmation: true,
  }
}

function createWalletCommand({ content, createCard }) {
  const walletAction = detectWalletAction(content)
  const { amount, tokenSymbol } = extractAmountToken(content)
  const address = extractAddress(content)
  const chain = detectChain(content)
  const addressValue =
    walletAction === '充值' ? '生成后展示' : shortenAddress(address)
  const addressTone = walletAction === '充值' || address ? 'muted' : 'danger'
  const isOutboundWalletAction = walletAction === '提现' || walletAction === '转账'
  const card = createCard({
    type: 'wallet-confirmation',
    status: 'draft',
    source: 'ai-agent',
    title: `${walletAction}卡片已准备好`,
    summary: isOutboundWalletAction
      ? '我已把钱包操作整理成授权卡。首次地址授权或新地址授权前不会转出资产，也不会在前端保存密钥。'
      : '我已把充值信息整理成卡片。充值只展示收款信息，不会在前端保存密钥。',
    metrics: [
      { label: '要做的事', value: walletAction, tone: 'gold' },
      { label: '资产', value: tokenSymbol, tone: 'gold' },
      { label: '金额', value: amount, tone: amount === '待补充' ? 'muted' : 'default' },
      { label: '网络', value: chain, tone: chain === '待选择' ? 'muted' : 'gold' },
      {
        label: walletAction === '充值' ? '充值地址' : '收款地址',
        value: addressValue,
        tone: addressTone,
      },
      { label: '当前状态', value: isOutboundWalletAction ? '未授权' : '待生成', tone: 'danger' },
      { label: '安全要求', value: isOutboundWalletAction ? '地址授权' : '仅展示', tone: 'gold' },
    ],
    tags: [
      'conversation',
      'wallet',
      'agent-wallet',
      getWalletActionTag(walletAction),
    ],
    metadata: {
      recipientAddress: address ?? null,
    },
  })

  return {
    actionLabel: walletAction,
    adapterRequirement: 'wallet-service',
    authorizationRequest: {
      address: address ?? null,
      requiresAssetAction: walletAction !== '充值',
      scope:
        walletAction === '提现' || walletAction === '转账'
          ? 'trusted-withdrawal-address'
          : 'wallet-receive',
    },
    assistantText:
      amount !== '待补充'
        ? `我已经把 ${amount} ${tokenSymbol} 的${walletAction}请求整理成卡片。首次地址授权或新地址授权前，不会动用资产。`
        : `我已经把${walletAction}请求整理成卡片。首次授权或新地址授权前，不会提现或转账。`,
    cards: [card],
    requiredConfirmation: true,
  }
}

function createBoostCommand({ createCard }) {
  const card = createCard({
    type: 'side-quest',
    status: 'draft',
    source: 'ai-agent',
    title: '赚币任务卡已准备好',
    summary:
      '我已记录你的赚币目标。后续任务、等级和奖励会根据卡库里的真实记录来计算。',
    metrics: [
      { label: '评分来源', value: '卡库', tone: 'gold' },
      { label: '当前状态', value: '待整理', tone: 'muted' },
      { label: '奖励领取', value: '需本人授权', tone: 'danger' },
    ],
    tags: ['conversation', 'boost', 'quest'],
  })

  return {
    actionLabel: '赚币任务',
    adapterRequirement: 'boost-service',
    authorizationRequest: {
      requiresAssetAction: false,
      scope: 'none',
    },
    assistantText: '我已经把赚币目标整理成任务卡。后续会按卡库记录来计算等级和奖励。',
    cards: [card],
    requiredConfirmation: true,
  }
}

function createEarningAgentCommand({ content, startOfficialStrategy }) {
  const strategyId = detectEarningStrategyId(content)
  const result = startOfficialStrategy({ strategyId })

  return {
    actionLabel: `启动${result.strategy.name}`,
    adapterRequirement: 'h-skill-runtime',
    authorizationRequest: {
      requiresAssetAction: true,
      scope: result.strategy.authorizationScope,
    },
    assistantText:
      `我已经把「${result.strategy.name}」启动卡准备好了。你先看卡片：授权前不会动用资产；后续只会通过 H Skill 调用 OKX OnchainOS 能力。`,
    cards: [result.card],
    requiredConfirmation: true,
  }
}

function createPortfolioCommand({ createCard }) {
  const card = createCard({
    type: 'portfolio-insight',
    status: 'draft',
    source: 'ai-agent',
    title: '资产分析卡已准备好',
    summary:
      '我已把资产问题整理成分析卡。真正的个性化建议会基于钱包资产和卡库历史。',
    metrics: [
      { label: '分析依据', value: '卡库+资产', tone: 'gold' },
      { label: '当前状态', value: '待分析', tone: 'gold' },
      { label: '建议性质', value: '参考', tone: 'muted' },
    ],
    tags: ['conversation', 'portfolio', 'insight'],
  })

  return {
    actionLabel: '资产分析',
    adapterRequirement: 'portfolio-service',
    authorizationRequest: {
      requiresAssetAction: false,
      scope: 'none',
    },
    assistantText: '我已经把资产问题整理成分析卡。等资产和卡库数据接好后，会给你更具体的建议。',
    cards: [card],
    requiredConfirmation: true,
  }
}

function createUnknownCommand({ createCard }) {
  const card = createCard({
    type: 'system-status',
    status: 'draft',
    source: 'ai-agent',
    title: '我先记下来了',
    summary:
      '这句话还不够明确，我先生成一张记录卡，不会触发钱包或交易动作。',
    metrics: [
      { label: '理解状态', value: '需要补充', tone: 'muted' },
      { label: '当前动作', value: '仅记录', tone: 'gold' },
      { label: '资产影响', value: '无', tone: 'gold' },
    ],
    tags: ['conversation', 'system'],
  })

  return {
    actionLabel: '记录',
    adapterRequirement: 'none',
    authorizationRequest: {
      requiresAssetAction: false,
      scope: 'none',
    },
    assistantText: '我先记下来了。你可以再说得具体一点，比如“帮我充值”或“帮我找赚币任务”。',
    cards: [card],
    requiredConfirmation: false,
  }
}

function detectEarningStrategyId(content) {
  const normalized = content.toLowerCase()

  if (
    normalized.includes('调仓') ||
    normalized.includes('rebalance') ||
    normalized.includes('智能')
  ) {
    return 'official-smart-rebalance'
  }

  return 'official-stable-earn'
}

const commandHandlers = {
  'boost-action': createBoostCommand,
  'earning-agent': createEarningAgentCommand,
  'portfolio-question': createPortfolioCommand,
  'trade-proposal': createTradeCommand,
  unknown: createUnknownCommand,
  'wallet-action': createWalletCommand,
}

module.exports = {
  commandHandlers,
}
