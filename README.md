# StellarPay

> Decentralized Payroll & Salary Distribution Platform on Stellar & Soroban

**StellarPay** is a mobile-responsive decentralized payroll platform for the Stellar Journey to Mastery Hackathon. Employers manage employees and execute direct or bulk salary distributions on **Stellar Testnet** using XLM and a Soroban payroll contract.

---

## Key Features

- **Level 1 — Wallet & Direct Transfers**: Freighter integration, live XLM balance, local roster, direct XLM salary transfers.
- **Level 2 — Soroban Payroll Smart Contract**: On-chain roster, admin RBAC, pinned token, pause/withdraw, cycle-safe bulk payroll, events.
- **Level 3 — Automation & CI**: Dry-run scheduler, Rust + Vitest tests, GitHub Actions CI.

---

## Project Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Wallet**: Freighter (`@stellar/freighter-api`)
- **Stellar SDK**: `@stellar/stellar-sdk`
- **Smart Contract**: Rust + Soroban SDK 27
- **Network**: Stellar Testnet only

See [ARCHITECTURE.md](ARCHITECTURE.md) for storage layout, API, and pause policy.

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js (v18+) & [Bun](https://bun.sh/)
- Rust & Cargo
- Stellar CLI (`stellar --version` 27+)
- [Freighter](https://www.freighter.app/) on **Testnet**

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_SOROBAN_CONTRACT_ID after deploy
bun install
bun run dev
```

### 3. Contract tests

```bash
cd contracts/payroll
cargo test
```

---

## Documentation

- [PLAN.md](PLAN.md) — Multi-level execution plan
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture & contract specs
- [DEMO.md](DEMO.md) — Live demo guide
- [TESTING.md](TESTING.md) — Contract & frontend testing
- [DEPLOYMENT.md](DEPLOYMENT.md) — Build, deploy, initialize with token

---

## Security & Operational Principles

- **Non-custodial UI**: Freighter signs client-side; no private keys in the web app.
- **Admin protection**: Contract methods require admin `require_auth()`.
- **Pinned token**: Payroll and withdraw use the token set at `initialize`.
- **Fund recovery**: Admin `withdraw` recovers excess contract balance.
- **Emergency pause**: Blocks pay/add/update/withdraw/next_cycle; recovery ops still allowed.
- **Cycle safety**: `next_cycle` blocked while unpaid active employees remain.
- **Storage TTL**: Instance and employee entries extended on mutations.
- **Client guards**: Valid `C...` contract IDs, fail-closed Testnet assert on sign, decimal-string XLM amounts.
- **Scheduler**: Dry-run by default; execute only with `PAYROLL_EXECUTE=1` + secret (testnet only; never commit keys).
- **Testnet-only**: Configured for Stellar Testnet.
