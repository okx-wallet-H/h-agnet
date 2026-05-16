const { commandHandlers } = require('./commandHandlers')
const { normalizeContent } = require('./commandParsers')
const {
  evaluateAgentAuthorization,
} = require('../services/agentAuthorizationPolicyService')

const pipelineVersion = 'agent-command-pipeline-v1'

const intentRules = [
  {
    intent: 'earning-agent',
    keywords: [
      'start agent',
      'earning agent',
      '启动 agent',
      '启动agent',
      '启动赚币',
      '开始赚币',
      '帮我赚币',
      '稳健赚币',
      '稳定币赚币',
      '智能调仓',
    ],
  },
  {
    intent: 'trade-proposal',
    keywords: ['swap', 'trade', 'buy', 'sell', '交易', '买', '卖', '兑换', '换成'],
  },
  {
    intent: 'wallet-action',
    keywords: ['deposit', 'withdraw', 'send', 'receive', '充值', '提现', '转账'],
  },
  {
    intent: 'portfolio-question',
    keywords: ['portfolio', 'position', 'risk', '持仓', '组合', '资产', '风险'],
  },
  {
    intent: 'boost-action',
    keywords: ['boost', 'reward', 'quest', 'member', '赚币', '奖励', '任务', '会员'],
  },
]

async function executeAgentCommand(input, dependencies) {
  const content = normalizeContent(input?.content)
  const intent = detectIntent(content)
  const handler = commandHandlers[intent] ?? commandHandlers.unknown
  const commandResult = await handler({
    content,
    createCard: dependencies.createCard,
    prepareSwap: dependencies.prepareSwap,
    runStrategyPreflight: dependencies.runStrategyPreflight,
    startOfficialStrategy: dependencies.startOfficialStrategy,
  })
  const authorization = evaluateAgentAuthorization(
    commandResult.authorizationRequest,
  )
  applyAuthorizationToCards(commandResult.cards, authorization)

  return {
    content,
    intent,
    confidence: intent === 'unknown' ? 'low' : 'medium',
    assistantText: commandResult.assistantText,
    processSteps: buildProcessSteps(intent, commandResult, authorization),
    cards: commandResult.cards,
    executionPlan: buildExecutionPlan(intent, commandResult, authorization),
  }
}

function applyAuthorizationToCards(cards, authorization) {
  cards.forEach((card) => {
    card.metadata = {
      ...card.metadata,
      agentAuthorization: {
        authorizationGrantId: authorization.authorizationGrantId,
        authorizationStatus: authorization.authorizationStatus,
        policyReason: authorization.policyReason,
        policyVersion: authorization.policyVersion,
        scope: authorization.scope,
      },
    }

    if (
      authorization.authorizationStatus !== 'agent-authorized' ||
      isStatusOnlyCard(card) ||
      !canApplyAgentAuthorizedStatus(card)
    ) {
      return
    }

    card.status = 'agent-authorized'
    card.summary = getAuthorizedSummary(card)
    upsertMetric(card, {
      label: '当前状态',
      value: 'Agent 已授权',
      tone: 'gold',
    })
    upsertMetric(card, {
      label: '下一步',
      value: card.tags.includes('official-strategy')
        ? '等待 H Skill Runner'
        : '等待 OKX 适配器',
      tone: 'gold',
    })
    upsertMetric(card, {
      label: '授权范围',
      value: getAuthorizationScopeLabel(authorization.scope),
      tone: 'gold',
    })
  })
}

function isStatusOnlyCard(card) {
  return card.tags.includes('preflight') || card.tags.includes('runner-status')
}

function canApplyAgentAuthorizedStatus(card) {
  return ['draft', 'requires-confirmation', 'confirmed'].includes(card.status)
}

