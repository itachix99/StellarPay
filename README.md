# StellarPay

> Decentralized Payroll & Salary Distribution Platform on Stellar & Soroban

**StellarPay** is a mobile-responsive decentralized payroll platform for the Stellar Journey to Mastery Hackathon. Employers manage employees and execute direct or bulk salary distributions on **Stellar Testnet** using XLM and a Soroban payroll contract.

---

## Level 1 — Wallet, Contracts, Transactions & Multi-Wallet

### 1. Wallet Setup

| Requirement | Implementation |
|---|---|
| Freighter wallet | `@stellar/freighter-api` v6.0.1 with `@creit-tech/stellar-wallets-kit` for multi-wallet support |
| Stellar Testnet | Hardcoded via `Networks.TESTNET` — Horizon (`horizon-testnet.stellar.org`) and Soroban RPC (`soroban-testnet.stellar.org`) |
| Network guard | `assertTestnet()` runs before every signing/submission to enforce Testnet-only operation |

**Key files:** `src/config.ts`, `src/lib/wallet.ts`

### 2. Wallet Connection

| Requirement | Implementation |
|---|---|
| Connect | `connect()` opens the StellarWalletsKit auth modal — supports Freighter, Albedo, xBull, Lobstr, Hana, Rabet, HOT Wallet, Klever |
| Disconnect | `disconnect()` clears localStorage and resets all wallet state |
| Auto-reconnect | On app load, reads `stellarpay.active_wallet` from localStorage, verifies network, and restores session |
| State management | `useWallet` hook exposes `address`, `balance`, `network`, `connecting`, `error` |

**Key files:** `src/hooks/useWallet.ts`, `src/lib/wallet.ts`, `src/components/ui.tsx` (WalletBar)

### 3. Balance Handling

| Requirement | Implementation |
|---|---|
| Fetch XLM balance | `getXlmBalance(address)` calls `server.loadAccount(address)` and finds `asset_type === "native"` |
| Display | Shown in the header `WalletBar` and the Employer Wallet Balance card with a loading spinner |
| Auto-refresh | Balance updates after connect, payment sent, and Friendbot funding |

**Key files:** `src/lib/stellar.ts` (`getXlmBalance`), `src/hooks/useWallet.ts` (`refreshBalance`)

### 4. Transaction Flow

| Requirement | Implementation |
|---|---|
| Send XLM | `sendXlm()` builds a `TransactionBuilder` with `Operation.payment()`, signs via Freighter, submits via Horizon |
| Duplicate guard | `pendingTxns` Set prevents concurrent transactions from the same address |
| Pre-flight check | Verifies sender has sufficient XLM (amount + 1 XLM reserve) before submitting |
| Success feedback | Toast notification with the amount, recipient name, and a clickable Stellar Expert link |
| Failure feedback | Toast notification with the error message and descriptive failure reason |
| Transaction hash | Returned from `submitTransaction()` and embedded in the explorer link |

**Key files:** `src/lib/stellar.ts` (`sendXlm`), `src/App.tsx` (`handlePay`)

### 5. Development Standards

| Requirement | Implementation |
|---|---|
| UI setup | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| Wallet integration | Multi-wallet kit wrapping Freighter + 7 other wallets with theme sync |
| Balance fetch | Horizon SDK `loadAccount` with 404 handling for unfunded accounts |
| Transaction logic | Full pipeline — validation, network guard, balance check, build, sign, submit |
| Error handling | Custom error classes (`WalletError`, `StellarError`, `SorobanError`), try/catch on every async path, toast notifications for all user-facing errors |
| Testing | Vitest unit tests covering wallet, Stellar SDK, and Soroban integration |
| Linting | oxlint with React hooks rules |
| CI | GitHub Actions pipeline — Rust contract build/test, frontend lint/test/build |

**Key files:** `src/lib/stellar.ts`, `src/lib/wallet.ts`, `src/lib/soroban.ts`, `src/__tests__/`

---

## Project Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Wallet**: Freighter (`@stellar/freighter-api`) via `@creit-tech/stellar-wallets-kit`
- **Stellar SDK**: `@stellar/stellar-sdk` v16
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
