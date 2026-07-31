import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isValidPublicKey,
  isValidContractId,
  isValidXlmAmount,
  parsePositiveXlm,
  xlmToStroops,
  stroopsToXlm,
  fundWithFriendbot,
  StellarError,
} from "../lib/stellar";
import {
  xlmToStroops as sorobanXlmToStroops,
  stroopsToXlm as sorobanStroopsToXlm,
} from "../lib/soroban";

describe("Stellar Validation & Unit Conversion Helpers", () => {
  it("validates Stellar G... public keys correctly", () => {
    const validKey = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";
    const invalidKey = "GA123";
    const emptyKey = "";
    const badChecksumKey = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECA";

    expect(isValidPublicKey(validKey)).toBe(true);
    expect(isValidPublicKey(invalidKey)).toBe(false);
    expect(isValidPublicKey(emptyKey)).toBe(false);
    expect(isValidPublicKey(badChecksumKey)).toBe(false);
  });

  it("validates Stellar C... contract IDs correctly", () => {
    const validContract = "CASTP46VFFVDQ77FUIDTTTXBBGYIX4YZTANUIVYGGVDXC67UL7VEVLTV";
    const gKey = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";

    expect(isValidContractId(validContract)).toBe(true);
    expect(isValidContractId(gKey)).toBe(false);
    expect(isValidContractId("C123")).toBe(false);
    expect(isValidContractId("")).toBe(false);
  });

  it("parses positive XLM amounts without float", () => {
    expect(parsePositiveXlm("1")).toBe("1");
    expect(parsePositiveXlm("0.5")).toBe("0.5");
    expect(parsePositiveXlm("1.2500000")).toBe("1.25");
    expect(isValidXlmAmount("500")).toBe(true);
    expect(isValidXlmAmount("0")).toBe(false);
    expect(isValidXlmAmount("-1")).toBe(false);
    expect(isValidXlmAmount("1.2.3")).toBe(false);
    expect(isValidXlmAmount("")).toBe(false);
    expect(isValidXlmAmount("0.12345678")).toBe(false); // >7 decimals
  });

  it("converts XLM to stroops accurately", () => {
    expect(xlmToStroops("1")).toBe(10_000_000n);
    expect(xlmToStroops("500")).toBe(5_000_000_000n);
    expect(xlmToStroops("0.5")).toBe(5_000_000n);
    expect(sorobanXlmToStroops("1")).toBe(10_000_000n);
  });

  it("converts XLM to stroops with high precision", () => {
    expect(xlmToStroops("0.1234567")).toBe(1_234_567n);
    expect(xlmToStroops("1.0000001")).toBe(10_000_001n);
  });

  it("handles edge cases for xlmToStroops", () => {
    expect(() => xlmToStroops("")).toThrow();
    expect(() => xlmToStroops("0")).toThrow();
    expect(() => xlmToStroops("-1")).toThrow();
    expect(() => xlmToStroops("1.2.3")).toThrow();
    expect(() => sorobanXlmToStroops("0")).toThrow();
  });

  it("converts stroops to XLM decimal string accurately", () => {
    expect(stroopsToXlm(10_000_000n)).toBe("1.0000");
    expect(stroopsToXlm(5_000_000_000n)).toBe("500.0000");
    expect(stroopsToXlm(5_000_000n)).toBe("0.5000");
    expect(sorobanStroopsToXlm(10_000_000n)).toBe("1.0000");
  });

  it("converts stroops to XLM with fractional precision", () => {
    expect(stroopsToXlm(1_234_567n)).toBe("0.1234");
    expect(stroopsToXlm(10_000_001n)).toBe("1.0000"); // display truncates to 4 decimals
  });
});

describe("fundWithFriendbot", () => {
  const addr = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns "funded" when friendbot succeeds (200)', async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ successful: true }), { status: 200 })),
    );
    await expect(fundWithFriendbot(addr)).resolves.toBe("funded");
  });

  it('returns "already-funded" when the account already has testnet funds (400)', async () => {
    // Real friendbot response shape for an already-funded account.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ detail: "account already funded to starting balance" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    await expect(fundWithFriendbot(addr)).resolves.toBe("already-funded");
  });

  it("throws when friendbot rejects for an unrelated reason (400)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ extras: { invalid_field: "addr", reason: "invalid address" } }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    await expect(fundWithFriendbot(addr)).rejects.toThrow(StellarError);
  });

  it("throws when the network request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(fundWithFriendbot(addr)).rejects.toThrow(StellarError);
  });

  it("maps an aborted/timed-out friendbot request to a friendly error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    );
    await expect(fundWithFriendbot(addr)).rejects.toThrow(/timed out/i);
  });

  it("passes an abort signal so a hung friendbot request can be cancelled", async () => {
    let signal: AbortSignal | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, opts?: RequestInit) => {
        signal = opts?.signal ?? null;
        return new Response(JSON.stringify({ successful: true }), { status: 200 });
      }),
    );
    await fundWithFriendbot(addr);
    expect(signal).not.toBeNull();
    expect(signal!.aborted).toBe(false);
  });
});
