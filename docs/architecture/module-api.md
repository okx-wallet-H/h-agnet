# Module API Architecture

H Wallet modules expose API-style contracts even when the implementation is not
yet connected to a live backend.

## API Namespace

All H Wallet backend routes use the product namespace prefix:

```txt
/api/h/v1
```

Rules:

* `h` is the H Wallet product namespace.
* `v1` is the public HTTP contract version.
* Frontend modules pass relative module paths such as `/cards`; the shared API
  client adds `/api/h/v1` centrally.
* Screens must not call provider URLs, OKX URLs, or OnchainOS commands
  directly.
* Future skills should map to this namespace, for example:

```txt
H.skill.wallet.balance → GET /api/h/v1/wallet/account
H.wallet.auth.status   → GET /api/h/v1/auth/agent-wallet/status
H.wallet.auth.requestCode → POST /api/h/v1/auth/agent-wallet/request-otp
H.wallet.auth.verifyCode  → POST /api/h/v1/auth/agent-wallet/verify
H.wallet.session.status   → GET /api/h/v1/auth/agent-wallet/session
H.card.wallet.created     → wallet-created conversation card
H.card.library.list       → GET /api/h/v1/cards
H.card.conversation.list  → GET /api/h/v1/cards/conversation
H.card.trade.handoff      → POST /api/h/v1/cards/:id/execution-handoff
H.card.trade.verify       → POST /api/h/v1/cards/:id/verify-trade
H.agent.strategies     → GET /api/h/v1/agent/strategies
H.agent.strategyPlan   → GET /api/h/v1/agent/strategies/:id/plan
H.agent.skills         → GET /api/h/v1/agent/skill-wrappers
H.agent.skillRuntime   → GET /api/h/v1/agent/skill-runtime
H.agent.skillDryRun    → POST /api/h/v1/agent/skill-runtime/dry-run
H.agent.skillInvoke    → POST /api/h/v1/agent/skill-runtime/invoke (internal)
H.agent.skillAudit     → GET /api/h/v1/agent/skill-runtime/invocations (internal)
H.agent.runner         → GET /api/h/v1/agent/runner
H.agent.runs           → GET /api/h/v1/agent/runs
H.agent.start          → POST /api/h/v1/agent/strategies/:id/start
H.agent.preflight      → POST /api/h/v1/agent/runs/:id/preflight
H.skill.strategy.plan  → H.skill.strategy.composePlan
H.skill.signal.read    → H.skill.signal.readOnchainSignals
H.skill.token.risk     → H.skill.token.analyzeRisk
H.skill.market.trends  → H.skill.market.readDexTrends
H.skill.cards.list     → GET /api/h/v1/cards
H.skill.cards.confirm  → POST /api/h/v1/cards/:id/confirm
H.skill.auth.me        → GET /api/h/v1/auth/me
H.skill.ai.authz       → GET /api/h/v1/ai/authorization-policy
H.skill.ai.turns       → GET /api/h/v1/ai/conversation/turns
H.skill.ai.chat        → POST /api/h/v1/ai/conversation/messages
H.skill.boost.growth   → GET /api/h/v1/boost/growth-summary
H.skill.boost.quests   → GET /api/h/v1/boost/side-quests
H.skill.boost.rules    → GET /api/h/v1/boost/side-quest-rules
H.skill.boost.scoring  → GET /api/h/v1/boost/scoring-rules
H.admin.boost.rules    → GET /api/h/v1/admin/boost/side-quest-rules
H.admin.boost.scoring  → GET /api/h/v1/admin/boost/scoring-rules
H.admin.audit.logs     → GET /api/h/v1/admin/audit-logs
```

`H.agent.skillRuntime` and `H.agent.skillDryRun` may be exposed for product
status and safe planning. `H.agent.skillInvoke` is internal-only and protected
by `H_WALLET_EXECUTION_TOKEN`; the mobile app must not call wrapped OKX skills
directly. User-facing execution must flow through AI conversation, authorization
cards, strategy runner, execution handoff, and verified result cards.

`/integrations/okx/status` includes the OKX provider registry. It reports
server-only adapter readiness for Onchain providers such as Agent Wallet, DEX
Swap, Security, Gateway, and DeFi Invest. The frontend may display those states,
but provider commands and credentials remain backend-only.

