// Soroban RPC client and transaction helper for StellarPay contract.
import {
  rpc,
  Contract,
  scValToNative,
  xdr,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { sign, assertTestnet } from "./wallet";
import { NETWORK_PASSPHRASE } from "../config";

export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const sorobanServer = new rpc.Server(SOROBAN_RPC_URL);

// Standard Stellar Native Asset SAC Contract ID on Testnet
export const NATIVE_SAC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Contract ID bound from environment or default fallback for local/demo testing
export const CONTRACT_ID =
  import.meta.env.VITE_SOROBAN_CONTRACT_ID || "";

export class SorobanError extends Error {}

/** Helper to convert XLM amount string to i128 Stroops (1 XLM = 10,000,000 Stroops) */
export function xlmToStroops(xlm: string): bigint {
  const num = Number(xlm);
  if (isNaN(num) || num <= 0) throw new SorobanError("Invalid salary amount");
  return BigInt(Math.round(num * 10_000_000));
}

/** Helper to convert i128 Stroops back to XLM decimal string */
export function stroopsToXlm(stroops: bigint | number): string {
  return (Number(stroops) / 10_000_000).toFixed(4);
}

/** Read contract admin address */
export async function fetchContractAdmin(contractId: string = CONTRACT_ID): Promise<string | null> {
  if (!contractId) return null;
  try {
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(
      // Mock source account for read simulation
      await sorobanServer.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"),
      { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
    )
      .addOperation(contract.call("get_admin"))
      .setTimeout(30)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      const val = sim.result.retval;
      return scValToNative(val);
    }
    return null;
  } catch {
    return null;
  }
}

/** Read current payroll cycle from contract */
export async function fetchContractCycle(contractId: string = CONTRACT_ID): Promise<number> {
  if (!contractId) return 0;
  try {
    const contract = new Contract(contractId);
    const mockAcc = await sorobanServer.getAccount("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    const tx = new TransactionBuilder(mockAcc, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call("get_cycle"))
      .setTimeout(30)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      return Number(scValToNative(sim.result.retval));
    }
    return 0;
  } catch {
    return 0;
  }
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

  // Simulate & assemble transaction resource footprint
  const sim = await sorobanServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new SorobanError(`Contract simulation error: ${sim.error}`);
  }

  tx = rpc.assembleTransaction(tx, sim).build();

  // Sign via Freighter wallet
  const signedXdr = await sign(tx.toXDR(), signerAddress);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  // Send transaction
  const sendRes = await sorobanServer.sendTransaction(signedTx);
  if (sendRes.status === "ERROR") {
    throw new SorobanError("Transaction submission failed to Soroban RPC.");
  }

  // Poll for execution status
  let statusRes = await sorobanServer.getTransaction(sendRes.hash);
  while (statusRes.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 1000));
    statusRes = await sorobanServer.getTransaction(sendRes.hash);
  }

  if (statusRes.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return sendRes.hash;
  } else {
    throw new SorobanError("Contract call failed on-chain.");
  }
}
