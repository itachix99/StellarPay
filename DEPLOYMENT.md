# StellarPay Soroban Smart Contract Deployment Guide

## Previously Deployed Testnet Contract (pre-safety-pass)

> **Note:** The safety-pass API is **breaking** (`initialize(admin, token)`, `pay_salaries()` with pinned token, pause/withdraw). Redeploy and re-initialize; do not reuse old contract state.

- **Legacy Contract ID**: `CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY`
- **Network**: Stellar Testnet
- **Explorer**: [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY)

---

## Step-by-Step Deployment

### 1. Build WASM

```bash
cd contracts/payroll
stellar contract build
# or: cargo build --target wasm32v1-none --release
```

### 2. Fund Deployer Account

```bash
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
```

### 3. Deploy WASM to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/stellarpay_payroll.wasm \
  --source-account deployer \
  --network testnet
```

Copy the returned **Contract ID** (`C...`).

### 4. Bind Environment Variable

Update `frontend/.env` (from `frontend/.env.example`):

```env
VITE_SOROBAN_CONTRACT_ID=C...your_new_contract_id...
```

### 5. Initialize (admin + pinned token)

Native SAC on **Testnet**:

```text
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

Use the dashboard **Initialize Contract** button (passes connected wallet as admin + native SAC), or Stellar CLI:

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source-account deployer \
  --network testnet \
  -- \
  initialize \
  --admin $ADMIN_G_ADDRESS \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

### 6. Fund the Contract

Transfer the payroll token (native SAC) to the contract address before `pay_salaries`. Excess can be recovered via admin `withdraw`.

### 7. Ops Notes

- Scheduler dry-run: `bun run scripts/payroll-scheduler.ts`
- Never commit `PAYROLL_SECRET_KEY` or `.env` secrets
- Prefer Freighter non-custodial admin for demos; secret-key automation is testnet-only
