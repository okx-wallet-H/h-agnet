# Production Readiness Checklist

This list separates what Codex can prepare in the repository from what the
project owner must provision outside the repository.

## Owner Tasks

### Server

* Buy or prepare a production server.
* Create a deploy user.
* Install Node.js, npm, git, and pm2.
* Clone the H Wallet repository on the server.
* Configure a production `.env` on the server, outside git.
* Configure a domain and HTTPS reverse proxy.

### Database

* Provision PostgreSQL.
* Create production and preview databases.
* Store `DATABASE_URL` as a server-side secret.
* Decide backup policy and retention window.

### Expo / EAS

* Create or connect the Expo project.
* Run `npx eas-cli@latest update:configure`.
* Confirm `app.json` contains `expo.updates.url` and
  `expo.extra.eas.projectId` after configuration.
* Add `EXPO_TOKEN` to GitHub repository secrets.
* Decide preview and production EAS branches.
* Later, prepare Apple Developer and Google Play accounts for store builds.

### GitHub Secrets

Required for server deploy:

```txt
H_WALLET_SERVER_HOST
H_WALLET_SERVER_USER
H_WALLET_SERVER_SSH_KEY
H_WALLET_SERVER_APP_DIR
```

Optional:

```txt
H_WALLET_SERVER_PORT
H_WALLET_SERVER_BRANCH
```

Required for mobile update:

```txt
EXPO_TOKEN
```

Required for production backend:

```txt
DATABASE_URL
H_WALLET_ADMIN_TOKEN
H_WALLET_EXECUTION_TOKEN
OKX_PROJECT_ID
OKX_API_KEY
OKX_SECRET_KEY
OKX_PASSPHRASE
H_AGENT_AI_API_KEY
```

### AI Provider

* Choose the production AI provider and model.
* Provide server-side AI API key.
* Choose the vector index store for AI knowledge retrieval.
* Define the embedding model, chunking rules, metadata schema, and reindex job.
* Confirm PostgreSQL remains the source of truth for cards, grants, Runner
  state, balances, rewards, and execution status.

### OKX / OnchainOS

* Confirm production OKX / OnchainOS project credentials.
* Confirm whether the OKX Builder Code should be attached to production calls.
* Confirm Agent Wallet OTP flow on the server machine.
* Confirm which OKX OnchainOS skills are available to production credentials.
* Keep `H_WALLET_EXECUTION_TOKEN` server-side only. It protects internal H Skill
  invocation and execution-handoff routes; never put it in Expo or mobile
  storage.

## Codex Tasks

### Repository

* Keep Expo SDK compatibility stable.
* Keep API contracts under `/api/h/v1`.
* Keep frontend free of secrets.
* Keep OKX Onchain and OKX CEX separated.
* Maintain CI, EAS update, and server deploy workflows.

### Backend

* Move repositories from memory to PostgreSQL when the database is ready.
* Add migrations and migration command.
* Add health checks for API, database, OKX adapters, and AI provider.
* Add structured logs and audit records.
* Add real adapter tests before enabling execution.

### AI

* Add a model gateway service.
* Add H Wallet prompt layers.
* Add knowledge ingestion.
* Add AI evaluation tests for Chinese commands.
* Add hallucination and blocked-execution regression tests.

### Product

* Keep chat as the primary surface.
* Keep cards simple and high quality.
* Keep complex operation details behind collapsible process summaries.
* Store verified result cards in the Card Library.
* Use Card Library data for membership, side quests, and portfolio advice.
