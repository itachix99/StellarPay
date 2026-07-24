# StellarPay System Architecture

## System Overview

StellarPay consists of a client-side React + TypeScript web application communicating with the Stellar Blockchain (Horizon API & Soroban RPC) and a Soroban Rust smart contract deployed on the Stellar Testnet.

```
+-----------------------------------------------------------------------+
|                              USER (HR / ADMIN)                        |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                    FRONTEND (Vite + React + TS)                       |
|  - Wallet Manager (Freighter API)                                     |
|  - Roster State & Direct Payment Module (Horizon SDK)                 |
|  - Soroban Contract Dashboard (Soroban RPC Client)                    |
|  - Event Streamer & Toast Feedback UI                                 |
+-----------------------------------------------------------------------+
          |                                            |
          | Direct XLM Payments                        | Soroban Contract Calls
          v                                            v
+-----------------------------+              +--------------------------+
|  Stellar Horizon Testnet    |              |  Stellar Soroban RPC     |
|  (Freighter Tx)             |              |  (Testnet Node)          |
+-----------------------------+              +--------------------------+
                                                       |
                                                       v
                                             +--------------------------+
                                             | Soroban Payroll Contract |
                                             | - Roster Storage         |
                                             | - Admin Access Control   |
                                             | - Pause / Withdraw       |
                                             | - Pinned Token Payouts   |
                                             | - Event Emission         |
                                             +--------------------------+
```

---

## Data Models

### 1. Employee Roster Object (Frontend localStorage)

```typescript
interface Employee {
  address: string;         // Stellar G... public key
  name?: string;           // Optional display name
  salary: string;          // XLM amount as decimal string
  active: boolean;
  addedAt: number;
  updatedAt: number;
}
```

Roster is sanitized on load (invalid keys/amounts dropped).

### 2. Contract Storage Layout (Soroban Rust)

| Key | Type | Notes |
|---|---|---|
| `Admin` | Address | Owner authorized for admin ops |
| `Initialized` | bool | One-time init guard |
| `Token` | Address | Pinned SAC/token used for payroll |
| `Paused` | bool | Emergency stop flag |
| `PayrollCycle` | u32 | Current cycle ID (starts at 0) |
| `EmployeeList` | Vec\<Address\> | Roster addresses (max 50) |
| `Employee(Address)` | EmployeeData (persistent) | salary, active, last_paid_cycle |

`EmployeeData`:
- `address`, `salary` (i128 stroops), `active`, `last_paid_cycle`
- New employees: `last_paid_cycle = 0`
- After pay for cycle N: `last_paid_cycle = N + 1`
- Unpaid when `active && salary > 0 && last_paid_cycle <= current_cycle`

### 3. Contract API (summary)

```text
initialize(admin, token)
get_admin / get_token / is_paused / get_cycle
get_employee / get_employees / get_total_payroll / get_unpaid_payroll
add_employee / remove_employee / update_employee_salary / set_employee_active
set_paused / transfer_admin / withdraw
pay_salaries() -> u32          // uses stored token; balance >= unpaid total
next_cycle() -> u32            // blocked if unpaid active remain
```

**Pause policy when Paused=true**
- Blocked: add, update salary, pay, next_cycle, withdraw
- Allowed: unpause, transfer_admin, remove, set_employee_active, getters

**TTL:** instance + employee persistent entries extended on mutating paths.

---

## Security Architecture & Error Categories

1. **Non-Custodial Signatures**: Envelopes built client-side; Freighter signs. Scheduler is optional secret-key automation (dry-run default; never commit keys).
2. **Access Control**: Admin methods call `require_auth()` on stored admin.
3. **Pinned Token**: Payroll/withdraw use token set at `initialize` only.
4. **Fund Recovery**: Admin `withdraw` recovers excess; not only pay-to-employees.
5. **Cycle Safety**: `next_cycle` refuses advance while unpaid active employees remain.
6. **Network Guard**: Hard fail on sign/submit if Freighter is not Testnet; soft status on connect.
7. **Client Validation**: Contract IDs via `StrKey.isValidContract`; money via decimal-string stroops (no float).

### Contract Errors

| Code | Name |
|---|---|
| 1 | AlreadyInitialized |
| 2 | NotInitialized |
| 3 | Unauthorized |
| 4 | DuplicateEmployee |
| 5 | EmployeeNotFound |
| 6 | InvalidSalaryAmount |
| 7 | InsufficientContractBalance |
| 8 | AlreadyPaidThisCycle |
| 9 | ContractPaused |
| 10 | MaxEmployeesReached |
| 11 | NothingToWithdraw |
| 12 | UnpaidEmployeesRemain |

### Frontend / Wallet Errors

- `WalletNotConnected`, `WrongNetwork`, `UserRejected`
- Invalid public key / contract ID / salary amount
- Insufficient balance / Horizon submit failures
