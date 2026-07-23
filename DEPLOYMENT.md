# StellarPay Soroban Smart Contract Deployment Guide

> Instructions for building WASM binaries and deploying smart contracts to Stellar Testnet.

## 🚀 Deployment Steps (Preview)
1. Build contract: `stellar contract build`
2. Deploy WASM to Testnet: `stellar contract deploy --wasm ... --source-account <key> --network testnet`
3. Bind Contract ID into `VITE_SOROBAN_CONTRACT_ID`.
