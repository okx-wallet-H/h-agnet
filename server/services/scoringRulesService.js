const {
  clearDraftScoringRuleSet,
  getDraftScoringRuleSet,
  getPublishedScoringRuleSet,
  initializeScoringRuleRepository,
  setDraftScoringRuleSet,
  setPublishedScoringRuleSet,
} = require('../repositories/scoringRuleRepository')

const defaultScoringRulesVersion = 'growth-scoring-rules-v0'
const initialPublishedAt = new Date().toISOString()

const allowedMetricPaths = [
  'activity.boostTasks',
  'activity.portfolioInsights',
  'completion.blockedCards',
  'completion.verifiedResults',
  'confirmations.confirmed',
  'receipts.pendingExecution',
  'receipts.total',
]

const defaultDimensions = [
  { id: 'growth', label: '成长值', minScore: 0, maxScore: 100, sortOrder: 10 },
  { id: 'task', label: '任务活跃', minScore: 0, maxScore: 100, sortOrder: 20 },
  { id: 'trust', label: '可信度', minScore: 0, maxScore: 100, sortOrder: 30 },
  {
    id: 'verified-result',
    label: '真实结果',
    minScore: 0,
    maxScore: 100,
    sortOrder: 40,
  },
]

const defaultTiers = [
  { id: 'inactive', label: '待激活', threshold: 0, sortOrder: 10 },
  { id: 'starter', label: '入门会员', threshold: 20, sortOrder: 20 },
  { id: 'builder', label: '成长会员', threshold: 45, sortOrder: 30 },
  { id: 'advanced', label: '高级会员', threshold: 75, sortOrder: 40 },
  { id: 'elite', label: '核心会员', threshold: 90, sortOrder: 50 },
]