function getAuthorizedSummary(card) {
  if (card.type === 'trade-confirmation') {
    return '你已完成交易授权，这次交易可进入 Agent 自主执行通道。若 OKX / OnchainOS 返回风险提示或拦截，H Wallet 会暂停并提示你。'
  }

  if (card.type === 'wallet-confirmation') {
    return '该地址已完成授权，本次钱包动作可进入 Agent 自主执行通道。地址变化时仍会重新要求授权。'
  }

  if (card.tags.includes('official-strategy')) {
    return '这个官方赚币策略已匹配你的授权范围。Agent 只能在当前策略版本内继续推进，策略变化时会重新授权。'
  }

  return card.summary
}

function getAuthorizationScopeLabel(scope) {
  if (scope === 'trusted-withdrawal-address') {
    return '当前地址'
  }

  if (scope === 'trade-autonomy') {
    return '交易自主执行'
  }

  if (typeof scope === 'string' && scope.startsWith('strategy:')) {
    return '官方策略版本'
  }

  return '当前授权'
}

function upsertMetric(card, nextMetric) {
  const existingMetric = card.metrics.find(
    (metric) => metric.label === nextMetric.label,
  )

  if (existingMetric) {
    existingMetric.value = nextMetric.value
    existingMetric.tone = nextMetric.tone
    return
  }

  card.metrics.push(nextMetric)
}

function detectIntent(content) {
  const normalized = content.toLowerCase()

  return (
    intentRules.find((rule) =>
      rule.keywords.some((keyword) => normalized.includes(keyword)),
    )?.intent ?? 'unknown'
  )
}

function buildProcessSteps(intent, commandResult, authorization) {
  if (intent === 'unknown') {
    return [
      {
        id: 'understand',
        title: '理解你的话',
        detail: '这句话还不够明确，我先按普通记录处理。',
        status: 'done',
      },
      {
        id: 'card',
        title: '生成记录卡',
        detail: '记录卡不会触发钱包、交易或奖励动作。',
        status: 'done',
      },
      {
        id: 'next',
        title: '等待你补充',
        detail: '你可以继续说金额、资产、网络或想做的任务。',
        status: 'waiting',
      },
    ]
  }

  const gateStep = authorization.requiredUserAuthorization
    ? {
        id: 'gate',
        title: '等待用户授权',
        detail: authorization.policyReason,
        status: 'waiting',
      }
    : {
        id: 'policy',
        title: '授权策略已匹配',
        detail: authorization.policyReason,
        status: 'done',
      }

  const steps = [
    {
      id: 'understand',
      title: '理解你的目标',
      detail: `我识别到你想做「${commandResult.actionLabel}」。`,
      status: 'done',
    },
    {
      id: 'card',
      title: '整理成授权卡',
      detail: '金额、资产、地址和风险提示会集中放在卡片里。',
      status: 'done',
    },
    gateStep,
  ]

  if (commandResult.preflight) {
    steps.push({
      id: 'preflight',
      title: '完成只读预检',
      detail: `已完成 ${commandResult.preflight.completedCount} 项，等待 ${commandResult.preflight.waitingCount} 项；不会签名或广播。`,
      status: commandResult.preflight.blockedCount > 0 ? 'blocked' : 'done',
    })
  }

  return steps
}

function buildExecutionPlan(intent, commandResult, authorization) {
  return {
    pipelineVersion,
    intent,
    actionLabel: commandResult.actionLabel,
    adapterRequirement: commandResult.adapterRequirement,
    authorizationGrantId: authorization.authorizationGrantId,
    authorizationStatus: authorization.authorizationStatus,
    policyReason: authorization.policyReason,
    policyVersion: authorization.policyVersion,
    requiredConfirmation: authorization.requiredUserAuthorization,
    requiredUserAuthorization: authorization.requiredUserAuthorization,
    scope: authorization.scope,
    executionMode: authorization.executionMode,
    safetyGate: authorization.safetyGate,
    runnerPreflight: commandResult.preflight
      ? {
          blockedCount: commandResult.preflight.blockedCount,
          completedCount: commandResult.preflight.completedCount,
          runId: commandResult.preflight.runId,
          waitingCount: commandResult.preflight.waitingCount,
        }
      : null,
    userFacingComplexity: 'simple-card',
  }
}

module.exports = {
  executeAgentCommand,
}
