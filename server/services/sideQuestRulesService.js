const {
  clearDraftSideQuestRuleSet,
  getDraftSideQuestRuleSet,
  getPublishedSideQuestRuleSet,
  initializeSideQuestRuleRepository,
  setDraftSideQuestRuleSet,
  setPublishedSideQuestRuleSet,
} = require('../repositories/sideQuestRuleRepository')

const defaultSideQuestRulesVersion = 'side-quest-rules-v1'
const initialPublishedAt = new Date().toISOString()

const allowedMetricPaths = [
  'activeCards',
  'activity.tradeCards',
  'completion.verifiedResults',
  'receipts.pendingExecution',
]

const allowedCategories = [
  'boost',
  'card-library',
  'execution',
  'portfolio',
  'trading',
  'verified-result',
  'wallet',
]

const defaultSideQuestRules = [
  {
    id: 'card-library-start',
    title: '卡库启航',
    description: '交易卡库累计 1 张交易卡，解锁成长系统入口。',
    category: 'card-library',
    rewardLabel: '成长入口',
    metricPath: 'activeCards',
    target: 1,
    unit: '张',
    enabled: true,
    sortOrder: 10,
  },
  {
    id: 'trade-master',
    title: '交易达人',
    description: '交易中或交易成功卡累计 5 张，解锁交易达人称号。',
    category: 'trading',
    rewardLabel: '交易达人',
    metricPath: 'activity.tradeCards',
    target: 5,
    unit: '张',
    enabled: true,
    sortOrder: 20,
  },
  {
    id: 'agent-runner',
    title: 'Agent 执行员',
    description: '交易进入执行通道累计 3 次，证明你开始使用 Agent 赚币流程。',
    category: 'execution',
    rewardLabel: 'Agent 执行员',
    metricPath: 'receipts.pendingExecution',
    target: 3,
    unit: '张',
    enabled: true,
    sortOrder: 30,
  },
  {
    id: 'execution-watcher',
    title: '执行观察员',
    description: '待执行交易累计 1 张，理解交易中与交易成功的区别。',
    category: 'execution',
    rewardLabel: '执行观察员',
    metricPath: 'receipts.pendingExecution',
    target: 1,
    unit: '张',
    enabled: true,
    sortOrder: 40,
  },
  {
    id: 'verified-record',
    title: '真实战绩',
    description: '交易成功累计 1 张。只有后端验证过的真实成功才会计入。',
    category: 'verified-result',
    rewardLabel: '真实战绩',
    metricPath: 'completion.verifiedResults',
    target: 1,
    unit: '张',
    enabled: true,
    sortOrder: 50,
  },
]

initializeSideQuestRuleRepository(createRuleSet({
  version: defaultSideQuestRulesVersion,
  status: 'published',
  rules: defaultSideQuestRules,
  publishedAt: initialPublishedAt,
  updatedAt: initialPublishedAt,
  updatedBy: 'system',
  changeNote: '初始支线任务规则。',
}))

function listSideQuestRules() {
  return toPublicRuleSet(getPublishedRuleSet())
}

function evaluateSideQuestRules(stats) {
  return evaluateRulesWithStats(stats, getPublishedRuleSet())
}

function getSideQuestRuleManagementSnapshot() {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftSideQuestRuleSet()

  return {
    lifecycle: {
      publicStatus: 'published',
      publishedVersion: publishedRuleSet.version,
      draftVersion: draftRuleSet?.version ?? null,
      hasDraft: Boolean(draftRuleSet),
    },
    permissionModel: {
      publicRead: 'GET /boost/side-quest-rules',
      adminRead: 'GET /admin/boost/side-quest-rules',
      adminWrite: 'Bearer token via H_WALLET_ADMIN_TOKEN',
      mobileMutationAllowed: false,
    },
    constraints: {
      allowedCategories: [...allowedCategories],
      allowedMetricPaths: [...allowedMetricPaths],
      requiredPublishStep: true,
    },
    published: cloneRuleSet(publishedRuleSet),
    draft: draftRuleSet ? cloneRuleSet(draftRuleSet) : null,
  }
}

function saveSideQuestRuleDraft(payload = {}, actor = 'admin') {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftSideQuestRuleSet()
  const baseRuleSet = draftRuleSet ?? publishedRuleSet
  const nextRules = payload.rules ?? baseRuleSet.rules
  const updatedAt = new Date().toISOString()

  const nextDraftRuleSet = createRuleSet({
    version: parseText(payload.version, `${publishedRuleSet.version}-draft`),
    status: 'draft',
    baseVersion: publishedRuleSet.version,
    rules: nextRules,
    updatedAt,
    updatedBy: actor,
    changeNote: parseText(payload.changeNote, '管理后台草稿。'),
  })

  return cloneRuleSet(setDraftSideQuestRuleSet(nextDraftRuleSet))
}

function previewSideQuestRuleChanges(stats, payload = {}) {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftSideQuestRuleSet()
  const baseRuleSet = draftRuleSet ?? publishedRuleSet
  const previewRuleSet = createRuleSet({
    ...baseRuleSet,
    version: parseText(payload.version, `${baseRuleSet.version}-preview`),
    status: 'draft',
    rules: payload.rules ?? baseRuleSet.rules,
    updatedAt: new Date().toISOString(),
    updatedBy: 'preview',
    changeNote: parseText(payload.changeNote, baseRuleSet.changeNote),
  })

  return {
    ruleSet: cloneRuleSet(previewRuleSet),
    sideQuests: evaluateRulesWithStats(stats, previewRuleSet),
  }
}