The first HTTP-backed OKX adapters are read/preflight only:

* `H.skill.swap.quote` → `GET /api/v6/dex/aggregator/quote`
* `H.skill.swap.execute` →
  `GET /api/v6/dex/aggregator/swap` for transaction data only
* `H.skill.gateway.simulate` →
  `POST /api/v6/dex/pre-transaction/simulate`
* `H.skill.gateway.trackOrder` →
  `GET /api/v6/dex/aggregator/history`

Swap signing, broadcast, DeFi deposit, DeFi claim, and reward collection remain
blocked until authorization, risk gates, adapter responses, and verified result
cards are complete.

OKX OnchainOS project credentials are stored as server-only environment
variables: `OKX_PROJECT_ID`, `OKX_API_KEY`, `OKX_SECRET_KEY`, and
`OKX_PASSPHRASE`.

These credentials are the H Wallet official server channel. They identify and
authenticate H Wallet's backend when calling OKX OnchainOS / OKX API, but they
do not replace the user's Agent Wallet authorization. Real asset actions still
belong to the user's Agent Wallet permission scope, risk gate, and verified
provider response.

If a future CEX module is added, it must live under its own explicit slice such
as `/api/h/v1/cex/...`. It must not share wallet execution routes, Agent Wallet
authorization state, or OnchainOS card proofs.

```txt
Screen / UI
↓
Feature Hook or Store
↓
Module Service
↓
Module API
↓
H Wallet Backend
↓
OKX / OnchainOS / Wallet / AI Adapters
```

## Modules

Current module contracts:

* `auth`: Agent Wallet email OTP, verification, session.
* `wallet`: account, assets, chains, send/receive preparation.
* `earning-agent`: user Agent lifecycle, preset strategy selection, run state,
  and execution progress.
* `strategy`: approved onchain earning strategies, parameters, risk profile,
  and adapter requirements.
* `trading`: OKX Swap operations used by approved strategies, plus user-requested
  swap proposals.
* `risk`: risk assessment for trade and wallet actions.
* `cards`: Card Library, conversation cards, scoring input data.
* `boost`: rewards, campaigns, membership growth inputs.
* `ai`: conversation commands, strategy proposal generation, and pending agent
  proposal state.

AI conversation can start the official earning Agent flow. Phrases such as
`启动稳健稳定币赚币 Agent` route to the official strategy registry and create a
strategy launch card instead of a generic side-quest card. Side quests remain
Card Library achievements, while the earning Agent remains the main onchain
strategy execution surface.

## Earning Agent Rule

H Wallet's main product is an onchain earning Agent, not a manual trading
terminal.

```txt
email registration
→ Agent Wallet
→ start earning Agent
→ approved preset strategy
→ OnchainOS skill orchestration
→ risk / authorization policy
→ execution progress card
→ result card
→ card library
→ portfolio advice / membership / side quests
```

Preset strategies are product-controlled. Users can start, pause, review, or
stop an Agent, but the frontend must not invent strategy logic, token routing,
or DeFi execution rules. Strategy execution belongs behind backend service and
adapter layers.

H Wallet strategies are composed from OKX OnchainOS skills. OKX provides the
capability layer; H Wallet owns strategy packaging, Chinese card UX,
authorization policy, stop conditions, and Card Library indexing.

```txt
H Wallet official strategy
→ ordered H Skill Wrapper sequence
→ OKX skill composition
→ normalized provider outputs
→ card / audit / scoring records
```

The user-facing command remains simple, for example `启动稳健稳定币赚币 Agent`.
The app should not ask low-cognition users to choose raw OKX skills.

Strategies are dynamic and versioned. H Wallet should treat them as managed
backend records, not as hardcoded app screens.

Each strategy should declare:

* strategy id and Chinese display name.
* version, status, rollout channel, and effective time.
* supported chains and assets.
* required wrapped skills, not raw provider commands.
* action types: swap, bridge, DeFi deposit, claim, rebalance, withdraw, or
  read-only analysis.
* authorization scope.
* risk gates and stop conditions.
* card templates for progress, blocked state, and verified result.
* migration notes when a new version replaces an old strategy.

