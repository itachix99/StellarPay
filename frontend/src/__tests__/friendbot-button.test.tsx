// Regression test: the "Need Testnet Funds? Click Friendbot" button must show
// honest feedback for every friendbot outcome — not a false "Funded!" success
// when the account already has funds.
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "../App";
import { ToastProvider } from "../hooks/useToast";

const { mockSetWalletKitTheme } = vi.hoisted(() => ({
  mockSetWalletKitTheme: vi.fn(),
}));

vi.mock("../lib/wallet", () => ({
  WalletError: class WalletError extends Error {},
  SUPPORTED_WALLETS: [],
  STELLAR_PAY_DARK_THEME: {},
  STELLAR_PAY_LIGHT_THEME: {},
  initStellarWalletsKit: vi.fn(),
  setWalletKitTheme: mockSetWalletKitTheme,
  openAuthModal: vi.fn(),
  openProfileModal: vi.fn(),
  connect: vi.fn(),
  getConnectedAddress: vi.fn(),
  checkTestnet: vi.fn(async () => "TESTNET"),
  assertTestnet: vi.fn(async () => undefined),
  sign: vi.fn(),
  disconnectWallet: vi.fn(),
}));

vi.mock("../hooks/useWallet", () => ({
  useWallet: () => ({
    address: "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU",
    balance: "0.0000000",
    network: "TESTNET",
    connecting: false,
    loadingBalance: false,
    error: null,
    connect: vi.fn(async () => "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU"),
    disconnect: vi.fn(),
    refreshBalance: vi.fn(async () => undefined),
    openAuthModal: vi.fn(),
    openProfileModal: vi.fn(),
  }),
}));

// The sidebar keeps every section mounted (even when hidden), so the Soroban
// dashboard mounts in App-level tests. Isolate it from real RPC polling here.
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

function friendbotResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Friendbot button", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    localStorage.setItem("stellarpay.onboarded", "1");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    cleanup();
  });

  async function clickFriendbot() {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>
    );
    const btn = screen.getByRole("button", {
      name: /need testnet funds\? click friendbot/i,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
  }

  it("shows a success toast when friendbot actually grants funds (200)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => friendbotResponse(200, { successful: true })));

    await clickFriendbot();

    await waitFor(() => {
      expect(screen.getByText(/funded account with 10,000 xlm/i)).toBeInTheDocument();
    });
  });

  it("shows an info toast instead of a false success when the account already has funds (400)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        friendbotResponse(400, { detail: "account already funded to starting balance" }),
      ),
    );

    await clickFriendbot();

    await waitFor(() => {
      expect(screen.getByText(/already has funds/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/funded account with 10,000 xlm/i)).not.toBeInTheDocument();
  });

  it("shows an error toast when friendbot rejects for an unrelated reason (400)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        friendbotResponse(400, {
          extras: { invalid_field: "addr", reason: "invalid address" },
        }),
      ),
    );

    await clickFriendbot();

    await waitFor(() => {
      expect(screen.getByText(/friendbot rejected the request/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/funded account with 10,000 xlm/i)).not.toBeInTheDocument();
  });

  it("shows an error toast when friendbot is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));

    await clickFriendbot();

    await waitFor(() => {
      expect(screen.getByText(/failed to reach friendbot/i)).toBeInTheDocument();
    });
  });
});
