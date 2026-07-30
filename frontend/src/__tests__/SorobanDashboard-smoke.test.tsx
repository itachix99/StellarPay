import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { SorobanDashboard } from "../components/SorobanDashboard";
import {
  fetchContractAdmin,
  fetchContractCycle,
  fetchIsPaused,
  checkContractInterface,
} from "../lib/soroban";

const ADMIN = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";

vi.mock("../lib/soroban", () => ({
  fetchContractAdmin: vi.fn().mockResolvedValue(null),
  fetchContractCycle: vi.fn().mockResolvedValue(0),
  fetchIsPaused: vi.fn().mockResolvedValue(false),
  fetchUnpaidPayroll: vi.fn().mockResolvedValue(0n),
  invokeContractCall: vi.fn(),
  subscribeToContractEvents: vi.fn(() => () => {}),
  checkContractInterface: vi.fn().mockResolvedValue({ compatible: true, exists: true, message: "ok" }),
  xlmToStroops: (xlm: string) => BigInt(Math.round(parseFloat(xlm) * 10_000_000)),
  stroopsToXlm: (stroops: bigint) => (Number(stroops) / 10_000_000).toFixed(4),
  NATIVE_SAC_TESTNET: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ push: vi.fn() }),
}));

describe("SorobanDashboard", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(fetchContractAdmin).mockResolvedValue(null);
    vi.mocked(fetchContractCycle).mockResolvedValue(0);
    vi.mocked(fetchIsPaused).mockResolvedValue(false);
    vi.mocked(checkContractInterface).mockResolvedValue({
      compatible: true,
      exists: true,
      message: "Contract supports the current payroll interface.",
    });
  });

  describe("smoke test", () => {
    it("renders the dashboard header", () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      expect(screen.getByText("Soroban Smart Contract Payroll")).toBeInTheDocument();
      expect(screen.getByText(/On-chain roster, pause, withdraw & bulk payout execution/i)).toBeInTheDocument();
    });
  });

  describe("contract configuration", () => {
    it("renders the contract ID input field with env value", () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      const input = screen.getByPlaceholderText(/e\.g\. C\.\.\./i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("CASTP46VFFVDQ77FUIDTTTXBBGYIX4YZTANUIVYGGVDXC67UL7VEVLTV");
    });

    it("shows payroll cycle display", () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      // The cycle is shown as "#0" inside a span with text-xl
      expect(screen.getByText("Payroll Cycle")).toBeInTheDocument();
    });
  });

  describe("uninitialized contract state", () => {
    it("shows Uninitialized badge when admin is null", async () => {
      vi.mocked(fetchContractAdmin).mockResolvedValue(null);
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.getByText("Uninitialized")).toBeInTheDocument();
      });
      expect(screen.getByText(/not initialized yet/i)).toBeInTheDocument();
    });

    it("shows Initialize Contract button when admin is null", async () => {
      vi.mocked(fetchContractAdmin).mockResolvedValue(null);
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.getByText("Initialize Contract")).toBeInTheDocument();
      });
    });

    it("disables initialization for an incompatible deployed ABI", async () => {
      vi.mocked(checkContractInterface).mockResolvedValue({
        compatible: false,
        exists: true,
        message: "Configured contract does not support the current payroll ABI.",
      });

      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);

      expect(await screen.findByText(/does not support the current payroll ABI/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Initialize Contract/i })).toBeDisabled();
    });
  });

  describe("initialized contract — not admin", () => {
    it("does not show admin controls when user is not admin", async () => {
      const otherAdmin = "GCVOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";
      vi.mocked(fetchContractAdmin).mockResolvedValue(otherAdmin);
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.queryByText(/You \(Admin\)/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText(/execute cycle/i)).toBeDisabled();
    });
  });

  describe("initialized contract — admin mode", () => {
    beforeEach(() => {
      vi.mocked(fetchContractAdmin).mockResolvedValue(ADMIN);
    });

    it("shows You (Admin) badge when user matches contract admin", async () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.getByText(/You \(Admin\)/i)).toBeInTheDocument();
      });
    });

    it("shows add employee form for admin", async () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.getByText(/Add Employee to On-Chain Smart Contract Roster/i)).toBeInTheDocument();
      });
    });

    it("shows Emergency Pause button for admin", async () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.getByText(/Emergency Pause/i)).toBeInTheDocument();
      });
    });

    it("shows Withdraw form for admin", async () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.getByText("Withdraw Excess Funds")).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText(/To G\.\.\./i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Amount XLM/i)).toBeInTheDocument();
    });

    it("shows Execute Payroll button enabled for admin", async () => {
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        const btn = screen.getByText(/Execute Cycle/i);
        expect(btn).not.toBeDisabled();
      });
    });
  });

  describe("paused contract state", () => {
    it("shows Paused badge when contract is paused", async () => {
      vi.mocked(fetchContractAdmin).mockResolvedValue(ADMIN);
      vi.mocked(fetchIsPaused).mockResolvedValue(true);
      render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
      await waitFor(() => {
        expect(screen.getByText("Paused")).toBeInTheDocument();
      });
      expect(screen.getByText(/Unpause/i)).toBeInTheDocument();
    });
  });
});
