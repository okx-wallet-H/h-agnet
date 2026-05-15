const http = require('node:http')
const { loadServerEnv } = require('./config/loadServerEnv')

loadServerEnv()

const {
  getAgentWalletSession,
  getAuthStatus,
  getCurrentIdentity,
  requestAgentWalletOtp,
  verifyAgentWalletOtp,
} = require('./services/agentWalletAuthService')
const {
  archiveCard,
  confirmCardReview,
  createCard,
  getCardLibraryStats,
  listCards,
  prepareCardForConfirmation,
} = require('./services/cardsService')
const {
  getWalletAccount,
  getWalletAddresses,
  getWalletAssets,
  getWalletChains,
} = require('./services/walletModuleService')
const { createTransferDraft } = require('./services/walletActionService')
const {
  discardScoringRuleDraft,
  discardSideQuestRuleDraft,
  getGrowthSummary,
  getScoringRuleManagementSnapshot,
  getSideQuestRuleManagementSnapshot,
  listBoostCampaigns,
  listScoringRules,
  listSideQuestRules,
  listSideQuests,
  previewScoringRuleDraft,
  previewSideQuestRuleDraft,
  publishScoringRuleDraft,
  publishSideQuestRuleDraft,
  saveScoringRuleDraft,
  saveSideQuestRuleDraft,
} = require('./services/boostModuleService')
const {
  createTradeProposal,
  getPendingTradeProposal,
} = require('./services/tradingModuleService')
const { evaluateTradeProposalRisk } = require('./services/riskModuleService')
const {
  createStrategyProposal,
  getPendingStrategyProposal,
} = require('./services/aiModuleService')
const {
  getAgentRunnerStatus,
  getOfficialStrategyPlan,
  listHSkillWrappers,
  listOfficialStrategySkills,
  listStrategyRuns,
  startOfficialStrategySkill,
} = require('./services/strategySkillService')
const {
  createHSkillDryRun,
  getHSkillRuntimeStatus,
  invokeHSkill,
  listHSkillInvocations,
} = require('./services/hSkillRuntimeService')
const {
  attachCardToConversationTurn,
  listAgentConversationMessages,
  listAgentConversationTurns,
  sendAgentConversationMessage,
} = require('./services/agentConversationService')
const {
  getAgentAuthorizationPolicySummary,
} = require('./services/agentAuthorizationPolicyService')
const {
  listAdminAuditLogs,
  recordAdminAuditLog,
} = require('./services/adminAuditLogService')
const { getOkxIntegrationStatus } = require('./services/okxIntegrationService')
const { requireAdminRequest } = require('./http/adminAuth')
const { readJsonBody, sendJson } = require('./http/json')

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '127.0.0.1'
const apiPrefix = '/api/h/v1'

