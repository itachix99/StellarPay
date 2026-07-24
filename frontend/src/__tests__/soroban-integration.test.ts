import { describe, it, expect } from "vitest";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { parseContractEvent } from "../lib/soroban";

const VALID_EMP = "GCWOXPHXNLGYMUAKMKXS7V6HQQJLZC7VFJQYUXQPLLCGIHA45MT5EECU";

describe("Contract event parsing", () => {
  const baseEvent = {
    id: "0000000000000001-0000000000",
    type: "sal_paid",
    ledgerClosedAt: "2026-07-24T12:00:00Z",
  };

  it("parses a sal_paid event", () => {
    const result = parseContractEvent({
      ...baseEvent,
      topic: [xdr.ScVal.scvSymbol("sal_paid"), Address.fromString(VALID_EMP).toScVal()],
      value: nativeToScVal(100_0000000n, { type: "i128" }),
    });

    expect(result).not.toBeNull();
    expect(result?.type).toBe("sal_paid");
    expect(result?.employee).toBe(VALID_EMP);
    expect(result?.amount).toBe(100_0000000n);
  });

  it("parses an emp_add event", () => {
    const result = parseContractEvent({
      ...baseEvent,
      type: "emp_add",
      topic: [xdr.ScVal.scvSymbol("emp_add"), Address.fromString(VALID_EMP).toScVal()],
      value: nativeToScVal(250_0000000n, { type: "i128" }),
    });

    expect(result?.type).toBe("emp_add");
    expect(result?.employee).toBe(VALID_EMP);
    expect(result?.amount).toBe(250_0000000n);
  });

  it("parses a pause event", () => {
    const result = parseContractEvent({
      ...baseEvent,
      type: "pause",
      topic: [xdr.ScVal.scvSymbol("pause")],
      value: nativeToScVal(1n, { type: "i128" }),
    });

    expect(result?.type).toBe("pause");
    expect(result?.active).toBe(true);
  });

  it("parses a cyc_next event", () => {
    const result = parseContractEvent({
      ...baseEvent,
      type: "cyc_next",
      topic: [xdr.ScVal.scvSymbol("cyc_next")],
      value: nativeToScVal(5n, { type: "u32" }),
    });

    expect(result?.type).toBe("cyc_next");
    expect(result?.cycle).toBe(5);
  });

  it("returns null for unknown event type", () => {
    const result = parseContractEvent({
      ...baseEvent,
      type: "unknown_event",
      topic: [xdr.ScVal.scvSymbol("unknown_event")],
      value: nativeToScVal(0n, { type: "i128" }),
    });

    expect(result).toBeNull();
  });
});
