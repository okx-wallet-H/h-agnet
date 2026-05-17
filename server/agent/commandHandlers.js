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

function createBoostCommand({ createCard, getGrowthSummary, listSideQuests }) {
  const growth =
    typeof getGrowthSummary === 'function' ? getGrowthSummary() : null
  const sideQuests =
    typeof listSideQuests === 'function' ? listSideQuests() : []
  const stats = growth?.stats ?? {}
  const nextQuest = getNextSideQuest(sideQuests)
  const unlockedCount = sideQuests.filter(
    (quest) => quest.status === 'unlocked',
  ).length
  const totalCards = Number(stats.totalCards ?? 0)
  const completedTrades = Number(stats.completedTrades ?? 0)
  const pendingExecution = Number(stats.confirmations?.pendingExecution ?? 0)
  const score = typeof growth?.score === 'number' ? growth.score : null
  const tierLabel = growth?.tier?.label ?? '待激活'
  const recommendedAction = growth?.recommendedActions?.[0]

  const card = createCard({
    type: 'side-quest',
    status: 'draft',
    source: 'ai-agent',
    title: '支线任务进度',
    summary: getBoostSummaryCopy({
      completedTrades,
      nextQuest,
      pendingExecution,
      totalCards,
    }),
    metrics: [
      { label: '评分来源', value: '卡库', tone: 'gold' },
      { label: '会员等级', value: tierLabel, tone: score ? 'gold' : 'muted' },
      {
        label: '成长评分',
        value: score === null ? '待计算' : `${score}/100`,
        tone: score ? 'gold' : 'muted',
      },
      { label: '交易卡库', value: `${totalCards} 张`, tone: totalCards ? 'gold' : 'muted' },
      { label: '交易中', value: `${pendingExecution} 张`, tone: pendingExecution ? 'gold' : 'muted' },
      { label: '交易成功', value: `${completedTrades} 张`, tone: completedTrades ? 'success' : 'muted' },
      {
        label: '下一支线',
        value: nextQuest?.title ?? recommendedAction?.title ?? '启动第一笔 Agent 交易',
        tone: nextQuest?.status === 'unlocked' ? 'success' : 'gold',
      },
    ],
    metadata: {
      cardLibrary: {
        completedTrades,
        pendingExecution,
        totalCards,
      },
      growth: growth
        ? {
            score: growth.score,
            taskScore: growth.taskScore,
            tier: growth.tier,
            trustScore: growth.trustScore,
            verifiedResultScore: growth.verifiedResultScore,
          }
        : null,
      nextAction: recommendedAction ?? null,
      nextQuest: nextQuest
        ? {
            id: nextQuest.id,
            progress: nextQuest.progress,
            requirement: nextQuest.requirement,
            status: nextQuest.status,
            title: nextQuest.title,
          }
        : null,
      unlockedQuestCount: unlockedCount,
    },
    tags: ['conversation', 'boost', 'quest'],
  })

  return {
    actionLabel: '支线任务',
    adapterRequirement: 'boost-service',
    authorizationRequest: {
      requiresAssetAction: false,
      scope: 'none',
    },
    assistantText: getBoostAssistantCopy({
      completedTrades,
      nextQuest,
      pendingExecution,
      score,
      tierLabel,
      totalCards,
    }),
    cards: [card],
    requiredConfirmation: false,
  }
}

function getNextSideQuest(sideQuests) {
  return (
    sideQuests.find((quest) => quest.status === 'active') ??
    sideQuests.find((quest) => quest.status === 'locked') ??
    sideQuests.find((quest) => quest.status === 'unlocked') ??
    null
  )
}

function getBoostSummaryCopy({
  completedTrades,
  nextQuest,
  pendingExecution,
  totalCards,
}) {
  if (totalCards === 0) {
    return '卡库还没有交易中或交易成功卡。先启动一次 Agent 赚币流程，支线任务和会员成长就会开始计分。'
  }

  return `卡库当前有 ${totalCards} 张交易卡，其中 ${pendingExecution} 张交易中、${completedTrades} 张交易成功。下一步关注「${nextQuest?.title ?? '继续积累交易卡'}」。`
}

