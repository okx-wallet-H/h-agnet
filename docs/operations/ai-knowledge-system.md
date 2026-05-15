# AI Model And Knowledge System

H Wallet's AI is a product orchestrator, not a free-form trading bot. It turns
Chinese user messages into safe H Wallet module actions, explanation cards, and
reviewable execution plans.

## AI Boundary

The AI layer may:

* classify user intent.
* explain wallet, strategy, card, and reward states in simple Chinese.
* create review-only cards.
* request strategy plans from the backend.
* call H Wallet server tools after policy checks.
* summarize Card Library history for portfolio suggestions.

The AI layer must not:

* call OKX or OnchainOS directly from the app.
* invent yield, price, balance, tx hash, or reward data.
* bypass OKX / OnchainOS safety prompts.
* execute outside the active authorization scope.
* mix CEX account actions into Onchain Agent Wallet flows.

## Conversation Pipeline

```txt
user message
-> intent parser
-> product policy check
-> knowledge retrieval
-> command planner
-> H API / H Skill tool call
-> collapsible process summary
-> conversation card
-> Card Library
```

The visible UI should stay simple. Complex details belong in a collapsible
process summary or backend audit record.

## Knowledge Sources

### Static Product Knowledge

Stored in repo docs and later indexed:

* AGENTS.md.
* `docs/architecture/module-api.md`.
* `docs/architecture/strategy-skill-runtime.md`.
* `docs/integrations/okx-onchainos.md`.
* production operation docs.

### Dynamic Product Knowledge

Stored in the database:

* strategy versions.
* H Skill wrapper registry.
* authorization rules.
* side quest rules.
* scoring rules.
* card templates.

### User Context

Derived from Card Library and user state:

* Agent Wallet binding state.
* verified cards.
* pending review cards.
* strategy run history.
* portfolio insight cards.
* membership and side quest progress.

### Provider Context

Only fetched by backend adapters:

* OKX Agent Wallet session state.
* OKX Swap quote and swap data.
* OKX transaction status.
* OKX security and simulation responses.
* OnchainOS skill outputs.

## Prompt Layers

Production AI should use layered prompts:

* system policy: safety, authorization, and domain boundary.
* product policy: H Wallet product rules and Chinese UX rules.
* module contract: allowed H API and H Skill tools.
* strategy context: active strategy version and allowed scope.
* user context: Card Library summary and current pending cards.
* response format: assistant text, process steps, cards, and execution plan.

## Tool Calling Rule

The AI can only call H Wallet server contracts. Provider-specific commands stay
behind adapters.

Allowed tool families:

```txt
H.auth.*
H.wallet.*
H.agent.*
H.skill.*
H.cards.*
H.boost.*
H.risk.*
```

Future MCP tools should be exposed as H Wallet wrappers first, then made
available to the Agent runner. The chat surface should not know whether a tool
is backed by OKX CLI, OKX API, MCP, or a later provider.

## Card Generation Rule

Cards are product primitives. AI output should create one of these states:

* review card: user must inspect or authorize.
* progress card: Agent is working or waiting.
* blocked card: execution stopped for safety or missing provider readiness.
* verified result card: backend adapter confirmed the final result.
* insight card: non-execution advice based on Card Library data.

Only verified result cards can claim real execution success.

## Knowledge Ingestion Plan

Phase 1:

* keep repo docs as the source of product memory.
* expose strategy and H Skill registry through backend APIs.
* summarize Card Library data server-side for AI context.

Phase 2:

* add a knowledge ingestion job.
* index approved docs and strategy records.
* add retrieval metadata for source, version, and update time.

Phase 3:

* connect management backend for strategy and prompt version changes.
* add evaluation sets for common Chinese commands.
* add regression tests for blocked execution and hallucination cases.

## Minimum AI Evaluation Set

The first AI test set should cover:

* email registration and Agent Wallet creation.
* "启动稳健稳定币赚币 Agent".
* "帮我赚币".
* "帮我把 ETH 换成 USDC".
* withdrawal to a first address.
* withdrawal to a changed address.
* portfolio analysis.
* side quest progress question.
* unsupported CEX request.
* unclear risky command.

Every case should assert intent, policy scope, cards created, and whether
execution is allowed, blocked, or review-only.
