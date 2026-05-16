const {
  getDatabaseStatus,
  initializeSchema,
  isDatabaseConfigured,
  query,
} = require('./postgresClient')

let persistenceReady = false
let lastError = null
let writeQueue = Promise.resolve()

async function initializePostgresPersistence() {
  if (!isDatabaseConfigured()) {
    return getPersistenceStatus()
  }

  await initializeSchema()
  persistenceReady = true
  lastError = null

  return getPersistenceStatus()
}

function getPersistenceStatus() {
  return {
    mode: persistenceReady ? 'postgresql' : 'memory',
    ready: persistenceReady,
    lastError: lastError?.message ?? null,
    database: getDatabaseStatus(),
  }
}

function persistUser(user) {
  scheduleWrite(async () => {
    await query(
      `
        insert into users (
          id, email, display_name, status, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6)
        on conflict (id) do update set
          email = excluded.email,
          display_name = excluded.display_name,
          status = excluded.status,
          updated_at = excluded.updated_at
      `,
      [
        user.id,
        user.email,
        user.displayName,
        user.status,
        user.createdAt,
        user.updatedAt,
      ],
    )
  })
}

function persistCurrentUserId(userId) {
  scheduleWrite(async () => {
    await query(
      `
        insert into h_runtime_state (key, value, updated_at)
        values ('currentUserId', $1::jsonb, now())
        on conflict (key) do update set
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
      [JSON.stringify(userId)],
    )
  })
}

function persistAgentWallet(binding) {
  scheduleWrite(async () => {
    await query(
      `
        insert into agent_wallets (
          id, user_id, provider, status, wallet_id, account_id, account_name,
          email, evm_address, sol_address, login_type, metadata, created_at,
          updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12::jsonb, $13, $14
        )
        on conflict (id) do update set
          provider = excluded.provider,
          status = excluded.status,
          wallet_id = excluded.wallet_id,
          account_id = excluded.account_id,
          account_name = excluded.account_name,
          email = excluded.email,
          evm_address = excluded.evm_address,
          sol_address = excluded.sol_address,
          login_type = excluded.login_type,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `,
      [
        binding.id,
        binding.userId,
        binding.provider,
        binding.status,
        binding.walletId,
        binding.accountId,
        binding.accountName,
        binding.email,
        binding.evmAddress,
        binding.solAddress,
        binding.loginType,
        JSON.stringify(binding.metadata ?? {}),
        binding.createdAt,
        binding.updatedAt,
      ],
    )
  })
}

function persistCard(card) {
  scheduleWrite(async () => {
    await query(
      `
        insert into cards (
          id, user_id, type, status, source, title, summary, metrics, metadata,
          tags, completed_at, created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb,
          $10::jsonb, $11, $12, now()
        )
        on conflict (id) do update set
          user_id = excluded.user_id,
          type = excluded.type,
          status = excluded.status,
          source = excluded.source,
          title = excluded.title,
          summary = excluded.summary,
          metrics = excluded.metrics,
          metadata = excluded.metadata,
          tags = excluded.tags,
          completed_at = excluded.completed_at,
          updated_at = excluded.updated_at
      `,
      [
        card.id,
        card.userId,
        card.type,
        card.status,
        card.source,
        card.title,
        card.summary,
        JSON.stringify(card.metrics ?? []),
        JSON.stringify(card.metadata ?? {}),
        JSON.stringify(card.tags ?? []),
        card.completedAt ?? null,
        card.createdAt,
      ],
    )
  })
}

function persistAgentConversationMessage(message) {
  scheduleWrite(async () => {
    await query(
      `
        insert into ai_conversation_messages (
          id, user_id, role, content, created_at
        ) values ($1, $2, $3, $4, $5)
        on conflict (id) do update set
          user_id = excluded.user_id,
          role = excluded.role,
          content = excluded.content
      `,
      [
        message.id,
        message.userId ?? null,
        message.role,
        message.content,
        message.createdAt,
      ],
    )
  })
}

function persistAgentConversationTurn(turn) {
  scheduleWrite(async () => {
    await query(
      `
        insert into ai_conversation_turns (
          id, user_id, intent, confidence, user_message_id,
          assistant_message_id, process_steps, card_ids, execution_plan,
          created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5,
          $6, $7::jsonb, $8::jsonb, $9::jsonb,
          $10, now()
        )
        on conflict (id) do update set
          user_id = excluded.user_id,
          intent = excluded.intent,
          confidence = excluded.confidence,
          user_message_id = excluded.user_message_id,
          assistant_message_id = excluded.assistant_message_id,
          process_steps = excluded.process_steps,
          card_ids = excluded.card_ids,
          execution_plan = excluded.execution_plan,
          updated_at = excluded.updated_at
      `,
      [
        turn.id,
        turn.userId ?? null,
        turn.intent,
        turn.confidence,
        turn.userMessageId,
        turn.assistantMessageId,
        JSON.stringify(turn.processSteps ?? []),
        JSON.stringify(turn.cardIds ?? []),
        turn.executionPlan ? JSON.stringify(turn.executionPlan) : null,
        turn.createdAt,
      ],
    )
  })
}

function persistAuthorizationGrant(grant) {
  scheduleWrite(async () => {
    await query(
      `
        insert into agent_authorization_grants (
          id, user_id, scope, address, status, metadata, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        on conflict (user_id, scope, address_key) do update set
          id = excluded.id,
          address = excluded.address,
          status = excluded.status,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `,
      [
        grant.id,
        grant.userId,
        grant.scope,
        grant.address,
        grant.status,
        JSON.stringify(grant.metadata ?? {}),
        grant.createdAt,
        grant.updatedAt,
      ],
    )
  })
}

function persistStrategyRun(run) {
  scheduleWrite(async () => {
    await query(
      `
        insert into strategy_runs (
          id, strategy_id, strategy_version, status, payload, created_at,
          updated_at
        ) values ($1, $2, $3, $4, $5::jsonb, $6, $7)
        on conflict (id) do update set
          strategy_id = excluded.strategy_id,
          strategy_version = excluded.strategy_version,
          status = excluded.status,
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `,
      [
        run.id,
        run.strategyId,
        run.strategyVersion,
        run.status,
        JSON.stringify(run),
        run.createdAt,
        run.updatedAt ?? run.createdAt,
      ],
    )
  })
}

function persistHSkillInvocation(invocation) {
  scheduleWrite(async () => {
    await query(
      `
        insert into h_skill_invocations (
          id, wrapper_id, provider_skill, status, payload, created_at
        ) values ($1, $2, $3, $4, $5::jsonb, $6)
        on conflict (id) do update set
          wrapper_id = excluded.wrapper_id,
          provider_skill = excluded.provider_skill,
          status = excluded.status,
          payload = excluded.payload
      `,
      [
        invocation.id,
        invocation.wrapperId,
        invocation.providerSkill,
        invocation.status,
        JSON.stringify(invocation),
        invocation.createdAt,
      ],
    )
  })
}

function persistAdminAuditLog(log) {
  scheduleWrite(async () => {
    await query(
      `
        insert into admin_audit_logs (
          id, actor_id, actor_role, action, resource, resource_version, summary,
          metadata, request, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
        on conflict (id) do nothing
      `,
      [
        log.id,
        log.actorId,
        log.actorRole,
        log.action,
        log.resource,
        log.resourceVersion ?? null,
        log.summary,
        JSON.stringify(log.metadata ?? {}),
        log.request ? JSON.stringify(log.request) : null,
        log.createdAt,
      ],
    )
  })
}

async function loadPersistedState() {
  if (!persistenceReady) {
    return createEmptyState()
  }

  const [
    users,
    runtimeState,
    agentWallets,
    cards,
    grants,
    conversationMessages,
    conversationTurns,
    strategyRuns,
    hSkillInvocations,
    adminAuditLogs,
  ] = await Promise.all([
    query('select * from users order by created_at desc'),
    query("select value from h_runtime_state where key = 'currentUserId'"),
    query('select * from agent_wallets order by created_at desc'),
    query('select * from cards order by created_at desc'),
    query('select * from agent_authorization_grants order by created_at desc'),
    query('select * from ai_conversation_messages order by created_at asc'),
    query('select * from ai_conversation_turns order by created_at asc'),
    query('select payload from strategy_runs order by created_at desc'),
    query('select payload from h_skill_invocations order by created_at desc'),
    query('select * from admin_audit_logs order by created_at desc limit 500'),
  ])

  return {
    adminAuditLogs: adminAuditLogs.rows.map(mapAdminAuditLog),
    agentWallets: agentWallets.rows.map(mapAgentWallet),
    authorizationGrants: grants.rows.map(mapAuthorizationGrant),
    cards: cards.rows.map(mapCard),
    conversationMessages: conversationMessages.rows.map(mapConversationMessage),
    conversationTurns: conversationTurns.rows.map(mapConversationTurn),
    currentUserId: runtimeState.rows[0]?.value ?? null,
    hSkillInvocations: hSkillInvocations.rows.map((row) => row.payload),
    strategyRuns: strategyRuns.rows.map((row) => row.payload),
    users: users.rows.map(mapUser),
  }
}

function scheduleWrite(task) {
  if (!persistenceReady) {
    return
  }

  writeQueue = writeQueue.then(task).catch((error) => {
    lastError = error
    console.error('[postgres-persistence]', error.message)
  })
}

function createEmptyState() {
  return {
    adminAuditLogs: [],
    agentWallets: [],
    authorizationGrants: [],
    cards: [],
    conversationMessages: [],
    conversationTurns: [],
    currentUserId: null,
    hSkillInvocations: [],
    strategyRuns: [],
    users: [],
  }
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapAgentWallet(row) {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    status: row.status,
    walletId: row.wallet_id,
    accountId: row.account_id,
    accountName: row.account_name,
    email: row.email,
    evmAddress: row.evm_address,
    solAddress: row.sol_address,
    loginType: row.login_type,
    metadata: row.metadata ?? {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapCard(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    source: row.source,
    title: row.title,
    summary: row.summary,
    createdAt: toIso(row.created_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : undefined,
    metrics: row.metrics ?? [],
    metadata: row.metadata ?? {},
    tags: row.tags ?? [],
  }
}

function mapConversationMessage(row) {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    createdAt: toIso(row.created_at),
  }
}

function mapConversationTurn(row) {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: toIso(row.created_at),
    intent: row.intent,
    confidence: row.confidence,
    userMessageId: row.user_message_id,
    assistantMessageId: row.assistant_message_id,
    processSteps: row.process_steps ?? [],
    cardIds: row.card_ids ?? [],
    executionPlan: row.execution_plan ?? null,
  }
}

function mapAuthorizationGrant(row) {
  return {
    id: row.id,
    address: row.address,
    createdAt: toIso(row.created_at),
    metadata: row.metadata ?? {},
    scope: row.scope,
    status: row.status,
    updatedAt: toIso(row.updated_at),
    userId: row.user_id,
  }
}

function mapAdminAuditLog(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    action: row.action,
    resource: row.resource,
    resourceVersion: row.resource_version,
    summary: row.summary,
    metadata: row.metadata ?? {},
    request: row.request ?? null,
    createdAt: toIso(row.created_at),
  }
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value
}

module.exports = {
  getPersistenceStatus,
  initializePostgresPersistence,
  loadPersistedState,
  persistAdminAuditLog,
  persistAgentConversationMessage,
  persistAgentConversationTurn,
  persistAgentWallet,
  persistAuthorizationGrant,
  persistCard,
  persistCurrentUserId,
  persistHSkillInvocation,
  persistStrategyRun,
  persistUser,
}
