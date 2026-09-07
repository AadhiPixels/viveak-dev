"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "./Icons";

export function CopyEmail({ email, className = "" }: { email: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2200);
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={copy}
        className="btn btn-secondary min-h-9 gap-2 px-3.5 py-2 text-[0.85rem]"
        aria-label={`Copy email address ${email}`}
      >
        {state === "copied" ? <Check /> : <Copy />}
        <span>{state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : "Copy email"}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "Email address copied to clipboard" : state === "failed" ? "Copy failed, the address is shown as text" : ""}
      </span>
    </span>
  );
}
