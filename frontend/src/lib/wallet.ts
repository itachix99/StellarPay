// Pure StellarWalletsKit Integration with Dynamic Theme Support
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import {
  Networks,
  SwkAppDarkTheme,
  SwkAppLightTheme,
  type SwkAppTheme,
} from "@creit-tech/stellar-wallets-kit/types";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import { FREIGHTER_ID } from "@creit-tech/stellar-wallets-kit/modules/freighter";
import { ALBEDO_ID } from "@creit-tech/stellar-wallets-kit/modules/albedo";
import { XBULL_ID } from "@creit-tech/stellar-wallets-kit/modules/xbull";
import { LOBSTR_ID } from "@creit-tech/stellar-wallets-kit/modules/lobstr";
import { HANA_ID } from "@creit-tech/stellar-wallets-kit/modules/hana";
import { RABET_ID } from "@creit-tech/stellar-wallets-kit/modules/rabet";
import { HOTWALLET_ID } from "@creit-tech/stellar-wallets-kit/modules/hotwallet";
import { KLEVER_ID } from "@creit-tech/stellar-wallets-kit/modules/klever";
import { NETWORK_PASSPHRASE } from "../config";

export class WalletError extends Error {}

export interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
}

export const SUPPORTED_WALLETS: WalletOption[] = [
  {
    id: FREIGHTER_ID,
    name: "Freighter Wallet",
    icon: "https://www.freighter.app/favicon.ico",
    description: "Official Stellar browser extension wallet",
    installUrl: "https://www.freighter.app/",
  },
  {
    id: ALBEDO_ID,
    name: "Albedo Link",
    icon: "https://albedo.link/favicon.ico",
    description: "Web-based non-custodial Stellar wallet",
    installUrl: "https://albedo.link/",
  },
  {
    id: XBULL_ID,
    name: "xBull Wallet",
    icon: "https://xbull.app/favicon.ico",
    description: "Multi-platform Stellar ecosystem wallet",
    installUrl: "https://xbull.app/",
  },
  {
    id: LOBSTR_ID,
    name: "Lobstr Vault",
    icon: "https://lobstr.co/favicon.ico",
    description: "Mobile & web Stellar wallet",
    installUrl: "https://lobstr.co/",
  },
  {
    id: HANA_ID,
    name: "Hana Wallet",
    icon: "https://hana.app/favicon.ico",
    description: "Multi-chain wallet & dApp browser",
    installUrl: "https://hana.app/",
  },
  {
    id: RABET_ID,
    name: "Rabet Wallet",
    icon: "https://rabet.io/favicon.ico",
    description: "Browser extension for Stellar",
    installUrl: "https://rabet.io/",
  },
  {
    id: HOTWALLET_ID,
    name: "HOT Wallet",
    icon: "https://hotwallet.tech/favicon.ico",
    description: "Popular Web3 ecosystem wallet",
    installUrl: "https://hotwallet.tech/",
  },
  {
    id: KLEVER_ID,
    name: "Klever Wallet",
    icon: "https://klever.io/favicon.ico",
    description: "Crypto wallet ecosystem",
    installUrl: "https://klever.io/",
  },
];

/** Custom StellarPay Dark Theme for StellarWalletsKit */
export const STELLAR_PAY_DARK_THEME: SwkAppTheme = {
  ...SwkAppDarkTheme,
  background: "#0b1413",
  "background-secondary": "#121b19",
  "foreground-strong": "#ffffff",
  foreground: "#f1f5f9",
  "foreground-secondary": "#94a3b8",
  primary: "#10b981",
  "primary-foreground": "#091210",
  border: "rgba(255, 255, 255, 0.12)",
  "border-radius": "1.25rem",
  "font-family": "Plus Jakarta Sans, sans-serif",
};

/** Custom StellarPay Light Theme for StellarWalletsKit */
export const STELLAR_PAY_LIGHT_THEME: SwkAppTheme = {
  ...SwkAppLightTheme,
  primary: "#059669",
  "border-radius": "1.25rem",
  "font-family": "Plus Jakarta Sans, sans-serif",
};