The first implementation can expose strategy contracts and blocked execution
states without claiming live yield or live execution.

## Skill Wrapper Rule

H Wallet does not let the Agent call raw skills directly from screens. Every
external capability must be wrapped in an internal H Skill contract first.

```txt
strategy version
→ agent runner
→ H skill wrapper
→ provider adapter
→ OKX OnchainOS skill / CLI / API
→ normalized result
→ card template
→ card library
```

Wrapper naming uses the H namespace and stays independent from provider names:

```txt
H.skill.wallet.createAgentWallet
H.skill.wallet.getPortfolio
H.skill.swap.quote
H.skill.swap.execute
H.skill.risk.scanTransaction
H.skill.gateway.simulate
H.skill.gateway.broadcast
H.skill.defi.deposit
H.skill.defi.claim
H.skill.bridge.quote
H.skill.bridge.execute
```

The wrapper layer is responsible for:

* input validation and typed schemas.
* provider selection and fallback policy.
* mapping H contracts to OKX OnchainOS skill commands.
* normalizing provider output into H Wallet result contracts.
* risk, authorization, and execution gate propagation.
* audit events and card metadata.

The strategy runner can update strategy logic by changing strategy records and
skill wrapper composition. It should not require frontend releases for every
strategy change.

## OKX Domain Boundary

H Wallet separates OKX into two product domains.

Onchain domain:

* OKX Wallet and OKX Agent Wallet.
* OnchainOS skill orchestration.
* DEX Swap, bridge, token intelligence, security scan, onchain gateway, and
  wallet portfolio.
* Current H Wallet Agent Wallet product surface.

CEX domain:

* OKX exchange account, exchange balances, spot / contract orders, exchange
  bots, Earn products, and exchange portfolio.
* Future independent module only.

Current H Wallet wallet and AI trading flows are Onchain-first. They should map
to OnchainOS / OKX Wallet skills such as agent wallet, DEX swap, bridge,
security, token, gateway, and wallet portfolio. CEX skills and exchange APIs
must not be used for Agent Wallet balance, DEX Swap, withdrawal address
authorization, transaction execution proof, or Card Library onchain receipts.

If CEX is introduced later, it needs separate service modules, credentials,
authorization policy, cards, copy, and safety rules. It cannot inherit Onchain
Agent Wallet permissions.

## Card Library Rule

The Card Library is the trade activity ledger for the product. H Wallet may
create many conversation cards, but only trading cards enter the Card Library:

* trade-confirmation cards with `pending-execution`, meaning OKX/onchain
  execution data or a real execution process exists but final success has not
  been verified yet.
* trade-success cards after verified completion.

Startup cards, preflight cards, wallet cards, side quest cards, portfolio
insight cards, and generic system cards remain available to the conversation or
their own modules, but they are not Card Library records.

```txt
module result
→ conversation card
→ if trade in-progress or trade success: card library
→ portfolio advice / membership score / side quests / rewards
```

Cards must not claim live wallet, trading, reward, or OKX data unless the data
was returned by a verified backend adapter.

Cards may include `userId` when a H Wallet identity is active. The Card Library
service should read the current identity from the auth boundary and attach it
server-side. Screens must not decide card ownership.

`POST /cards` is a client-safe draft note endpoint only. Ordinary clients may
create non-proof conversation drafts such as `system-status`,
`portfolio-insight`, or `side-quest` with `source: user-action`; they cannot
create trade-success, wallet-created, execution-receipt, pending-execution, or
service/OKX-sourced cards. Proof-like cards must come from backend modules,
H Skill wrappers, execution handoff, or OKX verification. The backend ignores
client-supplied ownership and completion fields for this endpoint; `userId` is
resolved server-side and `completedAt` is never accepted for client drafts.

Card Library stats keep the legacy response shape for app compatibility, but
the counters are derived only from the eligible trading subset:

* `confirmations`: trade cards waiting for execution.
* `receipts`: compatibility object; receipt cards are not Card Library records.
* `activity`: trade card counts; non-trade activity counters stay at zero.
* `completion`: verified trade-success cards and in-progress trade counts.

Membership scoring may use trading-in-progress cards as activity signals, but
only verified trade-success cards can represent real completed execution.

