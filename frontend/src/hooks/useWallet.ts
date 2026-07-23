// Wallet connection state + testnet check, exposed as a hook.
import { useCallback, useEffect, useState } from "react";
import {
  connect as fConnect,
  getConnectedAddress,
  assertTestnet,
  WalletError,
} from "../lib/wallet";
import { getXlmBalance } from "../lib/stellar";

export interface WalletState {
  address: string | null;
  balance: string | null;
  network: "TESTNET" | "WRONG" | "UNKNOWN";
  connecting: boolean;
  loadingBalance: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: null,
    network: "UNKNOWN",
    connecting: false,
    loadingBalance: false,
    error: null,
  });

  const refreshBalance = useCallback(async (addr: string) => {
    setState((s) => ({ ...s, loadingBalance: true }));
    try {
      const balance = await getXlmBalance(addr);
      setState((s) => ({ ...s, balance, loadingBalance: false }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loadingBalance: false,
        error: e instanceof Error ? e.message : "Failed to load balance.",
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const address = await fConnect();
      // Check network but don't block connection — surface it as a warning.
      let network: WalletState["network"] = "UNKNOWN";
      try {
        await assertTestnet();
        network = "TESTNET";
      } catch {
        network = "WRONG";
      }
      setState((s) => ({ ...s, address, network, connecting: false }));
      await refreshBalance(address);
    } catch (e) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: e instanceof WalletError ? e.message : "Failed to connect wallet.",
      }));
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    // Freighter has no disconnect RPC; we forget the session locally.
    setState({
      address: null,
      balance: null,
      network: "UNKNOWN",
      connecting: false,
      loadingBalance: false,
      error: null,
    });
  }, []);

  // Auto-reconnect if the user already authorized this app.
  useEffect(() => {
    (async () => {
      const addr = await getConnectedAddress();
      if (addr) {
        let network: WalletState["network"] = "UNKNOWN";
        try {
          await assertTestnet();
          network = "TESTNET";
        } catch {
          network = "WRONG";
        }
        setState((s) => ({ ...s, address: addr, network }));
        await refreshBalance(addr);
      }
    })();
  }, [refreshBalance]);

  return { ...state, connect, disconnect, refreshBalance };
}
