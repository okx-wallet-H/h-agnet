# CI/CD Operations

H Wallet needs two deployment lanes:

* repository to Expo / EAS for the mobile app.
* repository to server for H API, Agent runner, and backend services.

The first workflow files are intentionally conservative. They check code on
normal pushes and only deploy through explicit release branches or manual
dispatch until production secrets and environments are ready.

## Workflows

### Mobile CI

File:

```txt
.github/workflows/mobile-ci.yml
```

Runs:

```bash
npm ci
npm run typecheck
npm run lint
```

Triggers:

* pull requests.
* pushes to `main`.
* pushes to `codex-h-agent-framework`.

### Expo EAS Update

File:

```txt
.github/workflows/eas-update.yml
```

Purpose:

* publish JS and asset updates to EAS Update.
* preview branch for internal testing.
* production branch only when manually selected.

Triggers:

* manual `workflow_dispatch`.
* pushes to `release/mobile-preview`.

Required GitHub secret:

```txt
EXPO_TOKEN
```

Required Expo app config before real use:

```txt
expo.updates.url
expo.extra.eas.projectId
```

`expo.runtimeVersion` is already initialized with the `appVersion` policy.
Generate the project id and update URL with Expo's official EAS setup flow when
the Expo project is ready:

```bash
npx eas-cli@latest update:configure
```

Do not add fake project ids to `app.json`.

### Server Deploy

File:

```txt
.github/workflows/server-deploy.yml
```

Purpose:

* deploy the backend from GitHub to the production server.
* run typecheck and lint before deployment.
* update the server checkout and restart `h-wallet-api` through pm2.

Triggers:

* manual `workflow_dispatch`.
* pushes to `release/server-production`.

Required GitHub secrets:

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

The server must already have:

* Node.js compatible with the project.
* npm.
* git.
* pm2.
* a cloned H Wallet repository at `H_WALLET_SERVER_APP_DIR`.
* server-only `.env` configured outside git.

## Branch Policy

Recommended:

* `codex-h-agent-framework`: active rebuild work.
* `main`: stable project state.
* `release/mobile-preview`: pushes publish preview EAS updates.
* `release/server-production`: pushes deploy the server.

Production release should be a deliberate promotion, not every development
commit.

## Secret Ownership

User-owned setup:

* Expo account and `EXPO_TOKEN`.
* EAS project id and update URL.
* server SSH key and host.
* production database URL.
* OKX / OnchainOS production credentials.
* AI provider keys.

Codex-owned setup:

* workflow files.
* backend contract boundaries.
* docs and checklists.
* repository scripts that do not expose secrets.