const defaultRules = [
  {
    id: 'growth-confirmed-cards',
    dimension: 'growth',
    label: '已授权卡',
    description: '用户授权过的卡片会提升成长基础分。',
    metricPath: 'confirmations.confirmed',
    pointsPerUnit: 8,
    maxPoints: 24,
    sortOrder: 10,
    enabled: true,
  },
  {
    id: 'growth-execution-receipts',
    dimension: 'growth',
    label: '执行回执',
    description: '回执代表授权已记录；未广播回执不会算作链上成功。',
    metricPath: 'receipts.total',
    pointsPerUnit: 8,
    maxPoints: 24,
    sortOrder: 20,
    enabled: true,
  },
  {
    id: 'growth-verified-results',
    dimension: 'growth',
    label: '已验证结果',
    description: '只有后端验证过的真实结果才进入成功类评分。',
    metricPath: 'completion.verifiedResults',
    pointsPerUnit: 18,
    maxPoints: 36,
    sortOrder: 30,
    enabled: true,
  },
  {
    id: 'growth-boost-tasks',
    dimension: 'growth',
    label: '支线任务',
    description: '任务卡会作为社区成长和支线任务的依据。',
    metricPath: 'activity.boostTasks',
    pointsPerUnit: 8,
    maxPoints: 16,
    sortOrder: 40,
    enabled: true,
  },
  {
    id: 'growth-portfolio-insights',
    dimension: 'growth',
    label: '资产分析',
    description: '分析卡用于后续组合建议和风险教育。',
    metricPath: 'activity.portfolioInsights',
    pointsPerUnit: 6,
    maxPoints: 12,
    sortOrder: 50,
    enabled: true,
  },
  {
    id: 'growth-risk-penalty',
    dimension: 'growth',
    label: '风险扣分',
    description: '被阻止的卡片会降低成长评分，鼓励用户补全信息。',
    metricPath: 'completion.blockedCards',
    pointsPerUnit: -8,
    minPoints: -24,
    maxPoints: 0,
    sortOrder: 60,
    enabled: true,
  },
  {
    id: 'task-boost-cards',
    dimension: 'task',
    label: '支线任务',
    description: '支线任务卡会提高任务活跃度。',
    metricPath: 'activity.boostTasks',
    pointsPerUnit: 24,
    maxPoints: 48,
    sortOrder: 10,
    enabled: true,
  },
  {
    id: 'task-confirmed-cards',
    dimension: 'task',
    label: '已授权卡',
    description: '授权行为代表用户愿意完成任务闭环。',
    metricPath: 'confirmations.confirmed',
    pointsPerUnit: 10,
    maxPoints: 30,
    sortOrder: 20,
    enabled: true,
  },
  {
    id: 'task-receipts',
    dimension: 'task',
    label: '执行回执',
    description: '回执用于记录已授权动作。',
    metricPath: 'receipts.total',
    pointsPerUnit: 12,
    maxPoints: 24,
    sortOrder: 30,
    enabled: true,
  },
  {
    id: 'task-verified-results',
    dimension: 'task',
    label: '已验证结果',
    description: '真实结果会提高任务质量分。',
    metricPath: 'completion.verifiedResults',
    pointsPerUnit: 18,
    maxPoints: 36,
    sortOrder: 40,
    enabled: true,
  },
  {
    id: 'task-risk-penalty',
    dimension: 'task',
    label: '风险扣分',
    description: '被阻止动作会降低任务活跃可信度。',
    metricPath: 'completion.blockedCards',
    pointsPerUnit: -10,
    minPoints: -30,
    maxPoints: 0,
    sortOrder: 50,
    enabled: true,
  },
  {
    id: 'trust-confirmed-cards',
    dimension: 'trust',
    label: '已授权卡',
    description: '授权记录越完整，可信度越稳定。',
    metricPath: 'confirmations.confirmed',
    pointsPerUnit: 12,
    maxPoints: 36,
    sortOrder: 10,
    enabled: true,
  },
  {
    id: 'trust-receipts',
    dimension: 'trust',
    label: '执行回执',
    description: '执行回执用于建立可审计记录。',
    metricPath: 'receipts.total',
    pointsPerUnit: 12,
    maxPoints: 24,
    sortOrder: 20,
    enabled: true,
  },
  {
    id: 'trust-verified-results',
    dimension: 'trust',
    label: '已验证结果',
    description: '已验证结果是可信度的核心输入。',
    metricPath: 'completion.verifiedResults',
    pointsPerUnit: 24,
    maxPoints: 48,
    sortOrder: 30,
    enabled: true,
  },
  {
    id: 'trust-pending-execution',
    dimension: 'trust',
    label: '等待执行',
    description: '未广播回执只能作为过程记录，不能当作真实成功。',
    metricPath: 'receipts.pendingExecution',
    pointsPerUnit: -2,
    minPoints: -10,
    maxPoints: 0,
    sortOrder: 40,
    enabled: true,
  },
  {
    id: 'trust-risk-penalty',
    dimension: 'trust',
    label: '风险扣分',
    description: '被阻止动作会降低可信度。',
    metricPath: 'completion.blockedCards',
    pointsPerUnit: -12,
    minPoints: -36,
    maxPoints: 0,
    sortOrder: 50,
    enabled: true,
  },
  {
    id: 'verified-result-score',
    dimension: 'verified-result',
    label: '已验证结果',
    description: '真实结果越多，后续组合建议越可靠。',
    metricPath: 'completion.verifiedResults',
    pointsPerUnit: 25,
    maxPoints: 100,
    sortOrder: 10,
    enabled: true,
  },
]

initializeScoringRuleRepository(createRuleSet({
  version: defaultScoringRulesVersion,
  status: 'published',
  dimensions: defaultDimensions,
  tiers: defaultTiers,
  rules: defaultRules,
  caveats: [
    '当前评分是 v0 观察模型，只用于解释用户行为，不直接代表奖励。',
    '真实交易、奖励和提现成功必须来自后端验证结果。',
    '后续管理后台可以调整权重、上限、等级阈值和启用状态。',
  ],
  publishedAt: initialPublishedAt,
  updatedAt: initialPublishedAt,
  updatedBy: 'system',
  changeNote: '初始成长评分观察规则。',
}))

function listScoringRules() {
  return toPublicRuleSet(getPublishedRuleSet())
}

function evaluateCardLibraryScore(stats) {
  return evaluateScoringRuleSet(stats, getPublishedRuleSet())
}

function getScoringRuleManagementSnapshot() {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftScoringRuleSet()

  return {
    lifecycle: {
      publicStatus: 'published',
      publishedVersion: publishedRuleSet.version,
      draftVersion: draftRuleSet?.version ?? null,
      hasDraft: Boolean(draftRuleSet),
    },
    permissionModel: {
      publicRead: 'GET /boost/scoring-rules',
      adminRead: 'GET /admin/boost/scoring-rules',
      adminWrite: 'Bearer token via H_WALLET_ADMIN_TOKEN',
      mobileMutationAllowed: false,
    },
    constraints: {
      allowedMetricPaths: [...allowedMetricPaths],
      requiredPublishStep: true,
    },
    published: cloneRuleSet(publishedRuleSet),
    draft: draftRuleSet ? cloneRuleSet(draftRuleSet) : null,
  }
}

