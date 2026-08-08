import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Mode = "day" | "night";

const ModeCtx = createContext<{ mode: Mode; toggle: () => void }>({
  mode: "day",
  toggle: () => {},
});

export const useMode = () => useContext(ModeCtx);

function initialMode(): Mode {
  const param = new URLSearchParams(location.search).get("mode");
  if (param === "day" || param === "night") return param;
  const saved = localStorage.getItem("vv-mode");
  if (saved === "day" || saved === "night") return saved;
  const h = new Date().getHours();
  return h >= 19 || h < 7 ? "night" : "day";
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    localStorage.setItem("vv-mode", mode);
  }, [mode]);

  const toggle = () => setMode((m) => (m === "day" ? "night" : "day"));

  return <ModeCtx.Provider value={{ mode, toggle }}>{children}</ModeCtx.Provider>;
}
