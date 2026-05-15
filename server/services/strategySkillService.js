const {
  strategySkillRepository,
} = require('../repositories/strategySkillRepository')
const {
  getHSkillBindingStatus,
} = require('../adapters/okxProviderRegistry')
const {
  evaluateAgentAuthorization,
} = require('./agentAuthorizationPolicyService')
const { createCard } = require('./cardsService')

const runnerStates = [
  {
    id: 'idle',
    label: '待启动',
    description: '用户尚未启动赚币 Agent。',
  },
  {
    id: 'starting',
    label: '启动中',
    description: '创建策略运行记录和启动草案卡片。',
  },
  {
    id: 'planning',
    label: '规划中',
    description: '解析策略版本、H Skill 依赖和授权范围。',
  },
  {
    id: 'waiting-authorization',
    label: '等待授权',
    description: '需要用户授权或命中已有授权范围。',
  },
  {
    id: 'executing',
    label: '执行中',
    description: '通过 H Skill Wrapper 调用 OnchainOS 能力。',
  },
  {
    id: 'completed',
    label: '已完成',
    description: '生成 verified result 并写入卡库。',
  },
  {
    id: 'blocked',
    label: '已阻止',
    description: '适配器、风控或授权门阻止继续执行。',
  },
  {
    id: 'paused',
    label: '已暂停',
    description: '用户暂停 Agent 或策略进入维护状态。',
  },
]

function listOfficialStrategySkills() {
  return strategySkillRepository.listOfficialStrategies()
}

function listHSkillWrappers() {
  return strategySkillRepository.listHSkillWrappers()
}

function listStrategyRuns() {
  return strategySkillRepository.listRuns()
}

function getOfficialStrategyPlan(input) {
  const strategyId = validateStrategyId(input?.strategyId)
  const strategy = strategySkillRepository.findStrategyById(strategyId)

  if (!strategy) {
    const error = new Error('策略不存在或未开放。')
    error.statusCode = 404
    error.code = 'strategy-not-found'
    throw error
  }

  const plan = buildStrategyExecutionPlan(strategy)

  return {
    strategy,
    plan,
    summary: summarizeExecutionPlan(plan),
    executionPolicy: {
      realExecutionEnabled: false,
      reason: '当前阶段只生成 Agent Runner 编排计划，不执行真实链上动作。',
    },
  }
}

function getAgentRunnerStatus() {
  const runs = strategySkillRepository.listRuns()
  const currentRun = runs[0] ?? null

  return {
    state: currentRun?.status ?? 'idle',
    currentRun,
    stateOrder: runnerStates,
    summary: currentRun
      ? '赚币 Agent 已创建运行草案，等待执行适配器和授权链路继续推进。'
      : '赚币 Agent 等待用户启动策略。',
    executionPolicy: {
      realExecutionEnabled: false,
      reason: '当前阶段只开放 Runner 合约、策略注册表和启动草案。',
    },
  }
}

function startOfficialStrategySkill(input) {
  const strategyId = validateStrategyId(input?.strategyId)
  const strategy = strategySkillRepository.findStrategyById(strategyId)

  if (!strategy) {
    const error = new Error('策略不存在或未开放。')
    error.statusCode = 404
    error.code = 'strategy-not-found'
    throw error
  }

  const executionPlan = buildStrategyExecutionPlan(strategy)
  const authorization = evaluateAgentAuthorization({
    requiresAssetAction: true,
    scope: strategy.authorizationScope,
  })
  const run = {
    id: `agent-run-${Date.now()}`,
    strategyId: strategy.id,
    strategyVersion: strategy.version,
    status: 'blocked',
    createdAt: new Date().toISOString(),
    executionMode: 'draft-only',
    requiredSkillWrappers: strategy.requiredSkillWrappers,
    executionPlan,
    authorization,
    stateLabel: '已阻止',
    blockReason: getRunBlockReason({ authorization, executionPlan }),
    nextStep: getNextPlanStep(executionPlan),
    steps: [
      {
        id: 'starting',
        label: '创建运行草案',
        status: 'done',
        detail: '策略运行记录和卡片草案已创建。',
      },
      {
        id: 'planning',
        label: '解析策略能力',
        status: 'done',
        detail: summarizeExecutionPlan(executionPlan),
      },
      {
        id: 'waiting-authorization',
        label: '授权策略检查',
        status: authorization.requiredUserAuthorization ? 'waiting' : 'done',
        detail: authorization.policyReason,
      },
      {
        id: 'executing',
        label: '链上执行',
        status: 'blocked',
        detail: '当前阶段不执行真实链上操作。',
      },
      {
        id: 'completed',
        label: '结果入库',
        status: 'waiting',
        detail: '只有 verified result 才能生成完成卡片。',
      },
    ],
  }

  const card = createCard({
    type: 'system-status',
    status: 'draft',
    source: 'ai-agent',
    title: `${strategy.name} 启动草案`,
    summary:
      'H Wallet 已创建官方赚币策略启动草案。当前阶段不会执行真实链上操作，也不会承诺收益。',
    metrics: [
      { label: '策略版本', value: strategy.version, tone: 'gold' },
      { label: '风险等级', value: formatRiskLevel(strategy.riskLevel), tone: 'gold' },
      { label: '要做的事', value: '启动赚币 Agent', tone: 'gold' },
      { label: '执行模式', value: '草案，不执行', tone: 'danger' },
      { label: '所需 H Skill', value: String(strategy.requiredSkillWrappers.length), tone: 'muted' },
      {
        label: '授权范围',
        value: strategy.authorizationScope,
        tone: 'muted',
      },
      {
        label: '当前状态',
        value: authorization.requiredUserAuthorization ? '未授权' : 'Agent 已授权',
        tone: authorization.requiredUserAuthorization ? 'danger' : 'gold',
      },
    ],
    metadata: {
      authorizationScope: strategy.authorizationScope,
      authorizationStatus: authorization.authorizationStatus,
      strategyId: strategy.id,
      strategyVersion: strategy.version,
      runId: run.id,
      requiredSkillWrappers: strategy.requiredSkillWrappers,
    },
    tags: [
      'agent',
      'earning-agent',
      'official-strategy',
      'strategy-skill',
      `strategy:${strategy.id}`,
      `run:${run.id}`,
    ],
  })

  return {
    run: strategySkillRepository.insertRun(run),
    strategy,
    card,
  }
}

