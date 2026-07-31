// Regression tests for the hardened dialog focus behavior and honest status
// feedback:
//  - disconnect confirm closes on Escape and restores focus to its trigger
//  - disconnect confirm closes on backdrop click
//  - confirming disconnect calls disconnect and closes the dialog
//  - PayModal focuses its title on open, closes on Escape, and stays open on
//    Escape while a transaction is submitting
//  - connecting on the wrong network surfaces an honest error, not a success
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "../App";
import { ToastProvider } from "../hooks/useToast";
import { PayModal } from "../components/ui";
import type { PaymentDraft } from "../types";

const ADDR = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";

const { mockCheckTestnet, mockWallet } = vi.hoisted(() => ({
  mockCheckTestnet: vi.fn(async () => "TESTNET"),
  mockWallet: {
    address: null as string | null,
    balance: null as string | null,
    network: "UNKNOWN" as "TESTNET" | "WRONG" | "UNKNOWN",
    connecting: false,
    loadingBalance: false,
    error: null,
    connect: vi.fn(async () => ADDR),
    disconnect: vi.fn(),
    refreshBalance: vi.fn(async () => undefined),
    openAuthModal: vi.fn(),
    openProfileModal: vi.fn(),
  },
}));

vi.mock("../lib/wallet", () => ({
  WalletError: class WalletError extends Error {},
  SUPPORTED_WALLETS: [],
  STELLAR_PAY_DARK_THEME: {},
  STELLAR_PAY_LIGHT_THEME: {},
  initStellarWalletsKit: vi.fn(),
  setWalletKitTheme: vi.fn(),
  openAuthModal: vi.fn(),
  openProfileModal: vi.fn(),
  connect: vi.fn(),
  getConnectedAddress: vi.fn(),
  checkTestnet: mockCheckTestnet,
  assertTestnet: vi.fn(async () => undefined),
  sign: vi.fn(),
  disconnectWallet: vi.fn(),
}));

vi.mock("../hooks/useWallet", () => ({
  useWallet: () => mockWallet,
}));

// The shell keeps every section mounted, so the Soroban dashboard mounts in
// App-level tests. Isolate it from real RPC polling.
vi.mock("../lib/soroban", () => ({
  fetchContractAdmin: vi.fn().mockResolvedValue(null),
  fetchContractCycle: vi.fn().mockResolvedValue(0),
  fetchIsPaused: vi.fn().mockResolvedValue(false),
  fetchUnpaidPayroll: vi.fn().mockResolvedValue(0n),
  invokeContractCall: vi.fn(),
  subscribeToContractEvents: vi.fn(() => () => {}),
  checkContractInterface: vi
    .fn()
    .mockResolvedValue({ compatible: true, exists: true, message: "ok" }),
  xlmToStroops: (xlm: string) => BigInt(Math.round(parseFloat(xlm) * 10_000_000)),
  stroopsToXlm: (stroops: bigint) => (Number(stroops) / 10_000_000).toFixed(4),
  NATIVE_SAC_TESTNET: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
}));

function renderApp() {
  render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  );
}

function connectWallet() {
  mockWallet.address = ADDR;
  mockWallet.balance = "1000.0000000";
  mockWallet.network = "TESTNET";
}

const DRAFT: PaymentDraft = { to: ADDR, amount: "10", source: "direct" };

describe("dialog focus behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("stellarpay.onboarded", "1");
    mockCheckTestnet.mockResolvedValue("TESTNET");
    Object.assign(mockWallet, {
      address: null,
      balance: null,
      network: "UNKNOWN",
      connecting: false,
      loadingBalance: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("disconnect confirm closes on Escape and restores focus to its trigger", () => {
    connectWallet();
    renderApp();

    const trigger = screen.getByRole("button", { name: "Disconnect wallet" });
    // jsdom does not move focus on click; focus the trigger explicitly so the
    // dialog has a real element to restore to (a real browser focuses on click).
    trigger.focus();
    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: /confirm disconnect wallet/i }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: /confirm disconnect wallet/i }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("disconnect confirm closes on backdrop click", () => {
    connectWallet();
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect wallet" }));
    const dialog = screen.getByRole("dialog", {
      name: /confirm disconnect wallet/i,
    });

    fireEvent.click(dialog);

    expect(
      screen.queryByRole("dialog", { name: /confirm disconnect wallet/i }),
    ).not.toBeInTheDocument();
  });

  it("confirming disconnect calls disconnect and closes the dialog", () => {
    connectWallet();
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect wallet" }));
    fireEvent.click(screen.getByRole("button", { name: /^disconnect$/i }));

    expect(mockWallet.disconnect).toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: /confirm disconnect wallet/i }),
    ).not.toBeInTheDocument();
  });

  it("PayModal focuses its title on open and closes on Escape", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn(async () => true);
    render(
      <PayModal draft={DRAFT} onClose={onClose} onConfirm={onConfirm} balance="100" />,
    );

    const title = screen.getByText("Confirm Direct Payment");
    await waitFor(() => expect(document.activeElement).toBe(title));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("PayModal stays open on Escape while a transaction is submitting", async () => {
    const onClose = vi.fn();
    let resolveConfirm: (value: boolean) => void = () => {};
    const gate = new Promise<boolean>((res) => {
      resolveConfirm = res;
    });
    const onConfirm = vi.fn(() => gate);

    render(
      <PayModal draft={DRAFT} onClose={onClose} onConfirm={onConfirm} balance="100" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /sign & send/i }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();

    // Settle the transaction as failed — the dialog should stay open.
    resolveConfirm(false);
    await waitFor(() => expect(onClose).not.toHaveBeenCalled());
  });
});

describe("honest connect feedback", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("stellarpay.onboarded", "1");
    mockCheckTestnet.mockResolvedValue("TESTNET");
    Object.assign(mockWallet, {
      address: null,
      balance: null,
      network: "UNKNOWN",
      connecting: false,
      loadingBalance: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a success toast when connecting on Testnet", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    await waitFor(() => {
      expect(screen.getByText(/Connected wallet successfully/i)).toBeInTheDocument();
    });
  });

  it("shows an honest wrong-network toast when connecting on the wrong network", async () => {
    mockCheckTestnet.mockResolvedValue("WRONG");
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    await waitFor(() => {
      expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Connected wallet successfully/i)).not.toBeInTheDocument();
  });
});
