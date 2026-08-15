import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMode } from "../mode";
import { useToast } from "../toast";

type Cmd = { icon: string; label: string; hint?: string; run: () => void };

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { mode, toggle } = useMode();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  const cmds: Cmd[] = useMemo(
    () => [
      { icon: "🏠", label: "Top", run: () => go("top") },
      { icon: "📡", label: "Exhibit 01 — the Event Hub (break it)", run: () => go("event-hub") },
      { icon: "⚙️", label: "Exhibit 02 — the Migration Machine", run: () => go("migrations") },
      { icon: "🧱", label: "Exhibit 03 — the Returns Robot", run: () => go("returns") },
      { icon: "🏭", label: "Exhibit 04 — the Component Factory", run: () => go("factory") },
      { icon: "✅", label: "Exhibit 05 — the Coverage Cranker", run: () => go("coverage") },
      { icon: "📖", label: "The story so far", run: () => go("story") },
      { icon: "🌙", label: "The night shift — AadhiPixels products", run: () => go("products") },
      { icon: "🎒", label: "Loadout — skills", run: () => go("skills") },
      { icon: "🤝", label: "Hire me", run: () => go("contact") },
      {
        icon: mode === "day" ? "🌙" : "☀️",
        label: mode === "day" ? "Clock off — switch to night shift" : "Clock on — switch to day job",
        hint: "theme",
        run: () => { toggle(); setOpen(false); },
      },
      {
        icon: "📄",
        label: "Download CV",
        hint: "pdf",
        run: () => { window.location.href = "/cv.pdf"; setOpen(false); },
      },
      {
        icon: "✉️",
        label: "Email Viveak",
        hint: "mailto",
        run: () => { window.location.href = "mailto:viveak.03@gmail.com"; setOpen(false); },
      },
      {
        icon: "🔗",
        label: "LinkedIn",
        run: () => { window.open("https://linkedin.com/in/viveakv", "_blank"); setOpen(false); },
      },
      {
        icon: "🧬",
        label: "View this site's source",
        hint: "github",
        run: () => { window.open("https://github.com/AadhiPixels/viveak-dev", "_blank"); setOpen(false); },
      },
      {
        icon: "🎮",
        label: "I'm looking for the easter egg",
        hint: "hint",
        run: () => {
          toast("Try the Konami code: ↑↑↓↓←→←→BA");
          setOpen(false);
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode]
  );

  const filtered = cmds.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[sel]) filtered[sel].run();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="palette"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setSel(0); }}
              onKeyDown={onKeyDown}
              placeholder="Where to? Try 'break' or 'hire'…"
              aria-label="Command palette"
            />
            <div className="palette-list">
              {filtered.map((c, i) => (
                <button
                  key={c.label}
                  className={"palette-item" + (i === sel ? " sel" : "")}
                  onMouseEnter={() => setSel(i)}
                  onClick={c.run}
                >
                  <span className="icon">{c.icon}</span>
                  {c.label}
                  {c.hint && <span className="hint">{c.hint}</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 16, color: "var(--faint)", fontSize: 14 }}>
                  Nothing matches — but the answer is probably "email viveak.03@gmail.com".
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
