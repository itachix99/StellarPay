# StellarPay Comprehensive Testing Guide

This guide details how to execute test suites for smart contracts, frontend components, and automated scripts.

---

## 1. Soroban Smart Contract Unit Tests

```bash
cd contracts/payroll
cargo test
```

### Core happy paths
- `test_initialize` — init with admin + token; cycle 0; not paused
- `test_add_and_get_employee` / `test_remove_employee` / `test_update_employee_salary`
- `test_pay_salaries_success` — multi-employee SAC transfer (token pinned at init)
- `test_pay_salaries_double_call_prevented` — second pay in same cycle pays 0
- `test_pay_salaries_insufficient_balance`
- `test_add_employee_zero_salary_rejected` / `test_initialize_already_initialized_error`
- `test_remove_readd_employee_gets_paid`

### Safety / correctness
- `test_withdraw_admin_recovers_excess` / `test_withdraw_zero_rejected`
- `test_pay_salaries_balance_checks_unpaid_only`
- `test_pause_blocks_pay_and_allows_unpause`
- `test_transfer_admin_moves_control`
- `test_max_employees_enforced`
- `test_set_employee_active_false_excludes_from_payroll`
- `test_next_cycle_blocked_when_unpaid` / `test_next_cycle_after_full_pay` / `test_next_cycle_empty_roster_advances`

### Auth negatives (no `mock_all_auths` for the failing call)
- `test_unauthorized_add_employee`
- `test_unauthorized_pay_salaries`
- `test_unauthorized_withdraw`

---

## 2. Frontend Vitest Unit Tests

```bash
cd frontend
bun run test
```

### Cases
- Public key validation (`G...` ed25519 checksum)
- Contract ID validation (`C...` via `StrKey.isValidContract`)
- Positive XLM decimal parser (no float; ≤7 decimals)
- `xlmToStroops` / `stroopsToXlm` conversion

---

## 3. Code Linting & Static Analysis

```bash
cd frontend
bun run lint
bun run build
```

---

## 4. Automated Scheduler

```bash
# Dry-run (default) — status only, no txs
bun run scripts/payroll-scheduler.ts

# Live execute (testnet only; never commit secrets)
PAYROLL_EXECUTE=1 PAYROLL_SECRET_KEY=S... bun run scripts/payroll-scheduler.ts
# or:
bun run scripts/payroll-scheduler.ts --execute
```

Dry-run prints admin, cycle, paused, unpaid. Execute fails closed if paused, missing key/contract, or simulation error.
