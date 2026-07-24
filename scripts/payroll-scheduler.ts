/**
 * StellarPay Automated Payroll Scheduler Script (Level 3)
 *
 * TESTNET ONLY. Never commit PAYROLL_SECRET_KEY. Prefer dry-run.
 *
 * Usage:
 *   bun run scripts/payroll-scheduler.ts              # dry-run status
 *   PAYROLL_EXECUTE=1 PAYROLL_SECRET_KEY=S... \
 *     bun run scripts/payroll-scheduler.ts            # live execute
 *   bun run scripts/payroll-scheduler.ts --execute    # live execute (same)
 */
import {
  rpc,
  Contract,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Account,
  scValToNative,
} from "@stellar/stellar-sdk";

const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

const CONTRACT_ID =
  process.env.VITE_SOROBAN_CONTRACT_ID ||
  process.env.SOROBAN_CONTRACT_ID ||
  "";

const SECRET_KEY = process.env.PAYROLL_SECRET_KEY;
const EXECUTE =
  process.env.PAYROLL_EXECUTE === "1" ||
  process.argv.includes("--execute");

const SIM_SOURCE =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

async function simulateCall(
  server: rpc.Server,
  contractId: string,
  method: string,
): Promise<unknown | null> {
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(new Account(SIM_SOURCE, "0"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
    return scValToNative(sim.result.retval);
  }
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  return null;
}

export async function runScheduler() {
  console.log("=== StellarPay Automated Payroll Scheduler ===");
  console.log(`Target Contract: ${CONTRACT_ID || "(missing)"}`);
  console.log(`RPC Endpoint:    ${SOROBAN_RPC_URL}`);
  console.log(`Mode:            ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);

  if (!CONTRACT_ID) {
    fail("Contract ID missing. Set VITE_SOROBAN_CONTRACT_ID or SOROBAN_CONTRACT_ID.");
  }

  const server = new rpc.Server(SOROBAN_RPC_URL);

  // Status / dry-run path (default)
  try {
    const cycle = await simulateCall(server, CONTRACT_ID, "get_cycle");
    const unpaid = await simulateCall(server, CONTRACT_ID, "get_unpaid_payroll");
    const paused = await simulateCall(server, CONTRACT_ID, "is_paused");
    const admin = await simulateCall(server, CONTRACT_ID, "get_admin");

    console.log("\n✅ Contract status");
    console.log(`   Admin:   ${admin ?? "unknown"}`);
    console.log(`   Cycle:   ${cycle ?? "unknown"}`);
    console.log(`   Paused:  ${paused === true}`);
    console.log(`   Unpaid:  ${unpaid ?? "unknown"} stroops`);
  } catch (err) {
    fail(`Failed to query contract status: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!EXECUTE) {
    console.log("\nℹ️  Dry-run only. No transactions submitted.");
    console.log("    To execute payroll set PAYROLL_EXECUTE=1 and PAYROLL_SECRET_KEY=S...");
    return;
  }

  if (!SECRET_KEY) {
    fail("PAYROLL_EXECUTE is set but PAYROLL_SECRET_KEY is missing.");
  }

  // Preflight: refuse to pay if paused
  try {
    const paused = await simulateCall(server, CONTRACT_ID, "is_paused");
    if (paused === true) {
      fail("Contract is paused. Unpause before executing payroll.");
    }
  } catch (err) {
    fail(`Preflight failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const signer = Keypair.fromSecret(SECRET_KEY);
  console.log(`\nAdmin Signer Public Key: ${signer.publicKey()}`);

  const MAX_RETRIES = 30;

  async function submitAndWait(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    label: string,
  ): Promise<string> {
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed for ${label}: ${sim.error}`);
    }
    tx = rpc.assembleTransaction(tx, sim).build();
    tx.sign(signer);

    const sendRes = await server.sendTransaction(tx);
    console.log(`Submitted ${label} Tx Hash: ${sendRes.hash}`);

    let retries = 0;
    let statusRes = await server.getTransaction(sendRes.hash);
    while (statusRes.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      if (retries >= MAX_RETRIES) {
        throw new Error(`Transaction polling timed out for ${label}.`);
      }
      await new Promise((r) => setTimeout(r, 1000));
      statusRes = await server.getTransaction(sendRes.hash);
      retries++;
    }

    if (statusRes.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`${label} transaction failed on-chain.`);
    }
    return sendRes.hash;
  }

  try {
    const contract = new Contract(CONTRACT_ID);

    // Step 1: Execute pay_salaries (token is pinned on-chain)
    let account = await server.getAccount(signer.publicKey());
    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("pay_salaries"))
      .setTimeout(120)
      .build();

    const payHash = await submitAndWait(tx, "pay_salaries");
    console.log("Automated Payroll Executed Successfully!");
    console.log(`   Explorer: https://stellar.expert/explorer/testnet/tx/${payHash}`);

    // Step 2: Advance cycle (contract rejects if unpaid remain)
    account = await server.getAccount(signer.publicKey());
    tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("next_cycle"))
      .setTimeout(120)
      .build();

    const cycleHash = await submitAndWait(tx, "next_cycle");
    console.log(`Cycle advanced. Explorer: https://stellar.expert/explorer/testnet/tx/${cycleHash}`);
  } catch (err) {
    fail(`Scheduler error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (import.meta.main) {
  runScheduler();
}