function saveScoringRuleDraft(payload = {}, actor = 'admin') {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftScoringRuleSet()
  const baseRuleSet = draftRuleSet ?? publishedRuleSet
  const updatedAt = new Date().toISOString()
  const nextDraftRuleSet = createRuleSet({
    version: parseText(payload.version, `${publishedRuleSet.version}-draft`),
    status: 'draft',
    baseVersion: publishedRuleSet.version,
    dimensions: payload.dimensions ?? baseRuleSet.dimensions,
    tiers: payload.tiers ?? baseRuleSet.tiers,
    rules: payload.rules ?? baseRuleSet.rules,
    caveats: payload.caveats ?? baseRuleSet.caveats,
    updatedAt,
    updatedBy: actor,
    changeNote: parseText(payload.changeNote, '管理后台评分草稿。'),
  })

  return cloneRuleSet(setDraftScoringRuleSet(nextDraftRuleSet))
}

function previewScoringRuleChanges(stats, payload = {}) {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftScoringRuleSet()
  const baseRuleSet = draftRuleSet ?? publishedRuleSet
  const previewRuleSet = createRuleSet({
    ...baseRuleSet,
    version: parseText(payload.version, `${baseRuleSet.version}-preview`),
    status: 'draft',
    dimensions: payload.dimensions ?? baseRuleSet.dimensions,
    tiers: payload.tiers ?? baseRuleSet.tiers,
    rules: payload.rules ?? baseRuleSet.rules,
    caveats: payload.caveats ?? baseRuleSet.caveats,
    updatedAt: new Date().toISOString(),
    updatedBy: 'preview',
    changeNote: parseText(payload.changeNote, baseRuleSet.changeNote),
  })

  return {
    ruleSet: cloneRuleSet(previewRuleSet),
    score: evaluateScoringRuleSet(stats, previewRuleSet),
  }
}

function publishScoringRuleDraft(payload = {}, actor = 'admin') {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftScoringRuleSet()

  if (!draftRuleSet) {
    throwServiceError(400, 'draft-not-found', '当前没有可发布的评分规则草稿。')
  }

  const nextVersion = parseText(
    payload.version,
    createNextRuleSetVersion(publishedRuleSet.version),
  )

  if (nextVersion === publishedRuleSet.version) {
    throwServiceError(400, 'invalid-rule-version', '新版本号必须不同于当前已发布版本。')
  }

  const publishedAt = new Date().toISOString()
  const nextPublishedRuleSet = createRuleSet({
    ...draftRuleSet,
    version: nextVersion,
    status: 'published',
    baseVersion: null,
    publishedAt,
    updatedAt: publishedAt,
    updatedBy: actor,
    changeNote: parseText(payload.changeNote, draftRuleSet.changeNote),
  })

  clearDraftScoringRuleSet()

  return cloneRuleSet(setPublishedScoringRuleSet(nextPublishedRuleSet))
}

function discardScoringRuleDraft(actor = 'admin') {
  const draftRuleSet = getDraftScoringRuleSet()
  const discardedVersion = draftRuleSet?.version ?? null
  clearDraftScoringRuleSet()

  return {
    discardedVersion,
    discardedBy: actor,
    discardedAt: new Date().toISOString(),
    snapshot: getScoringRuleManagementSnapshot(),
  }
}

function evaluateScoringRuleSet(stats, ruleSet) {
  const dimensions = ruleSet.dimensions
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((dimension) => evaluateDimension(stats, ruleSet, dimension))
  const dimensionMap = Object.fromEntries(
    dimensions.map((dimension) => [dimension.id, dimension]),
  )
  const growth = dimensionMap.growth ?? dimensions[0]

  return {
    modelVersion: ruleSet.version,
    ruleSetVersion: ruleSet.version,
    source: 'card-library',
    score: growth?.score ?? 0,
    tier: getTier(growth?.score ?? 0, ruleSet.tiers),
    taskScore: dimensionMap.task?.score ?? 0,
    trustScore: dimensionMap.trust?.score ?? 0,
    verifiedResultScore: dimensionMap['verified-result']?.score ?? 0,
    breakdown: growth?.items ?? [],
    dimensions,
    caveats: [...ruleSet.caveats],
  }
}

