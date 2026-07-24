// Stellar (Horizon) service — balance fetch + XLM payment building/submitting.
// TESTNET ONLY.
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Memo,
  StrKey,
} from "@stellar/stellar-sdk";
import { HORIZON_URL, NETWORK_PASSPHRASE, FRIENDBOT_URL } from "../config";
import { sign, assertTestnet } from "./wallet";

export const server = new Horizon.Server(HORIZON_URL);

/** Domain error for Stellar/Horizon problems, mapped to friendly messages. */
export class StellarError extends Error {}

// Pending transaction lock to prevent duplicate submissions
const pendingTxns = new Set<string>();

/** Check if a transaction is already in flight for the given address */
export function isPending(address: string): boolean {
  return pendingTxns.has(address);
}

/** Validate a Stellar G... public key including ed25519 checksum. */
export function isValidPublicKey(key: string): boolean {
  try {
    StrKey.decodeEd25519PublicKey(key.trim());
    return true;
  } catch {
    return false;
  }
}

/** Validate a Stellar C... contract ID (checksummed). */
export function isValidContractId(id: string): boolean {
  try {
    return StrKey.isValidContract(id.trim());
  } catch {
    return false;
  }
}

/**
 * Parse a positive XLM amount string without floating-point.
 * Returns the normalized string safe for Operation.payment and stroop math.
 */
export function parsePositiveXlm(amount: string): string {
  const trimmed = amount.trim();
  if (!trimmed) {
    throw new StellarError("Salary amount must be a positive number.");
  }
  if (trimmed.startsWith("-")) {
    throw new StellarError("Salary amount must be a positive number.");
  }

  const parts = trimmed.split(".");
  if (parts.length > 2) {
    throw new StellarError("Salary amount must be a positive number.");
  }

  const integerPart = parts[0] || "0";
  const fractionalRaw = parts[1] || "";
  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionalRaw)) {
    throw new StellarError("Salary amount must be a positive number.");
  }
  if (fractionalRaw.length > 7) {
    throw new StellarError("XLM amounts support at most 7 decimal places.");
  }

  const fractionalPart = fractionalRaw.padEnd(7, "0");
  const stroops = BigInt(integerPart || "0") * 10_000_000n + BigInt(fractionalPart || "0");
  if (stroops <= 0n) {
    throw new StellarError("Salary amount must be a positive number.");
  }

  // Normalize for Horizon payment amount (no trailing junk)
  const fracTrimmed = fractionalRaw.replace(/0+$/, "");
  return fracTrimmed.length > 0
    ? `${integerPart || "0"}.${fracTrimmed}`
    : `${BigInt(integerPart || "0")}`;
}

/** True if amount is a positive XLM decimal string (≤7 decimals). */
export function isValidXlmAmount(amount: string): boolean {
  try {
    parsePositiveXlm(amount);
    return true;
  } catch {
    return false;
  }
}

/** Convert XLM decimal string to stroops (i128). */
export function xlmToStroops(xlm: string): bigint {
  const normalized = parsePositiveXlm(xlm);
  const parts = normalized.split(".");
  const integerPart = parts[0] || "0";
  const fractionalPart = (parts[1] || "").padEnd(7, "0").slice(0, 7);
  return BigInt(integerPart) * 10_000_000n + BigInt(fractionalPart);
}

/** Convert stroops to XLM decimal string (4 display decimals). */
export function stroopsToXlm(stroops: bigint | number): string {
  const val = typeof stroops === "number" ? BigInt(Math.trunc(stroops)) : stroops;
  const integer = val / 10_000_000n;
  const fractional = val % 10_000_000n;
  const fracStr = fractional.toString().padStart(7, "0").slice(0, 4);
  return `${integer}.${fracStr}`;
}

/**
 * Fetch native XLM balance for an account.
 * Returns "0" for accounts that exist but somehow lack native (shouldn't happen).
 * Throws StellarError with a clear message if the account is unfunded/missing.
 */
