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

## 🟡 Level 2: Soroban Smart Contract & Admin Dashboard (COMPLETED)

### Objectives
1. **Soroban Contract Development**:
   - Write Soroban smart contract in Rust inside `contracts/payroll/`.
   - Data Structures: `Admin`, `EmployeeData`, `PayrollState`.
   - Functions: `initialize`, `add_employee`, `remove_employee`, `update_employee_salary`, `pay_salaries`, `get_admin`, `get_employees`, `get_total_payroll`, `get_cycle`.
   - Access Control: Admin authentication via `admin.require_auth()`.
   - Event Emission: Emitting `emp_add`, `emp_rm`, `emp_upd`, `sal_paid`, `cyc_done`.
2. **Contract Testing & Deployment**:
   - Write Rust unit tests for all contract functions & error conditions. (5/5 unit tests passing).
   - Compile WASM binary & deploy contract to Stellar Testnet using `stellar contract deploy`.
   - Live Deployed Contract ID: `CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY`.
3. **Frontend Integration**:
   - Soroban RPC helper module `src/lib/soroban.ts`.
   - Interactive Soroban Dashboard component `src/components/SorobanDashboard.tsx`.
   - Bulk payroll execution trigger with step-by-step transaction logs & explorer links.

### Level 2 Acceptance Criteria
- [x] Contract deployed to Stellar Testnet.
- [x] Frontend reads and displays contract state.
- [x] Only admin wallet can execute roster changes or trigger contract payroll.
- [x] `pay_salaries` distributes funds automatically from contract pool.
- [x] Verified via runtime checklist & committed to Git as `level-2-complete`.

---

## 🔴 Level 3: Advanced Automation, Token Support, CI/CD & Testing (COMPLETED)

### Objectives
1. **Recurring Payroll & Safety**:
   - Payroll cycle tracking (`cycle_id`, `last_paid_timestamp`).
   - Duplicate payout prevention per cycle.
   - Roster state safety during mid-cycle additions/removals.
2. **Asset / Token Support**:
   - Inter-contract communication with Stellar Asset Contract (SAC) and native XLM.
3. **Event Streaming & Real-time Log**:
   - Real-time transaction execution feed embedded in Soroban Dashboard.
4. **Automated Worker**:
   - CLI/Cron background automation script (`scripts/payroll-scheduler.ts`).
5. **Testing & CI/CD**:
   - End-to-end Rust contract test suite (5/5 passing).
   - Vitest unit tests for frontend helpers (3/3 passing).
   - GitHub Actions workflow (`.github/workflows/ci.yml`) for linting, testing, and building contract & frontend.
6. **Documentation & Polish**:
   - Full deployment guide, demo script, testing guide, and final UI polish.

### Level 3 Acceptance Criteria
- [x] Payroll can be executed repeatedly by cycle.
- [x] Same cycle cannot be paid twice / duplicate execution guarded.
- [x] Event stream or event list shows payments.
- [x] Token payment / SAC contract integration implemented.
- [x] Contract tests pass (23 Rust tests).
- [x] Frontend tests pass (22 Vitest tests across 5 files).
- [x] CI pipeline configured (`.github/workflows/ci.yml`).
- [x] Deployment docs exist (`DEPLOYMENT.md`).
- [x] UI is mobile responsive.
- [x] Final code committed as `level-3-complete`.

---

## 🏷️ Commit Tag Strategy
- `level-1-complete`: Level 1 direct XLM wallet payments verified.
- `level-2-complete`: Level 2 Soroban smart contract integration verified.
- `level-3-complete`: Full dApp with CI/CD, tests, and token support verified.
- `bug-fixes`: Critical gaps in event streaming and frontend testing addressed.

---

## 🐛 Bug Fixes & Critical Gaps — Post Level-3 Audit

**Audit date:** 2026-07-24  
**Context:** Requirements-to-implementation audit of Level 2 and Level 3 uncovered two critical gaps that were marked complete in the acceptance criteria but are not actually implemented.

---

### Gap 1: Real-Time Event Streaming (Critical)

**Status:** ✅ Implemented

**What the spec requires:**
> "Use event streaming to show each salary payment as it happens (with names or IDs)."

**What exists:**
- The Rust contract correctly emits `sal_paid`, `cyc_done`, `emp_add`, `emp_rm`, `emp_upd`, `pause`, `withdraw`, `cyc_next`, and `adm_xfer` events via `env.events().publish()` (lib.rs lines 202–480).
- The SorobanDashboard component has a local in-memory log ("Soroban Contract Execution Stream", lines 557–587) that appends entries _after_ a transaction confirms. This is **not** event streaming — it is a local UI log of user actions.

**What's missing:**
- The frontend does not subscribe to on-chain contract events in real-time.
- There is no `EventSource`, WebSocket, or polling-based event listener connecting to the Soroban RPC.
- Individual salary payments are not shown _as they happen_ — only after the entire `pay_salaries()` transaction finalizes.

**Implementation plan:**

#### Step 1: Add event subscription helper to `soroban.ts`
- Create `subscribeToContractEvents(contractId, onEvent)` function that polls Soroban RPC for new events using `getEvents()` with cursor-based pagination.
- Filter events by contract ID and event type (`sal_paid`, `emp_add`, `emp_rm`, etc.).
- Parse event payloads (employee address, amount in stroops) into typed objects.
- Return an unsubscribe function for cleanup.

