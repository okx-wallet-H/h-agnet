# OKX Onchain / OnchainOS Integration Prep

H Wallet integrates OKX Onchain, OKX Wallet, Agent Wallet, and OnchainOS
through the backend only.

This document is Onchain-only. It does not cover OKX CEX exchange account
integration, exchange orders, exchange balances, bots, or Earn products.

## API Namespace

All frontend-visible contracts use:

```txt
/api/h/v1
```

Current integration status endpoint:

```txt
GET /api/h/v1/integrations/okx/status
```

## Current Scope

Ready now:

* Agent Wallet status contract
* Agent Wallet email OTP request route
* Agent Wallet OTP verify route
* Wallet transfer / withdraw authorization card draft route
* Conversation card recording for generated cards
* OKX DEX quote adapter boundary
* OKX DEX swap-data adapter boundary
* OKX DEX Hot Token market-trend adapter boundary
* OKX DEX Signal List read-only adapter boundary
* OKX DEX Token Search / Advanced Info read-only profile boundary
* OKX Security Token Scan risk-gate adapter boundary
* OKX Transaction API simulation adapter boundary
* OKX DEX transaction status tracking boundary

Still locked:

* Real wallet transfer broadcast
* Contract call execution
* Swap signing and broadcast
* Reward claim execution

Out of scope for this document:

* OKX exchange account balances
* CEX spot / contract order placement
* CEX trading bots
* CEX Earn products
* CEX portfolio and account configuration

## Server-Only Environment

For Agent Wallet email OTP login through OnchainOS CLI:

```bash
H_AGENT_ONCHAINOS_AUTH_MODE=cli
ONCHAINOS_CLI_PATH=/absolute/path/to/onchainos
```

For OKX Swap / OnchainOS Open API calls, backend-only credentials are required:

```bash
OKX_PROJECT_ID=...
OKX_API_KEY=...
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
```

Optional:

```bash
OKX_ONCHAINOS_BASE_URL=https://web3.okx.com
OKX_BUILDER_CODE=...
```

`OKX_BUILDER_CODE` is an X Layer attribution marker for the H Wallet project.
It is not an API key, not a wallet authorization, and not a replacement for
`OKX_PROJECT_ID`.

Do not expose OKX keys, OnchainOS credentials, CLI paths, session tokens, or
execution credentials through `EXPO_PUBLIC_*`.

## User Flow

```txt
email input
→ POST /api/h/v1/auth/agent-wallet/request-otp
→ OKX verification code
→ POST /api/h/v1/auth/agent-wallet/verify
→ Agent Wallet session
→ H Wallet AI conversation
```

This flow is passwordless. H Wallet must not ask for or store a user password
for Agent Wallet access.

## Execution Rule

Any action that can change assets must follow:

```txt
AI conversation
→ authorization card
→ H Wallet backend OKX Swap adapter
→ OKX Swap quote
→ OKX Swap data
→ H Wallet risk checks
→ user authorization policy
→ wallet / OnchainOS execution path
→ OKX transaction status
→ verified result card
→ card library
```

First trade authorization grants Agent execution for the current user, but only
after the H Wallet session resolves to a connected OKX Agent Wallet binding.
OTP-requested users cannot grant asset autonomy yet. A withdrawal or transfer
address can be reused after authorization; changing the address requires fresh
authorization. OKX / OnchainOS confirming responses or risk blocks must still
be surfaced to the user.

Agent Wallet session reads are resolved from the current H Wallet session's
stored wallet binding. Public app routes must not expose or bind the backend
process' global OnchainOS CLI wallet session.

No screen should directly call OKX, OnchainOS, wallet CLI commands, or provider
SDKs.

Do not use CEX skills or exchange APIs for this flow. Agent Wallet login, DEX
Swap, bridge, token security, onchain gateway, and wallet portfolio belong to
the Onchain domain. CEX can be added later only as a separate backend module
with separate authorization and card semantics.

H Wallet does not rebuild quote routing or swap execution. OKX Swap owns route
aggregation, quote output, swap data generation, and transaction-status lookup;
H Wallet owns AI UX, authorization policy, card records, and backend adapter
security.

Official OKX Onchain endpoints:

* Quote: `GET /api/v6/dex/aggregator/quote`
* Swap data: `GET /api/v6/dex/aggregator/swap`
* Transaction status: `GET /api/v6/dex/aggregator/history`
* DEX market trends: `GET /api/v6/dex/market/token/hot-token`
* DEX buy signals: `POST /api/v6/dex/market/signal/list`
* Token search: `GET /api/v6/dex/market/token/search`
* Token advanced info: `GET /api/v6/dex/market/token/advanced-info`
* Token security scan: `POST /api/v6/security/token-scan`

These calls stay server-side behind H Wallet APIs.

Current adapter rule:

```txt
H.skill.swap.quote
→ server-only OKX signed request
→ OKX DEX quote response
→ H Wallet normalized invocation result

H.skill.swap.execute
→ authorization policy check
→ server-only OKX signed request
→ OKX DEX swap transaction data
→ H Wallet normalized invocation result
→ still unsigned and unbroadcast

H.skill.market.readDexTrends
→ server-only OKX signed request
→ OKX Hot Token response
→ H Wallet normalized market trend rows
→ read-only strategy input

H.skill.signal.readOnchainSignals
→ server-only OKX signed request
→ OKX Signal List response
→ H Wallet normalized signal rows
→ read-only strategy input

H.skill.token.analyzeRisk
→ server-only OKX signed request
→ OKX Token Search / Advanced Info response
→ H Wallet normalized token profile
→ read-only strategy input, not a final security verdict

H.skill.risk.scanTransaction
→ token-scan input: chain + contract token address
→ server-only OKX signed request
→ OKX Security riskLevel
→ H Wallet normalized risk gate action
```

Quote failures, missing token contract addresses, or provider errors return a
blocked fail-safe result. H Wallet must not invent prices, routes, tx calldata,
or transaction status.

Swap-data generation requires a wallet address, explicit slippage, and an active
authorization scope. It returns OKX router transaction data only; H Wallet must
not mark it as executed until signature, broadcast, status tracking, and a
verified result card are complete.

Transaction simulation uses OKX Transaction API as a preflight gate. The OKX
documentation notes simulation/broadcast availability can depend on allowlist
access. Any failed simulation remains blocked and cannot be treated as safe.

Transaction status tracking uses `chainIndex + txHash` and returns provider
status such as `pending`, `success`, or `fail`. A missing or failed status query
must remain blocked; H Wallet must not infer success from local state.

The first OKX Security adapter is token-scan only. It can block, warn, require
confirmation, or allow based on OKX's returned `riskLevel`. Transaction calldata
security scanning must use a later tx-scan adapter and remains blocked until
that method is connected.

## Manual Preflight For Later

When we are ready for real Agent Wallet CLI integration, check these manually on
the backend machine:

```bash
onchainos --version
onchainos wallet status
```

Do not run wallet send / contract-call / swap execution in product code until
the authorization-card flow, risk checks, and result-card recording are complete.
