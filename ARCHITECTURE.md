# StellarPay System Architecture

## 📐 System Overview

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
|  (Passkey/Freighter Tx)     |              |  (Testnet Node)          |
+-----------------------------+              +--------------------------+
                                                       |
                                                       v
                                             +--------------------------+
                                             | Soroban Payroll Contract |
                                             | - Roster Storage         |
                                             | - Admin Access Control   |
                                             | - Bulk Payout Execution  |
                                             | - Event Emission         |
                                             +--------------------------+
```

---

## 🔑 Data Models

### 1. Employee Roster Object (Frontend & Contract)
```typescript
interface Employee {
  id: string;              // Unique identifier (or address)
  address: string;         // Stellar G... public key
  name: string;            // Employee name/role description
  salaryAmount: string;    // Salary in XLM or Token stroops
  active: boolean;         // Active status
  addedAt: number;         // Timestamp added
  lastPaidCycle?: number;  // Cycle ID when last paid
}
```

### 2. Contract Storage Layout (Soroban Rust)
- `Admin`: `Address` (Owner wallet authorized to manage roster & trigger payroll)
- `EmployeeRoster`: `Map<Address, EmployeeData>` (Stores employee addresses and salary details)
- `PayrollState`:
  - `cycle_id`: `u32`
  - `total_payout_amount`: `i128`
  - `is_paused`: `bool`

---

## 🔒 Security Architecture & Error Categories

1. **Non-Custodial Signatures**: All transaction envelopes are built client-side and submitted to Freighter wallet for user signature.
2. **Access Control**: Soroban contract functions verify `admin.require_auth()` for configuration and distribution triggers.
3. **Mandatory Error Handling**:
   - `WalletNotConnected`: Prompt connection workflow.
   - `WrongNetwork`: Enforce Stellar Testnet selection.
   - `UserRejected`: Catch user cancellation in Freighter without app crash.
   - `InsufficientContractBalance`: Verify contract balance prior to `pay_salaries` execution.
   - `DuplicateEmployee`: Prevent adding an existing address to roster.
   - `InvalidSalaryAmount`: Validate positive non-zero numerical values.
