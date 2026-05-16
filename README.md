# H Wallet

H Wallet is a mobile-first AI conversational Web3 community app, Agent Wallet,
and onchain earning Agent product for the OKX ecosystem and OnchainOS workflows.

Users interact through AI conversation. Registration, recharge, withdrawal,
trade preparation, portfolio review, rewards, and side quests are represented as
reviewable cards. Successful or verified cards enter the Card Library, which
powers user statistics, portfolio suggestions, membership scoring, and growth
systems.

The Agent Wallet flow is passwordless: users register with email OTP through
OKX Agent Wallet, then start an earning Agent. The Agent executes product-owned
preset onchain strategies through backend OnchainOS skill adapters, while the
user sees simple Chinese progress cards, authorization cards, and result cards.

Strategies are dynamic backend-managed assets. H Wallet wraps OKX OnchainOS
skills behind its own H skill contracts, so strategies can be versioned,
updated, enabled, disabled, or replaced without coupling screens to provider
commands.

The first trade authorization grants Agent execution within that policy scope;
withdrawal or transfer address changes require a fresh user authorization.

This project is in the first rebuild phase. The current focus is architecture,
navigation, design system, module API boundaries, and safe backend contracts.
Real wallet, OKX, OnchainOS, and OKX Swap execution integrations are
intentionally not implemented yet.

Trading is not a self-built matching, routing, or swap engine. H Wallet only
orchestrates AI intent, authorization, card UX, and backend adapter boundaries.
Quotes, routing, swap data, and swap status must come from OKX Swap /
OnchainOS APIs.

Current product scope is OKX Onchain only: OKX Wallet, Agent Wallet, OnchainOS,
DEX Swap, bridge, token/security, and wallet portfolio. OKX CEX exchange
accounts, exchange balances, exchange orders, bots, and Earn products are a
separate future domain and must not be mixed into Agent Wallet or OnchainOS
flows.

## Stack

* Expo
* React Native
* TypeScript
* Expo Router
* NativeWind
* Zustand
* React Query
* Reanimated
* MMKV

## Run

```bash
npm run dev
```

Then open the app in Expo Go, iOS Simulator, Android Emulator, or web:

```bash
npm run ios
npm run android
npm run web
```

## Backend

Start the local H Wallet backend contract server:

```bash
npm run backend
```

The first-phase backend listens on `http://127.0.0.1:3000`. All product API
routes use the H Wallet namespace prefix: `/api/h/v1`.

* `GET /`
* `GET /api/h/v1/auth/agent-wallet/status`
* `GET /api/h/v1/auth/me`
* `POST /api/h/v1/auth/agent-wallet/request-otp`
* `POST /api/h/v1/auth/agent-wallet/verify`
* `GET /api/h/v1/auth/agent-wallet/session`
* `GET /api/h/v1/wallet/account`
* `GET /api/h/v1/wallet/assets`
* `GET /api/h/v1/wallet/chains`
* `GET /api/h/v1/agent/strategies`
* `GET /api/h/v1/agent/skill-wrappers`
* `GET /api/h/v1/agent/skill-runtime`
* `GET /api/h/v1/agent/skill-runtime/invocations`
* `POST /api/h/v1/agent/skill-runtime/dry-run`
* `POST /api/h/v1/agent/skill-runtime/invoke`
* `GET /api/h/v1/agent/runner`
* `GET /api/h/v1/agent/runs`
* `POST /api/h/v1/agent/strategies/:id/start`
* `GET /api/h/v1/cards`
* `GET /api/h/v1/cards/stats`
* `POST /api/h/v1/cards`
* `POST /api/h/v1/cards/:id/prepare-confirmation`
* `POST /api/h/v1/cards/:id/confirm` records user authorization and returns a
  non-broadcast execution receipt card
* `POST /api/h/v1/cards/:id/archive`
* `GET /api/h/v1/boost/campaigns`
* `GET /api/h/v1/boost/growth-summary`
* `GET /api/h/v1/boost/side-quests`
* `GET /api/h/v1/boost/side-quest-rules`
* `GET /api/h/v1/boost/scoring-rules`
* `GET /api/h/v1/admin/boost/side-quest-rules`
* `POST /api/h/v1/admin/boost/side-quest-rules/draft`
* `POST /api/h/v1/admin/boost/side-quest-rules/preview`
* `POST /api/h/v1/admin/boost/side-quest-rules/publish`
* `POST /api/h/v1/admin/boost/side-quest-rules/discard-draft`
* `GET /api/h/v1/admin/boost/scoring-rules`
* `POST /api/h/v1/admin/boost/scoring-rules/draft`
* `POST /api/h/v1/admin/boost/scoring-rules/preview`
* `POST /api/h/v1/admin/boost/scoring-rules/publish`
* `POST /api/h/v1/admin/boost/scoring-rules/discard-draft`
* `GET /api/h/v1/admin/audit-logs`
* `GET /api/h/v1/trading/proposals/pending`
* `POST /api/h/v1/trading/proposals`
* `POST /api/h/v1/risk/trade-proposal`
* `GET /api/h/v1/ai/conversation/turns`
* `GET /api/h/v1/ai/conversation/messages`
* `GET /api/h/v1/ai/authorization-policy`
* `POST /api/h/v1/ai/conversation/messages`
* `GET /api/h/v1/ai/strategy/proposals/pending`
* `POST /api/h/v1/ai/strategy/proposals`

Copy `.env.example` when configuring local environments. Do not commit `.env`
or any OKX / OnchainOS credentials.

Admin routes require `H_WALLET_ADMIN_TOKEN` on the backend and
`Authorization: Bearer <token>` from the management backend only. Mobile
frontend code must not use admin tokens or mutate reward and side quest rules.

Persistence is behind repository boundaries. Without `DATABASE_URL`, the backend
uses in-memory storage for local UI work. With `DATABASE_URL`, it initializes the
PostgreSQL schema and persists users, Agent Wallet bindings, cards,
authorization grants, strategy runs, H Skill invocations, and admin audit logs.
See `docs/architecture/database-schema.md` and
`docs/database/001_initial_schema.sql` for the first schema.

Production operation planning lives in:

* `docs/operations/production-architecture.md`
* `docs/operations/ai-knowledge-system.md`
* `docs/operations/ci-cd.md`
* `docs/operations/production-readiness-checklist.md`

The first GitHub Actions templates cover repository checks, Expo EAS Update,
and server deploy. They require owner-provided GitHub secrets before real
preview or production deployment.

When the backend is configured with `H_AGENT_ONCHAINOS_AUTH_MODE=cli` and
`ONCHAINOS_CLI_PATH`, the Agent Wallet auth endpoints call:

* `onchainos wallet login <email> --locale zh-CN`
* `onchainos wallet verify <otp>`
* `onchainos wallet status`
* `onchainos wallet balance`

## Verify

```bash
npm run typecheck
npm run lint
```
