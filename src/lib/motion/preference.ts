/**
 * Motion preference store.
 *
 * The persisted setting has three values: "system" follows the OS
 * prefers-reduced-motion setting, "reduced" and "full" override it.
 * The effective value ("full" | "reduced") is mirrored to
 * <html data-motion> so CSS can react before hydration (see the inline
 * script in app/layout.tsx).
 */

export type MotionPreference = "system" | "reduced" | "full";
export type EffectiveMotion = "full" | "reduced";

export const MOTION_STORAGE_KEY = "vv-motion";

const listeners = new Set<() => void>();
let cachedPreference: MotionPreference | null = null;

function readStored(): MotionPreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (v === "reduced" || v === "full") return v;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

export function getPreference(): MotionPreference {
  if (cachedPreference === null) cachedPreference = readStored();
  return cachedPreference;
}

export function getServerPreference(): MotionPreference {
  return "system";
}

export function systemPrefersReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function effectiveMotion(pref: MotionPreference = getPreference()): EffectiveMotion {
  if (pref === "reduced") return "reduced";
  if (pref === "full") return "full";
  return systemPrefersReduced() ? "reduced" : "full";
}

export function applyToDocument(pref: MotionPreference = getPreference()) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-motion", effectiveMotion(pref));
}

export function setPreference(pref: MotionPreference) {
  cachedPreference = pref;
  try {
    if (pref === "system") window.localStorage.removeItem(MOTION_STORAGE_KEY);
    else window.localStorage.setItem(MOTION_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable */
  }
  applyToDocument(pref);
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      applyToDocument();
      listeners.forEach((l) => l());
    };
    mq.addEventListener("change", onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MOTION_STORAGE_KEY) {
        cachedPreference = null;
        applyToDocument();
        listeners.forEach((l) => l());
      }
    };
    window.addEventListener("storage", onStorage);
    mediaCleanup = () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && mediaCleanup) {
      mediaCleanup();
      mediaCleanup = null;
    }
  };
}

let mediaCleanup: (() => void) | null = null;

/** Inline, pre-paint version of the logic above. Kept tiny and dependency free. */
export const PRE_PAINT_SCRIPT = `(function(){try{var s=localStorage.getItem('${MOTION_STORAGE_KEY}');var m=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;var v=s==='reduced'?'reduced':s==='full'?'full':(m?'reduced':'full');document.documentElement.setAttribute('data-motion',v);}catch(e){try{document.documentElement.setAttribute('data-motion',window.matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full');}catch(f){}}})();`;
