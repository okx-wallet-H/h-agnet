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
* Card Library recording for generated cards

Still locked:

* Real wallet transfer broadcast
* Real OKX Swap quote / swap data
* Contract call execution
* Swap execution
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
OKX_API_KEY=...
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
```

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

First trade authorization grants Agent execution for the current user. A
withdrawal or transfer address can be reused after authorization; changing the
address requires fresh authorization. OKX / OnchainOS confirming responses or
risk blocks must still be surfaced to the user.

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

Official OKX Swap endpoints to integrate later:

* Quote: `GET /api/v6/dex/aggregator/quote`
* Swap data: `GET /api/v6/dex/aggregator/swap`
* Transaction status: OKX DEX transaction-status endpoint for initiated swaps

These calls stay server-side behind H Wallet APIs.

## Manual Preflight For Later

When we are ready for real Agent Wallet CLI integration, check these manually on
the backend machine:

```bash
onchainos --version
onchainos wallet status
```

Do not run wallet send / contract-call / swap execution in product code until
the authorization-card flow, risk checks, and result-card recording are complete.
