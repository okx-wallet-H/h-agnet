const { randomUUID } = require('node:crypto')

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
const { invokeHSkill } = require('./hSkillRuntimeService')
const { getCurrentUserId } = require('./userIdentityService')

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

function nowIso() {
  return new Date().toISOString()
}

function listOfficialStrategySkills() {
  return strategySkillRepository
    .listOfficialStrategies()
    .map(enrichStrategyWithOkxSkillComposition)
}

function listHSkillWrappers() {
  return strategySkillRepository.listHSkillWrappers()
}

function listStrategyRuns() {
  return strategySkillRepository.listRuns({ userId: getCurrentUserId() })
}

function getOfficialStrategyPlan(input) {
  const strategyId = validateStrategyId(input?.strategyId)
  const strategy = enrichStrategyWithOkxSkillComposition(
    strategySkillRepository.findStrategyById(strategyId),
  )

  if (!strategy) {
    const error = new Error('策略不存在或未开放。')
    error.statusCode = 404
    error.code = 'strategy-not-found'
    throw error
  }

  const plan = buildStrategyExecutionPlan(strategy)
  const composition = buildOkxSkillComposition(strategy)

  return {
    strategy,
    composition,
    plan,
    compositionSummary: summarizeOkxSkillComposition(composition),
    summary: summarizeExecutionPlan(plan),
    executionPolicy: {
      realExecutionEnabled: false,
      reason: '当前阶段只生成 Agent Runner 编排计划，不执行真实链上动作。',
    },
  }
}

