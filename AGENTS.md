# AGENTS.md

## Project Identity

H-Agent is a next-generation AI Agent Wallet and Web3 trading terminal.

H-Agent is also an AI conversational Web3 community app. Users interact
primarily through AI chat: registration, recharge, withdrawal, strategy
requests, trading instructions, confirmations, and success reports should be
expressed as high-quality conversational cards.

This is NOT a demo project.

The goal is to build a professional-grade:

* AI Agent Wallet
* OKX ecosystem client
* OnchainOS-enabled trading platform
* Mobile-first Web3 terminal
* AI conversational Web3 community
* Card-library-driven user data and growth system

Target quality:

* Production-grade architecture
* High-end UI/UX
* Scalable modular system
* Long-term maintainability

---

# Core Rules

## DO NOT

* Do not generate random architecture
* Do not create unnecessary files
* Do not over-engineer
* Do not rewrite the whole project at once
* Do not destroy Expo compatibility
* Do not change package.json without explanation
* Do not hardcode API keys
* Do not put business logic directly inside screens
* Do not create ugly template-like UI
* Do not use low-quality Web2 dashboard style
* Do not create inconsistent component styles
* Do not generate fake/mock blockchain integrations pretending to be real

---

# Tech Stack

Preferred stack:

* Expo
* React Native
* TypeScript
* Expo Router
* NativeWind
* Zustand
* React Query
* Reanimated
* MMKV

Do not replace the stack unless necessary.

---

# Product Direction

H-Agent focuses on:

* OKX Wallet integration
* OKX ecosystem
* OnchainOS integration
* Onchain earning Agent execution
* Preset strategy execution
* Web3 earning workflows
* AI-powered portfolio interactions
* Boost/reward systems
* Multi-chain asset management
* AI conversation as the primary command surface
* Community earn/reward workflows
* Recharge and withdrawal flows
* Card Library as the source of truth for user activity, portfolio insight,
  membership scoring, side quests, and growth recommendations

Core product loop:

User registers with email
↓
OKX Agent Wallet is created or restored
↓
User starts the earning Agent
↓
Agent selects an approved preset strategy
↓
OKX OnchainOS Skill Orchestration
↓
Risk / authorization policy
↓
Execution progress card / result card
↓
Card Library
↓
Portfolio Advice / Membership / Side Quests / Scoring

AI Chat remains the primary command surface, but the main product value is not
manual trading. The core value is: create an Agent Wallet, start the Agent, let
it execute pre-approved onchain earning strategies, and explain each important
step through simple Chinese cards.

Strategy and skill rules:

* Strategies are dynamic product assets, not frontend constants.
* Strategies may be updated, versioned, enabled, disabled, or replaced from the
  backend / management system.
* Agent execution must call H Wallet's own sealed skill wrappers, not raw
  provider logic from screens.
* A strategy declares which wrapped skills it needs; the Agent runner resolves
  and executes those wrappers.
* New OKX OnchainOS skills or future providers should be added by registering a
  wrapper, not by rewriting product screens.
* Every strategy version must preserve risk gates, authorization scope, card
  templates, and execution auditability.

## OKX Domain Boundary

H Wallet must keep OKX CEX and OKX Onchain domains separate.

Onchain domain:

* OKX Wallet
* OKX Agent Wallet
* OnchainOS skills
* DEX Swap / Bridge / Token / Security / Wallet portfolio
* Current H Wallet product surface

CEX domain:

* OKX exchange account
* Exchange balances
* Spot / contract orders
* Exchange bots
* Earn products
* Future separate product module only

Do not mix CEX account balances, exchange orders, exchange bots, or Earn data
into Agent Wallet, onchain wallet balance, OKX Swap, Card Library execution
proof, or OnchainOS authorization flows.

If CEX is added later, it must use a separate module boundary, API namespace
slice, credential model, authorization policy, card types, and user-facing copy.

---

# Architecture Rules

Use clean modular architecture.

Recommended structure:

src/
app/
screens/
components/
features/
services/
wallet/
ai/
trading/
risk/
boost/
design-system/
hooks/
store/
lib/
constants/
types/

---

# UI/UX Rules

UI quality is CRITICAL.

Design direction:

* Black / Gold / Purple
* Futuristic
* High-end Web3 terminal
* Premium financial interface
* Minimal but powerful
* Mobile-first
* Smooth animations
* Strong hierarchy
* Professional typography

Avoid:

* Generic admin templates
* Flat boring layouts
* Cheap gradients
* Random colors
* Inconsistent spacing

---

# Development Workflow

For every task:

1. Analyze first
2. Plan first
3. Explain changes
4. Modify only necessary files
5. Keep diffs small
6. Preserve architecture consistency

After coding:

* Explain modified files
* Explain why changes were made
* Explain how to run
* Explain how to verify

---

# OKX Integration Rules

IMPORTANT:

* Never hardcode API keys
* Never store secrets in frontend
* Use adapter/service layers
* Separate UI from blockchain logic
* Separate wallet logic from screens

Architecture:

UI Layer
↓
Feature Layer
↓
Service Layer
↓
OKX Adapter Layer
↓
OnchainOS / Wallet / APIs

---

# AI Agent Rules

AI features should be modular.

Modules:

* Intent parsing
* Strategy planning
* Risk evaluation
* Trade proposal generation
* Execution confirmation
* Transaction history
* Card generation
* Card Library indexing
* User scoring signals

Onchain trades follow the Agent Wallet authorization policy. The first trade
authorization can grant Agent execution within its policy scope. A withdrawal
or transfer address must be authorized before autonomous reuse, and a changed
address requires fresh user authorization.

CEX trading is not part of the current H Wallet Agent Wallet flow. If added
later, it must use its own exchange authorization model and must not reuse
Onchain Agent Wallet permissions.

Never auto-execute outside an active authorization scope, and never bypass OKX /
OnchainOS safety prompts or risk blocks.

Conversation cards are product primitives. Confirmation cards must be shown
before risky actions. Success cards must be stored in the Card Library after
verified completion. Do not fake card data as if it came from OKX, OnchainOS,
or a live wallet.

---

# Code Quality

Requirements:

* Strong typing
* Reusable components
* Minimal duplication
* Clean naming
* Predictable folder structure
* Scalable services
* Maintainable code

---

# Current Priority

Current phase:

* Architecture planning
* Design system
* Navigation system
* UI foundation
* Core screens
* Wallet flow planning
* OKX integration planning

NOT:

* Full backend
* Real trading execution
* Production API deployment

---

# Important

This project is being rebuilt from scratch.

Prioritize:

* Architecture quality
* UI quality
* Maintainability
* Scalability

Do not rush into generating massive codebases.
