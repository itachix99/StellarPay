// Freighter wallet integration (v6 API). All calls return { ..., error? }.
// Note: Freighter has no "disconnect" RPC — disconnect is a local-app concept
// (we simply forget the address in React state).
import {
  isConnected,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from "@stellar/freighter-api";
import { EXPECTED_NETWORK, NETWORK_PASSPHRASE } from "../config";

/** Thrown for every wallet failure so the UI can show a friendly message. */
export class WalletError extends Error {}

/** True if the Freighter extension is installed & reachable. */
export async function freighterInstalled(): Promise<boolean> {
  try {
    const res = await isConnected();
    if (res.error) return false;
    return res.isConnected;
  } catch {
    return false;
  }
}

/** Prompt the user to connect. Returns the public key. */
export async function connect(): Promise<string> {
  if (!(await freighterInstalled())) {
    throw new WalletError(
      "Freighter wallet not detected. Install it from freighter.app and reload.",
    );
  }
  const res = await requestAccess();
  if (res.error) {
    // User rejected, or extension locked.
    throw new WalletError(
      "Connection request was rejected. Approve it in Freighter to continue.",
    );
  }
  if (!res.address) {
    throw new WalletError("No account found in Freighter. Create one first.");
  }
  return res.address;
}

/** Get the currently authorized address without prompting (for auto-reconnect). */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const res = await getAddress();
    if (res.error || !res.address) return null;
    return res.address;
  } catch {
    return null;
  }
}

/** Verify Freighter is set to Testnet; throws WalletError otherwise. */
export async function assertTestnet(): Promise<void> {
  const res = await getNetwork();
  if (res.error) {
    throw new WalletError("Could not read the network from Freighter.");
  }
  if (res.network !== EXPECTED_NETWORK) {
    throw new WalletError(
      `Wrong network selected in Freighter (${res.network}). Switch to Testnet.`,
    );
  }
}

/** Sign a transaction XDR with the connected account on Testnet. */
export async function sign(xdr: string, address: string): Promise<string> {
  const res = await signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  if (res.error) {
    throw new WalletError(
      "Transaction signing was rejected in Freighter.",
    );
  }
  return res.signedTxXdr;
}