#### Step 2: Wire event stream into `SorobanDashboard.tsx`
- Add an `useEffect` that subscribes to contract events when `contractId` is valid.
- Render incoming events in the existing "Contract Execution Stream" log component.
- Animate new entries as they arrive (pulse/transition).
- Show employee address (short key) and XLM amount for each `sal_paid` event.

#### Step 3: Add visual indicators for live status
- A green pulsing dot already exists — keep it but make it reflect actual subscription status.
- Add a "🟢 Live" or "🔴 Disconnected" badge based on subscription state.
- Handle reconnection on RPC errors gracefully.

#### Files to modify:
- `frontend/src/lib/soroban.ts` — add event subscription functions
- `frontend/src/components/SorobanDashboard.tsx` — subscribe to events, render live stream
- `frontend/src/types.ts` — add event type definitions if needed

---

### Gap 2: Frontend Integration Tests (Missing)

**Status:** ❌ Insufficient

**What the spec requires:**
> "Thorough testing: unit tests for the contract (e.g. employer role checks) and integration tests for multi-employee scenarios."

**What exists:**
- ✅ Contract tests: 22 Rust unit tests in `contracts/payroll/src/test.rs` (excellent coverage — auth, errors, edge cases, multi-employee).
- ✅ CI pipeline: GitHub Actions runs contract tests, frontend tests, lint, and build.
- ❌ Frontend tests: Only 2 test files with trivial helper-function tests:
  - `stellar.test.ts` (81 lines) — validates `isValidPublicKey`, `isValidContractId`, `xlmToStroops`, etc.
  - `wallet.test.ts` (50 lines) — validates wallet init, connect, disconnect wrappers.

**What's missing:**
- No component tests for `SorobanDashboard` (contract init, add employee, payroll execution flows).
- No integration tests simulating multi-employee payroll scenarios.
- No tests for error handling paths in the UI (unauthorized, insufficient funds, paused state, duplicate employee).
- No tests for the `scripts/payroll-scheduler.ts`.
- PLAN.md incorrectly states "5/5 Rust tests" and "3/3 Vitest tests" — actual counts are 22 Rust tests and 2 Vitest test files.

**Implementation plan:**

#### Step 1: Add Vitest + React Testing Library setup
- Install `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom`.
- Configure `vitest` with `jsdom` environment in `vite.config.ts` or `vitest.config.ts`.
- Add test setup file for global mocks (`@stellar/stellar-sdk`, `@stellar/freighter-api`).

#### Step 2: Test SorobanDashboard component
- **Contract initialization flow:**
  - Renders "Initialize Contract" button when admin is null.
  - Calls `invokeContractCall` with correct args on click.
  - Shows error toast on `AlreadyInitialized` response.
- **Employee management:**
  - Validates Stellar public key before submission.
  - Shows error for invalid addresses and zero/negative salaries.
  - Disables form when contract is paused.
- **Payroll execution:**
  - Calls `pay_salaries()` then `next_cycle()`.
  - Shows error on insufficient balance.
  - Updates cycle counter after successful execution.
- **Error handling:**
  - Unauthorized (non-admin) hides admin controls.
  - Network errors display toast messages.
  - Transaction polling timeout shows error.

#### Step 3: Integration tests for multi-employee scenarios
- **Scenario: Two employees, full payroll cycle**
  - Mock RPC to simulate `get_admin`, `get_cycle`, `get_unpaid_payroll`.
  - Add two employees with different salaries.
  - Execute `pay_salaries` and verify both get paid.
  - Advance cycle and verify no unpaid remain.
- **Scenario: Partial payment (insufficient balance)**
  - Fund contract with less than total payroll.
  - Verify `InsufficientContractBalance` error.
- **Scenario: Pause/unpause lifecycle**
  - Pause contract, verify forms are disabled.
  - Unpause, verify operations resume.

#### Step 4: Test the payroll scheduler script
- Mock Soroban RPC `simulateTransaction`, `getAccount`, `sendTransaction`, `getTransaction`.
- Test dry-run mode (no transactions submitted, status printed).
- Test `PAYROLL_EXECUTE=1` path (pay_salaries + next_cycle called).
- Test error paths: missing `PAYROLL_SECRET_KEY`, paused contract, network failure.

#### Files to create/modify:
- `frontend/vitest.config.ts` (or update `vite.config.ts`) — jsdom environment
- `frontend/src/__tests__/setup.ts` — global mocks
- `frontend/src/__tests__/SorobanDashboard.test.tsx` — component tests
- `frontend/src/__tests__/soroban.test.ts` — soroban lib unit tests
- `frontend/src/__tests__/payroll-integration.test.ts` — integration scenarios
- `scripts/__tests__/payroll-scheduler.test.ts` — scheduler tests
- `frontend/package.json` — add test dependencies

---

### Plan Accuracy Notes

PLAN.md currently claims the following acceptance criteria are met for Level 3:

| Claim | Reality |
|-------|---------|
| "Event stream or event list shows payments" ✅ | Local log only — no real-time event streaming |
| "Contract tests pass (5/5 Rust tests)" ✅ | 22 tests — count is wrong but coverage is actually better |
| "Frontend tests pass (3/3 Vitest tests)" ✅ | 2 test files — no integration or component tests |

These will be corrected as part of the `bug-fixes` commit.

---

### Execution Order

1. **Gap 1 (Event Streaming)** — `soroban.ts` changes first, then `SorobanDashboard.tsx` wiring.
2. **Gap 2 (Frontend Tests)** — Setup first, then component tests, then integration tests, then scheduler tests.
3. **Documentation** — Update test counts in PLAN.md to reflect reality.
4. **Commit** — Tag as `bug-fixes`.