function buildStrategyExecutionPlan(strategy) {
  return strategy.requiredSkillWrappers.map((wrapperId, index) => {
    const wrapper = strategySkillRepository.findHSkillWrapperById(wrapperId)
    const stage = inferExecutionStage(wrapperId)

    if (!wrapper) {
      return {
        id: `execution-step-${index + 1}`,
        order: index + 1,
        wrapperId,
        label: '未注册封装能力',
        providerSkill: 'unknown',
        stage,
        status: 'blocked',
        required: true,
        detail: '策略引用的 H Skill Wrapper 未注册，必须先补齐封装协议。',
      }
    }

    const binding = getHSkillBindingStatus(wrapper)
    const ready = binding.status === 'ready'

    return {
      id: `execution-step-${index + 1}`,
      order: index + 1,
      wrapperId: wrapper.id,
      label: wrapper.label,
      providerSkill: wrapper.providerSkill,
      adapterStatus: binding.adapterStatus,
      bindingStatus: binding.status,
      credentialBoundary: binding.credentialBoundary,
      credentialLabel: binding.credentialLabel,
      requiredProviderMethod: binding.requiredProviderMethod,
      stage,
      status: ready ? 'ready' : 'blocked',
      required: true,
      detail: ready
        ? 'H Skill 协议和 provider adapter 均已就绪。'
        : binding.reason,
      wrapperStatus: wrapper.status,
    }
  })
}

function summarizeExecutionPlan(plan) {
  const blockedCount = plan.filter((item) => item.status === 'blocked').length
  const readyCount = plan.length - blockedCount

  return `已解析 ${plan.length} 个执行节点，${readyCount} 个 adapter 就绪，${blockedCount} 个等待 adapter。`
}

function getNextPlanStep(plan) {
  const blockedStep = plan.find((item) => item.status === 'blocked')

  if (!blockedStep) {
    return '下一步接入授权策略和真实 OKX adapter 执行回执。'
  }

  return `优先接入 ${blockedStep.wrapperId} 的真实 OKX adapter。`
}

function getRunBlockReason({ authorization, executionPlan }) {
  const blockedCount = executionPlan.filter(
    (item) => item.status === 'blocked',
  ).length

  if (authorization.requiredUserAuthorization) {
    return authorization.policyReason
  }

  if (blockedCount > 0) {
    return '部分 H Skill Wrapper 还没有接入真实 OKX adapter。'
  }

  return '真实执行回执链路尚未开放。'
}

function inferExecutionStage(wrapperId) {
  const stageLabels = {
    'H.skill.wallet.getPortfolio': '读取钱包',
    'H.skill.swap.quote': 'OKX Swap 报价',
    'H.skill.swap.execute': 'OKX Swap 执行',
    'H.skill.risk.scanTransaction': '风控扫描',
    'H.skill.gateway.simulate': '链上模拟',
    'H.skill.gateway.broadcast': '链上广播',
    'H.skill.gateway.trackOrder': '状态追踪',
    'H.skill.defi.deposit': 'DeFi 存入',
    'H.skill.defi.claim': '收益领取',
  }

  return stageLabels[wrapperId] ?? '封装能力'
}

function validateStrategyId(input) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    const error = new Error('strategyId 必须是非空字符串。')
    error.statusCode = 400
    error.code = 'bad-request'
    throw error
  }

  return input.trim()
}

function formatRiskLevel(riskLevel) {
  const labels = {
    low: '低',
    medium: '中',
    high: '高',
  }

  return labels[riskLevel] ?? riskLevel
}

module.exports = {
  getOfficialStrategyPlan,
  getAgentRunnerStatus,
  listHSkillWrappers,
  listOfficialStrategySkills,
  listStrategyRuns,
  startOfficialStrategySkill,
}
