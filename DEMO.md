# StellarPay Hackathon Demo Script & Judging Walkthrough 🎬

Welcome to **StellarPay** — Decentralized Payroll & Bulk Salary Distribution on Stellar & Soroban.

---

## 🚀 Live Demo Requirements

1. Chrome / Brave browser with [Freighter Wallet Extension](https://www.freighter.app/) installed.
2. Freighter set to **Stellar Testnet** (Settings → Network → Testnet).

---

## 🎯 5-Minute Hackathon Demo Script

### Step 1: Wallet Connection & Account Balance
1. Open StellarPay frontend (`bun run dev` at `http://localhost:5173`).
2. Click **Connect Freighter Wallet**.
3. Approve the connection prompt in Freighter.
4. Verify account address, XLM balance, and the **Stellar Testnet** badge in the top navigation bar.
5. *(Optional)* Click **"Need Testnet Funds? Click Friendbot →"** to top up 10,000 Testnet XLM.

### Step 2: Level 1 — Direct Wallet Salary Payment
1. Scroll to **Add New Employee**.
2. Enter Employee Name: `Alice Chen (Lead Developer)`.
3. Enter Recipient Public Key: `GAAZI4TCR3TY5OJHCTJC2A4TQSYBZG3MJXZ4B2UZZ626N3Q6JGWLVB3R`.
4. Enter Salary: `250` XLM.
5. Click **Add to Roster**.
6. On the newly created employee card, click **Pay Salary**.
7. In the confirmation modal, click **Sign & Send XLM**.
8. Sign transaction in Freighter.
9. Notice the instant toast notification with clickable link to **Stellar Expert Testnet Explorer**.

### Step 3: Level 2 — Soroban Smart Contract Roster & Bulk Payroll
1. Scroll down to the **Soroban Smart Contract Payroll** dashboard.
2. Notice the live deployed Contract ID: `CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY`.
3. Click **Sync Contract** to fetch the current Admin address and Payroll Cycle number.
4. As Admin, enter an employee public key and salary amount under **Add Employee to On-Chain Smart Contract Roster**.
5. Click **Add On-Chain** and sign the Soroban invocation transaction.
6. Click **Execute Cycle #1 Payroll**.
7. Watch the Soroban contract iterate through all registered employees and disburse salaries on-chain.
8. Observe live execution logs streamed in the embedded execution console.

### Step 4: Level 3 — Automated Scheduler & CI/CD
1. Open a terminal and run the background scheduler script:
   ```bash
   bun run scripts/payroll-scheduler.ts
   ```
2. Verify automated RPC contract health check output.

---

## 🛡️ Edge Cases Handled during Demo
- **User Rejects Signature**: Friendly toast error surfaces; app state remains consistent.
- **Wrong Network**: Banner warns user if Freighter is set to Mainnet or Futurenet.
- **Insufficient Funds**: Pre-flight balance check ensures gas reserve + payout headroom.
- **Duplicate Roster Address**: Prevented both client-side and inside Soroban contract logic.
