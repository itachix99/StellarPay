# StellarPay Execution Plan & Roadmap

This document details the step-by-step development strategy for building **StellarPay** for the Stellar Journey to Mastery Hackathon.

---

## 🎯 Project Overview
StellarPay is a decentralized payroll distribution dApp built on Stellar Testnet, combining direct wallet payments with a Soroban smart contract for bulk payroll execution, access control, and auditing.

---

## 📋 Phase 0: Discovery & Setup (COMPLETED)
- [x] Phase 0 Discovery questions answered (Vite + React + TS, Bun, Tailwind CSS, Root `contracts/`, Hybrid automation, Testnet Git setup).
- [x] Repository initialized (`git init -b main`).
- [x] Root `.gitignore` configured.
- [x] Scaffolding initial documentation (`README.md`, `PLAN.md`, `ARCHITECTURE.md`, `DEMO.md`, `TESTING.md`, `DEPLOYMENT.md`).

---

## 🟢 Level 1: Core Wallet & Direct Payments (COMPLETED)

### Objectives
1. **Wallet Integration**: Connect & disconnect Freighter wallet, check network (Stellar Testnet).
2. **Balance Fetching**: Query and display connected wallet XLM balance via Horizon API.
3. **Local Employee Roster**: Local store for employee public keys, names, and assigned XLM salaries.
4. **Direct Salary Distribution**: Construct and submit Horizon XLM payment transactions from employer wallet to employee addresses.
5. **Transaction Feedback**: Clear success/error toasts, status banners, transaction hash display, and link to Stellar Expert Testnet explorer.
6. **Mobile Responsive UI**: Clean card-based responsive layout with loading spinners and full error handling.

### Level 1 Acceptance Criteria
- [x] Connect & disconnect Freighter wallet cleanly.
- [x] Display employer account address and XLM balance.
- [x] Add/remove employees in local manager UI.
- [x] Send XLM salary directly to any employee.
- [x] Robust error handling (rejected tx, wrong network, missing address, insufficient balance).
- [x] Verified via runtime test checklist & committed to Git as `level-1-complete`.

---

## 🟡 Level 2: Soroban Smart Contract & Admin Dashboard

### Objectives
1. **Soroban Contract Development**:
   - Write Soroban smart contract in Rust inside `contracts/payroll/`.
   - Data Structures: `Admin`, `Employee`, `Salary`, `PayrollState`.
   - Functions: `initialize`, `add_employee`, `remove_employee`, `update_employee_salary`, `fund_contract`, `pay_salaries`.
   - Access Control: Admin authentication via `require_auth()`.
   - Event Emission: Emitting `EmployeeAdded`, `EmployeeRemoved`, `SalaryPaid`, `PayrollFunded`.
2. **Contract Testing & Deployment**:
   - Write Rust unit tests for all contract functions & error conditions.
   - Compile WASM binary & deploy contract to Stellar Testnet using `stellar contract deploy`.
   - Bind contract ID in frontend environment configuration.
3. **Frontend Integration**:
   - Invoke contract read and write calls using `@stellar/stellar-sdk` Soroban RPC client.
   - Admin dashboard view showing contract-managed employee roster and contract pool balance.
   - Bulk payroll execution trigger with step-by-step progress feedback.

### Level 2 Acceptance Criteria
- [ ] Contract deployed to Stellar Testnet.
- [ ] Frontend reads and displays contract state.
- [ ] Only admin wallet can execute roster changes or trigger contract payroll.
- [ ] `pay_salaries` distributes funds automatically from contract pool.
- [ ] Verified via runtime checklist & committed to Git as `level-2-complete`.

---

## 🔴 Level 3: Advanced Automation, Token Support, CI/CD & Testing

### Objectives
1. **Recurring Payroll & Safety**:
   - Payroll cycle tracking (`cycle_id`, `last_paid_timestamp`).
   - Duplicate payout prevention per cycle.
   - Roster state safety during mid-cycle additions/removals.
2. **Asset / Token Support**:
   - Inter-contract communication with Stellar Asset Contract (SAC) or custom tokens.
   - Allow payroll payout in custom tokens in addition to XLM.
3. **Event Streaming & Real-time Log**:
   - Poll Soroban events to display live transaction feed in frontend.
4. **Automated Worker**:
   - Background automated scheduler script for recurring payroll execution.
5. **Testing & CI/CD**:
   - End-to-end Rust contract test suite.
   - Vitest component and wallet state tests.
   - GitHub Actions workflow (`.github/workflows/ci.yml`) for linting, testing, and building contract & frontend.
6. **Documentation & Polish**:
   - Full deployment guide, demo script, and final UI polish.

---

## 🏷️ Commit Tag Strategy
- `level-1-complete`: Level 1 direct XLM wallet payments verified.
- `level-2-complete`: Level 2 Soroban smart contract integration verified.
- `level-3-complete`: Full dApp with CI/CD, tests, and token support verified.