/** Initialize or update StellarWalletsKit theme dynamically */
export function initStellarWalletsKit(themeMode?: "light" | "dark"): void {
  const isDark = themeMode
    ? themeMode === "dark"
    : typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const selectedTheme = isDark ? STELLAR_PAY_DARK_THEME : STELLAR_PAY_LIGHT_THEME;

  try {
    StellarWalletsKit.init({
      modules: defaultModules(),
      network: Networks.TESTNET,
      theme: selectedTheme,
    });
  } catch (e) {
    console.error("Failed to initialize StellarWalletsKit:", e);
  }
}

/** Update kit theme when user toggles dark/light mode */
export function setWalletKitTheme(themeMode: "light" | "dark"): void {
  initStellarWalletsKit(themeMode);
}

/** Open StellarWalletsKit native authentication modal matching current theme */
export async function openAuthModal(themeMode?: "light" | "dark"): Promise<string> {
  initStellarWalletsKit(themeMode);
  try {
    const { address } = await StellarWalletsKit.authModal();
    return address;
  } catch (e) {
    if (e instanceof Error) {
      throw new WalletError(e.message || "Wallet connection cancelled.");
    }
    throw new WalletError("Wallet connection cancelled.");
  }
}

/** Open StellarWalletsKit native profile modal matching current theme */
export async function openProfileModal(themeMode?: "light" | "dark"): Promise<void> {
  initStellarWalletsKit(themeMode);
  await StellarWalletsKit.profileModal();
}

/** Connect to wallet via StellarWalletsKit native modal */
export async function connect(themeMode?: "light" | "dark"): Promise<string> {
  return openAuthModal(themeMode);
}

/** Get authorized account address from StellarWalletsKit memory */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    initStellarWalletsKit();
    const { address } = await StellarWalletsKit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

/** Check network status against Stellar Testnet */
export async function checkTestnet(): Promise<"TESTNET" | "WRONG" | "UNKNOWN"> {
  try {
    initStellarWalletsKit();

    // xBull doesn't support getNetwork() (always rejects).
    // The kit is initialized with TESTNET, and xBull enforces the correct
    // network at signing time when it receives the network passphrase.
    try {
      const mod = StellarWalletsKit.selectedModule;
      if (mod && mod.productId === XBULL_ID) {
        return "TESTNET";
      }
    } catch {
      // No module selected yet — fall through to getNetwork()
    }

    const res = await StellarWalletsKit.getNetwork();
    if (res.networkPassphrase === NETWORK_PASSPHRASE) {
      return "TESTNET";
    }
    return "WRONG";
  } catch {
    return "UNKNOWN";
  }
}

/** Hard network guard for signing / submitting paths — blocks WRONG *and* UNKNOWN. */
export async function assertTestnet(): Promise<void> {
  const status = await checkTestnet();
  if (status === "WRONG") {
    throw new WalletError(
      "Wrong network selected in wallet. Please switch your wallet to Stellar Testnet."
    );
  }
  if (status === "UNKNOWN") {
    throw new WalletError(
      "Unable to verify wallet network. Ensure your wallet is connected to Stellar Testnet."
    );
  }
}

/** Sign transaction XDR using StellarWalletsKit */
export async function sign(xdr: string, address: string): Promise<string> {
  initStellarWalletsKit();
  try {
    const res = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address,
    });
    if (!res || !res.signedTxXdr) {
      throw new WalletError("Transaction signing returned empty result.");
    }
    return res.signedTxXdr;
  } catch (e) {
    if (e instanceof WalletError) throw e;
    const msg = e instanceof Error ? e.message : "Transaction signing was rejected in wallet.";
    throw new WalletError(msg);
  }
}

/** Disconnect currently active wallet in StellarWalletsKit */
export async function disconnectWallet(): Promise<void> {
  try {
    initStellarWalletsKit();
    await StellarWalletsKit.disconnect();
  } catch {
    // Ignore error on disconnect
  }
}
