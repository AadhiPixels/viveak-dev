"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { DEFAULT_TOLERANCE_MS, DEMO_SECRET, signPayload, verifySignature, type VerificationResult } from "@/lib/crypto/hmac";
import { Badge, SmallButton } from "./bits";

const SAMPLE = {
  id: "evt-0001",
  type: "reservation.confirmed",
  occurredAt: "2026-01-14T09:30:00Z",
  data: { reservationId: "RSV-10001", loungeCode: "LHR-T5-N", guests: 2, status: "confirmed" },
};

const ORIGINAL_BODY = JSON.stringify(SAMPLE, null, 2);
const TAMPERED_BODY = ORIGINAL_BODY.replace('"guests": 2', '"guests": 3');

/** How far past the tolerance the "aged" verification clock sits. */
const STALE_MARGIN_MS = 60_000;

interface Signed {
  timestamp: number;
  header: string;
}

function explain(result: VerificationResult | null, tampered: boolean, stale: boolean): string {
  if (!result) return "Verifying.";
  if (result.valid) {
    return 'The receiver recomputed HMAC-SHA256 over timestamp + "." + body with the shared key, the digests matched in a constant-time comparison, and the timestamp is inside the tolerance window.';
  }
  switch (result.reason) {
    case "signature mismatch":
      return tampered
        ? "One character of the body changed after signing, so the recomputed digest no longer matches the header. Without the key nobody can produce a matching signature for the edited body."
        : "The recomputed digest does not match the header.";
    case "timestamp outside tolerance":
      return stale
        ? "The header is genuine but too old. Rejecting stale timestamps limits how long a captured request can be replayed."
        : "The timestamp is outside the tolerance window.";
    default:
      return "The header could not be parsed.";
  }
}

function verificationClock(signed: Signed, stale: boolean): number {
  return stale ? signed.timestamp + DEFAULT_TOLERANCE_MS + STALE_MARGIN_MS : Date.now();
}

/**
 * Signs a sample payload with the public demo key, then lets the reader break
 * verification by tampering with the body or ageing the timestamp. Signing and
 * verification run in the browser with Web Crypto; nothing is sent anywhere.
 */
export function HmacDemo() {
  const id = useId();
  const [signed, setSigned] = useState<Signed | null>(null);
  const [tampered, setTampered] = useState(false);
  const [stale, setStale] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const body = tampered ? TAMPERED_BODY : ORIGINAL_BODY;

  // Sign once on the client after mount; the server renders the "computing" placeholder.
  useEffect(() => {
    let cancelled = false;
    const timestamp = Date.now();
    signPayload(DEMO_SECRET, timestamp, ORIGINAL_BODY)
      .then((header) => {
        if (cancelled) return null;
        setSigned({ timestamp, header });
        return verifySignature(DEMO_SECRET, ORIGINAL_BODY, header, Date.now());
      })
      .then((r) => {
        if (r && !cancelled) setResult(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Web Crypto is unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runVerify = useCallback((payload: string, current: Signed | null, staleFlag: boolean) => {
    if (!current) return;
    verifySignature(DEMO_SECRET, payload, current.header, verificationClock(current, staleFlag))
      .then((r) => {
        setResult(r);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Verification failed."));
  }, []);

  const runSign = useCallback(
    (payload: string, staleFlag: boolean) => {
      const timestamp = Date.now();
      signPayload(DEMO_SECRET, timestamp, payload)
        .then((header) => {
          const next = { timestamp, header };
          setSigned(next);
          setError(null);
          runVerify(payload, next, staleFlag);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Signing failed."));
    },
    [runVerify],
  );

  const onTamper = (checked: boolean) => {
    setTampered(checked);
    setResult(null);
    runVerify(checked ? TAMPERED_BODY : ORIGINAL_BODY, signed, stale);
  };

  const onStale = (checked: boolean) => {
    setStale(checked);
    setResult(null);
    runVerify(body, signed, checked);
  };

  const lines = body.split("\n");
  const tone = !result ? "muted" : result.valid ? "signal" : "danger";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-line bg-graphite">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 md:px-5">
          <h3 className="font-sans text-[0.95rem] font-medium tracking-[-0.01em] text-lumen">Payload</h3>
          <span className="mono-label text-silver-2">{tampered ? "edited after signing" : "as signed"}</span>
        </div>
        <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.78rem] leading-relaxed text-silver md:px-5" aria-label="Webhook body">
          {lines.map((line, i) => {
            const hot = tampered && line.includes('"guests": 3');
            return (
              <span key={i} className={`block ${hot ? "bg-danger/15 text-danger" : ""}`}>
                {line}
              </span>
            );
          })}
        </pre>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-4 py-3 md:px-5">
          <label className="flex cursor-pointer items-center gap-2 text-[0.9rem] text-lumen">
            <input type="checkbox" checked={tampered} onChange={(e) => onTamper(e.target.checked)} className="h-4 w-4 accent-signal" />
            Tamper with payload
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[0.9rem] text-lumen">
            <input type="checkbox" checked={stale} onChange={(e) => onStale(e.target.checked)} className="h-4 w-4 accent-signal" />
            Age the timestamp beyond tolerance
          </label>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-line bg-graphite">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 md:px-5">
          <h3 className="font-sans text-[0.95rem] font-medium tracking-[-0.01em] text-lumen">Signature</h3>
          <div className="flex flex-wrap items-center gap-2">
            <SmallButton onClick={() => runSign(body, stale)} title="Sign the current body with a fresh timestamp" disabled={!signed}>
              Re-sign current body
            </SmallButton>
            <SmallButton onClick={() => runVerify(body, signed, stale)} disabled={!signed}>
              Verify again
            </SmallButton>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 px-4 py-4 text-[0.85rem] md:px-5">
          <dt className="mono-label text-silver-3">Key</dt>
          <dd className="min-w-0 break-all font-mono text-[0.78rem] text-silver">
            {DEMO_SECRET} <span className="text-silver-3">(public, demo only)</span>
          </dd>
          <dt className="mono-label text-silver-3">Signed</dt>
          <dd className="font-mono text-[0.78rem] text-silver">{signed ? `t = ${signed.timestamp} (Unix ms)` : "computing"}</dd>
          <dt className="mono-label text-silver-3">Message</dt>
          <dd className="font-mono text-[0.78rem] text-silver">timestamp + &quot;.&quot; + body</dd>
          <dt className="mono-label text-silver-3">Header</dt>
          <dd className="min-w-0 break-all font-mono text-[0.78rem] text-lumen">{signed ? signed.header : "computing"}</dd>
          <dt className="mono-label text-silver-3">Tolerance</dt>
          <dd className="font-mono text-[0.78rem] text-silver">{DEFAULT_TOLERANCE_MS / 60000} minutes</dd>
        </dl>
        <div className="border-t border-line px-4 py-4 md:px-5" role="status" aria-labelledby={`${id}-result`}>
          <div className="flex flex-wrap items-center gap-3">
            <span id={`${id}-result`} className="eyebrow">
              Verify result
            </span>
            <Badge tone={tone} dot>
              {!result ? "Verifying" : result.valid ? "Valid" : `Invalid · ${result.reason}`}
            </Badge>
          </div>
          <p className="mt-2 max-w-[60ch] text-[0.9rem] leading-relaxed text-silver">{error ?? explain(result, tampered, stale)}</p>
        </div>
      </div>
    </div>
  );
}
