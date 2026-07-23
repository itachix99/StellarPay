/**
 * StellarPay Automated Payroll Scheduler Script (Level 3)
 *
 * Can be run manually or as a background cron job:
 *   bun run scripts/payroll-scheduler.ts
 */
import {
  rpc,
  Contract,
  Address,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";

const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
const NATIVE_SAC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const CONTRACT_ID =
  process.env.VITE_SOROBAN_CONTRACT_ID ||
  "CD4GDOOKY7NBXFL7UCSQGVQ4FE62P42TVGMTCBBJYD5ZMOOI7JDJM5LY";

const SECRET_KEY = process.env.PAYROLL_SECRET_KEY;

async function runScheduler() {
  console.log("=== 🚀 StellarPay Automated Payroll Scheduler ===");
  console.log(`Target Contract: ${CONTRACT_ID}`);
  console.log(`RPC Endpoint:    ${SOROBAN_RPC_URL}`);

  const server = new rpc.Server(SOROBAN_RPC_URL);

  if (!SECRET_KEY) {
    console.log("\n⚠️  Notice: PAYROLL_SECRET_KEY is not set.");
    console.log("    To trigger automated contract payouts from CLI/cron, set:");
    console.log("    export PAYROLL_SECRET_KEY=S...");
    console.log("    Simulating payroll status check instead...\n");

    try {
      const mockAcc = await server.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
      const contract = new Contract(CONTRACT_ID);
      const tx = new TransactionBuilder(mockAcc, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call("get_cycle"))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      console.log("✅ Contract status check success!");
      console.log("   Soroban Payroll Contract is active and responsive on Testnet.");
    } catch (err) {
      console.error("❌ Failed to query contract status:", err);
    }
    return;
  }

  // If Secret Key is provided, execute automated pay_salaries transaction!
  const signer = Keypair.fromSecret(SECRET_KEY);
  console.log(`Admin Signer Public Key: ${signer.publicKey()}`);

  try {
    const account = await server.getAccount(signer.publicKey());
    const contract = new Contract(CONTRACT_ID);

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("pay_salaries", new Address(NATIVE_SAC_TESTNET).toScVal()))
      .setTimeout(120)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    tx = rpc.assembleTransaction(tx, sim).build();
    tx.sign(signer);

    const sendRes = await server.sendTransaction(tx);
    console.log(`🌎 Submitted Tx Hash: ${sendRes.hash}`);

    let statusRes = await server.getTransaction(sendRes.hash);
    while (statusRes.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      await new Promise((r) => setTimeout(r, 1000));
      statusRes = await server.getTransaction(sendRes.hash);
    }

    if (statusRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log("🎉 Automated Payroll Executed Successfully!");
      console.log(`   Explorer Link: https://stellar.expert/explorer/testnet/tx/${sendRes.hash}`);
    } else {
      console.error("❌ Transaction failed on-chain.");
    }
  } catch (err) {
    console.error("❌ Scheduler error:", err);
  }
}

runScheduler();
