# Strategy Skill Runtime

This is the current product memory for H Wallet's earning Agent architecture.

## Current Scope

H Wallet is an onchain earning Agent product.

The current phase supports official strategy skills only:

```txt
Agent Wallet
→ Agent Runner
→ Official Strategy Skill Registry
→ H Skill Wrapper
→ OKX OnchainOS skill / MCP / CLI / API
→ normalized result
→ card
→ Card Library
```

H Wallet strategies are OKX skill compositions. H Wallet owns the product
strategy, execution order, authorization scope, risk gates, and Chinese card
templates. OKX OnchainOS skills own the underlying capabilities such as wallet
portfolio, DEX signals, token analysis, Swap quote, security scan, simulation,
gateway tracking, and DeFi actions.

```txt
H.strategy.official.*
→ H Skill Wrapper sequence
→ OKX skill composition
→ normalized step results
→ review / progress / result cards
```

Do not expose raw OKX skill names as user commands. The user starts an H Wallet
strategy such as `启动稳健稳定币赚币 Agent`; the strategy registry decides which
OKX skills are composed behind that product action.

## Strategy Skill Principle

Strategies are dynamic product assets, not frontend logic.

The frontend can list, start, pause, and review strategies, but it must not
contain strategy execution logic, token routing rules, yield assumptions, or
provider-specific commands.

Runner plan inspection uses:

```txt
GET /api/h/v1/agent/strategies/:strategyId/plan
```

This endpoint returns the ordered H Skill execution plan for an official
strategy. The plan is informational in the current phase: it marks protocol
steps as ready or blocked, but it does not execute provider actions.

Provider readiness is centralized in the OKX provider registry:

```txt
H Skill Wrapper
→ provider skill id
→ OKX provider registry
→ server-only adapter status
```

The registry currently tracks `okx-agentic-wallet`, `okx-dex-swap`,
`okx-dex-market`, `okx-security`, `okx-onchain-gateway`, and
`okx-defi-invest`. Screens may show registry status, but they must not branch
into provider commands or hold provider secrets.

OKX Project/API credentials are marked as the `H Wallet 官方接入` server
channel. This means provider calls are made through H Wallet's official backend
credential boundary, while user asset authorization remains controlled by the
Agent Wallet authorization policy. The official channel marker should flow into
plans, audit events, and cards as source context, not as a substitute for user
authorization.

Every strategy skill declares:

* `id`
* `version`
* Chinese display name and summary
* risk level
* supported chains and assets
* required H Skill wrappers
* OKX skill composition generated from those wrappers
* authorization scope
* stop conditions
* card templates

Strategy authorization is scoped by strategy version, for example
`strategy:stable-earn:v0`. The first user confirmation creates a grant for that
exact scope. A different strategy or strategy version must be treated as a new
authorization scope unless the backend policy deliberately migrates it.

## H Skill Wrapper Principle

The Agent calls H Skill wrappers, not raw provider skills.

```txt
H.skill.swap.quote
→ provider adapter
→ okx-dex-swap
→ normalized quote result
```

This keeps the Agent Runner stable when strategies change or when provider
integrations are replaced.

The first runtime contract is dry-run only:

```txt
GET  /api/h/v1/agent/skill-runtime
GET  /api/h/v1/agent/skill-runtime/invocations
POST /api/h/v1/agent/skill-runtime/dry-run
POST /api/h/v1/agent/skill-runtime/invoke
```

Dry-run validates wrapper identity, records an invocation, and returns a blocked
result. It does not call OKX, OnchainOS, wallets, or provider APIs.

The first strategy-composition wrappers are:

```txt
H.skill.strategy.composePlan      → okx-dex-strategy
H.skill.signal.readOnchainSignals → okx-dex-signal
H.skill.token.analyzeRisk         → okx-dex-token
H.skill.market.readDexTrends      → okx-dex-market
```

