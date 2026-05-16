# Database Schema Blueprint

H Wallet will move from in-memory repositories to PostgreSQL after the module
contracts are stable. The frontend must keep calling module APIs; it should not
depend on database details.

## Persistence Strategy

Fallback state:

```txt
service -> repository -> in-memory store
```

Enabled state:

```txt
service -> repository -> PostgreSQL adapter
```

Repository names should stay stable while implementations change:

* `cardRepository`
* `agentWalletRepository`
* `agentAuthorizationPolicyRepository`
* `strategySkillRepository`
* `sideQuestRuleRepository`
* `scoringRuleRepository`
* `adminAuditLogRepository`

## Core Tables

### users

Stores the product user identity. Email is the first login path, but wallet and
community identities can be added later.

### agent_wallets

Stores Agent Wallet binding metadata only. Do not store private keys or OKX API
secrets.

### cards

Stores conversation cards and the Card Library source rows. The Card Library
view is intentionally narrower than the full conversation history: it only
counts trading-in-progress cards and verified trade-success cards. Wallet
actions, startup/preflight cards, portfolio insight cards, and side quest cards
remain in their own product surfaces and do not enter the Card Library ledger.

### card_events

Append-only card lifecycle history, such as created, prepared for
authorization, authorized, archived, verified, or blocked.

### side_quest_rule_sets / side_quest_rules

Versioned support for side quest rules. Public app clients read only the
published version. Management tools create drafts, preview them, then publish a
new version.

### scoring_rule_sets / scoring_rules

Versioned support for growth scoring rules. The current rules are a v0
observation model, not a final reward formula.

### agent_authorization_grants

Stores user-level Agent autonomy grants. Trade autonomy can be granted once per
user, while withdrawal and transfer autonomy is address-scoped. Address changes
must create a new authorization requirement.

### strategy_runs

Stores Agent Runner state for official strategy runs, including authorization
state, execution plan, H Skill composition, blocked adapter reason, and current
timeline.

### h_skill_invocations

Stores H Skill wrapper invocation records. These are provider-boundary audit
records and must not imply successful on-chain execution unless the invocation
contains a verified provider result.

### h_runtime_state

Stores small backend runtime pointers such as the current local development
user. This is not an authentication session model; production auth should use a
real session boundary later.

### user_score_snapshots

Stores calculated score snapshots when we need history, leaderboard stability,
or anti-abuse review.

### admin_audit_logs

Management-only audit trail for draft, preview, publish, and discard actions.

## Security Rules

* No frontend secrets.
* No private keys in the database.
* No OKX API keys in mobile storage.
* Admin rule mutation requires backend-side auth.
* Public clients must never write rule tables.
* Real trading and reward success must come from verified backend adapters.

## Migration Draft

See `docs/database/001_initial_schema.sql`.
