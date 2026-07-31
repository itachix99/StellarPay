// Sidebar navigation & application shell tests:
//  - nav destinations and active-state (aria-current="page")
//  - localStorage persistence of the active section and collapsed state
//  - mobile off-canvas drawer (open / select / Escape / backdrop / focus)
//  - section content stays mounted so form values survive navigation
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import App from "../App";
import { ToastProvider } from "../hooks/useToast";
import { setViewportWidth } from "./setup";

const ADDR = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";

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
  checkTestnet: vi.fn(async () => "TESTNET"),
  assertTestnet: vi.fn(async () => undefined),
  sign: vi.fn(),
  disconnectWallet: vi.fn(),
}));

vi.mock("../hooks/useWallet", () => ({
  useWallet: () => ({
    address: ADDR,
    balance: "1000.0000000",
    network: "TESTNET",
    connecting: false,
    loadingBalance: false,
    error: null,
    connect: vi.fn(async () => ADDR),
    disconnect: vi.fn(),
    refreshBalance: vi.fn(async () => undefined),
    openAuthModal: vi.fn(),
    openProfileModal: vi.fn(),
  }),
}));

// The shell keeps the Soroban section mounted (hidden when inactive), so App
// always loads the dashboard. Isolate it from real RPC polling.
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

function navButton(name: RegExp | string) {
  return screen.getByRole("button", { name });
}

describe("Sidebar navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("stellarpay.onboarded", "1");
    setViewportWidth(1280); // desktop
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe("desktop navigation & active state", () => {
    it("renders the four destinations with Overview active by default", () => {
      renderApp();
      expect(navButton(/^overview/i)).toBeInTheDocument();
      expect(navButton(/^direct xlm/i)).toBeInTheDocument();
      expect(navButton(/^soroban contract/i)).toBeInTheDocument();
      expect(navButton(/^employee roster/i)).toBeInTheDocument();

      expect(navButton(/^overview/i)).toHaveAttribute("aria-current", "page");
      expect(screen.getByTestId("section-overview")).not.toHaveAttribute("hidden");
      expect(screen.getByTestId("section-direct")).toHaveAttribute("hidden");
    });

    it("marks the selected destination active and shows its section", () => {
      renderApp();
      fireEvent.click(navButton(/^employee roster/i));

      expect(navButton(/^employee roster/i)).toHaveAttribute("aria-current", "page");
      expect(navButton(/^overview/i)).not.toHaveAttribute("aria-current");
      expect(screen.getByTestId("section-roster")).not.toHaveAttribute("hidden");
      expect(screen.getByTestId("section-overview")).toHaveAttribute("hidden");
    });

    it("navigates to the Soroban section", () => {
      renderApp();
      fireEvent.click(navButton(/^soroban contract/i));
      expect(screen.getByTestId("section-soroban")).not.toHaveAttribute("hidden");
      expect(navButton(/^soroban contract/i)).toHaveAttribute("aria-current", "page");
    });
  });

  describe("persistence across sessions", () => {
    it("restores the active section from localStorage", () => {
      renderApp();
      fireEvent.click(navButton(/^employee roster/i));
      cleanup();

      renderApp();
      expect(navButton(/^employee roster/i)).toHaveAttribute("aria-current", "page");
      expect(screen.getByTestId("section-roster")).not.toHaveAttribute("hidden");
    });

    it("restores the collapsed preference from localStorage", () => {
      renderApp();
      const toggle = navButton(/collapse|expand sidebar/i);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      // Descriptions are hidden when collapsed
      expect(screen.queryByRole("button", { name: /dashboard & wallet summary/i }))
        .not.toBeInTheDocument();
      cleanup();

      renderApp();
      const restored = navButton(/collapse|expand sidebar/i);
      expect(restored).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("button", { name: /dashboard & wallet summary/i }))
        .not.toBeInTheDocument();
    });
  });

  describe("form values survive navigation", () => {
    it("does not clear partially entered Direct XLM form values", () => {
      renderApp();
      fireEvent.click(navButton(/^direct xlm/i));
      const addrInput = screen.getByRole("textbox", { name: /recipient.*address/i });
      fireEvent.change(addrInput, { target: { value: ADDR } });
      expect(addrInput).toHaveValue(ADDR);

      fireEvent.click(navButton(/^employee roster/i));
      fireEvent.click(navButton(/^direct xlm/i));

      expect(
        screen.getByRole("textbox", { name: /recipient.*address/i }),
      ).toHaveValue(ADDR);
    });
  });

  describe("mobile off-canvas drawer", () => {
    it("opens from the hamburger and closes when a section is selected", () => {
      setViewportWidth(500); // mobile
      renderApp();

      const menuBtn = screen.getByRole("button", { name: /open navigation menu/i });
      expect(menuBtn).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(menuBtn);
      expect(menuBtn).toHaveAttribute("aria-expanded", "true");
      const dialog = screen.getByRole("dialog", { name: /navigation menu/i });
      expect(dialog).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole("button", { name: /^soroban contract/i }));

      expect(screen.queryByRole("dialog", { name: /navigation menu/i }))
        .not.toBeInTheDocument();
      expect(menuBtn).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByTestId("section-soroban")).not.toHaveAttribute("hidden");
    });

    it("closes on Escape", () => {
      setViewportWidth(500);
      renderApp();

      const menuBtn = screen.getByRole("button", { name: /open navigation menu/i });
      fireEvent.click(menuBtn);
      expect(screen.getByRole("dialog", { name: /navigation menu/i })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog", { name: /navigation menu/i }))
        .not.toBeInTheDocument();
      expect(menuBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("closes on backdrop click", () => {
      setViewportWidth(500);
      renderApp();

      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
      const dialog = screen.getByRole("dialog", { name: /navigation menu/i });
      // The presentation wrapper is the backdrop; clicking it closes the drawer.
      fireEvent.click(dialog.parentElement!);

      expect(screen.queryByRole("dialog", { name: /navigation menu/i }))
        .not.toBeInTheDocument();
    });

    it("returns focus to the menu button after closing", () => {
      setViewportWidth(500);
      renderApp();

      const menuBtn = screen.getByRole("button", { name: /open navigation menu/i });
      menuBtn.focus();
      fireEvent.click(menuBtn);
      expect(screen.getByRole("dialog", { name: /navigation menu/i })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(document.activeElement).toBe(menuBtn);
    });
  });
});