function publishSideQuestRuleDraft(payload = {}, actor = 'admin') {
  const publishedRuleSet = getPublishedRuleSet()
  const draftRuleSet = getDraftSideQuestRuleSet()

  if (!draftRuleSet) {
    throwServiceError(400, 'draft-not-found', '当前没有可发布的支线任务规则草稿。')
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
  clearDraftSideQuestRuleSet()

  return cloneRuleSet(setPublishedSideQuestRuleSet(nextPublishedRuleSet))
}

function discardSideQuestRuleDraft(actor = 'admin') {
  const draftRuleSet = getDraftSideQuestRuleSet()
  const discardedVersion = draftRuleSet?.version ?? null
  clearDraftSideQuestRuleSet()

  return {
    discardedVersion,
    discardedBy: actor,
    discardedAt: new Date().toISOString(),
    snapshot: getSideQuestRuleManagementSnapshot(),
  }
}

function getPublishedRuleSet() {
  const publishedRuleSet = getPublishedSideQuestRuleSet()

  if (!publishedRuleSet) {
    throwServiceError(500, 'rule-set-not-ready', '支线任务规则尚未初始化。')
  }

  return publishedRuleSet
}

function evaluateRulesWithStats(stats, ruleSet) {
  return ruleSet.rules
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((rule) => createSideQuestFromRule(rule, stats, ruleSet.version))
}

function createSideQuestFromRule(rule, stats, ruleVersion) {
  const current = getMetricValue(stats, rule.metricPath)
  const progress = Math.max(
    0,
    Math.min(Math.round((current / rule.target) * 100), 100),
  )
  const status =
    current >= rule.target ? 'unlocked' : current > 0 ? 'active' : 'locked'

  return {
    id: rule.id,
    ruleVersion,
    title: rule.title,
    description: rule.description,
    category: rule.category,
    rewardLabel: rule.rewardLabel,
    status,
    progress,
    requirement: {
      current,
      target: rule.target,
      unit: rule.unit,
    },
    source: 'card-library',
  }
}

function createRuleSet(input) {
  return {
    version: parseText(input.version, defaultSideQuestRulesVersion),
    status: input.status === 'draft' ? 'draft' : 'published',
    baseVersion: input.baseVersion ?? null,
    publishedAt: input.publishedAt ?? null,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    updatedBy: parseText(input.updatedBy, 'system'),
    changeNote: parseText(input.changeNote, ''),
    rules: normalizeRules(input.rules),
  }
}

function normalizeRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throwServiceError(400, 'invalid-rule-set', '支线任务规则不能为空。')
  }

  const seenIds = new Set()

  return rules.map((rule) => {
    const normalizedRule = normalizeRule(rule)

    if (seenIds.has(normalizedRule.id)) {
      throwServiceError(
        400,
        'duplicate-rule-id',
        `支线任务规则 ID 重复：${normalizedRule.id}`,
      )
    }

    seenIds.add(normalizedRule.id)

    return normalizedRule
  })
}

function normalizeRule(rule) {
  const id = parseText(rule?.id)
  const title = parseText(rule?.title)
  const description = parseText(rule?.description)
  const category = parseText(rule?.category)
  const rewardLabel = parseText(rule?.rewardLabel)
  const metricPath = parseText(rule?.metricPath)
  const target = Number(rule?.target)
  const unit = parseText(rule?.unit, '次')
  const sortOrder = Number(rule?.sortOrder ?? 0)

  if (!id || !title || !description || !rewardLabel) {
    throwServiceError(400, 'invalid-rule', '支线任务规则缺少必要文案字段。')
  }

  if (!allowedCategories.includes(category)) {
    throwServiceError(400, 'invalid-rule-category', `不支持的支线任务分类：${category}`)
  }

  if (!allowedMetricPaths.includes(metricPath)) {
    throwServiceError(400, 'invalid-rule-metric', `不支持的卡库统计指标：${metricPath}`)
  }

  if (!Number.isFinite(target) || target <= 0) {
    throwServiceError(400, 'invalid-rule-target', '支线任务目标值必须大于 0。')
  }

  if (!Number.isFinite(sortOrder)) {
    throwServiceError(400, 'invalid-rule-order', '支线任务排序值必须是数字。')
  }

  return {
    id,
    title,
    description,
    category,
    rewardLabel,
    metricPath,
    target,
    unit,
    enabled: typeof rule.enabled === 'boolean' ? rule.enabled : true,
    sortOrder,
  }
}

function getMetricValue(stats, metricPath) {
  const value = metricPath
    .split('.')
    .reduce((current, key) => current?.[key], stats)

  return typeof value === 'number' && Number.isFinite(value) ? value : 0
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
    rules: ruleSet.rules.map((rule) => ({ ...rule })),
  }
}

function cloneRuleSet(ruleSet) {
  return {
    ...ruleSet,
    rules: ruleSet.rules.map((rule) => ({ ...rule })),
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

module.exports = {
  discardSideQuestRuleDraft,
  evaluateSideQuestRules,
  getSideQuestRuleManagementSnapshot,
  listSideQuestRules,
  previewSideQuestRuleChanges,
  publishSideQuestRuleDraft,
  saveSideQuestRuleDraft,
}