These are strategy inputs and planning helpers. They must not execute asset
actions directly. Any asset-changing step still goes through swap, gateway,
DeFi, risk, authorization, and verified result gates.

The first read-only invoke target is `H.skill.wallet.getPortfolio`. It maps to
`okx-agentic-wallet` / `onchainos wallet balance` because it reads the current
logged-in Agent Wallet. Address-based portfolio lookup is a different wrapper
and should use `okx-wallet-portfolio` when introduced.

`H.skill.market.readDexTrends` maps to `okx-dex-market` / OKX Hot Token API.
It is a read-only strategy input. The backend sends a server-only signed
request to `/api/v6/dex/market/token/hot-token`, normalizes the returned list
into H Wallet market trend rows, and records the invocation. If OKX returns a
non-success code, an empty response, or a provider error, H Wallet must not
invent market data.

The first risk-gate invoke target is `H.skill.risk.scanTransaction`. Its first
connected provider method is `okx-security` / token-scan through
`/api/v6/security/token-scan`. This scans contract tokens and normalizes OKX's
authoritative `riskLevel` into H Wallet actions: `allow`, `warn`,
`require-confirmation`, or `block`.

Transaction-level `tx-scan`, signature scan, DApp scan, and approval monitoring
are separate OKX Security methods and remain locked until their adapters are
connected. If the wrapper receives transaction calldata before tx-scan is
available, it must return a blocked fail-safe result. A missing or failed risk
scan is never treated as safe.

The first simulation-gate invoke target is `H.skill.gateway.simulate`. It maps
to `okx-onchain-gateway` / OKX Transaction API simulation. A missing, rejected,
or failed simulation is never treated as executable. OKX documentation notes
simulation access can depend on allowlist eligibility, so provider errors remain
blocked instead of being downgraded to warnings.

Trading is owned by OKX. `H.skill.swap.quote` maps to `okx-dex-swap` quote
capability. H Wallet must not create its own quote, route, swap calldata, or
execution engine. The first connected adapter calls OKX DEX quote through a
server-only signed request. Quote requests require token contract addresses, not
only symbols. Missing input or provider errors return a blocked fail-safe result
instead of fake pricing.

`H.skill.swap.execute` also maps to `okx-dex-swap`. OKX owns approve, signing,
broadcast, tx hash, and execution response. H Wallet only supplies validated
intent, wallet, authorization scope, and card/audit context. The current adapter
can request OKX swap transaction data after the authorization policy passes, but
it does not sign, broadcast, or claim execution success. Missing authorization,
missing transaction data, or provider errors stay blocked.

`H.skill.gateway.broadcast` and `H.skill.gateway.trackOrder` map to
`okx-onchain-gateway`. They are for non-swap final-mile transaction broadcast
and status tracking. Broadcast requires an authorization scope and remains
blocked. The first tracking adapter reads OKX DEX transaction history by
`chainIndex + txHash`; it can observe `pending`, `success`, or `fail`, but it
must never invent transaction state.

`H.skill.defi.deposit` and `H.skill.defi.claim` map to `okx-defi-invest`.
They are the only current H Skill wrappers for DeFi earning actions. H Wallet
must not choose yield products in the frontend, invent APY, build DeFi calldata,
or claim rewards without OKX verified data. Deposit requires a backend-selected
`investmentId`, wallet address, amount, token, and authorization scope. Claim
requires a fresh position-detail reference before any collection attempt, so
stale Card Library or cached portfolio data cannot trigger a reward claim.
Until the adapter is connected, both wrappers return blocked fail-safe results.

## Agent Runner State Machine

The Runner owns execution state. Strategy skills do not own global lifecycle.

```txt
idle
→ starting
→ planning
→ waiting-authorization
→ executing
→ completed
```

Any state can move to:

```txt
blocked
paused
```

Current implementation exposes the state machine contract and creates blocked
draft runs. Real execution stays disabled until H Skill wrappers, authorization,
risk checks, and verified result cards are connected.
