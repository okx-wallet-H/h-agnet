# Production Architecture

H Wallet production is an app plus backend system. The Expo app is the user
surface, but all sensitive execution, strategy, AI, OKX, and scoring work must
live behind H Wallet server APIs.

## Production Components

```txt
Expo app
-> H API gateway (/api/h/v1)
-> Agent command pipeline
-> Strategy registry
-> H Skill runtime
-> OKX / OnchainOS adapters
-> Card Library
-> PostgreSQL
-> scoring / side quest / membership jobs
```

### Mobile App

Responsibilities:

* Chinese AI conversation surface.
* Review cards, result cards, Card Library, wallet entry, profile entry,
  community tab, and Agent state views.
* Reads public module APIs only.
* Stores non-secret user preferences and local cache.

Non-responsibilities:

* No OKX API secrets.
* No private keys.
* No raw OnchainOS provider calls.
* No strategy execution logic.
* No admin rule mutation.

### H API Backend

Responsibilities:

* Owns the `/api/h/v1` namespace.
* Validates user identity and Agent Wallet binding state.
* Normalizes every module contract for the app.
* Owns OKX / OnchainOS server-only adapters.
* Owns card persistence, authorization records, audit logs, and score inputs.
* Provides a stable contract while providers, strategies, and AI models change.

### Agent Runner

Responsibilities:

* Converts approved strategy plans into ordered H Skill calls.
* Respects authorization policy, risk gates, stop conditions, and provider
  safety responses.
* Writes progress cards, blocked cards, and verified result cards.

The runner must never call provider SDKs from screens. Screens only observe
runner status and show card output.

### Strategy Registry

Strategies are backend-managed product assets.

Each strategy version should define:

* id, version, status, rollout channel, and Chinese display name.
* supported chains, supported assets, and strategy risk level.
* required H Skill wrappers.
* authorization scope and stop conditions.
* card templates for launch, progress, blocked, and verified result states.
* migration notes when a version is replaced.

### H Skill Runtime

H Skill wrappers are the internal product API for provider capabilities:

```txt
H.skill.wallet.getPortfolio
H.skill.swap.quote
H.skill.swap.execute
H.skill.risk.scanTransaction
H.skill.gateway.simulate
H.skill.gateway.trackOrder
H.skill.defi.deposit
H.skill.defi.claim
```

Wrappers normalize provider data into H Wallet contracts. New OKX OnchainOS
skills or future providers should be registered here, not added directly to UI
screens.

### OKX / OnchainOS Adapter Layer

Current domain is Onchain only:

* OKX Agent Wallet.
* OKX Wallet / wallet portfolio.
* OKX Swap.
* OKX security.
* OKX onchain gateway.
* OKX DeFi invest wrappers when available.

OKX CEX accounts, exchange balances, exchange orders, bots, and exchange Earn
products are a separate future module and must not share Onchain Agent Wallet
authorization.

### PostgreSQL

PostgreSQL is the first production database target. It should persist:

* users.
* Agent Wallet bindings.
* cards and card events.
* strategy versions and strategy runs.
* H Skill invocations.
* authorization grants.
* scoring rules and score snapshots.
* side quest rules and progress.
* admin audit logs.

Current in-memory repositories are temporary implementation details. Frontend
contracts should not change when repositories move to PostgreSQL.

### Queue / Background Jobs

The first production queue can be Redis-backed when we need reliable async
work. Initial candidates:

* Agent run step execution.
* OKX transaction status polling.
* Card Library indexing.
* score recalculation.
* side quest progress recalculation.
* AI knowledge ingestion.

Do not add a queue before a job needs retry, delay, or isolation from request
latency.

### AI Knowledge Layer

AI must use H Wallet knowledge and H APIs, not raw provider access.

The production knowledge layer should be hybrid:

* PostgreSQL stores authoritative business state: users, Agent Wallet bindings,
  cards, grants, strategy runs, scoring, side quests, and audit records.
* A vector index stores semantic retrieval material: approved docs, strategy
  explanations, H Skill descriptions, safe card summaries, and support
  knowledge.
* The AI context builder combines scoped vector retrieval with server-side
  summaries from PostgreSQL. It must not treat vector search as the source of
  truth for balances, authorization, rewards, or execution status.

Knowledge sources:

* product rules from AGENTS.md and architecture docs.
* strategy registry records.
* H Skill wrapper descriptions.
* OKX / OnchainOS integration notes.
* user Card Library summary.
* authorization policy.
* risk and blocked-state rules.

## Environment Stages

### Local

Purpose: development and contract testing.

* Expo tunnel or local simulator.
* local Node server.
* in-memory repositories.
* optional local `.env`.

### Preview

Purpose: real-device testing before production.

* EAS Update preview branch.
* server preview environment.
* preview PostgreSQL database.
* preview OKX / OnchainOS credentials if available.
* restricted test users.

### Production

Purpose: real users and real assets.

* EAS production channel and App Store / Play Store builds.
* production H API server.
* production PostgreSQL.
* server-only secret storage.
* monitoring, logs, backup, and incident process.
* strict provider access boundaries.

## Security Rules

* Only `EXPO_PUBLIC_*` variables can reach the mobile app.
* OKX credentials, AI provider keys, database URLs, admin tokens, and server
  SSH keys are server-side only.
* Admin tokens are management-system credentials. The mobile app must never
  send them.
* Real execution cards require verified backend adapter responses.
* Failed risk scan, failed simulation, or provider uncertainty stays blocked.
* Withdrawal and transfer address changes require fresh authorization.

## Release Rule

Small JS and asset changes can ship through EAS Update only when the native
runtime is compatible. Native dependency changes, SDK upgrades, native config,
permissions, and new native modules require a new EAS build.
