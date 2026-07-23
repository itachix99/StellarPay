# StellarPay Soroban Smart Contract Deployment Guide

## 🚀 Deployed Testnet Contract

- **Contract ID**: `CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY`
- **WASM Hash**: `d6f924a718d85b1c3019b8c9c25491ba4d259a91da771f1ab6a1a25734c749d3`
- **Network**: Stellar Testnet
- **Explorer Link**: [View Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY)

---

## 🛠️ Step-by-Step Deployment Instructions

### 1. Build WASM
```bash
cd contracts/payroll
stellar contract build
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

### 4. Bind Environment Variable
Update `frontend/.env`:
```env
VITE_SOROBAN_CONTRACT_ID=CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY
```
