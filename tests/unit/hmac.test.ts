import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOLERANCE_MS,
  DEMO_SECRET,
  constantTimeEqual,
  parseSignatureHeader,
  signPayload,
  verifySignature,
} from "@/lib/crypto/hmac";

const body = JSON.stringify({ id: "evt-0001", type: "reservation.confirmed", data: { reservationId: "RSV-10001", guests: 2 } });
const ts = 1_757_200_000_000; // a fixed Unix-millisecond timestamp

describe("signPayload", () => {
  it("returns t=<ts>,v1=<hex> using HMAC-SHA256 over timestamp + '.' + body", async () => {
    const header = await signPayload(DEMO_SECRET, ts, body);
    const expected = createHmac("sha256", DEMO_SECRET).update(`${ts}.${body}`).digest("hex");
    expect(header).toBe(`t=${ts},v1=${expected}`);
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
  });

  it("is deterministic and key dependent", async () => {
    expect(await signPayload(DEMO_SECRET, ts, body)).toBe(await signPayload(DEMO_SECRET, ts, body));
    expect(await signPayload("another-key", ts, body)).not.toBe(await signPayload(DEMO_SECRET, ts, body));
    expect(await signPayload(DEMO_SECRET, ts + 1, body)).not.toBe(await signPayload(DEMO_SECRET, ts, body));
  });

  it("rejects timestamps that are not non-negative integers", async () => {
    await expect(signPayload(DEMO_SECRET, 1.5, body)).rejects.toThrow(/timestamp/);
    await expect(signPayload(DEMO_SECRET, -1, body)).rejects.toThrow(/timestamp/);
  });

  it("uses a demo key that says what it is", () => {
    expect(DEMO_SECRET).toBe("demo-public-key-not-a-secret");
  });
});

describe("verifySignature", () => {
  it("accepts an untouched payload inside the tolerance window", async () => {
    const header = await signPayload(DEMO_SECRET, ts, body);
    expect(await verifySignature(DEMO_SECRET, body, header, ts + 1000)).toEqual({ valid: true });
    expect(await verifySignature(DEMO_SECRET, body, header, ts + DEFAULT_TOLERANCE_MS)).toEqual({ valid: true });
    expect(await verifySignature(DEMO_SECRET, body, header, ts - DEFAULT_TOLERANCE_MS)).toEqual({ valid: true });
  });

  it("rejects a tampered payload with a signature mismatch", async () => {
    const header = await signPayload(DEMO_SECRET, ts, body);
    const tampered = body.replace('"guests":2', '"guests":3');
    expect(tampered).not.toBe(body);
    expect(await verifySignature(DEMO_SECRET, tampered, header, ts)).toEqual({ valid: false, reason: "signature mismatch" });
  });

  it("rejects a signature made with a different key", async () => {
    const header = await signPayload("someone-else", ts, body);
    expect(await verifySignature(DEMO_SECRET, body, header, ts)).toEqual({ valid: false, reason: "signature mismatch" });
  });

  it("rejects a signature whose timestamp was altered after signing", async () => {
    const header = await signPayload(DEMO_SECRET, ts, body);
    const shifted = header.replace(`t=${ts}`, `t=${ts + 1}`);
    expect(await verifySignature(DEMO_SECRET, body, shifted, ts)).toEqual({ valid: false, reason: "signature mismatch" });
  });

  it("rejects stale or future timestamps beyond the tolerance, before any digest work", async () => {
    const header = await signPayload(DEMO_SECRET, ts, body);
    expect(await verifySignature(DEMO_SECRET, body, header, ts + DEFAULT_TOLERANCE_MS + 1)).toEqual({
      valid: false,
      reason: "timestamp outside tolerance",
    });
    expect(await verifySignature(DEMO_SECRET, body, header, ts - DEFAULT_TOLERANCE_MS - 1)).toEqual({
      valid: false,
      reason: "timestamp outside tolerance",
    });
    expect(await verifySignature(DEMO_SECRET, body, header, ts + 2000, 1000)).toEqual({
      valid: false,
      reason: "timestamp outside tolerance",
    });
  });

  it("rejects malformed headers", async () => {
    for (const bad of ["", "t=abc,v1=00", "v1=" + "0".repeat(64), `t=${ts}`, `t=${ts},v1=xyz`, `t=${ts},v1=${"0".repeat(64)},x=1`, "nonsense"]) {
      expect(await verifySignature(DEMO_SECRET, body, bad, ts)).toEqual({ valid: false, reason: "malformed header" });
    }
  });
});

describe("parseSignatureHeader", () => {
  it("parses well-formed headers and normalises the hex to lower case", () => {
    const hex = "AB".repeat(32);
    expect(parseSignatureHeader(`t=${ts}, v1=${hex}`)).toEqual({ timestamp: ts, v1: hex.toLowerCase() });
    expect(parseSignatureHeader(`v1=${hex},t=${ts}`)).toEqual({ timestamp: ts, v1: hex.toLowerCase() });
  });

  it("returns null for anything else", () => {
    expect(parseSignatureHeader("")).toBeNull();
    expect(parseSignatureHeader("t=1")).toBeNull();
    expect(parseSignatureHeader(`t=1,v1=${"0".repeat(63)}`)).toBeNull();
  });
});

describe("constantTimeEqual", () => {
  it("compares strings without short-circuiting", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "ab")).toBe(false);
    expect(constantTimeEqual("", "")).toBe(true);
    expect(constantTimeEqual("", "a")).toBe(false);
  });
});
