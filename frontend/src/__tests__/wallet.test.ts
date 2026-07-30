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

// Mock the StellarWalletsKit module used internally
vi.mock("@creit-tech/stellar-wallets-kit/sdk", () => ({
  StellarWalletsKit: {
    init: vi.fn(),
    authModal: vi.fn(),
    profileModal: vi.fn(),
    getAddress: vi.fn(),
    getNetwork: vi.fn(),
    signTransaction: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
  },
}));

import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";

describe("StellarWalletsKit Native Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initStellarWalletsKit", () => {
    it("initializes without error", () => {
      expect(() => initStellarWalletsKit()).not.toThrow();
    });

    it("passes testnet network passphrase", () => {
      initStellarWalletsKit();
      expect(StellarWalletsKit.init).toHaveBeenCalled();
      const callArgs = vi.mocked(StellarWalletsKit.init).mock.calls[0][0];
      expect(callArgs).toHaveProperty("network", "Test SDF Network ; September 2015");
    });
  });

  describe("getConnectedAddress", () => {
    it("returns null when no connected address is active in memory", async () => {
      vi.mocked(StellarWalletsKit.getAddress).mockRejectedValue(new Error("No address"));
      const address = await getConnectedAddress();
      expect(address).toBeNull();
    });

    it("returns address when available", async () => {
      vi.mocked(StellarWalletsKit.getAddress).mockResolvedValue({
        address: "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU",
      });
      const address = await getConnectedAddress();
      expect(address).toBe("GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU");
    });
  });

  describe("checkTestnet", () => {
    it("returns TESTNET when network passphrase matches", async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockResolvedValue({
        network: "testnet",
        networkPassphrase: "Test SDF Network ; September 2015",
      });
      const status = await checkTestnet();
      expect(status).toBe("TESTNET");
    });

    it("returns WRONG when network passphrase differs", async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockResolvedValue({
        network: "public",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      });
      const status = await checkTestnet();
      expect(status).toBe("WRONG");
    });

    it("returns UNKNOWN when getNetwork throws", async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockRejectedValue(new Error("Not connected"));
      const status = await checkTestnet();
      expect(status).toBe("UNKNOWN");
    });
  });

  describe("assertTestnet", () => {
    it("resolves when network is TESTNET", async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockResolvedValue({
        network: "testnet",
        networkPassphrase: "Test SDF Network ; September 2015",
      });
      await expect(assertTestnet()).resolves.toBeUndefined();
    });

    it("throws WalletError when network is WRONG", async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockResolvedValue({
        network: "public",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      });
      await expect(assertTestnet()).rejects.toThrow(WalletError);
      await expect(assertTestnet()).rejects.toThrow(
        "Wrong network selected in wallet"
      );
    });

    it("throws WalletError when network is UNKNOWN", async () => {
      vi.mocked(StellarWalletsKit.getNetwork).mockRejectedValue(new Error("Not connected"));
      await expect(assertTestnet()).rejects.toThrow(WalletError);
      await expect(assertTestnet()).rejects.toThrow(
        "Unable to verify wallet network"
      );
    });
  });

  describe("connect", () => {
    it("connect helper function exists and is callable", () => {
      expect(typeof connect).toBe("function");
    });
  });

  describe("disconnectWallet", () => {
    it("disconnects active wallet safely", async () => {
      await expect(disconnectWallet()).resolves.not.toThrow();
    });
  });

  describe("WalletError", () => {
    it("handles WalletError instances correctly", () => {
      const err = new WalletError("Test error message");
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("Test error message");
    });
  });
});
