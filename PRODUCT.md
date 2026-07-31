# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are Web3 HR managers, startup founders, and DAO contributors who distribute recurring salaries and direct payments on the Stellar network and need non-custodial, verifiable payout tooling.

Secondary audience (confirmed): developers and students evaluating the architecture. The app is a working Testnet demonstration of a non-custodial Stellar & Soroban payroll stack, so the implementation doubles as reference material for how a wallet-signed XLM/Soroban payroll flow is built.

## Product Purpose

StellarPay is a non-custodial, decentralized payroll and salary distribution platform on Stellar Testnet. Administrators manage employee rosters, send instant direct XLM transfers, and trigger automated bulk smart-contract payouts powered by Soroban. There is no subscription or prepaid balance: the connected wallet approves the exact payout before Stellar settles, and every transaction is verifiable on-chain with an explorer receipt. Success means payroll runs end-to-end — from roster to signed transaction to on-chain confirmation — without the app ever holding funds or keys.

## Positioning

Non-custodial, instant, transparent bulk salary payouts on Stellar & Soroban with zero administrative overhead. The mechanism a neighboring product could not truthfully copy: client-side wallet signing combined with an on-chain Soroban payroll contract that enforces admin RBAC, a pinned native SAC (XLM) token, emergency pause/withdraw, and cycle-safe bulk payroll execution — all on Testnet with a live deployed contract.

## Operating Context

- Browser-based console, mobile-responsive, light/dark themes, sidebar navigation with an Overview dashboard.
- Non-custodial signing: transactions are built client-side and signed inside the connected wallet. Freighter is the primary signing path; Albedo, xBull, LOBSTR, HOT, Hana, Rabet, and Klever are selectable via Stellar Wallets Kit.
- A local employee roster is persisted in browser localStorage, separate from the on-chain Soroban roster; the UI labels each clearly.
- Testnet only (Horizon + Soroban RPC); Friendbot funds new accounts; the client fail-closes on any network other than Testnet.
- Live contract-event streaming via Soroban RPC polling; every action emits a toast and a Stellar Expert link as its receipt.
- First-run onboarding overlay plus a persistent About trigger; wallet session auto-reconnects across reloads.

## Capabilities and Constraints

- Direct XLM transfers to any G… address on Testnet, with an employee prefill picker and a pre-signing review modal (recipient, network, source, balances).
- Soroban payroll contract: on-chain roster with admin access control, pinned native SAC (XLM) token, pause/withdraw, cycle-safe `pay_salaries`/`next_cycle`, 10 contract event types, max 50 employees. Functions and error codes are tabulated in README.md.
- Local roster: add/remove employees with salary and active flags, roster statistics, and per-employee "Pay Salary" actions that prefill the Direct XLM form.
- Stack: React 19 + TypeScript, Vite + Tailwind CSS 4, `@stellar/stellar-sdk` 16, `@creit-tech/stellar-wallets-kit`, and a Rust + Soroban SDK 27 contract (v0.1.0).
- Constraint: Stellar Testnet only — never mainnet. The deployed contract is injected as `VITE_SOROBAN_CONTRACT_ID`.
- Custom error classes (roster, wallet, contract) with localized, honest messages; localStorage data is sanitized on load.

## Brand Commitments

- Product name: StellarPay.
- Binding identity (confirmed): "Machine Payments Protocol" (MPP). The acronym appears across the hero, Overview section, and onboarding copy (e.g. "MPP / Stellar testnet"), and is used as the protocol framing for the product.
- Voice/personality: Trustworthy, Efficient, Modern — financial stability, high precision, operational clarity.
- Logo assets: `frontend/src/assets/logo_lightmode.svg` and `frontend/src/assets/logo_darkmode.svg`.
- Identity constraint: the visual direction rejects cluttered SaaS templates, low-contrast gray-on-gray text, cheesy 3D crypto illustrations, and glassmorphism overload (recorded in DESIGN.md).

## Evidence on Hand

- README.md — feature list, contract tables, and a product walkthrough with screenshots (`frontend/src/assets/wallet_connect.png`, `wallet_connected.png`, `payment.png`, `payment_done.png`, `hero.png`).
- ARCHITECTURE.md — system overview, data models, and contract storage layout.
- TESTING.md — test strategy and commands.
- DESIGN.md — the committed visual design system (palette, typography, elevation, components).
- Live Testnet deployment: payroll contract ID `CASTP46VFFVDQ77FUIDTTTXBBGYIX4YZTANUIVYGGVDXC67UL7VEVLTV`, native SAC (XLM) token `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`.
- 87 frontend tests (Vitest) plus Rust contract tests; CI via GitHub Actions.
- Absence: no real customer testimonials, no production/mainnet deployment, no pricing or licensing. Future work must not fabricate these.

## Product Principles

- **Clarity over clutter.** Clean data hierarchy, bold typography, and unambiguous status feedback over decorative flair.
- **Instant, verifiable feedback.** Every transaction, contract invocation, and wallet action emits immediate feedback — a toast plus an on-chain explorer receipt. Nothing settles silently.
- **Financial-grade security & transparency.** Exact stroop calculations, full addresses, and Stellar Expert links are shown; the client fail-closes on non-Testnet networks; keys never leave the wallet.
- **Responsive operational ease.** Payroll can be approved from any screen size, from phone to desktop.
- **Demo fidelity.** The app is a working Testnet demonstration; recorded capabilities must match what the running console actually does.

## Accessibility & Inclusion

Aspirational target (confirmed, not an audited certification): WCAG AA conformance, text contrast ≥ 4.5:1, keyboard focus indicators, and `@media (prefers-reduced-motion: reduce)` alternatives. The UI implements these, but the claim is a target the interface follows, not a verified compliance statement.