function getBoostAssistantCopy({
  completedTrades,
  nextQuest,
  pendingExecution,
  score,
  tierLabel,
  totalCards,
}) {
  if (totalCards === 0) {
    return '我看了一下卡库：现在还没有交易中或交易成功卡。先启动 Agent 赚币，卡库有记录后，支线任务和会员等级会自动开始计算。'
  }

  const scoreCopy = score === null ? '待计算' : `${score}/100`

  return `我按卡库重新算了一遍：当前 ${tierLabel}，成长评分 ${scoreCopy}；交易中 ${pendingExecution} 张，交易成功 ${completedTrades} 张。下一支线是「${nextQuest?.title ?? '继续积累交易卡'}」。`
}

async function createEarningAgentCommand({
  content,
  createCard,
  runStrategyPreflight,
  startOfficialStrategy,
}) {
  const strategyId = detectEarningStrategyId(content)
  const result = startOfficialStrategy({ strategyId })
  const cards = [result.card]
  let preflight = null
  let preflightCopy =
    '我会继续做只读预检，把复杂过程折叠在后台，只把结果卡片给你看。'

  if (typeof runStrategyPreflight === 'function') {
    try {
      const preflightResult = await runStrategyPreflight({
        input: buildStrategyPreflightInput(content),
        runId: result.run.id,
      })

      preflight = preflightResult.preflight
      cards.push(preflightResult.card)
      preflightCopy = `我已经顺手完成只读预检：完成 ${preflight.completedCount} 项，等待 ${preflight.waitingCount} 项；没有签名、没有广播。`
    } catch (error) {
      const card = createCard({
        type: 'system-status',
        status: 'blocked',
        source: 'ai-agent',
        title: `${result.strategy.name} 预检暂停`,
        summary:
          error instanceof Error && error.message
            ? error.message
            : 'Runner 只读预检暂时失败。启动卡仍然有效，但不会进入执行。',
        metrics: [
          { label: '预检状态', value: '已暂停', tone: 'danger' },
          { label: '资产影响', value: '无', tone: 'gold' },
          { label: '执行状态', value: '未广播', tone: 'danger' },
        ],
        metadata: {
          runId: result.run.id,
          strategyId: result.strategy.id,
          strategyName: result.strategy.name,
          strategyVersion: result.strategy.version,
        },
        tags: [
          'agent',
          'earning-agent',
          'runner-status',
          'preflight',
          'blocked',
          `strategy:${result.strategy.id}`,
          `run:${result.run.id}`,
        ],
      })

      cards.push(card)
      preflight = {
        blockedCount: 1,
        completedCount: 0,
        runId: result.run.id,
        waitingCount: 0,
      }
      preflightCopy = '只读预检暂时暂停了，启动卡仍然保留；我不会进入任何资产动作。'
    }
  }

  return {
    actionLabel: `启动${result.strategy.name}`,
    adapterRequirement: 'h-skill-runtime',
    authorizationRequest: {
      requiresAssetAction: true,
      scope: result.strategy.authorizationScope,
    },
    assistantText:
      `我已经把「${result.strategy.name}」启动卡准备好了。${preflightCopy}`,
    cards,
    preflight,
    requiredConfirmation: true,
  }
}

function buildStrategyPreflightInput(content) {
  const chain = detectChain(content)
  const tokenAddress = extractAddress(content)
  const { tokenSymbol } = extractAmountToken(content)
  const token =
    tokenSymbol !== '待选择' ? tokenSymbol : extractLikelyTokenSymbol(content)

  return compactPreflightInput({
    chain: chain === '待选择' ? undefined : chain,
    operation: 'buy',
    token: token || undefined,
    tokenAddress: tokenAddress || undefined,
  })
}

function compactPreflightInput(input) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
}

function extractLikelyTokenSymbol(content) {
  const ignored = new Set([
    'AI',
    'AGENT',
    'H',
    'OKX',
    'ONCHAIN',
    'OS',
    'WEB3',
  ])
  const matches = content.match(/\b[A-Z][A-Z0-9]{1,12}\b/g) ?? []

  return matches.find((item) => !ignored.has(item.toUpperCase())) ?? ''
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