function evaluateDimension(stats, ruleSet, dimension) {
  const items = ruleSet.rules
    .filter((rule) => rule.enabled && rule.dimension === dimension.id)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((rule) => evaluateRule(stats, rule))
  const rawScore = items.reduce((total, item) => total + item.points, 0)

  return {
    id: dimension.id,
    label: dimension.label,
    score: clampScore(rawScore, dimension.minScore, dimension.maxScore),
    maxScore: dimension.maxScore,
    items,
  }
}

function evaluateRule(stats, rule) {
  const current = getMetricValue(stats, rule.metricPath)
  const rawPoints = current * rule.pointsPerUnit
  const points = clampScore(rawPoints, rule.minPoints, rule.maxPoints)

  return {
    id: rule.id,
    label: rule.label,
    points,
    maxPoints: rule.maxPoints,
    description: rule.description,
    metricPath: rule.metricPath,
    current,
  }
}

function getTier(score, tiers) {
  const orderedTiers = [...tiers].sort((left, right) => left.threshold - right.threshold)
  const currentIndex = orderedTiers.findLastIndex((tier) => score >= tier.threshold)
  const currentTier = orderedTiers[Math.max(currentIndex, 0)]
  const nextTier = orderedTiers[Math.max(currentIndex, 0) + 1] ?? null

  if (!nextTier) {
    return {
      id: currentTier.id,
      label: currentTier.label,
      nextLabel: null,
      nextThreshold: null,
      progress: 100,
    }
  }

  return {
    id: currentTier.id,
    label: currentTier.label,
    nextLabel: nextTier.label,
    nextThreshold: nextTier.threshold,
    progress: clampScore(
      ((score - currentTier.threshold) /
        (nextTier.threshold - currentTier.threshold)) *
        100,
      0,
      100,
    ),
  }
}

function createRuleSet(input) {
  const dimensions = normalizeDimensions(input.dimensions)

  return {
    version: parseText(input.version, defaultScoringRulesVersion),
    status: input.status === 'draft' ? 'draft' : 'published',
    baseVersion: input.baseVersion ?? null,
    publishedAt: input.publishedAt ?? null,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    updatedBy: parseText(input.updatedBy, 'system'),
    changeNote: parseText(input.changeNote, ''),
    dimensions,
    tiers: normalizeTiers(input.tiers),
    rules: normalizeRules(input.rules, dimensions),
    caveats: normalizeTextList(input.caveats),
  }
}

function normalizeDimensions(dimensions) {
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    throwServiceError(400, 'invalid-scoring-dimensions', '评分维度不能为空。')
  }

  return dimensions.map((dimension) => {
    const id = parseText(dimension?.id)
    const label = parseText(dimension?.label)
    const minScore = Number(dimension?.minScore ?? 0)
    const maxScore = Number(dimension?.maxScore ?? 100)
    const sortOrder = Number(dimension?.sortOrder ?? 0)

    if (!id || !label) {
      throwServiceError(400, 'invalid-scoring-dimension', '评分维度缺少必要字段。')
    }

    if (!Number.isFinite(minScore) || !Number.isFinite(maxScore)) {
      throwServiceError(400, 'invalid-scoring-range', '评分维度范围必须是数字。')
    }

    if (maxScore <= minScore) {
      throwServiceError(400, 'invalid-scoring-range', '评分维度上限必须大于下限。')
    }

    return { id, label, minScore, maxScore, sortOrder }
  })
}

function normalizeTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    throwServiceError(400, 'invalid-scoring-tiers', '会员等级阈值不能为空。')
  }

  return tiers.map((tier) => {
    const id = parseText(tier?.id)
    const label = parseText(tier?.label)
    const threshold = Number(tier?.threshold)
    const sortOrder = Number(tier?.sortOrder ?? threshold)

    if (!id || !label || !Number.isFinite(threshold)) {
      throwServiceError(400, 'invalid-scoring-tier', '会员等级缺少必要字段。')
    }

    return { id, label, threshold, sortOrder }
  })
}

