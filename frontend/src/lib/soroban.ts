// Soroban RPC client and transaction helper for StellarPay contract.
import {
  rpc,
  Contract,
  scValToNative,
  xdr,
  TransactionBuilder,
  BASE_FEE,
  Account,
} from "@stellar/stellar-sdk";
import { sign, assertTestnet } from "./wallet";
import { NETWORK_PASSPHRASE } from "../config";
import { xlmToStroops as parseXlmToStroops, stroopsToXlm as formatStroops } from "./stellar";

export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const sorobanServer = new rpc.Server(SOROBAN_RPC_URL);

// Standard Stellar Native Asset SAC Contract ID on Testnet
export const NATIVE_SAC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Well-formed G-key used only as a local simulation source (seq "0").
// Avoids network dependency on a live GAAA... account for pure reads.
const SIM_SOURCE_PUBLIC =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

// Contract ID bound from environment or default fallback for local/demo testing
export const CONTRACT_ID = import.meta.env.VITE_SOROBAN_CONTRACT_ID || "";

export class SorobanError extends Error {}

// Pending transaction lock to prevent duplicate submissions
const pendingTxns = new Set<string>();

/** Check if a transaction is already in flight for the given address */
export function isPending(address: string): boolean {
  return pendingTxns.has(address);
}

/** Helper to convert XLM amount string to i128 Stroops (1 XLM = 10,000,000 Stroops) */
export function xlmToStroops(xlm: string): bigint {
  try {
    return parseXlmToStroops(xlm);
  } catch (e) {
    throw new SorobanError(e instanceof Error ? e.message : "Invalid salary amount");
  }
}

/** Helper to convert i128 Stroops back to XLM decimal string */
export function stroopsToXlm(stroops: bigint | number): string {
  return formatStroops(stroops);
}

function simulationAccount(source?: string): Account {
  return new Account(source ?? SIM_SOURCE_PUBLIC, "0");
}

async function simulateRead(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<unknown | null> {
  if (!contractId) return null;
  try {
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(simulationAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      return scValToNative(sim.result.retval);
    }
    return null;
  } catch {
    return null;
  }
}

/** Read contract admin address */
export async function fetchContractAdmin(
  contractId: string = CONTRACT_ID,
): Promise<string | null> {
  const val = await simulateRead(contractId, "get_admin");
  return typeof val === "string" ? val : null;
}

/** Read current payroll cycle from contract */
export async function fetchContractCycle(
  contractId: string = CONTRACT_ID,
): Promise<number> {
  const val = await simulateRead(contractId, "get_cycle");
  return typeof val === "number" || typeof val === "bigint" ? Number(val) : 0;
}

/** Read pinned payroll token */
export async function fetchContractToken(
  contractId: string = CONTRACT_ID,
): Promise<string | null> {
  const val = await simulateRead(contractId, "get_token");
  return typeof val === "string" ? val : null;
}

/** Read paused flag */
export async function fetchIsPaused(
  contractId: string = CONTRACT_ID,
): Promise<boolean> {
  const val = await simulateRead(contractId, "is_paused");
  return val === true;
}

/** Read unpaid payroll total in stroops */
export async function fetchUnpaidPayroll(
  contractId: string = CONTRACT_ID,
): Promise<bigint> {
  const val = await simulateRead(contractId, "get_unpaid_payroll");
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(val);
  if (typeof val === "string") {
    try {
      return BigInt(val);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

/** Execute a contract call transaction signed via Freighter */
export async function invokeContractCall(params: {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  signerAddress: string;
}): Promise<string> {
  const { contractId, method, args, signerAddress } = params;

  if (!contractId) {
    throw new SorobanError("Soroban Payroll Contract ID is not set.");
  }

  if (pendingTxns.has(signerAddress)) {
    throw new SorobanError("A transaction is already in progress. Please wait.");
  }
  pendingTxns.add(signerAddress);

  try {
    await assertTestnet();

    const account = await sorobanServer.getAccount(signerAddress);
    const contract = new Contract(contractId);

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(120)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      throw new SorobanError(`Contract simulation error: ${sim.error}`);
    }

    tx = rpc.assembleTransaction(tx, sim).build();

    const signedXdr = await sign(tx.toXDR(), signerAddress);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    const sendRes = await sorobanServer.sendTransaction(signedTx);
    if (sendRes.status === "ERROR") {
      throw new SorobanError("Transaction submission failed to Soroban RPC.");
    }

    const MAX_RETRIES = 30;
    let retries = 0;
    let statusRes = await sorobanServer.getTransaction(sendRes.hash);
    while (statusRes.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      if (retries >= MAX_RETRIES) {
        throw new SorobanError("Transaction polling timed out after 30 seconds.");
      }
      await new Promise((r) => setTimeout(r, 1000));
      statusRes = await sorobanServer.getTransaction(sendRes.hash);
      retries++;
    }

    if (statusRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return sendRes.hash;
    }
    throw new SorobanError("Contract call failed on-chain.");
  } finally {
    pendingTxns.delete(signerAddress);
  }
}