export async function getXlmBalance(address: string): Promise<string> {
  try {
    const account = await server.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch (e: unknown) {
    if (isNotFound(e)) {
      throw new StellarError(
        "Account not found on Testnet. Fund it with Friendbot first.",
      );
    }
    throw new StellarError("Failed to load account balance from Horizon.");
  }
}

/**
 * Build, sign (via Freighter), and submit a native XLM payment.
 * Returns the transaction hash on success.
 */
export async function sendXlm(params: {
  from: string;
  to: string;
  amount: string;
  memo?: string;
}): Promise<string> {
  const { from, to, amount, memo } = params;

  if (!isValidPublicKey(to)) {
    throw new StellarError("Recipient address is not a valid Stellar public key.");
  }

  let paymentAmount: string;
  let amountStroops: bigint;
  try {
    paymentAmount = parsePositiveXlm(amount);
    amountStroops = xlmToStroops(paymentAmount);
  } catch (e) {
    throw e instanceof StellarError
      ? e
      : new StellarError("Salary amount must be a positive number.");
  }

  if (pendingTxns.has(from)) {
    throw new StellarError("A transaction is already in progress. Please wait.");
  }
  pendingTxns.add(from);

  try {
    // Never submit on the wrong network (fail-closed).
    await assertTestnet();

    let sourceAccount;
    try {
      sourceAccount = await server.loadAccount(from);
    } catch (e) {
      if (isNotFound(e)) {
        throw new StellarError(
          "Your account is not funded on Testnet. Use Friendbot to fund it.",
        );
      }
      throw new StellarError("Could not load your account from Horizon.");
    }

    // Pre-flight balance check (leave ~1 XLM headroom for base reserve + fee).
    const native = sourceAccount.balances.find((b) => b.asset_type === "native");
    const availableStroops = native ? xlmToStroops(native.balance) : 0n;
    const reserveStroops = 10_000_000n; // 1 XLM
    if (availableStroops < amountStroops + reserveStroops) {
      const availableXlm = stroopsToXlm(availableStroops);
      const needXlm = stroopsToXlm(amountStroops + reserveStroops);
      throw new StellarError(
        `Insufficient balance. You have ${availableXlm} XLM; need ~${needXlm} XLM (amount + reserve/fee).`,
      );
    }

    const builder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: to,
          asset: Asset.native(),
          amount: paymentAmount,
        }),
      )
      .setTimeout(120);

    if (memo && memo.trim()) {
      builder.addMemo(Memo.text(memo.trim().slice(0, 28)));
    }

    const tx = builder.build();

    const signedXdr = await sign(tx.toXDR(), from);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    try {
      const result = await server.submitTransaction(signedTx);
      return result.hash;
    } catch (e: unknown) {
      throw new StellarError(mapSubmitError(e));
    }
  } finally {
    pendingTxns.delete(from);
  }
}

/** Fund an account via Friendbot (testnet convenience). */
export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(address)}`);
  if (!res.ok) {
    if (res.status === 400) {
      try {
        const body = await res.json();
        if (body?.extras?.error?.includes("already exists")) return;
      } catch {
        // If we can't parse the body, assume it's the "already exists" case
      }
      return;
    }
    throw new StellarError("Friendbot funding failed. Try again in a moment.");
  }
}

// --- helpers -------------------------------------------------------------

function isNotFound(e: unknown): boolean {
  const err = e as { response?: { status?: number } };
  return err?.response?.status === 404;
}

/** Turn a Horizon submit error into a human message. */
function mapSubmitError(e: unknown): string {
  const err = e as {
    response?: { data?: { extras?: { result_codes?: Record<string, unknown> } } };
  };
  const codes = err?.response?.data?.extras?.result_codes;
  if (codes) {
    const flat = JSON.stringify(codes);
    if (flat.includes("underfunded"))
      return "Transaction failed: insufficient balance for this payment.";
    if (flat.includes("no_destination"))
      return "Transaction failed: recipient account does not exist on Testnet.";
    if (flat.includes("tx_bad_seq"))
      return "Transaction failed: sequence error. Refresh and try again.";
  }
  return "Transaction failed on the network. Please try again.";
}
