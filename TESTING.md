# StellarPay Comprehensive Testing Guide 🧪

This guide details how to execute test suites for smart contracts, frontend components, and automated scripts.

---

## 🦀 1. Soroban Smart Contract Unit Tests

Rust unit tests verify access control, state mutation, salary calculations, error responses, and event emissions.

```bash
cd contracts/payroll
cargo test
```

### Test Suite Output
- `test_initialize` — Verifies single initialization and admin role assignment.
- `test_add_and_get_employee` — Verifies roster addition and salary storage in stroops.
- `test_remove_employee` — Verifies employee removal and total payroll recalculation.
- `test_update_employee_salary` — Verifies salary modification.
- `test_pay_salaries_success` — Mocks Stellar Asset Contract (SAC) token and verifies automated multi-employee transfer & cycle increment.

---

## ⚡ 2. Frontend Vitest Unit Tests

Frontend tests verify Stellar address validation algorithms and stroop unit conversion math.

```bash
cd frontend
bun run test
```

### Test Cases
- Public key format verification (`G...` 56-char base32).
- `xlmToStroops` (1 XLM = 10,000,000 stroops).
- `stroopsToXlm` decimal string conversion.

---

## 🔍 3. Code Linting & Static Analysis

### Frontend Linter
```bash
cd frontend
bun run lint
```

### Frontend Typecheck & Production Build
```bash
cd frontend
bun run build
```

---

## 🤖 4. Automated Scheduler Health Check
```bash
bun run scripts/payroll-scheduler.ts
```