async function handleRequest(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const routePath = getRoutePath(url.pathname)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  try {
    if (request.method === 'GET' && url.pathname === '/') {
      sendJson(response, 200, {
        ok: true,
        service: 'h-wallet-backend',
        apiPrefix,
        status: getAuthStatus(),
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/auth/agent-wallet/status'
    ) {
      sendJson(response, 200, { ok: true, data: getAuthStatus() })
      return
    }

    if (request.method === 'GET' && routePath === '/auth/me') {
      sendJson(response, 200, { ok: true, data: getCurrentIdentity() })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/auth/agent-wallet/request-otp'
    ) {
      const body = await readJsonBody(request)
      const data = await requestAgentWalletOtp(body)
      sendJson(response, 200, { ok: true, data })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/auth/agent-wallet/verify'
    ) {
      const body = await readJsonBody(request)
      const data = await verifyAgentWalletOtp(body)
      sendJson(response, 200, { ok: true, data })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/auth/agent-wallet/session'
    ) {
      const data = await getAgentWalletSession()
      sendJson(response, 200, { ok: true, data })
      return
    }

    if (request.method === 'GET' && routePath === '/wallet/account') {
      sendJson(response, 200, { ok: true, data: await getWalletAccount() })
      return
    }

    if (request.method === 'GET' && routePath === '/wallet/addresses') {
      sendJson(response, 200, { ok: true, data: await getWalletAddresses() })
      return
    }

    if (request.method === 'GET' && routePath === '/wallet/assets') {
      sendJson(response, 200, { ok: true, data: await getWalletAssets() })
      return
    }

    if (request.method === 'GET' && routePath === '/wallet/chains') {
      sendJson(response, 200, { ok: true, data: await getWalletChains() })
      return
    }

    if (request.method === 'GET' && routePath === '/integrations/okx/status') {
      sendJson(response, 200, {
        ok: true,
        data: getOkxIntegrationStatus({ apiPrefix }),
      })
      return
    }

    if (request.method === 'GET' && routePath === '/agent/strategies') {
      sendJson(response, 200, {
        ok: true,
        data: listOfficialStrategySkills(),
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath.match(/^\/agent\/strategies\/[^/]+\/plan$/)
    ) {
      const strategyId = routePath.split('/')[3]
      sendJson(response, 200, {
        ok: true,
        data: getOfficialStrategyPlan({ strategyId }),
      })
      return
    }

    if (request.method === 'GET' && routePath === '/agent/skill-wrappers') {
      sendJson(response, 200, {
        ok: true,
        data: listHSkillWrappers(),
      })
      return
    }

    if (request.method === 'GET' && routePath === '/agent/skill-runtime') {
      sendJson(response, 200, {
        ok: true,
        data: getHSkillRuntimeStatus(),
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/agent/skill-runtime/invocations'
    ) {
      sendJson(response, 200, {
        ok: true,
        data: listHSkillInvocations(),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/agent/skill-runtime/dry-run'
    ) {
      const body = await readJsonBody(request)
      sendJson(response, 200, {
        ok: true,
        data: createHSkillDryRun(body),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/agent/skill-runtime/invoke'
    ) {
      const body = await readJsonBody(request)
      sendJson(response, 200, {
        ok: true,
        data: await invokeHSkill(body),
      })
      return
    }

    if (request.method === 'GET' && routePath === '/agent/runner') {
      sendJson(response, 200, {
        ok: true,
        data: getAgentRunnerStatus(),
      })
      return
    }

    if (request.method === 'GET' && routePath === '/agent/runs') {
      sendJson(response, 200, {
        ok: true,
        data: listStrategyRuns(),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath.match(/^\/agent\/strategies\/[^/]+\/start$/)
    ) {
      const strategyId = routePath.split('/')[3]
      sendJson(response, 200, {
        ok: true,
        data: startOfficialStrategySkill({ strategyId }),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/wallet/actions/transfer-draft'
    ) {
      const body = await readJsonBody(request)
      sendJson(response, 200, { ok: true, data: createTransferDraft(body) })
      return
    }

    if (request.method === 'GET' && routePath === '/cards') {
      sendJson(response, 200, { ok: true, data: listCards() })
      return
    }

    if (request.method === 'GET' && routePath === '/cards/stats') {
      sendJson(response, 200, { ok: true, data: getCardLibraryStats() })
      return
    }

    if (request.method === 'POST' && routePath === '/cards') {
      const body = await readJsonBody(request)
      sendJson(response, 200, { ok: true, data: createCard(body) })
      return
    }

    if (
      request.method === 'POST' &&
      routePath.match(/^\/cards\/[^/]+\/archive$/)
    ) {
      const cardId = routePath.split('/')[2]
      sendJson(response, 200, { ok: true, data: archiveCard(cardId) })
      return
    }

    if (
      request.method === 'POST' &&
      routePath.match(/^\/cards\/[^/]+\/prepare-confirmation$/)
    ) {
      const cardId = routePath.split('/')[2]
      sendJson(response, 200, {
        ok: true,
        data: prepareCardForConfirmation(cardId),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath.match(/^\/cards\/[^/]+\/confirm$/)
    ) {
      const cardId = routePath.split('/')[2]
      const data = confirmCardReview(cardId)

      attachCardToConversationTurn(data.card.id, data.receiptCard)
      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (request.method === 'GET' && routePath === '/boost/campaigns') {
      sendJson(response, 200, { ok: true, data: listBoostCampaigns() })
      return
    }

    if (request.method === 'GET' && routePath === '/boost/side-quests') {
      sendJson(response, 200, { ok: true, data: listSideQuests() })
      return
    }

    if (request.method === 'GET' && routePath === '/boost/side-quest-rules') {
      sendJson(response, 200, { ok: true, data: listSideQuestRules() })
      return
    }

    if (request.method === 'GET' && routePath === '/boost/scoring-rules') {
      sendJson(response, 200, { ok: true, data: listScoringRules() })
      return
    }

    if (request.method === 'GET' && routePath === '/boost/growth-summary') {
      sendJson(response, 200, { ok: true, data: getGrowthSummary() })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/admin/boost/side-quest-rules'
    ) {
      requireAdminRequest(request)
      sendJson(response, 200, {
        ok: true,
        data: getSideQuestRuleManagementSnapshot(),
      })
      return
    }

    if (request.method === 'GET' && routePath === '/admin/audit-logs') {
      requireAdminRequest(request)
      sendJson(response, 200, {
        ok: true,
        data: listAdminAuditLogs({
          limit: url.searchParams.get('limit'),
          resource: url.searchParams.get('resource'),
        }),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/side-quest-rules/draft'
    ) {
      const actor = requireAdminRequest(request)
      const body = await readJsonBody(request)
      const data = saveSideQuestRuleDraft(body, actor.id)

      recordAdminAuditLog({
        action: 'draft_saved',
        actor,
        metadata: {
          baseVersion: data.baseVersion,
          changeNote: data.changeNote,
          ruleCount: data.rules.length,
        },
        request,
        resource: 'side_quest_rules',
        resourceVersion: data.version,
        summary: '保存支线任务规则草稿。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/side-quest-rules/preview'
    ) {
      const actor = requireAdminRequest(request)
      const body = await readJsonBody(request)
      const data = previewSideQuestRuleDraft(body)

      recordAdminAuditLog({
        action: 'previewed',
        actor,
        metadata: {
          ruleCount: data.ruleSet.rules.length,
          sideQuestCount: data.sideQuests.length,
        },
        request,
        resource: 'side_quest_rules',
        resourceVersion: data.ruleSet.version,
        summary: '预览支线任务规则草稿。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/side-quest-rules/publish'
    ) {
      const actor = requireAdminRequest(request)
      const body = await readJsonBody(request)
      const data = publishSideQuestRuleDraft(body, actor.id)

      recordAdminAuditLog({
        action: 'published',
        actor,
        metadata: {
          changeNote: data.changeNote,
          ruleCount: data.rules.length,
        },
        request,
        resource: 'side_quest_rules',
        resourceVersion: data.version,
        summary: '发布支线任务规则。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/side-quest-rules/discard-draft'
    ) {
      const actor = requireAdminRequest(request)
      const data = discardSideQuestRuleDraft(actor.id)

      recordAdminAuditLog({
        action: 'draft_discarded',
        actor,
        metadata: {
          discardedVersion: data.discardedVersion,
        },
        request,
        resource: 'side_quest_rules',
        resourceVersion: data.discardedVersion,
        summary: '丢弃支线任务规则草稿。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/admin/boost/scoring-rules'
    ) {
      requireAdminRequest(request)
      sendJson(response, 200, {
        ok: true,
        data: getScoringRuleManagementSnapshot(),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/scoring-rules/draft'
    ) {
      const actor = requireAdminRequest(request)
      const body = await readJsonBody(request)
      const data = saveScoringRuleDraft(body, actor.id)

      recordAdminAuditLog({
        action: 'draft_saved',
        actor,
        metadata: {
          baseVersion: data.baseVersion,
          changeNote: data.changeNote,
          dimensionCount: data.dimensions.length,
          ruleCount: data.rules.length,
          tierCount: data.tiers.length,
        },
        request,
        resource: 'scoring_rules',
        resourceVersion: data.version,
        summary: '保存评分规则草稿。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/scoring-rules/preview'
    ) {
      const actor = requireAdminRequest(request)
      const body = await readJsonBody(request)
      const data = previewScoringRuleDraft(body)

      recordAdminAuditLog({
        action: 'previewed',
        actor,
        metadata: {
          dimensionCount: data.ruleSet.dimensions.length,
          ruleCount: data.ruleSet.rules.length,
          score: data.score.score,
        },
        request,
        resource: 'scoring_rules',
        resourceVersion: data.ruleSet.version,
        summary: '预览评分规则草稿。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/scoring-rules/publish'
    ) {
      const actor = requireAdminRequest(request)
      const body = await readJsonBody(request)
      const data = publishScoringRuleDraft(body, actor.id)

      recordAdminAuditLog({
        action: 'published',
        actor,
        metadata: {
          changeNote: data.changeNote,
          dimensionCount: data.dimensions.length,
          ruleCount: data.rules.length,
          tierCount: data.tiers.length,
        },
        request,
        resource: 'scoring_rules',
        resourceVersion: data.version,
        summary: '发布评分规则。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/admin/boost/scoring-rules/discard-draft'
    ) {
      const actor = requireAdminRequest(request)
      const data = discardScoringRuleDraft(actor.id)

      recordAdminAuditLog({
        action: 'draft_discarded',
        actor,
        metadata: {
          discardedVersion: data.discardedVersion,
        },
        request,
        resource: 'scoring_rules',
        resourceVersion: data.discardedVersion,
        summary: '丢弃评分规则草稿。',
      })

      sendJson(response, 200, {
        ok: true,
        data,
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/trading/proposals/pending'
    ) {
      sendJson(response, 200, { ok: true, data: getPendingTradeProposal() })
      return
    }

    if (request.method === 'POST' && routePath === '/trading/proposals') {
      const body = await readJsonBody(request)
      sendJson(response, 200, { ok: true, data: createTradeProposal(body) })
      return
    }

    if (request.method === 'POST' && routePath === '/risk/trade-proposal') {
      sendJson(response, 200, {
        ok: true,
        data: evaluateTradeProposalRisk(),
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/ai/strategy/proposals/pending'
    ) {
      sendJson(response, 200, { ok: true, data: getPendingStrategyProposal() })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/ai/conversation/messages'
    ) {
      sendJson(response, 200, {
        ok: true,
        data: listAgentConversationMessages(),
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/ai/conversation/turns'
    ) {
      sendJson(response, 200, {
        ok: true,
        data: listAgentConversationTurns(),
      })
      return
    }

    if (
      request.method === 'GET' &&
      routePath === '/ai/authorization-policy'
    ) {
      sendJson(response, 200, {
        ok: true,
        data: getAgentAuthorizationPolicySummary(),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/ai/conversation/messages'
    ) {
      const body = await readJsonBody(request)
      sendJson(response, 200, {
        ok: true,
        data: await sendAgentConversationMessage(body),
      })
      return
    }

    if (
      request.method === 'POST' &&
      routePath === '/ai/strategy/proposals'
    ) {
      const body = await readJsonBody(request)
      sendJson(response, 200, { ok: true, data: createStrategyProposal(body) })
      return
    }

    sendJson(response, 404, {
      ok: false,
      error: {
        code: 'not-found',
        message: '接口不存在。',
      },
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 501
    const errorCode =
      error.code ??
      (statusCode === 400 ? 'bad-request' : 'adapter-not-configured')

    sendJson(response, statusCode, {
      ok: false,
      error: {
        code: errorCode,
        message:
          error instanceof Error
            ? error.message
            : '后端发生未知错误。',
      },
    })
  }
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response)
})

server.listen(port, host, () => {
  console.log(`H Wallet backend listening on http://${host}:${port}${apiPrefix}`)
})

function getRoutePath(pathname) {
  if (pathname.startsWith(`${apiPrefix}/`)) {
    return pathname.slice(apiPrefix.length)
  }

  if (pathname === apiPrefix) {
    return '/'
  }

  return pathname
}
