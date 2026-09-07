"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  applyToDocument,
  effectiveMotion,
  getPreference,
  getServerPreference,
  setPreference as storeSetPreference,
  subscribe,
  type EffectiveMotion,
  type MotionPreference,
} from "@/lib/motion/preference";

interface MotionContextValue {
  preference: MotionPreference;
  effective: EffectiveMotion;
  /** True when animation code should stay out of the way. */
  reduced: boolean;
  /** True once the client has read the real preference (avoids building timelines against the server default). */
  hydrated: boolean;
  setPreference: (p: MotionPreference) => void;
}

const MotionContext = createContext<MotionContextValue | null>(null);

function getHydratedSnapshot() {
  return true;
}
function getServerHydratedSnapshot() {
  return false;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribe, getPreference, getServerPreference);
  const hydrated = useSyncExternalStore(subscribe, getHydratedSnapshot, getServerHydratedSnapshot);
  const effective = useSyncExternalStore(
    subscribe,
    () => effectiveMotion(getPreference()),
    () => "full" as EffectiveMotion,
  );

  useEffect(() => {
    applyToDocument();
    document.documentElement.setAttribute("data-hydrated", "true");
  }, []);

  const setPreference = useCallback((p: MotionPreference) => storeSetPreference(p), []);

  const value = useMemo<MotionContextValue>(
    () => ({
      preference,
      effective,
      reduced: effective === "reduced",
      hydrated,
      setPreference,
    }),
    [preference, effective, hydrated, setPreference],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionContextValue {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    throw new Error("useMotion must be used within MotionProvider");
  }
  return ctx;
}

/**
 * Convenience for scenes: true when scroll choreography may be created.
 * False before hydration and whenever motion is reduced.
 */
export function useMotionEnabled(): boolean {
  const { hydrated, reduced } = useMotion();
  return hydrated && !reduced;
}