function normalizeRules(rules, dimensions) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throwServiceError(400, 'invalid-scoring-rules', '评分规则不能为空。')
  }

  const dimensionIds = new Set(dimensions.map((dimension) => dimension.id))
  const seenIds = new Set()

  return rules.map((rule) => {
    const normalizedRule = normalizeRule(rule, dimensionIds)

    if (seenIds.has(normalizedRule.id)) {
      throwServiceError(
        400,
        'duplicate-scoring-rule-id',
        `评分规则 ID 重复：${normalizedRule.id}`,
      )
    }

    seenIds.add(normalizedRule.id)

    return normalizedRule
  })
}

function normalizeRule(rule, dimensionIds) {
  const id = parseText(rule?.id)
  const dimension = parseText(rule?.dimension)
  const label = parseText(rule?.label)
  const description = parseText(rule?.description)
  const metricPath = parseText(rule?.metricPath)
  const pointsPerUnit = Number(rule?.pointsPerUnit)
  const minPoints = Number(rule?.minPoints ?? 0)
  const maxPoints = Number(rule?.maxPoints ?? 0)
  const sortOrder = Number(rule?.sortOrder ?? 0)

  if (!id || !dimension || !label || !description) {
    throwServiceError(400, 'invalid-scoring-rule', '评分规则缺少必要字段。')
  }

  if (!dimensionIds.has(dimension)) {
    throwServiceError(400, 'invalid-scoring-dimension', `未知评分维度：${dimension}`)
  }

  if (!allowedMetricPaths.includes(metricPath)) {
    throwServiceError(400, 'invalid-scoring-metric', `不支持的卡库指标：${metricPath}`)
  }

  if (!Number.isFinite(pointsPerUnit)) {
    throwServiceError(400, 'invalid-scoring-points', '评分权重必须是数字。')
  }

  if (!Number.isFinite(minPoints) || !Number.isFinite(maxPoints)) {
    throwServiceError(400, 'invalid-scoring-cap', '评分上下限必须是数字。')
  }

  return {
    id,
    dimension,
    label,
    description,
    metricPath,
    pointsPerUnit,
    minPoints,
    maxPoints,
    sortOrder,
    enabled: typeof rule.enabled === 'boolean' ? rule.enabled : true,
  }
}

function getMetricValue(stats, metricPath) {
  const value = metricPath
    .split('.')
    .reduce((current, key) => current?.[key], stats)

  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function clampScore(value, minScore = 0, maxScore = 100) {
  return Math.max(minScore, Math.min(Math.round(value), maxScore))
}

function normalizeTextList(input) {
  if (!Array.isArray(input)) {
    return []
  }

  return input.filter((item) => typeof item === 'string' && item.trim())
}

function createNextRuleSetVersion(currentVersion) {
  const versionMatch = currentVersion.match(/^(.*-v)(\d+)$/)

  if (!versionMatch) {
    return `${currentVersion}-next`
  }

  return `${versionMatch[1]}${Number(versionMatch[2]) + 1}`
}

function toPublicRuleSet(ruleSet) {
  return {
    version: ruleSet.version,
    status: ruleSet.status,
    publishedAt: ruleSet.publishedAt,
    updatedAt: ruleSet.updatedAt,
    changeNote: ruleSet.changeNote,
    dimensions: ruleSet.dimensions.map((dimension) => ({ ...dimension })),
    tiers: ruleSet.tiers.map((tier) => ({ ...tier })),
    rules: ruleSet.rules.map((rule) => ({ ...rule })),
    caveats: [...ruleSet.caveats],
  }
}

function cloneRuleSet(ruleSet) {
  return {
    ...ruleSet,
    dimensions: ruleSet.dimensions.map((dimension) => ({ ...dimension })),
    tiers: ruleSet.tiers.map((tier) => ({ ...tier })),
    rules: ruleSet.rules.map((rule) => ({ ...rule })),
    caveats: [...ruleSet.caveats],
  }
}

function parseText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function throwServiceError(statusCode, code, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code

  throw error
}

function getPublishedRuleSet() {
  const publishedRuleSet = getPublishedScoringRuleSet()

  if (!publishedRuleSet) {
    throwServiceError(500, 'scoring-rules-not-ready', '评分规则尚未初始化。')
  }

  return publishedRuleSet
}

module.exports = {
  discardScoringRuleDraft,
  evaluateCardLibraryScore,
  getScoringRuleManagementSnapshot,
  listScoringRules,
  previewScoringRuleChanges,
  publishScoringRuleDraft,
  saveScoringRuleDraft,
}
