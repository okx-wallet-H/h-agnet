# Database Schema Blueprint

H Wallet will move from in-memory repositories to PostgreSQL after the module
contracts are stable. The frontend must keep calling module APIs; it should not
depend on database details.

## Persistence Strategy

Current state:

```txt
service -> repository -> in-memory store
```

Target state:

```txt
service -> repository -> PostgreSQL adapter
```

Repository names should stay stable while implementations change:

* `cardRepository`
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

The Card Library ledger. Cards are the shared data source for AI conversation,
wallet actions, trading authorizations, receipts, portfolio advice, membership
growth, and side quests.

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
