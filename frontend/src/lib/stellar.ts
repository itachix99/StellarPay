// Stellar (Horizon) service — balance fetch + XLM payment building/submitting.
// TESTNET ONLY.
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Memo,
} from "@stellar/stellar-sdk";
import { HORIZON_URL, NETWORK_PASSPHRASE, FRIENDBOT_URL } from "../config";
import { sign, assertTestnet } from "./wallet";

export const server = new Horizon.Server(HORIZON_URL);

/** Domain error for Stellar/Horizon problems, mapped to friendly messages. */
export class StellarError extends Error {}

/** A basic G... public key format check (does not verify checksum on-chain). */
export function isValidPublicKey(key: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(key.trim());
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

  // Guard clauses -> specific, friendly errors.
  if (!isValidPublicKey(to)) {
    throw new StellarError("Recipient address is not a valid Stellar public key.");
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new StellarError("Salary amount must be a positive number.");
  }

  // Never submit on the wrong network.
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
  const available = native ? Number(native.balance) : 0;
  if (available < amt + 1) {
    throw new StellarError(
      `Insufficient balance. You have ${available} XLM; need ~${(amt + 1).toFixed(
        1,
      )} XLM (amount + reserve/fee).`,
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
        amount: String(amount),
      }),
    )
    .setTimeout(120);

  if (memo && memo.trim()) {
    builder.addMemo(Memo.text(memo.trim().slice(0, 28)));
  }

  const tx = builder.build();

  // Sign with Freighter.
  const signedXdr = await sign(tx.toXDR(), from);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  // Submit.
  try {
    const result = await server.submitTransaction(signedTx);
    return result.hash;
  } catch (e: unknown) {
    throw new StellarError(mapSubmitError(e));
  }
}

/** Fund an account via Friendbot (testnet convenience). */
export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(address)}`);
  if (!res.ok) {
    // Friendbot returns 400 if the account already exists — treat as fine.
    if (res.status === 400) return;
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
