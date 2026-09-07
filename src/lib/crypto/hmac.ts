/**
 * HMAC-SHA256 payload signing for the lab's demonstration.
 *
 * Signature scheme: `HMAC-SHA256(secret, timestamp + "." + body)` presented as
 * `t=<timestamp>,v1=<hex>`. Timestamps are Unix milliseconds. Verification
 * recomputes the digest, compares it in constant time and rejects timestamps
 * outside a tolerance window, which limits how long a captured request can be
 * replayed.
 *
 * Web Crypto only (`globalThis.crypto.subtle`), so the same code runs in
 * Node 22 and in browsers. This module never imports the simulation engine.
 */

/** Public, demo-only key shown on the lab page. It protects nothing. */
export const DEMO_SECRET = "demo-public-key-not-a-secret";

/** Five minutes, the tolerance used by the lab. */
export const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

const encoder = new TextEncoder();

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error(
      "Web Crypto is only available in secure contexts (HTTPS or localhost). Open this page over HTTPS to run the signing demo.",
    );
  }
  return c.subtle;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await subtle().importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await subtle().sign("HMAC", key, encoder.encode(message));
  return toHex(digest);
}

/** Compares two strings without short-circuiting on the first difference. */
export function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Signs `body` for `timestamp` (Unix ms) and returns the header value `t=<ts>,v1=<hex>`. */
export async function signPayload(secret: string, timestamp: number, body: string): Promise<string> {
  if (!Number.isInteger(timestamp) || timestamp < 0) {
    throw new Error("timestamp must be a non-negative integer (Unix milliseconds).");
  }
  const hex = await hmacHex(secret, `${timestamp}.${body}`);
  return `t=${timestamp},v1=${hex}`;
}

export interface ParsedSignature {
  timestamp: number;
  v1: string;
}

/** Parses `t=<ts>,v1=<hex>`; returns null when the shape is wrong. */
export function parseSignatureHeader(header: string): ParsedSignature | null {
  const parts = header.split(",").map((p) => p.trim());
  let timestamp: number | null = null;
  let v1: string | null = null;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) return null;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") {
      if (!/^\d+$/.test(value)) return null;
      timestamp = Number(value);
    } else if (key === "v1") {
      if (!/^[0-9a-f]{64}$/i.test(value)) return null;
      v1 = value.toLowerCase();
    } else {
      return null;
    }
  }
  if (timestamp === null || v1 === null) return null;
  return { timestamp, v1 };
}

export interface VerificationResult {
  valid: boolean;
  /** Present when invalid: "malformed header", "timestamp outside tolerance" or "signature mismatch". */
  reason?: string;
}

/**
 * Verifies a header against `body`. The timestamp check runs first so a stale
 * request is rejected before any digest work; the digest comparison is
 * constant time.
 */
export async function verifySignature(
  secret: string,
  body: string,
  header: string,
  nowMs: number,
  toleranceMs: number = DEFAULT_TOLERANCE_MS,
): Promise<VerificationResult> {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { valid: false, reason: "malformed header" };
  if (Math.abs(nowMs - parsed.timestamp) > toleranceMs) {
    return { valid: false, reason: "timestamp outside tolerance" };
  }
  const expected = await hmacHex(secret, `${parsed.timestamp}.${body}`);
  if (!constantTimeEqual(expected, parsed.v1)) {
    return { valid: false, reason: "signature mismatch" };
  }
  return { valid: true };
}
