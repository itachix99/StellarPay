import { describe, it, expect } from "vitest";
import {
  isValidPublicKey,
  isValidContractId,
  isValidXlmAmount,
  parsePositiveXlm,
  xlmToStroops,
  stroopsToXlm,
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