When a user confirms a quote-ready trade card, the confirmation route may run a
server-side continuation step. That step can only create a Card Library record
after H Wallet has received OKX swap data and passed the pre-execution
simulation gate. If OKX data, wallet context, authorization, or simulation is
missing, the continuation writes a blocked conversation card instead of a Card
Library card.

When a pending trade receives a real execution callback from the Agent Wallet
runner, `POST /cards/:id/execution-handoff` records the returned `txHash` on the
pending card. This is an internal runner endpoint protected by
`H_WALLET_EXECUTION_TOKEN`; the mobile app must not store this token or call the
handoff endpoint directly. The handoff is a receipt only; it does not create a
success card and it cannot overwrite a different existing transaction hash.

After the handoff, `POST /cards/:id/verify-trade` checks OKX DEX History
through `H.skill.gateway.trackOrder`. H Wallet only creates a `trade-success`
card when OKX reports `success`. `pending`, `fail`, missing records, provider
errors, or unknown states do not create success cards.

Run the local in-memory smoke check after changing Card Library, confirmation
continuation, or trade-result verification logic:

```txt
node scripts/smoke-card-logic.js
```

The smoke check does not read `.env`, does not start PostgreSQL, and does not
call OKX. It verifies that quote-ready confirmations and blocked follow-up cards
stay in conversation history only, while `pending-execution` and verified
`trade-success` cards are the only records admitted into the Card Library.

Growth scoring v1 is exposed by `/boost/growth-summary`. It returns a
transparent score, tier, task score, trust score, per-rule breakdown, recommended
next actions, and safety caveats. It must stay derived from Card Library data
until real OKX / OnchainOS reward adapters are connected.

Growth scoring rules are exposed read-only by `/boost/scoring-rules`. The
current model is a v0 observation model: it defines inputs, dimensions, caps,
tiers, and explanations, but it is not treated as the final reward formula.
Management backend changes must follow the same draft, preview, publish, and
discard lifecycle as side quest rules:

```txt
GET  /admin/boost/scoring-rules
POST /admin/boost/scoring-rules/draft
POST /admin/boost/scoring-rules/preview
POST /admin/boost/scoring-rules/publish
POST /admin/boost/scoring-rules/discard-draft
```

Side quests are exposed by `/boost/side-quests`. A side quest is a Card
Library achievement, not a fake reward claim. For example, five trading cards
unlock the `交易达人` achievement; verified rewards still require backend
adapter proof.

Side quest rules are exposed read-only by `/boost/side-quest-rules`. Public
clients only receive the published rule set, and the evaluator always uses the
published rule set.

Management backend work must use the admin namespace:

```txt
GET  /admin/boost/side-quest-rules
POST /admin/boost/side-quest-rules/draft
POST /admin/boost/side-quest-rules/preview
POST /admin/boost/side-quest-rules/publish
POST /admin/boost/side-quest-rules/discard-draft
```

Admin routes require `Authorization: Bearer <H_WALLET_ADMIN_TOKEN>`. The
mobile app must never store or send this token. Rule changes follow a
draft-first lifecycle: save draft, preview against Card Library stats, publish
as a new version, then recalculate user progress from the same rules. This
keeps future management changes auditable without letting ordinary clients
mutate growth logic.

Every successful admin draft, preview, publish, and discard action writes an
audit log entry. Admin audit logs are exposed by `/admin/audit-logs` and must
remain management-only.

## Conversation Rule

AI conversation is the primary command surface. A conversation response may
create review-only cards, but it must not execute wallet, trading, reward, or
contract actions directly.

```txt
user command
→ conversation API
→ assistant message
→ collapsible process steps
→ review-only card
→ card library
```

Current conversation intent detection is a safe backend contract placeholder.
It exists to stabilize UI and Card Library data flow before connecting a real AI
planner and OKX / OnchainOS adapters.

Conversation responses currently return:

* `id` and `createdAt`: stable identifiers for a complete conversation turn.
* `assistantMessage`: simple Chinese response for the chat surface.
* `processSteps`: short collapsible execution summary for transparency.
* `cards`: review-only authorization, insight, task, or status cards.
* `executionPlan`: backend-only orchestration metadata for adapter routing,
  authorization gates, and future OKX / OnchainOS execution modules.

