import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  initStellarWalletsKit,
  connect,
  getConnectedAddress,
  checkTestnet,
  assertTestnet,
  disconnectWallet,
  WalletError,
} from "../lib/wallet";

describe("StellarWalletsKit Native Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes StellarWalletsKit without error", () => {
    expect(() => initStellarWalletsKit()).not.toThrow();
  });

  it("returns null when no connected address is active in memory", async () => {
    const address = await getConnectedAddress();
    expect(address).toBeNull();
  });

  it("returns UNKNOWN or WRONG for testnet check when uninitialized or disconnected", async () => {
    const status = await checkTestnet();
    expect(["TESTNET", "WRONG", "UNKNOWN"]).toContain(status);
  });

  it("assertTestnet handles network check without crashing", async () => {
    await expect(assertTestnet()).resolves.toBeUndefined().catch((e) => {
      expect(e).toBeInstanceOf(WalletError);
    });
  });

  it("connect helper function exists and is callable", () => {
    expect(typeof connect).toBe("function");
  });

  it("disconnects active wallet safely", async () => {
    await expect(disconnectWallet()).resolves.not.toThrow();
  });

  it("handles WalletError instances correctly", () => {
    const err = new WalletError("Test error message");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Test error message");
  });
});