function getAgentRunnerStatus() {
  const runs = strategySkillRepository.listRuns({ userId: getCurrentUserId() })
  const currentRun = selectCurrentStrategyRun(runs)

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

function selectCurrentStrategyRun(runs) {
  return (
    [...runs].sort((firstRun, secondRun) => {
      const statusDiff =
        getRunDisplayPriority(firstRun.status) -
        getRunDisplayPriority(secondRun.status)

      if (statusDiff !== 0) {
        return statusDiff
      }

      return (
        new Date(secondRun.updatedAt ?? secondRun.createdAt).getTime() -
        new Date(firstRun.updatedAt ?? firstRun.createdAt).getTime()
      )
    })[0] ?? null
  )
}

function getRunDisplayPriority(status) {
  const priorities = {
    executing: 1,
    planning: 2,
    blocked: 3,
    completed: 4,
    paused: 5,
    'waiting-authorization': 6,
    starting: 7,
  }

  return priorities[status] ?? 99
}

function startOfficialStrategySkill(input) {
  const strategyId = validateStrategyId(input?.strategyId)
  const userId = getCurrentUserId()
  const strategy = enrichStrategyWithOkxSkillComposition(
    strategySkillRepository.findStrategyById(strategyId),
  )

  if (!strategy) {
    const error = new Error('策略不存在或未开放。')
    error.statusCode = 404
    error.code = 'strategy-not-found'
    throw error
  }

  const executionPlan = buildStrategyExecutionPlan(strategy)
  const okxSkillComposition = buildOkxSkillComposition(strategy)
  const authorization = evaluateAgentAuthorization({
    requiresAssetAction: true,
    scope: strategy.authorizationScope,
  })
  const blockedPlanCount = executionPlan.filter(
    (item) => item.status === 'blocked',
  ).length
  const runStatus = authorization.requiredUserAuthorization
    ? 'waiting-authorization'
    : blockedPlanCount > 0
      ? 'blocked'
      : 'planning'
  const run = {
    id: createStrategyRunId(),
    strategyId: strategy.id,
    strategyVersion: strategy.version,
    userId,
    status: runStatus,
    createdAt: new Date().toISOString(),
    executionMode: 'draft-only',
    requiredSkillWrappers: strategy.requiredSkillWrappers,
    executionPlan,
    okxSkillComposition,
    authorization,
    stateLabel: getRunStateLabel(runStatus),
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
    status: authorization.requiredUserAuthorization ? 'draft' : 'agent-authorized',
    source: 'ai-agent',
    title: `${strategy.name} 启动草案`,
    summary:
      'H Wallet 已创建官方赚币 Agent 启动卡。授权前不会动用资产；当前阶段只进入策略草案和 H Skill 编排。',
    metrics: [
      { label: '策略版本', value: strategy.version, tone: 'gold' },
      { label: '风险等级', value: formatRiskLevel(strategy.riskLevel), tone: 'gold' },
      { label: '要做的事', value: '启动赚币 Agent', tone: 'gold' },
      {
        label: '资产范围',
        value: strategy.supportedAssets.join(' / '),
        tone: 'gold',
      },
      {
        label: '网络范围',
        value: strategy.supportedChains.join(' / '),
        tone: 'muted',
      },
      {
        label: 'H Skill',
        value: `${strategy.requiredSkillWrappers.length} 个封装能力`,
        tone: blockedPlanCount > 0 ? 'muted' : 'gold',
      },
      {
        label: '当前状态',
        value: authorization.requiredUserAuthorization ? '未授权' : 'Agent 已授权',
        tone: authorization.requiredUserAuthorization ? 'danger' : 'gold',
      },
      {
        label: '下一步',
        value: authorization.requiredUserAuthorization ? '完成策略授权' : '等待执行回执',
        tone: 'gold',
      },
    ],
    metadata: {
      authorizationScope: strategy.authorizationScope,
      authorizationStatus: authorization.authorizationStatus,
      blockedPlanCount,
      readyPlanCount: executionPlan.length - blockedPlanCount,
      strategyId: strategy.id,
      strategyName: strategy.name,
      strategySummary: strategy.summary,
      strategyVersion: strategy.version,
      runId: run.id,
      supportedAssets: strategy.supportedAssets,
      supportedChains: strategy.supportedChains,
      requiredSkillWrappers: strategy.requiredSkillWrappers,
      okxSkillComposition,
    },
    tags: [
      'agent',
      'earning-agent',
      'official-strategy',
      'strategy-skill',
      'okx-skill-composition',
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

function createStrategyRunId() {
  return `agent-run-${Date.now()}-${randomUUID()}`
}

async function runOfficialStrategyPreflight(input) {
  const runId = validateStrategyId(input?.runId)
  const run = strategySkillRepository.findRunById(runId, {
    userId: getCurrentUserId(),
  })

  if (!run) {
    const error = new Error('策略运行记录不存在。')
    error.statusCode = 404
    error.code = 'strategy-run-not-found'
    throw error
  }

  const strategy = enrichStrategyWithOkxSkillComposition(
    strategySkillRepository.findStrategyById(run.strategyId),
  )

  if (!strategy) {
    const error = new Error('策略不存在或未开放。')
    error.statusCode = 404
    error.code = 'strategy-not-found'
    throw error
  }

  const preflight = await invokePreflightWrappers({
    input: input?.input ?? {},
    run,
    strategy,
  })
  const nextRun = updateRunAfterPreflight({ preflight, run })
  const card = createStrategyPreflightCard({
    preflight,
    run: nextRun,
    strategy,
  })

  return {
    run: nextRun,
    strategy,
    card,
    preflight,
  }
}

async function invokePreflightWrappers({ input, run, strategy }) {
  const results = []

  for (const wrapperId of strategy.requiredSkillWrappers) {
    const invocationInput = getPreflightInvocationInput({
      input,
      strategy,
      wrapperId,
    })

    if (!invocationInput) {
      results.push(createWaitingPreflightResult(wrapperId))
      continue
    }

    const invocationResult = await invokeHSkill({
      input: invocationInput,
      wrapperId,
    })
    const invocation = invocationResult.invocation

    results.push({
      wrapperId,
      invocationId: invocation.id,
      status: invocation.result.ok ? 'completed' : 'blocked',
      code: invocation.result.code,
      message: invocation.result.message,
      stage: inferExecutionStage(wrapperId),
    })
  }

  const completedCount = results.filter(
    (item) => item.status === 'completed',
  ).length
  const blockedCount = results.filter((item) => item.status === 'blocked').length
  const waitingCount = results.filter((item) => item.status === 'waiting').length

  return {
    blockedCount,
    completedCount,
    inputSummary: summarizePreflightInput(input),
    results,
    runId: run.id,
    strategyId: strategy.id,
    strategyVersion: strategy.version,
    waitingCount,
  }
}

function getPreflightInvocationInput({ input, strategy, wrapperId }) {
  if (wrapperId === 'H.skill.strategy.composePlan') {
    return { strategyId: strategy.id }
  }

  if (wrapperId === 'H.skill.wallet.getPortfolio') {
    return {}
  }

  if (wrapperId === 'H.skill.market.readDexTrends') {
    return {
      chain: normalizePreflightText(input.chain),
      chainIndex: normalizePreflightText(input.chainIndex),
      strategyId: strategy.id,
      limit: normalizePreflightText(input.marketLimit) || '5',
    }
  }

  if (wrapperId === 'H.skill.signal.readOnchainSignals') {
    return {
      chain: normalizePreflightText(input.chain),
      chainIndex: normalizePreflightText(input.chainIndex),
      strategyId: strategy.id,
      limit: normalizePreflightText(input.signalLimit) || '5',
    }
  }

  if (wrapperId === 'H.skill.token.analyzeRisk') {
    const tokenInput = getPreflightTokenInput(input)

    if (!tokenInput) {
      return null
    }

    return {
      ...tokenInput,
      limit: normalizePreflightText(input.tokenLimit) || '5',
    }
  }

  if (wrapperId === 'H.skill.risk.scanTransaction') {
    const tokenInput = getPreflightTokenInput(input)

    if (!tokenInput?.tokenAddress) {
      return null
    }

    return {
      chain: tokenInput.chain,
      chainIndex: tokenInput.chainIndex,
      operation: normalizePreflightText(input.operation) || 'buy',
      tokenAddress: tokenInput.tokenAddress,
    }
  }

  if (wrapperId === 'H.skill.swap.quote') {
    const quoteInput = getPreflightQuoteInput(input)

    return quoteInput
  }

  return null
}

function getPreflightTokenInput(input) {
  const tokenAddress =
    normalizePreflightText(input.tokenAddress) ||
    normalizePreflightText(input.contractAddress) ||
    normalizePreflightText(input.address)
  const token = normalizePreflightText(input.token)
  const chain = normalizePreflightText(input.chain)
  const chainIndex = normalizePreflightText(input.chainIndex)

  if ((!token && !tokenAddress) || (!chain && !chainIndex)) {
    return null
  }

  return {
    chain,
    chainIndex,
    token,
    tokenAddress,
  }
}

function getPreflightQuoteInput(input) {
  const chain = normalizePreflightText(input.chain)
  const chainIndex = normalizePreflightText(input.chainIndex)
  const fromTokenAddress = normalizePreflightText(input.fromTokenAddress)
  const toTokenAddress = normalizePreflightText(input.toTokenAddress)
  const amount = normalizePreflightText(input.amountRaw) || normalizePreflightText(input.amount)

  if ((!chain && !chainIndex) || !fromTokenAddress || !toTokenAddress || !amount) {
    return null
  }

  return {
    amount,
    chain,
    chainIndex,
    fromTokenAddress,
    swapMode: 'exactIn',
    toTokenAddress,
  }
}

function createWaitingPreflightResult(wrapperId) {
  return {
    wrapperId,
    status: 'waiting',
    code: 'preflight-input-required',
    message: getPreflightWaitingMessage(wrapperId),
    stage: inferExecutionStage(wrapperId),
  }
}

function getPreflightWaitingMessage(wrapperId) {
  const waitingMessages = {
    'H.skill.token.analyzeRisk': '等待 token + chain 输入后读取代币画像。',
    'H.skill.risk.scanTransaction': '等待合约地址后执行 OKX Security Token Scan。',
    'H.skill.swap.quote': '等待完整换币意图后获取 OKX Swap 报价。',
    'H.skill.swap.execute': '资产动作不会在只读预检中执行。',
    'H.skill.gateway.simulate': '等待 OKX swap data 后执行链上模拟。',
    'H.skill.defi.deposit': 'DeFi 存入不会在只读预检中执行。',
    'H.skill.defi.claim': '收益领取不会在只读预检中执行。',
  }

  return waitingMessages[wrapperId] ?? '该步骤等待更完整的策略上下文。'
}

function updateRunAfterPreflight({ preflight, run }) {
  const hasBlockedPreflight = preflight.blockedCount > 0
  const nextStatus = hasBlockedPreflight ? 'blocked' : 'planning'
  const stateLabel = hasBlockedPreflight ? '预检暂停' : '预检完成'
  const blockReason = hasBlockedPreflight
    ? getFirstBlockedPreflightReason(preflight)
    : '只读预检已完成；真实执行仍等待授权、交易数据、模拟和回执链路。'
  const nextStep = hasBlockedPreflight
    ? '先处理预检阻断项，再继续生成执行卡片。'
    : '等待完整交易意图或策略产品输入后进入下一张执行卡。'

  return strategySkillRepository.updateRun(run.id, (currentRun) => ({
    ...currentRun,
    blockReason,
    executionMode: 'preflight-only',
    nextStep,
    preflight,
    stateLabel,
    status: nextStatus,
    steps: currentRun.steps.map((step) => {
      if (step.id === 'planning') {
        return {
          ...step,
          detail: `只读预检完成 ${preflight.completedCount} 项，等待 ${preflight.waitingCount} 项。`,
          status: 'done',
        }
      }

      if (step.id === 'executing') {
        return {
          ...step,
          detail: blockReason,
          status: hasBlockedPreflight ? 'blocked' : 'waiting',
        }
      }

      return step
    }),
    updatedAt: nowIso(),
  }))
}

function createStrategyPreflightCard({ preflight, run, strategy }) {
  const status = preflight.blockedCount > 0 ? 'blocked' : 'pending-execution'

  return createCard({
    type: 'system-status',
    status,
    source: 'ai-agent',
    title: `${strategy.name} 预检快照`,
    summary:
      'Agent 已执行当前可用的只读 H Skill 预检。它只读取 OKX / OnchainOS 数据，不签名、不广播、不声称收益。',
    metrics: [
      { label: '预检能力', value: `${preflight.results.length} 个`, tone: 'gold' },
      { label: '已完成', value: `${preflight.completedCount} 个`, tone: 'success' },
      { label: '等待输入', value: `${preflight.waitingCount} 个`, tone: 'muted' },
      { label: '阻断项', value: `${preflight.blockedCount} 个`, tone: preflight.blockedCount ? 'danger' : 'gold' },
      { label: '执行状态', value: '未广播', tone: 'danger' },
      { label: '下一步', value: run.nextStep, tone: 'gold' },
      { label: '当前状态', value: status === 'blocked' ? '已阻止' : '待执行', tone: status === 'blocked' ? 'danger' : 'gold' },
    ],
    metadata: {
      runnerStatus: {
        blockReason: run.blockReason,
        nextStep: run.nextStep,
        preflight,
        runId: run.id,
        state: run.status,
        stateLabel: run.stateLabel,
        steps: run.steps,
      },
      strategyId: strategy.id,
      strategyName: strategy.name,
      strategyVersion: strategy.version,
    },
    tags: [
      'agent',
      'earning-agent',
      'runner-status',
      'preflight',
      'not-broadcast',
      'okx-skill-composition',
      `strategy:${strategy.id}`,
      `run:${run.id}`,
    ],
  })
}

function getFirstBlockedPreflightReason(preflight) {
  const blocked = preflight.results.find((item) => item.status === 'blocked')

  return blocked
    ? `${blocked.stage} 未通过：${blocked.message}`
    : '只读预检未通过。'
}

function summarizePreflightInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [
        key,
        typeof value === 'string' ? value.slice(0, 80) : typeof value,
      ]),
  )
}

function normalizePreflightText(input) {
  return typeof input === 'string' && input.trim().length > 0
    ? input.trim()
    : ''
}

function getRunStateLabel(status) {
  const labels = {
    blocked: '已阻止',
    idle: '待启动',
    planning: '规划中',
    'waiting-authorization': '等待授权',
  }

  return labels[status] ?? status
}

function enrichStrategyWithOkxSkillComposition(strategy) {
  if (!strategy) {
    return strategy
  }

  return {
    ...strategy,
    compositionMode: 'okx-skill-composition',
    strategyOwner: 'H Wallet',
    capabilityOwner: 'OKX OnchainOS',
    okxSkillComposition: buildOkxSkillComposition(strategy),
  }
}

function buildOkxSkillComposition(strategy) {
  return strategy.requiredSkillWrappers.map((wrapperId, index) => {
    const wrapper = strategySkillRepository.findHSkillWrapperById(wrapperId)
    const binding = wrapper ? getHSkillBindingStatus(wrapper) : null

    return {
      id: `okx-composition-step-${index + 1}`,
      order: index + 1,
      phase: inferCompositionPhase(wrapperId),
      hSkillWrapperId: wrapperId,
      hSkillWrapperLabel: wrapper?.label ?? '未注册 H Skill Wrapper',
      okxSkill: wrapper?.providerSkill ?? 'unknown',
      okxSkillRole: inferOkxSkillRole(wrapperId),
      providerStatus: binding?.adapterStatus ?? 'unknown',
      bindingStatus: binding?.status ?? 'blocked',
      userVisibleMode: inferUserVisibleMode(wrapperId),
      rule:
        'H Wallet 负责策略顺序、授权范围、风控门和卡片语义；OKX skill 负责底层能力输出。',
    }
  })
}

function summarizeOkxSkillComposition(composition) {
  const okxSkillCount = new Set(
    composition.map((item) => item.okxSkill).filter(Boolean),
  ).size

  return `该策略由 ${composition.length} 个 H Skill Wrapper 编排，组合 ${okxSkillCount} 个 OKX OnchainOS skill。`
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
    'H.skill.strategy.composePlan': '策略组合',
    'H.skill.signal.readOnchainSignals': '链上信号',
    'H.skill.token.analyzeRisk': '代币画像',
    'H.skill.market.readDexTrends': '市场趋势',
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

function inferCompositionPhase(wrapperId) {
  const phaseMap = {
    'H.skill.strategy.composePlan': 'strategy-planning',
    'H.skill.wallet.getPortfolio': 'wallet-context',
    'H.skill.signal.readOnchainSignals': 'signal-input',
    'H.skill.token.analyzeRisk': 'risk-input',
    'H.skill.market.readDexTrends': 'market-input',
    'H.skill.swap.quote': 'quote',
    'H.skill.swap.execute': 'execution',
    'H.skill.risk.scanTransaction': 'risk-gate',
    'H.skill.gateway.simulate': 'simulation-gate',
    'H.skill.gateway.broadcast': 'broadcast',
    'H.skill.gateway.trackOrder': 'verification',
    'H.skill.defi.deposit': 'earning-action',
    'H.skill.defi.claim': 'earning-action',
  }

  return phaseMap[wrapperId] ?? 'provider-capability'
}

function inferOkxSkillRole(wrapperId) {
  const roleMap = {
    'H.skill.strategy.composePlan': '把 OKX skill 能力组合成 H Wallet 策略步骤。',
    'H.skill.wallet.getPortfolio': '读取 Agent Wallet 资产上下文。',
    'H.skill.signal.readOnchainSignals': '提供链上信号输入，不直接下单。',
    'H.skill.token.analyzeRisk': '提供 token 画像和风险输入。',
    'H.skill.market.readDexTrends': '提供 DEX 市场趋势输入。',
    'H.skill.swap.quote': '提供 OKX Swap 报价和路线。',
    'H.skill.swap.execute': '提供 OKX Swap 交易数据和执行能力。',
    'H.skill.risk.scanTransaction': '提供交易、签名和 token 风险扫描。',
    'H.skill.gateway.simulate': '提供交易模拟和 gas 预检。',
    'H.skill.gateway.broadcast': '提供链上广播能力。',
    'H.skill.gateway.trackOrder': '提供交易状态追踪。',
    'H.skill.defi.deposit': '提供 DeFi 存入能力。',
    'H.skill.defi.claim': '提供收益领取能力。',
  }

  return roleMap[wrapperId] ?? '提供 OKX OnchainOS 能力。'
}

function inferUserVisibleMode(wrapperId) {
  const visibleWrappers = new Set([
    'H.skill.swap.quote',
    'H.skill.swap.execute',
    'H.skill.defi.deposit',
    'H.skill.defi.claim',
    'H.skill.gateway.trackOrder',
  ])

  return visibleWrappers.has(wrapperId) ? 'card-output' : 'collapsible-process'
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
  runOfficialStrategyPreflight,
  startOfficialStrategySkill,
}
