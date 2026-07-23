import { describe, it, expect } from "vitest";
import { isValidPublicKey } from "../lib/stellar";
import { xlmToStroops, stroopsToXlm } from "../lib/soroban";

describe("Stellar Validation & Unit Conversion Helpers", () => {
  it("validates Stellar G... public keys correctly", () => {
    const validKey = "GAAZI4TCR3TY5OJHCTJC2A4TQSYBZG3MJXZ4B2UZZ626N3Q6JGWLVB3R";
    const invalidKey = "GA123";
    const emptyKey = "";

    expect(isValidPublicKey(validKey)).toBe(true);
    expect(isValidPublicKey(invalidKey)).toBe(false);
    expect(isValidPublicKey(emptyKey)).toBe(false);
  });

  it("converts XLM to stroops accurately", () => {
    expect(xlmToStroops("1")).toBe(10_000_000n);
    expect(xlmToStroops("500")).toBe(5_000_000_000n);
    expect(xlmToStroops("0.5")).toBe(5_000_000n);
  });

  it("converts stroops to XLM decimal string accurately", () => {
    expect(stroopsToXlm(10_000_000n)).toBe("1.0000");
    expect(stroopsToXlm(5_000_000_000n)).toBe("500.0000");
    expect(stroopsToXlm(5_000_000n)).toBe("0.5000");
  });
});
