import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SorobanDashboard } from "../components/SorobanDashboard";

const ADMIN = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";

vi.mock("../lib/soroban", () => ({
  fetchContractAdmin: vi.fn().mockResolvedValue(null),
  fetchContractCycle: vi.fn().mockResolvedValue(0),
  fetchIsPaused: vi.fn().mockResolvedValue(false),
  fetchUnpaidPayroll: vi.fn().mockResolvedValue(0n),
  invokeContractCall: vi.fn(),
  subscribeToContractEvents: vi.fn(() => () => {}),
  xlmToStroops: (xlm: string) => BigInt(Math.round(parseFloat(xlm) * 10_000_000)),
  stroopsToXlm: (stroops: bigint) => (Number(stroops) / 10_000_000).toFixed(4),
  NATIVE_SAC_TESTNET: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
}));

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ push: vi.fn() }),
}));

describe("SorobanDashboard smoke test", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the dashboard header", () => {
    render(<SorobanDashboard userAddress={ADMIN} network="TESTNET" />);
    expect(screen.getByText("Soroban Smart Contract Payroll")).toBeInTheDocument();
    expect(screen.getByText(/On-chain roster, pause, withdraw & bulk payout execution/i)).toBeInTheDocument();
  });
});
