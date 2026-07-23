# StellarPay 🚀
> Decentralized Payroll & Salary Distribution Platform on Stellar & Soroban

**StellarPay** is a production-ready, mobile-responsive decentralized payroll platform designed for the Stellar Journey to Mastery Hackathon. It enables employers and HR administrators to seamlessly manage employees and execute bulk or direct salary distributions on the Stellar Testnet using XLM and Soroban smart contracts.

---

## 🌟 Key Features

- **Level 1 — Wallet & Direct Transfers**: Freighter Wallet integration, live XLM balance querying, employee roster management, and direct XLM salary transfers on Stellar Testnet.
- **Level 2 — Soroban Payroll Smart Contract**: On-chain payroll contract deployed to Testnet with role-based access control, roster state management, contract funding, automated multi-employee payroll execution, and event tracking.
- **Level 3 — Advanced dApp & Automation**: Recurring payroll cycle safety, custom token asset (SAC) payment support, real-time event log streaming, Rust integration tests, Vitest frontend tests, and GitHub Actions CI/CD pipeline.

---

## 🏗️ Project Architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Wallet**: Freighter Wallet (`@stellar/freighter-api`)
- **Stellar SDK**: `@stellar/stellar-sdk`
- **Smart Contract**: Rust + Soroban SDK (`soroban-sdk`)
- **Network**: Stellar Testnet

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+) & [Bun](https://bun.sh/)
- Rust & Cargo (1.97+)
- Stellar CLI (`stellar --version` 27.0.0+)
- [Freighter Wallet](https://www.freighter.app/) extension (configured to **Testnet**)

### 2. Frontend Setup
```bash
cd frontend
bun install
bun run dev
```

---

## 📚 Documentation

- [PLAN.md](PLAN.md) — Multi-level execution plan & milestones.
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture, data flow, and smart contract specs.
- [DEMO.md](DEMO.md) — Step-by-step hackathon presentation & live demo guide.
- [TESTING.md](TESTING.md) — Contract & frontend testing guide.
- [DEPLOYMENT.md](DEPLOYMENT.md) — Soroban smart contract build & Stellar Testnet deployment guide.

---

## 🛡️ Security & Operational Principles
- Non-custodial: All transactions signed client-side using Freighter wallet.
- Admin protection: Only authorized employer wallet addresses can manage roster & execute contract payroll.
- Testnet-Only: strictly configured for Stellar Testnet. Zero private keys or seeds stored.
