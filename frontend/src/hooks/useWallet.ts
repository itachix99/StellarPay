// Wallet connection state + testnet check, exposed as a hook.
import { useCallback, useEffect, useState } from "react";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { KitEventType } from "@creit-tech/stellar-wallets-kit/types";
import {
  connect as kitConnect,
  getConnectedAddress,
  checkTestnet,
  disconnectWallet,
  openAuthModal,
  openProfileModal,
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

  const connect = useCallback(async (themeMode?: "light" | "dark") => {
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const address = await kitConnect(themeMode);
      const network = await checkTestnet();
      try {
        localStorage.setItem("stellarpay.active_wallet", "connected");
      } catch {
        // localStorage unavailable
      }
      setState((s) => ({ ...s, address, network, connecting: false }));
      await refreshBalance(address);
      return address;
    } catch (e) {
      try {
        localStorage.removeItem("stellarpay.active_wallet");
      } catch {
        // localStorage unavailable
      }
      const errorMsg = e instanceof WalletError ? e.message : "Failed to connect wallet.";
      setState((s) => ({
        ...s,
        address: null,
        connecting: false,
        error: errorMsg,
      }));
      throw e;
    }
  }, [refreshBalance]);

  const disconnect = useCallback(async () => {
    try {
      localStorage.removeItem("stellarpay.active_wallet");
    } catch {
      // localStorage unavailable
    }
    await disconnectWallet();
    setState({
      address: null,
      balance: null,
      network: "UNKNOWN",
      connecting: false,
      loadingBalance: false,
      error: null,
    });
  }, []);

  // Subscribe to StellarWalletsKit events for live wallet state updates
  useEffect(() => {
    let subState: (() => void) | undefined;
    let subDisconnect: (() => void) | undefined;

    try {
      subState = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (evt) => {
        const addr = evt.payload?.address;
        if (addr) {
          setState((s) => ({ ...s, address: addr }));
          refreshBalance(addr);
        }
      });

      subDisconnect = StellarWalletsKit.on(KitEventType.DISCONNECT, () => {
        disconnect();
      });
    } catch {
      // StellarWalletsKit may not be initialized yet before first connect
    }

    return () => {
      if (subState) subState();
      if (subDisconnect) subDisconnect();
    };
  }, [refreshBalance, disconnect]);

  // Auto-reconnect active wallet on load
  useEffect(() => {
    (async () => {
      let activeWallet: string | null = null;
      try {
        activeWallet = localStorage.getItem("stellarpay.active_wallet");
      } catch {
        // localStorage unavailable
      }

      if (activeWallet) {
        const addr = await getConnectedAddress();
        if (addr) {
          const network = await checkTestnet();
          setState((s) => ({ ...s, address: addr, network }));
          await refreshBalance(addr);
        }
      }
    })();
  }, [refreshBalance]);

  return {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    openAuthModal,
    openProfileModal,
  };
}
