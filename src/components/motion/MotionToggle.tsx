"use client";

import { useId } from "react";
import { useMotion } from "./MotionProvider";
import type { MotionPreference } from "@/lib/motion/preference";

const OPTIONS: { value: MotionPreference; label: string; hint: string }[] = [
  { value: "system", label: "Auto", hint: "Follow your system setting" },
  { value: "full", label: "Full", hint: "Scroll choreography on" },
  { value: "reduced", label: "Reduced", hint: "Stable compositions, no camera travel" },
];

/**
 * Persistent motion setting. Rendered as a small segmented radio group so it
 * works with a keyboard, announces its state and never hides content.
 */
export function MotionToggle({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { preference, effective, hydrated, setPreference } = useMotion();
  const id = useId();

  return (
    <fieldset
      className={`m-0 flex items-center gap-2 border-0 p-0 ${className}`}
      aria-describedby={`${id}-hint`}
    >
      <legend className={compact ? "sr-only" : "eyebrow mr-1"}>Motion</legend>
      <div
        className="inline-flex items-center rounded-full border border-line-strong p-0.5"
        role="radiogroup"
        aria-label="Motion"
      >
        {OPTIONS.map((opt) => {
          const checked = preference === opt.value;
          return (
            <label
              key={opt.value}
              title={opt.hint}
              className={`relative cursor-pointer select-none rounded-full px-2.5 py-1 text-[0.72rem] font-medium leading-none transition-colors ${
                checked ? "bg-fg text-bg" : "text-muted hover:text-fg"
              }`}
            >
              <input
                type="radio"
                name={`${id}-motion`}
                value={opt.value}
                checked={checked}
                onChange={() => setPreference(opt.value)}
                className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      <span id={`${id}-hint`} className="sr-only" aria-live="polite">
        {hydrated
          ? effective === "reduced"
            ? "Reduced motion is active."
            : "Full motion is active."
          : ""}
      </span>
    </fieldset>
  );
}
