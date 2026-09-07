import type { SimStatusCode } from "./types";

/** "300 ms", "1.5 s", "6 s". Used by engine notes and the UI alike. */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "never";
  if (Math.abs(ms) < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  const text = Number.isInteger(s) ? String(s) : s.toFixed(1).replace(/\.0$/, "");
  return `${text} s`;
}

/** Simulated clock reading: "12.3 s", "1 min 02.5 s". */
export function formatClock(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  if (total < 60) return `${total.toFixed(1)} s`;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes} min ${seconds.toFixed(1).padStart(4, "0")} s`;
}

/** "t+4 s" style offsets for notes about exact scheduling. */
export function formatAt(ms: number): string {
  return `t = ${formatClock(ms)}`;
}

export function statusText(status: SimStatusCode): string {
  switch (status) {
    case 200:
      return "200 OK";
    case 429:
      return "429 Too Many Requests";
    case 503:
      return "503 Service Unavailable";
    default:
      return "no response (timeout)";
  }
}

export function padId(n: number): string {
  return String(n).padStart(4, "0");
}