Authorizing a card may create an `execution-receipt` card. This receipt records
that the user's authorization was received, but it must not claim a real
on-chain success unless a verified execution adapter returns a transaction
result.

Conversation commands go through the Agent Command Pipeline:

```txt
message
→ intent detection
→ command handler
→ authorization policy
→ execution plan
→ review card
→ card library
→ authorization gate or autonomous execution adapter
```

Current handlers cover OKX Swap intent, wallet actions, portfolio questions,
side quests, and unknown messages. New skills should be added as command
handlers behind the pipeline instead of adding provider logic to screens.

## OKX Swap Boundary

H Wallet must not rebuild a trading engine. The trading module is only a product
orchestration layer around OKX Swap:

```txt
AI swap intent
→ authorization policy
→ H Wallet backend adapter
→ OKX Swap quote
→ OKX Swap data
→ wallet / OnchainOS execution path
→ OKX transaction status
→ verified result card
```

Screens must not call OKX Swap directly. They call H Wallet module APIs, and
the backend owns OKX request signing, secret storage, quote normalization,
swap-data handling, transaction-status polling, and card recording.

OKX Swap owns quote quality, route aggregation, swap calldata/instructions, and
swap status. H Wallet owns Chinese conversational UX, authorization policy,
Card Library records, membership/quest scoring, and user-facing safety copy.

Agent execution authorization is policy-based:

* H Wallet does not introduce a password. Email OTP creates or restores the
  Agent Wallet session.
* First trade authorization grants `trade-autonomy` for the current user.
* A withdrawal or transfer address must be authorized before autonomous reuse.
* A changed withdrawal or transfer address requires a new user authorization.
* Non-asset actions such as portfolio analysis or side quest planning do not
  need asset authorization.

Even when H Wallet policy marks an action as agent-authorized, provider
adapters must still respect OKX / OnchainOS safety responses. If an adapter
returns a confirming response or risk block, the backend must surface that gate
instead of silently forcing execution.

## Backend Contract

The first-phase backend returns safe empty states or blocked states for modules
that are not connected yet. This keeps the frontend contract stable without
pretending integrations are live.

## Identity Boundary

The first identity flow is:

```txt
email
→ H Wallet user identity
→ OKX Agent Wallet OTP request
→ OTP verification
→ Agent Wallet binding
→ user-scoped card library
```

`/auth/me` exposes the current H Wallet identity and Agent Wallet binding
metadata. It must not expose private keys, OKX API secrets, raw CLI session
files, or provider credentials.

There is no H Wallet password credential in this flow. The frontend must not
ask the user to create a password, and the backend must not store password
hashes for Agent Wallet access.

## Persistence Boundary

Current storage is in-memory, but mutable data is accessed through repository
modules:

```txt
service
→ repository interface
→ in-memory repository today
→ PostgreSQL repository later
```

The first PostgreSQL migration should target:

* `cards`
* `card_events`
* `side_quest_rule_sets`
* `side_quest_rules`
* `scoring_rule_sets`
* `scoring_rules`
* `agent_authorization_grants`
* `user_score_snapshots`
* `admin_audit_logs`

Screens and feature hooks must continue to depend on module APIs, not database
or repository details.

The first SQL draft lives in `docs/database/001_initial_schema.sql`. It is a
schema blueprint, not an instruction to connect production data yet.

## Provider Extension Rule

Every new provider must enter through an adapter layer instead of screens.

```txt
Feature hook
→ module service
→ module API
→ backend module route
→ provider adapter
```

Provider adapters must normalize their output into H Wallet card, wallet,
trading, risk, or boost contracts. The frontend should never branch on provider
SDK details, raw OKX response shapes, secret configuration, CLI command names,
or service-specific error codes.

## User Experience Rule

The primary user surface is Chinese AI conversation. Complex execution details
belong behind API/service boundaries and may only be shown as a short
collapsible process summary.

```txt
simple user command
→ AI process summary
→ confirmation / result card
→ card library
```

This keeps the product usable for low-cognition users while still preserving
auditable execution data for cards, membership scoring, quests, rewards, and
portfolio suggestions.
