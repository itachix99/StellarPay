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
import type { ContractEvent, ContractEventType, EventSubscriptionOptions } from "../types";

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

// ---------------------------------------------------------------------------
// Event Streaming — subscribe to on-chain contract events via polling
// ---------------------------------------------------------------------------

/** Known event topics emitted by the payroll contract. */
const EVENT_TOPICS: Record<string, ContractEventType> = {
  sal_paid: "sal_paid",
  cyc_done: "cyc_done",
  cyc_next: "cyc_next",
  emp_add: "emp_add",
  emp_rm: "emp_rm",
  emp_upd: "emp_upd",
  emp_act: "emp_act",
  pause: "pause",
  adm_xfer: "adm_xfer",
  withdraw: "withdraw",
};

/** Map a Soroban event topic string to our typed event name. */
function resolveEventType(topic: string): ContractEventType | null {
  // Events are emitted as symbol_short!("sal_paid") etc.
  // The topic string from RPC is the symbol value.
  for (const [key, value] of Object.entries(EVENT_TOPICS)) {
    if (topic === key || topic.includes(key)) {
      return value;
    }
  }
  return null;
}

/**
 * Parse a raw Soroban RPC event into a typed ContractEvent.
 * Uses scValToNative to decode the SCVal topic and value arrays.
 */
export function parseContractEvent(raw: {
  id: string;
  type: string;
  ledgerClosedAt: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}): ContractEvent | null {
  const eventType = resolveEventType(raw.type);
  if (!eventType) return null;

  const event: ContractEvent = {
    id: raw.id,
    type: eventType,
    timestamp: raw.ledgerClosedAt,
    rawData: raw,
  };

  try {
    // Convert the SCVal arrays to native JS values.
    // Topics in this contract are emitted as (symbol, ...args).
    const topics: unknown[] = raw.topic.map((t) => scValToNative(t));
    const dataValue: unknown = scValToNative(raw.value);

    const topic0 = topics[0];
    const topic1 = topics[1];

    const extractAddress = (val: unknown): string | undefined => {
      if (typeof val === "string") return val;
      if (val && typeof val === "object") {
        // Address objects may come back as { address: string }
        const asRecord = val as Record<string, unknown>;
        if (typeof asRecord.address === "string") return asRecord.address;
      }
      return undefined;
    };

    switch (eventType) {
      case "sal_paid": {
        event.employee = extractAddress(topic1);
        if (typeof dataValue === "bigint" || typeof dataValue === "number") {
          event.amount = BigInt(dataValue);
        }
        break;
      }
      case "emp_add":
      case "emp_upd": {
        event.employee = extractAddress(topic1);
        if (typeof dataValue === "bigint" || typeof dataValue === "number") {
          event.amount = BigInt(dataValue);
        }
        break;
      }
      case "emp_rm": {
        event.employee = extractAddress(topic1);
        break;
      }
      case "emp_act": {
        event.employee = extractAddress(topic1);
        event.active = dataValue === 1 || dataValue === 1n;
        break;
      }
      case "pause": {
        event.active = dataValue === 1 || dataValue === 1n;
        break;
      }
      case "withdraw": {
        event.employee = extractAddress(topic1);
        if (typeof dataValue === "bigint" || typeof dataValue === "number") {
          event.amount = BigInt(dataValue);
        }
        break;
      }
      case "cyc_done": {
        if (typeof topic0 === "bigint" || typeof topic0 === "number") {
          event.cycle = Number(topic0);
        }
        if (typeof dataValue === "bigint" || typeof dataValue === "number") {
          event.amount = BigInt(dataValue);
        }
        break;
      }
      case "cyc_next": {
        if (typeof dataValue === "bigint" || typeof dataValue === "number") {
          event.cycle = Number(dataValue);
        }
        break;
      }
      case "adm_xfer": {
        event.newAdmin = extractAddress(topic1);
        break;
      }
    }
  } catch {
    // If parsing fails, still return the event with raw data
  }

  return event;
}

/**
 * Subscribe to contract events from the Soroban RPC.
 *
 * Uses cursor-based polling: on each interval, fetches events newer than
 * the last seen cursor. Returns an unsubscribe function that stops polling.
 *
 * @example
 * const unsub = subscribeToContractEvents({
 *   contractId: "C...",
 *   pollIntervalMs: 5000,
 *   onEvents: (events) => events.forEach(e => console.log(e.type, e.employee)),
 *   onError: (err) => console.error(err),
 * });
 * // later: unsub();
 */
export function subscribeToContractEvents(
  options: EventSubscriptionOptions,
): () => void {
  const {
    contractId,
    pollIntervalMs = 5000,
    limit = 20,
    onEvents,
    onError,
  } = options;

  const MAX_BACKOFF_MS = 60_000;
  const BACKOFF_MULTIPLIER = 2;

  let cursor: string | undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let currentInterval = pollIntervalMs;
  let stopped = false;

  async function poll() {
    if (stopped) return;
    try {
      const filters: rpc.Api.EventFilter[] = [
        {
          type: "contract",
          contractIds: [contractId],
          topics: [], // match all topics for this contract
        },
      ];

      const result = await sorobanServer.getEvents(
        cursor
          ? { startLedger: undefined, filters, limit, cursor }
          : { startLedger: 0, filters, limit }
      );

      if (result.events && result.events.length > 0) {
        const parsed: ContractEvent[] = [];
        for (const rawEvent of result.events) {
          if (rawEvent.id === cursor) continue; // skip the cursor event itself
          const parsedEvent = parseContractEvent(rawEvent);
          if (parsedEvent) {
            parsed.push(parsedEvent);
          }
        }
        if (parsed.length > 0) {
          onEvents(parsed);
        }
      }

      // Advance cursor to the latest event ID
      if (result.events && result.events.length > 0) {
        cursor = result.events[result.events.length - 1].id;
      }

      // Reset backoff on successful poll
      currentInterval = pollIntervalMs;
    } catch (err) {
      if (!stopped && onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
      // Exponential backoff on error
      currentInterval = Math.min(currentInterval * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);
    }

    // Schedule next poll (recursive setTimeout enables dynamic intervals)
    if (!stopped) {
      timer = setTimeout(poll, currentInterval);
    }
  }

  // Initial fetch
  poll();

  return () => {
    stopped = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
